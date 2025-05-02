import { Router } from 'express';
import { BulkActionService } from '../services/BulkActionService';
import { RateLimiter } from '../services/RateLimiter';
import { Channel } from 'amqplib';
import { Redis } from 'ioredis';
import { BulkActionType } from '../models/BulkAction';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const router = Router();
const upload = multer({ dest: 'uploads/' });
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

export const createBulkActionRoutes = (channel: Channel, redis: Redis) => {
  const rateLimiter = new RateLimiter(redis);
  const bulkActionService = new BulkActionService(rateLimiter, channel);

  // List all bulk actions
  router.get('/', async (req, res) => {
    try {
      const { accountId } = req.query;
      const actions = await bulkActionService.getBulkActionStatus(accountId as string);
      res.json(actions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bulk actions' });
    }
  });

  // Create a new bulk action from file
  router.post('/upload', upload.single('file'), async (req, res) => {
    try {
      const { accountId, actionType } = req.body;
      
      if (!accountId || !actionType || !req.file) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const filePath = req.file.path;
      const fileExtension = path.extname(req.file.originalname).toLowerCase();

      if (fileExtension !== '.json') {
        await unlink(filePath);
        return res.status(400).json({ error: 'Only JSON files are supported' });
      }

      const bulkAction = await bulkActionService.processBulkActionFromFile(
        accountId,
        actionType as BulkActionType,
        filePath
      );

      // Clean up the uploaded file
      // await unlink(filePath);

      res.status(201).json(bulkAction);
    } catch (error: any) {
      console.error(error.message);
      if (error.message === 'Rate limit exceeded') {
        //log error
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      res.status(500).json({ error: 'Failed to create bulk action' });
    }
  });

  // Create a new bulk action (existing endpoint)
  router.post('/', async (req, res) => {
    try {
      const { accountId, actionType, entityIds, fieldsToUpdate, entities } = req.body;
      
      if (!accountId || !actionType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      let bulkAction;

      if (actionType === BulkActionType.UPDATE) {
        if (!entityIds || !fieldsToUpdate) {
          return res.status(400).json({ error: 'Missing required fields for update' });
        }
        bulkAction = await bulkActionService.processBulkUpdate(
          accountId,
          entityIds,
          fieldsToUpdate
        );
      } else if (actionType === BulkActionType.INSERT) {
        if (!entities) {
          return res.status(400).json({ error: 'Missing required fields for insert' });
        }
        bulkAction = await bulkActionService.processBulkInsert(
          accountId,
          entities
        );
      } else {
        return res.status(400).json({ error: 'Invalid action type' });
      }

      res.status(201).json(bulkAction);
    } catch (error: any) {
      if (error.message === 'Rate limit exceeded') {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      res.status(500).json({ error: 'Failed to create bulk action' });
    }
  });

  // Get bulk action status
  router.get('/:actionId', async (req, res) => {
    try {
      const { actionId } = req.params;
      const action = await bulkActionService.getBulkActionStatus(actionId);
      res.json(action);
    } catch (error) {
      res.status(404).json({ error: 'Bulk action not found' });
    }
  });

  // Get bulk action statistics
  router.get('/:actionId/stats', async (req, res) => {
    try {
      const { actionId } = req.params;
      const stats = await bulkActionService.getBulkActionStats(actionId);
      res.json(stats);
    } catch (error) {
      res.status(404).json({ error: 'Bulk action not found' });
    }
  });

  // Get bulk action logs
  router.get('/:actionId/logs', async (req, res) => {
    try {
      const { actionId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      const logs = await bulkActionService.getBulkActionLogs(
        actionId,
        Number(page),
        Number(limit)
      );
      
      res.json(logs);
    } catch (error) {
      res.status(404).json({ error: 'Bulk action not found' });
    }
  });

  return router;
}; 