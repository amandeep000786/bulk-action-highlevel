"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBulkAction = void 0;
const rabbitmq_1 = require("../config/rabbitmq");
const createBulkAction = async (payload) => {
    const channel = (0, rabbitmq_1.getRabbitChannel)();
    channel.sendToQueue('contact_updates', Buffer.from(JSON.stringify(payload)));
    return { message: 'Bulk action queued', actionId: payload.actionId };
};
exports.createBulkAction = createBulkAction;
