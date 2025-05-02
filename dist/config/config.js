"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/config/config.ts
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file
dotenv_1.default.config();
// Cache environment variables in a config object
const config = {
    mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/crmdb',
    port: process.env.PORT || 8080,
    // Add any other environment variables here...
};
// Export the cached config object
exports.default = config;
