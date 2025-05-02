import express from 'express';
import mongoose from 'mongoose';
import { connect, Channel } from 'amqplib';
import Redis from 'ioredis';
import { createBulkActionRoutes } from './routes/bulkActions';
import { BulkActionConsumer } from './consumers/BulkActionConsumer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

async function initializeServices() {
  // MongoDB connection  
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bulk_actions')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

  // Redis connection
  const redis = new Redis(process.env.REDIS_URI || 'redis://localhost:6379');

  // RabbitMQ connection
  const conn = await connect(process.env.RABBITMQ_URI || 'amqp://localhost');
  const channel = await conn.createChannel();
  console.log('Connected to RabbitMQ');
  
  // Start bulk action consumer
  const consumer = new BulkActionConsumer(channel, redis);
  consumer.start();

  // Setup routes
  app.use('/api/bulk-actions', createBulkActionRoutes(channel, redis));

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

initializeServices().catch(err => {
  console.error('Failed to initialize services:', err);
  process.exit(1);
});
