import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  name: string;
  email: string;
  age: number;
  status: string;
  accountId: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, required: true },
  status: { type: String, required: true },
  accountId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create index for email and accountId for faster queries
ContactSchema.index({ email: 1, accountId: 1 }, { unique: true });

export const Contact = mongoose.model<IContact>('Contact', ContactSchema);
