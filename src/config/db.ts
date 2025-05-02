import mongoose from 'mongoose';
import config from './config';

export const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoURI);
    console.log(config.mongoURI)
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
