# SQL Database (Relational) Reference

## What is a SQL Database?

A SQL (relational) database stores data in structured tables with rows and columns. Examples: PostgreSQL, MySQL, SQL Server, SQLite.

## Key Concepts

- **Schema:** Defines tables, columns, types, and relationships.
- **Table:** A collection of rows (records) with a fixed set of columns.
- **Row:** A single record in a table.
- **Column:** A field in a table, with a specific data type.
- **Primary Key:** Uniquely identifies each row.
- **Foreign Key:** Links rows between tables (relationships).
- **Index:** Speeds up queries on columns.
- **Transaction:** A group of operations that succeed or fail together (ACID properties).

## Connection Management

- Use a **connection pool** (e.g., `pg.Pool` for PostgreSQL) to manage and reuse DB connections efficiently.
- Do NOT open/close a new connection for every request.
- One pool per database is best practice.

## When to Use SQL Databases

- Data is highly structured and relational.
- You need strong consistency, transactions, or complex queries (JOINs).
- Data integrity and ACID compliance are important.

## What to Consider When Creating a SQL Database

- **Schema design:** Plan tables, keys, and relationships up front.
- **Indexes:** Add indexes for frequently queried columns.
- **Normalization:** Avoid redundant data, but denormalize for performance if needed.
- **Security:** Use strong passwords, restrict user privileges, and use SSL if possible.
- **Backups:** Set up regular backups.
- **Connection limits:** Tune pool size for your workload and DB server.
- **Migrations:** Use tools (e.g., Flyway, Sequelize, Knex) to manage schema changes.

## Example: PostgreSQL Pool Singleton

```js
import { Pool } from "pg";
const pool = new Pool({
  /* config */
});
export default pool;
```

## Common Pitfalls

- Opening too many connections (can exhaust DB resources).
- Not handling errors or transaction rollbacks.
- Hardcoding credentials in code (use environment variables).
- Not planning for migrations or schema changes.

---

# NoSQL Database Reference

## What is a NoSQL Database?

A NoSQL database stores data in flexible, non-tabular formats. Examples: MongoDB (document), Redis (key-value), Cassandra (wide-column), Neo4j (graph).

## Key Concepts (MongoDB as Example)

- **Collection:** Like a table, but schema-less.
- **Document:** A JSON-like object (record) in a collection.
- **Field:** A key-value pair in a document.
- **Index:** Speeds up queries on fields.
- **Replica Set:** Provides high availability.
- **Sharding:** Distributes data across servers for scalability.
- **Transaction:** Supported in modern MongoDB for multi-document operations.

## Connection Management

- Use a **singleton MongoClient** to manage a pool of connections.
- Do NOT create a new client for every request.
- One client per database is best practice.

## When to Use NoSQL Databases

- Data is semi-structured, unstructured, or changes frequently.
- You need horizontal scaling, flexible schemas, or high write throughput.
- Relationships are simple or not required.

## What to Consider When Creating a NoSQL Database

- **Schema design:** Even schema-less DBs benefit from a consistent document structure.
- **Indexes:** Add indexes for frequently queried fields.
- **Sharding/Replication:** Plan for scaling and high availability.
- **Security:** Use strong passwords, enable authentication, and use SSL if possible.
- **Backups:** Set up regular backups.
- **Connection limits:** Tune pool size for your workload and DB server.
- **Migrations:** Plan for document structure changes.

## Example: MongoDB Singleton Client

```js
import { MongoClient } from "mongodb";
let client;
let clientPromise;
export function getMongoClient() {
  if (!clientPromise) {
    client = new MongoClient(process.env.MONGO_URL);
    clientPromise = client.connect();
  }
  return clientPromise;
}
```

## Common Pitfalls

- Creating a new client for every request (connection exhaustion).
- Not planning document structure (leads to inconsistent data).
- Not using indexes (slow queries).
- Hardcoding credentials in code (use environment variables).
- Not planning for migrations or document changes.

---

# General Database Best Practices

- Use environment variables for all credentials and connection strings.
- Use a singleton or pool for all database connections.
- Plan schema/document structure up front.
- Secure your database (auth, SSL, firewalls).
- Monitor performance and tune indexes/queries.
- Set up regular backups and test restores.
- Use migrations for schema/document changes.
- Handle errors and edge cases gracefully.

This file is a reference for SQL and NoSQL database setup, connection management, and best practices. Update as your project evolves.
