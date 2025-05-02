// models/BulkAction.js
import mongoose, { Schema, Document } from 'mongoose';

export enum BulkActionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SCHEDULED = 'scheduled'
}

export enum BulkActionType {
  UPDATE = 'update',
  INSERT = 'insert',
  DELETE = 'delete'
}

export interface IBulkAction extends Document {
  actionId: string;
  accountId: string;
  entityType: string;
  actionType: BulkActionType;
  status: BulkActionStatus;
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  scheduledFor?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    fieldsToUpdate?: Record<string, any>;
    filterCriteria?: Record<string, any>;
    entities?: any[]; // For insert operations
  };
}

const BulkActionSchema: Schema = new Schema({
  actionId: { type: String, required: true, unique: true },
  accountId: { type: String, required: true },
  entityType: { type: String, required: true },
  actionType: { 
    type: String, 
    enum: Object.values(BulkActionType),
    required: true 
  },
  status: { 
    type: String, 
    enum: Object.values(BulkActionStatus),
    default: BulkActionStatus.PENDING 
  },
  totalRecords: { type: Number, default: 0 },
  processedRecords: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  skippedCount: { type: Number, default: 0 },
  scheduledFor: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  metadata: {
    fieldsToUpdate: { type: Schema.Types.Mixed },
    filterCriteria: { type: Schema.Types.Mixed },
    entities: { type: [Schema.Types.Mixed] }
  }
});

// Create index for faster queries
BulkActionSchema.index({ accountId: 1, status: 1 });
BulkActionSchema.index({ actionId: 1 }, { unique: true });

export const BulkAction = mongoose.model<IBulkAction>('BulkAction', BulkActionSchema);
