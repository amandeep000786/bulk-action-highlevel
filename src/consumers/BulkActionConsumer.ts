import { Channel, Message } from 'amqplib';
import { BulkAction, BulkActionStatus, BulkActionType } from '../models/BulkAction';
import { BulkActionLog, LogStatus } from '../models/BulkActionLog';
import { Contact } from '../models/Contact';
import { BulkActionService } from '../services/BulkActionService';
import { RateLimiter } from '../services/RateLimiter';
import { Redis } from 'ioredis';

export class BulkActionConsumer {
  private channel: Channel;
  private batchSize: number = 100;
  private bulkActionService: BulkActionService;

  constructor(channel: Channel, redis: Redis) {
    this.channel = channel;
    const rateLimiter = new RateLimiter(redis);
    this.bulkActionService = new BulkActionService(rateLimiter, channel);
  }

  async start() {
    // Assert queues
    await this.channel.assertQueue('bulk_actions', { durable: true });
    await this.channel.assertQueue('bulk_action_chunks', { durable: true });
    
    // Set prefetch for parallel processing
    await this.channel.prefetch(this.batchSize);

    // Consume main bulk action queue
    this.channel.consume('bulk_actions', async (msg: Message | null) => {
      if (!msg) return;

      try {
        const { actionId, accountId, actionType, entityIds, fieldsToUpdate, entities, filePath } = JSON.parse(msg.content.toString());
        
        if (filePath) {
          // Process file-based bulk action
          await this.bulkActionService.processFileInChunks(
            actionId,
            accountId,
            actionType,
            filePath
          );
        } else if (actionType === BulkActionType.UPDATE) {
          await this.processBulkUpdate(actionId, accountId, entityIds, fieldsToUpdate);
        } else if (actionType === BulkActionType.INSERT) {
          await this.processBulkInsert(actionId, accountId, entities);
        }

        this.channel.ack(msg);
      } catch (error) {
        console.error('Error processing bulk action:', error);
        this.channel.nack(msg);
      }
    });

    // Consume chunk processing queue
    this.channel.consume('bulk_action_chunks', async (msg: Message | null) => {
      if (!msg) return;

      try {
        const { actionId, chunkId, accountId, actionType, records, totalChunks, chunkIndex } = JSON.parse(msg.content.toString());
        
        await this.bulkActionService.processChunk(
          actionId,
          chunkId,
          accountId,
          'Contact',
          actionType,
          records,
          totalChunks,
          chunkIndex
        );

        this.channel.ack(msg);
      } catch (error) {
        console.error('Error processing chunk:', error);
        this.channel.nack(msg);
      }
    });
  }

  private async processBulkUpdate(
    actionId: string,
    accountId: string,
    entityIds: string[],
    fieldsToUpdate: Record<string, any>
  ) {
    const bulkAction = await BulkAction.findOne({ actionId });
    if (!bulkAction) {
      throw new Error('Bulk action not found');
    }

    // Update status to in progress
    bulkAction.status = BulkActionStatus.IN_PROGRESS;
    bulkAction.totalRecords = entityIds.length;
    await bulkAction.save();

    // Process in batches
    for (let i = 0; i < entityIds.length; i += this.batchSize) {
      const batch = entityIds.slice(i, i + this.batchSize);
      await this.processUpdateBatch(bulkAction, accountId, batch, fieldsToUpdate);
    }

    // Update final status
    bulkAction.status = BulkActionStatus.COMPLETED;
    await bulkAction.save();
  }

  private async processBulkInsert(
    actionId: string,
    accountId: string,
    entities: any[]
  ) {
    const bulkAction = await BulkAction.findOne({ actionId });
    if (!bulkAction) {
      throw new Error('Bulk action not found');
    }

    // Update status to in progress
    bulkAction.status = BulkActionStatus.IN_PROGRESS;
    bulkAction.totalRecords = entities.length;
    await bulkAction.save();

    // Process in batches
    for (let i = 0; i < entities.length; i += this.batchSize) {
      const batch = entities.slice(i, i + this.batchSize);
      await this.processInsertBatch(bulkAction, accountId, batch);
    }

    // Update final status
    bulkAction.status = BulkActionStatus.COMPLETED;
    await bulkAction.save();
  }

  private async processUpdateBatch(
    bulkAction: any,
    accountId: string,
    entityIds: string[],
    fieldsToUpdate: Record<string, any>
  ) {
    const logs = [];

    for (const entityId of entityIds) {
      try {
        // Check for duplicate email if email is being updated
        if (fieldsToUpdate.email) {
          const existingContact = await Contact.findOne({
            email: fieldsToUpdate.email,
            accountId,
            _id: { $ne: entityId }
          });

          if (existingContact) {
            logs.push({
              actionId: bulkAction.actionId,
              accountId,
              entityId,
              status: LogStatus.SKIPPED,
              error: 'Duplicate email found'
            });
            bulkAction.skippedCount++;
            continue;
          }
        }

        // Update contact
        const result = await Contact.findByIdAndUpdate(
          entityId,
          { $set: fieldsToUpdate },
          { new: true }
        );

        if (result) {
          logs.push({
            actionId: bulkAction.actionId,
            accountId,
            entityId,
            status: LogStatus.SUCCESS
          });
          bulkAction.successCount++;
        } else {
          logs.push({
            actionId: bulkAction.actionId,
            accountId,
            entityId,
            status: LogStatus.FAILED,
            error: 'Contact not found'
          });
          bulkAction.failureCount++;
        }
      } catch (error: any) {
        logs.push({
          actionId: bulkAction.actionId,
          accountId,
          entityId,
          status: LogStatus.FAILED,
          error: error.message || 'Unknown error'
        });
        bulkAction.failureCount++;
      }

      bulkAction.processedRecords++;
    }

    // Save logs and update bulk action
    await Promise.all([
      BulkActionLog.insertMany(logs),
      bulkAction.save()
    ]);
  }

  private async processInsertBatch(
    bulkAction: any,
    accountId: string,
    entities: any[]
  ) {
    const logs = [];

    for (const entity of entities) {
      try {
        // Check for duplicate email
        const existingContact = await Contact.findOne({
          email: entity.email,
          accountId
        });

        if (existingContact) {
          logs.push({
            actionId: bulkAction.actionId,
            accountId,
            entityId: entity.email,
            status: LogStatus.SKIPPED,
            error: 'Duplicate email found'
          });
          bulkAction.skippedCount++;
          continue;
        }

        // Create new contact
        const contact = new Contact({
          ...entity,
          accountId
        });

        await contact.save();

        logs.push({
          actionId: bulkAction.actionId,
          accountId,
          entityId: contact._id,
          status: LogStatus.SUCCESS
        });
        bulkAction.successCount++;
      } catch (error: any) {
        logs.push({
          actionId: bulkAction.actionId,
          accountId,
          entityId: entity.email,
          status: LogStatus.FAILED,
          error: error.message || 'Unknown error'
        });
        bulkAction.failureCount++;
      }

      bulkAction.processedRecords++;
    }

    // Save logs and update bulk action
    await Promise.all([
      BulkActionLog.insertMany(logs),
      bulkAction.save()
    ]);
  }
} 