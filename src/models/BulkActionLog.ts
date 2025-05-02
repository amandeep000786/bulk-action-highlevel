import mongoose, { Schema, Document } from 'mongoose';

export enum LogStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export interface IBulkActionLog extends Document {
  actionId: string;
  accountId: string;
  entityId: string;
  status: LogStatus;
  error?: string;
  createdAt: Date;
}

const BulkActionLogSchema: Schema = new Schema({
  actionId: { type: String, required: true },
  accountId: { type: String, required: true },
  entityId: { type: String, required: true },
  status: { 
    type: String, 
    enum: Object.values(LogStatus),
    required: true 
  },
  error: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Create index for faster queries
BulkActionLogSchema.index({ actionId: 1 });
BulkActionLogSchema.index({ accountId: 1, createdAt: -1 });

export const BulkActionLog = mongoose.model<IBulkActionLog>('BulkActionLog', BulkActionLogSchema); 