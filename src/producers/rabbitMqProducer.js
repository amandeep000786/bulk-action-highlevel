export async function sendToRabbitMQ(batch, channel) {
    const payload = Buffer.from(JSON.stringify(batch));
    channel.sendToQueue(QUEUE_NAME, payload, { persistent: true });
    console.log(`📤 Sent batch of ${batch.length} contacts to queue`);
  }

   