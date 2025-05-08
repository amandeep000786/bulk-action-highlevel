# Bulk Action Ingestion Flow

This document explains the flow of data ingestion and how to add support for new entity types in the bulk action platform.

## Overview

The bulk action platform follows a standardized flow for processing bulk operations on any entity type. The system is designed to be extensible, allowing new entity types to be added with minimal configuration.

## Ingestion Flow

1. **Request Reception**
   - API receives bulk action request
   - Request validation (account ID, entity IDs, fields to update)
   - Rate limit check
   - Duplicate detection

2. **Job Creation**
   - Create bulk action job record in MongoDB
   - Generate unique action ID
   - Set initial status (PENDING)

3. **Message Queueing**
   - Split entities into batches (default: 1000 entities per batch)
   - Queue batches in RabbitMQ
   - Each batch contains:
     - Action ID
     - Entity IDs
     - Fields to update
     - Account context

4. **Processing**
   - Worker processes pick up batches from queue
   - Process each entity in the batch
   - Update status in real-time
   - Log results and errors

5. **Completion**
   - Update final status (COMPLETED/FAILED)
   - Generate statistics
   - Clean up temporary data

## Adding Support for New Entity Types

To add support for a new entity type, follow these steps:

### 1. Create Entity Handler

Create a new handler class in `src/handlers/`:

```typescript
// src/handlers/NewEntityHandler.ts
import { BaseEntityHandler } from './BaseEntityHandler';

export class NewEntityHandler extends BaseEntityHandler {
  constructor() {
    super('newEntity');
  }

  async validateEntity(entityId: string): Promise<boolean> {
    // Add entity-specific validation logic
    return true;
  }

  async updateEntity(entityId: string, updates: Record<string, any>): Promise<void> {
    // Implement entity update logic
    // Example:
    // await this.crmClient.updateNewEntity(entityId, updates);
  }
}
```

### 2. Register Handler

Add the handler to the handler registry in `src/handlers/index.ts`:

```typescript
import { NewEntityHandler } from './NewEntityHandler';

export const handlers = {
  // ... existing handlers
  newEntity: new NewEntityHandler(),
};
```

### 3. Add Entity Type to Types

Update the entity types in `src/types/entities.ts`:

```typescript
export type EntityType = 
  | 'contact'
  | 'lead'
  | 'account'
  | 'newEntity'; // Add your new entity type
```

### 4. Create API Endpoint (Optional)

If you need a specific endpoint for the new entity type, add it to `src/routes/bulkActions.ts`:

```typescript
router.post('/new-entity', async (req, res) => {
  const { accountId, entityIds, fieldsToUpdate } = req.body;
  
  const action = await bulkActionService.createBulkAction({
    accountId,
    entityType: 'newEntity',
    entityIds,
    fieldsToUpdate
  });
  
  res.json(action);
});
```

## Example: Adding Support for "Product" Entity

Here's a complete example of adding support for a "Product" entity:

1. Create the handler:
```typescript
// src/handlers/ProductHandler.ts
import { BaseEntityHandler } from './BaseEntityHandler';

export class ProductHandler extends BaseEntityHandler {
  constructor() {
    super('product');
  }

  async validateEntity(productId: string): Promise<boolean> {
    // Check if product exists and belongs to account
    return await this.crmClient.productExists(productId);
  }

  async updateEntity(productId: string, updates: Record<string, any>): Promise<void> {
    // Update product with new values
    await this.crmClient.updateProduct(productId, updates);
  }
}
```

2. Register the handler:
```typescript
// src/handlers/index.ts
import { ProductHandler } from './ProductHandler';

export const handlers = {
  contact: new ContactHandler(),
  lead: new LeadHandler(),
  product: new ProductHandler(), // Add new handler
};
```

3. Update types:
```typescript
// src/types/entities.ts
export type EntityType = 
  | 'contact'
  | 'lead'
  | 'product'; // Add new type
```

## Best Practices

1. **Validation**
   - Always validate entity IDs before processing
   - Check account permissions
   - Validate field updates against entity schema

2. **Error Handling**
   - Log detailed error information
   - Implement retry logic for transient failures
   - Provide clear error messages

3. **Performance**
   - Use batch processing
   - Implement proper indexing
   - Monitor queue sizes and processing times

4. **Testing**
   - Add unit tests for new handlers
   - Test with large datasets
   - Verify error scenarios

## Monitoring

Monitor the following metrics for new entity types:
- Processing time per entity
- Success/failure rates
- Queue sizes
- Memory usage
- Error rates

Use the built-in statistics endpoints to track performance:
```
GET /api/bulk-actions/:actionId/stats
GET /api/bulk-actions/:actionId/logs
``` 