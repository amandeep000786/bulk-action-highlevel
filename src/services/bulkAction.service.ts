import { getRabbitChannel } from '../config/rabbitmq';
import { BulkActionPayload } from '../types/bulkAction.types';

export const createBulkAction = async (payload: BulkActionPayload) => {
  const channel = getRabbitChannel();
  channel.sendToQueue('contact_updates', Buffer.from(JSON.stringify(payload)));
  return { message: 'Bulk action queued', actionId: payload.actionId };
};
