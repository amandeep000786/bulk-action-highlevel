import amqp from 'amqplib';

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
  const connection = await amqp.connect(process.env.RABBITMQ_URL!);
  channel = await connection.createChannel();
  await channel.assertQueue('contact_updates');
  console.log('RabbitMQ connected');
};

export const getRabbitChannel = () => channel;
