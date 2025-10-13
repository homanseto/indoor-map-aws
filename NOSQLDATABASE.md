## MongoDB Replica Set: Local & AWS Deployment Guide

### Key Concepts

- **Replica Set**: A group of mongod processes that maintain the same data set, providing redundancy and high availability.
- **Primary/Secondary**: One node is PRIMARY (accepts writes); others are SECONDARY (replicate data).
- **Transactions**: Require a replica set, even for a single node.
- **Keyfile Authentication**: Required for secure replica set communication.
- **Replica Set Hostnames**: All members must use either localhost or external IP/DNS—never mix.
- **Initialization**: `rs.initiate()` sets up the replica set; must match your network config.
- **Port Mapping**: Host and container ports must align for seamless access.

---

### Local Development: Step-by-Step

1. **Generate a Keyfile** (for authentication):

```sh
openssl rand -base64 756 > mongo-keyfile
chmod 400 mongo-keyfile
```

2. **docker-compose.dev.yml**

- Map MongoDB port: `27017:27017`
- Mount keyfile and init script:
  ```yaml
  ports:
    - "27017:27017"
  volumes:
    - ./mongo-keyfile:/data/keyfile:ro
    - ./mongo-init:/docker-entrypoint-initdb.d
  command: ["mongod", "--replSet", "rs0", "--keyFile", "/data/keyfile"]
  ```

3. **mongo-init/init.js**

```js
rs.initiate({
  _id: "rs0",
  members: [{ _id: 0, host: "localhost:27017", priority: 1 }],
});
```

4. **.env.local**

```env
MONGO_URL=mongodb://admin:adminpassword@localhost:27017/indoor_map?authSource=admin&replicaSet=rs0
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=adminpassword
MONGO_INITDB_DATABASE=indoor_map
```

5. **Reset Data Directory (if needed):**

```sh
docker-compose down
rm -rf ./mongodb-data
docker-compose up -d
```

6. **Initialize Replica Set (if not automatic):**

```sh
mongosh -u admin -p adminpassword --authenticationDatabase admin --port 27017
> rs.initiate({
   _id: "rs0",
   members: [{ _id: 0, host: "localhost:27017", priority: 1 }]
  })
> rs.status()
// Should show PRIMARY
```

7. **Troubleshooting**

- If you get `Server selection timed out`, ensure:
  - Replica set is PRIMARY (`rs.status()`)
  - Ports are mapped correctly
  - Connection string matches your setup
- If you switch networks, re-init with the new accessible host/IP.
- Never mix localhost and external IPs in replica set config.

---

### AWS Deployment: Step-by-Step

1. **Provision EC2 Instances** (or use a managed MongoDB service like Atlas for production).
2. **Set Up Security Groups**

- Open MongoDB port (default 27017) only to trusted sources.

3. **Copy Keyfile to All Nodes**

- Use `scp` or AWS SSM to distribute the same keyfile to all replica set members.
- Set permissions: `chmod 400 mongo-keyfile`

4. **Start mongod on Each Node**

```sh
mongod --replSet rs0 --keyFile /path/to/mongo-keyfile --bind_ip 0.0.0.0 --port 27017
```

5. **Initialize Replica Set from One Node**

```sh
mongosh -u admin -p <password> --authenticationDatabase admin --host <primary-node-public-dns>
> rs.initiate({
   _id: "rs0",
   members: [
    { _id: 0, host: "<primary-node-public-dns>:27017" },
    { _id: 1, host: "<secondary-node-public-dns>:27017" },
    // ...
   ]
  })
> rs.status()
```

6. **Update App Connection String**

```env
MONGO_URL=mongodb://admin:adminpassword@<primary-node-public-dns>:27017,<secondary-node-public-dns>:27017/indoor_map?authSource=admin&replicaSet=rs0
```

7. **Best Practices for AWS**

- Use DNS names, not IPs, for replica set members.
- Secure keyfile and never commit it to source control.
- Use encrypted EBS volumes and VPC for network isolation.
- Consider managed MongoDB (Atlas) for easier ops.

---

### Deep Dive: Replica Set Concepts & Troubleshooting

- **All members must use the same address type** (all localhost or all external IP/DNS).
- **Keyfile is required** for authentication in a replica set.
- **Replica set config is stored in the data directory**—changing hostnames/ports requires a fresh data dir or `rs.reconfig()`.
- **Initialization scripts only run on a fresh data directory**.
- **If you see `NotYetInitialized` or `no replset config has been received`**, run `rs.initiate()` as admin.
- **If you see `Server selection timed out`**:
  - Check that the replica set is PRIMARY.
  - Ensure your app and MongoDB are using the same port and host.
  - Try connecting with `mongosh` using the same credentials and port as your app.
- **For local dev, use `localhost:27017` everywhere.**
- **For production, use DNS names and secure networking.**

---

### References

- [MongoDB Replica Set Docs](https://www.mongodb.com/docs/manual/replication/)
- [MongoDB Security Best Practices](https://www.mongodb.com/docs/manual/administration/security/)
- [MongoDB Atlas (Managed Service)](https://www.mongodb.com/atlas)

# NoSQL Database (MongoDB, etc.) Reference

## What is a NoSQL Database?

NoSQL databases store data in flexible, non-tabular formats. Common types: document (MongoDB), key-value (Redis), wide-column (Cassandra), graph (Neo4j).

## Key Concepts (MongoDB Example)

- **Collection:** Like a table, but schema-less.
- **Document:** A JSON-like object (record) in a collection.
- **Field:** A key-value pair in a document.
- **Index:** Speeds up queries on fields.
- **Replica Set:** Provides high availability.
- **Sharding:** Distributes data across servers for scalability.
- **Transaction:** Supported for multi-document operations in modern MongoDB.

## When to Use NoSQL

- Data is semi-structured, unstructured, or changes frequently.
- You need horizontal scaling, flexible schemas, or high write throughput.
- Relationships are simple or not required.

## Connection Management

- Use a **singleton MongoClient** to manage a pool of connections.
- Do NOT create a new client for every request.
- One client per database is best practice.

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

## General NoSQL Best Practices

- Use environment variables for all credentials and connection strings.
- Use a singleton or pool for all database connections.
- Plan document structure up front.
- Secure your database (auth, SSL, firewalls).
- Monitor performance and tune indexes/queries.
- Set up regular backups and test restores.
- Use migrations for document changes.
- Handle errors and edge cases gracefully.

This file is a reference for NoSQL database setup, connection management, and best practices. Update as your project evolves.
