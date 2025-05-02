import { v4 as uuidv4 } from 'uuid';
import { BulkAction, BulkActionStatus, BulkActionType, IBulkAction } from '../models/BulkAction';
import { BulkActionLog, LogStatus, IBulkActionLog } from '../models/BulkActionLog';
import { Contact, IContact } from '../models/Contact';
import { RateLimiter } from './RateLimiter';
import { Channel } from 'amqplib';
import fs from 'fs';
import { createReadStream } from 'fs';
import { Transform } from 'stream';
import { promisify } from 'util';
import readline from 'readline';
import path from 'path';
import { DbHelper } from '../utils/DbHelper';
import { Document } from 'mongoose';

const readFile = promisify(fs.readFile);

// Define supported entity types
export type SupportedEntity = IContact; // Add other interfaces here when adding new models
export type EntityType = 'Contact'; // Add other entity types here when adding new models

interface IEntityProcessor<T extends Document> {
  getUniqueFields(record: any): Record<string, any>;
  getEntityIdentifier(record: any): string;
  validateRecord(record: any): boolean;
  processInsert(dbHelper: DbHelper<T>, record: any, accountId: string): Promise<T>;
  processUpdate(dbHelper: DbHelper<T>, id: string, fieldsToUpdate: any): Promise<T | null>;
}

class ContactProcessor implements IEntityProcessor<IContact> {
  getUniqueFields(record: any): Record<string, any> {
    return { email: record.email };
  }

  getEntityIdentifier(record: any): string {
    return record.id || record._id || record.email || 'unknown';
  }

  validateRecord(record: any): boolean {
    return !!record.email;
  }

  async processInsert(dbHelper: DbHelper<IContact>, record: any, accountId: string): Promise<IContact> {
    const result = await dbHelper.create({
      ...record,
      accountId
    });
    return Array.isArray(result) ? result[0] : result;
  }

  async processUpdate(dbHelper: DbHelper<IContact>, id: string, fieldsToUpdate: any): Promise<IContact | null> {
    return dbHelper.updateById(id, { $set: fieldsToUpdate });
  }
}

export class BulkActionService {
  private rateLimiter: RateLimiter;
  private channel: Channel;
  private readonly CHUNK_SIZE = 1000;
  private entityHelpers: Map<EntityType, DbHelper<any>> = new Map();
  private entityProcessors: Map<EntityType, IEntityProcessor<any>> = new Map();

  constructor(rateLimiter: RateLimiter, channel: Channel) {
    this.rateLimiter = rateLimiter;
    this.channel = channel;
    this.initializeEntityHelpers();
    this.initializeEntityProcessors();
  }

  private initializeEntityHelpers() {
    this.entityHelpers.set('Contact', new DbHelper(Contact));
    // Add other entity helpers here when adding new models
  }

  private initializeEntityProcessors() {
    this.entityProcessors.set('Contact', new ContactProcessor());
    // Add other entity processors here when adding new models
  }

  private getDbHelper(entityType: EntityType): DbHelper<any> {
    const helper = this.entityHelpers.get(entityType);
    if (!helper) {
      throw new Error(`No helper found for entity type: ${entityType}`);
    }
    return helper;
  }

  private getEntityProcessor(entityType: EntityType): IEntityProcessor<any> {
    const processor = this.entityProcessors.get(entityType);
    if (!processor) {
      throw new Error(`No processor found for entity type: ${entityType}`);
    }
    return processor;
  }

