"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumeContactUpdates = void 0;
const Contact_1 = require("../models/Contact");
const rabbitmq_1 = require("../config/rabbitmq");
const consumeContactUpdates = async () => {
    const channel = (0, rabbitmq_1.getRabbitChannel)();
    channel.consume('contact_updates', async (msg) => {
        if (msg) {
            const payload = JSON.parse(msg.content.toString());
            for (const id of payload.entities) {
                await Contact_1.Contact.findByIdAndUpdate(id, payload.updates);
            }
            channel.ack(msg);
        }
    });
};
exports.consumeContactUpdates = consumeContactUpdates;
