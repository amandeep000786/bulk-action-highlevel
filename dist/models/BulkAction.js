"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// models/BulkAction.js
const mongoose_1 = __importDefault(require("mongoose"));
const bulkActionSchema = new mongoose_1.default.Schema({
    accountId: String,
    entityType: String, // e.g. Contact
    actionType: String, // e.g. update
    fieldsToUpdate: Object,
    status: { type: String, enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued' },
    scheduledAt: Date,
    createdAt: { type: Date, default: Date.now },
    stats: {
        success: Number,
        failed: Number,
        skipped: Number,
    },
    logs: [Object],
});
module.exports = mongoose_1.default.model('BulkAction', bulkActionSchema);
