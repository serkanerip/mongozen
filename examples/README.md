# MongoZen Examples

This directory contains examples demonstrating how to use the MongoZen ODM library.

## Available Examples

### 1. Basic Usage

Location: [basic-usage](./basic-usage)

Demonstrates the fundamental features of MongoZen, including:
- Schema creation and validation
- Model creation
- CRUD operations
- Aggregation

### 2. Custom Logger

Location: [custom-logger](./custom-logger)

Shows how to use a custom logger with MongoZen, including:
- Creating a custom logger
- Setting log levels
- Direct logger access

## Running the Examples

Each example is a standalone npm package that references the MongoZen library using a relative path.

To run an example:

```bash
# Navigate to the example directory
cd basic-usage

# Install dependencies
npm install

# Run the example
npm start
```

## Prerequisites

All examples assume you have a MongoDB server running with the following connection details:
- Connection URI: `mongodb://mongo:pass@localhost:27017`
- Database name: `test_db`

You may need to adjust these settings in the example code to match your MongoDB setup.
