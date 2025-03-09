# MongoZen Basic Usage Example

This example demonstrates the basic usage of the MongoZen ODM library, including:

- Creating a schema
- Creating a model
- Connecting to MongoDB
- Performing CRUD operations
- Using aggregation

## Prerequisites

- MongoDB server running (the example uses `mongodb://mongo:pass@localhost:27017`)

## Running the Example

```bash
# Install dependencies
npm install

# Run the example
npm start
```

## What This Example Demonstrates

1. **Schema Creation**: Defining a schema with various field types, validation, and default values
2. **Model Creation**: Creating a model for the 'users' collection
3. **CRUD Operations**: Creating, reading, updating, and deleting documents
4. **Aggregation**: Calculating the average age of users
5. **Connection Management**: Connecting to and closing MongoDB connections
