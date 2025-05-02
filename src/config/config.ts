// src/config/config.ts
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Cache environment variables in a config object
const config = {
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/crmdb',
  port: process.env.PORT || 8080,
  // Add any other environment variables here...
};

// Export the cached config object
export default config;