  async processChunk(
    actionId: string,
    chunkId: string,
    accountId: string,
    entityType: EntityType,
    actionType: BulkActionType,
    records: any[],
    totalChunks: number,
    chunkIndex: number
  ): Promise<void> {
    const bulkAction = await BulkAction.findOne({ actionId });
    if (!bulkAction) {
      throw new Error('Bulk action not found');
    }

    const dbHelper = this.getDbHelper(entityType);
    const processor = this.getEntityProcessor(entityType);
    const logs: IBulkActionLog[] = [];
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (const record of records) {
      try {
        if (!processor.validateRecord(record)) {
          logs.push(new BulkActionLog({
            actionId: bulkAction.actionId,
            accountId,
            entityId: processor.getEntityIdentifier(record),
            status: LogStatus.FAILED,
            error: 'Invalid record format'
          }));
          failureCount++;
          continue;
        }

        if (actionType === BulkActionType.INSERT) {
          const uniqueFields = processor.getUniqueFields(record);
          const existing = await dbHelper.findOne({ ...uniqueFields, accountId });

          if (existing) {
            logs.push(new BulkActionLog({
              actionId: bulkAction.actionId,
              accountId,
              entityId: processor.getEntityIdentifier(record),
              status: LogStatus.SKIPPED,
              error: 'Duplicate entity found'
            }));
            skippedCount++;
            continue;
          }

          const entity = await processor.processInsert(dbHelper, record, accountId);

          logs.push(new BulkActionLog({
            actionId: bulkAction.actionId,
            accountId,
            entityId: (entity as any)._id.toString(),
            status: LogStatus.SUCCESS
          }));
          successCount++;
        } else if (actionType === BulkActionType.UPDATE) {
          const { id, ...fieldsToUpdate } = record;
          const result = await processor.processUpdate(dbHelper, id, fieldsToUpdate);

          if (result) {
            logs.push(new BulkActionLog({
              actionId: bulkAction.actionId,
              accountId,
              entityId: id,
              status: LogStatus.SUCCESS
            }));
            successCount++;
          } else {
            logs.push(new BulkActionLog({
              actionId: bulkAction.actionId,
              accountId,
              entityId: id,
              status: LogStatus.FAILED,
              error: `${entityType} not found`
            }));
            failureCount++;
          }
        }
      } catch (error: any) {
        logs.push(new BulkActionLog({
          actionId: bulkAction.actionId,
          accountId,
          entityId: processor.getEntityIdentifier(record),
          status: LogStatus.FAILED,
          error: error.message || 'Unknown error'
        }));
        failureCount++;
      }
    }

    // Update counts atomically
    await BulkAction.findOneAndUpdate(
      { actionId },
      { 
        $inc: { 
          processedRecords: records.length,
          successCount,
          failureCount,
          skippedCount
        }
      }
    );

    // Save logs
    await BulkActionLog.insertMany(logs);

    // Check if this is the last chunk
    if (chunkIndex === totalChunks - 1) {
      const actualCount = await dbHelper.find({ accountId }).then(results => results.length);
      const expectedCount = bulkAction.successCount + successCount;
      
      if (actualCount !== expectedCount) {
        console.error(`Count mismatch: expected ${expectedCount}, got ${actualCount}`);
        await BulkAction.findOneAndUpdate(
          { actionId },
          { 
            $set: {
              successCount: actualCount,
              failureCount: bulkAction.totalRecords - actualCount - (bulkAction.skippedCount + skippedCount),
              status: BulkActionStatus.COMPLETED
            }
          }
        );
      } else {
        await BulkAction.findOneAndUpdate(
          { actionId },
          { 
            $set: { status: BulkActionStatus.COMPLETED }
          }
        );
      }
    }
  }

  async createBulkAction(
    accountId: string,
    entityType: string,
    actionType: BulkActionType,
    metadata: any,
    scheduledFor?: Date
  ): Promise<IBulkAction> {
    const actionId = uuidv4();
    const status = scheduledFor ? BulkActionStatus.SCHEDULED : BulkActionStatus.PENDING;

    const bulkAction = new BulkAction({
      actionId,
      accountId,
      entityType,
      actionType,
      status,
      scheduledFor,
      metadata,
      totalRecords: 0,
      processedRecords: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0
    });

    await bulkAction.save();
    return bulkAction;
  }

  async processBulkUpdate(
    accountId: string,
    entityIds: string[],
    fieldsToUpdate: Record<string, any>
  ): Promise<IBulkAction> {
    // Check rate limit
    const canProcess = await this.rateLimiter.canProcessBulkAction(accountId, entityIds.length);
    if (!canProcess) {
      throw new Error('Rate limit exceeded');
    }

    const bulkAction = await this.createBulkAction(
      accountId,
      'Contact',
      BulkActionType.UPDATE,
      { fieldsToUpdate }
    );

    // Queue the bulk action for processing
    await this.channel.sendToQueue(
      'bulk_actions',
      Buffer.from(JSON.stringify({
        actionId: bulkAction.actionId,
        accountId,
        actionType: BulkActionType.UPDATE,
        entityIds,
        fieldsToUpdate
      }))
    );

    return bulkAction;
  }

