# Bulk Action Platform for CRM

A highly scalable and efficient bulk action platform capable of performing various bulk actions on CRM entities. The system is designed to handle large volumes of data (up to a million entities) with high performance, extendability, and robust error handling.

## Features

- Bulk update operations on CRM entities
- Rate limiting per account
- Duplicate detection and handling
- Batch processing for efficiency
- Real-time progress tracking
- Detailed logging and statistics
- Horizontal scalability
- Scheduled bulk actions

## Technical Stack

- Node.js with TypeScript
- Express.js for API
- MongoDB for data storage
- RabbitMQ for message queuing
- Redis for rate limiting
- Docker for containerization

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Redis
- RabbitMQ
- Docker (optional)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bulk-action-platform
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/bulk_actions
REDIS_URI=redis://localhost:6379
RABBITMQ_URI=amqp://localhost
```

4. Start the services:
```bash
# Start MongoDB, Redis, and RabbitMQ
# Using Docker (recommended):
docker-compose up -d

# Or start them individually
```

5. Start the application:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### List Bulk Actions
```
GET /api/bulk-actions?accountId=<accountId>
```

### Create Bulk Action
```
POST /api/bulk-actions
{
  "accountId": "string",
  "entityIds": ["string"],
  "fieldsToUpdate": {
    "field1": "value1",
    "field2": "value2"
  }
}
```

### Get Bulk Action Status
```
GET /api/bulk-actions/:actionId
```

### Get Bulk Action Statistics
```
GET /api/bulk-actions/:actionId/stats
```

### Get Bulk Action Logs
```
GET /api/bulk-actions/:actionId/logs?page=1&limit=50
```

## Rate Limiting

The system implements rate limiting with the following rules:
- Each account is limited to 10,000 events per minute
- Rate limits are enforced using Redis
- Exceeding the rate limit will result in a 429 status code

## Error Handling

The system provides detailed error information:
- 400: Bad Request (missing required fields)
- 404: Not Found (bulk action not found)
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error

## Logging

The system maintains detailed logs for each bulk action:
- Success/failure status for each entity
- Error messages for failed operations
- Skipped records due to duplicates
- Timestamps for all operations

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License. 