  async processBulkInsert(
    accountId: string,
    entities: Partial<IContact>[]
  ): Promise<IBulkAction> {
    // Check rate limit
    const canProcess = await this.rateLimiter.canProcessBulkAction(accountId, entities.length);
    if (!canProcess) {
      throw new Error('Rate limit exceeded');
    }

    const bulkAction = await this.createBulkAction(
      accountId,
      'Contact',
      BulkActionType.INSERT,
      { entities }
    );

    // Queue the bulk action for processing
    await this.channel.sendToQueue(
      'bulk_actions',
      Buffer.from(JSON.stringify({
        actionId: bulkAction.actionId,
        accountId,
        actionType: BulkActionType.INSERT,
        entities
      }))
    );

    return bulkAction;
  }

  async getBulkActionStatus(actionId: string): Promise<IBulkAction> {
    const bulkAction = await BulkAction.findOne({ actionId });
    if (!bulkAction) {
      throw new Error('Bulk action not found');
    }
    return bulkAction;
  }

  async getBulkActionStats(actionId: string): Promise<{
    total: number;
    processed: number;
    success: number;
    failure: number;
    skipped: number;
  }> {
    const bulkAction = await this.getBulkActionStatus(actionId);
    return {
      total: bulkAction.totalRecords,
      processed: bulkAction.processedRecords,
      success: bulkAction.successCount,
      failure: bulkAction.failureCount,
      skipped: bulkAction.skippedCount
    };
  }

  async getBulkActionLogs(
    actionId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    logs: IBulkActionLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      BulkActionLog.find({ actionId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BulkActionLog.countDocuments({ actionId })
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async processBulkActionFromFile(
    accountId: string,
    actionType: BulkActionType,
    filePath: string
  ): Promise<IBulkAction> {
    // Create a bulk action record
    const bulkAction = await this.createBulkAction(
      accountId,
      'Contact',
      actionType,
      { filePath }
    );

    // Queue the file processing
    await this.channel.sendToQueue(
      'bulk_actions',
      Buffer.from(JSON.stringify({
        actionId: bulkAction.actionId,
        accountId,
        actionType,
        filePath
      }))
    );

    return bulkAction;
  }

  async processFileInChunks(
    actionId: string,
    accountId: string,
    actionType: BulkActionType,
    filePath: string
  ): Promise<void> {
    const bulkAction = await BulkAction.findOne({ actionId });
    if (!bulkAction) {
      throw new Error('Bulk action not found');
    }

    // Update status to in progress
    bulkAction.status = BulkActionStatus.IN_PROGRESS;
    await bulkAction.save();

    // Read the entire file first to determine its format
    const fileContent = await readFile(filePath, 'utf-8');
    let records: any[] = [];

    try {
      // Try to parse as a single JSON array
      const parsedContent = JSON.parse(fileContent);
      if (Array.isArray(parsedContent)) {
        records = parsedContent;
      } else if (typeof parsedContent === 'object') {
        // If it's a single object, wrap it in an array
        records = [parsedContent];
      }
    } catch (error) {
      // If parsing as a single JSON fails, try line-by-line parsing
      const lines = fileContent.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const record = JSON.parse(line);
          if (record && typeof record === 'object') {
            records.push(record);
          }
        } catch (e) {
          console.error('Error parsing line:', line);
        }
      }
    }

    // Update total records count
    bulkAction.totalRecords = records.length;
    await bulkAction.save();

    // Process records in chunks and send to RabbitMQ
    const chunkPromises = [];
    const totalChunks = Math.ceil(records.length / this.CHUNK_SIZE);
    
    for (let i = 0; i < records.length; i += this.CHUNK_SIZE) {
      const chunk = records.slice(i, i + this.CHUNK_SIZE);
      const chunkId = `${actionId}_${i}`;
      
      // Send chunk to RabbitMQ
      const promise = this.channel.sendToQueue(
        'bulk_action_chunks',
        Buffer.from(JSON.stringify({
          actionId,
          chunkId,
          accountId,
          actionType,
          records: chunk,
          totalChunks,
          chunkIndex: Math.floor(i / this.CHUNK_SIZE)
        }))
      );
      chunkPromises.push(promise);
    }

    // Wait for all chunks to be queued
    await Promise.all(chunkPromises);
  }
} 