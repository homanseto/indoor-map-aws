# Indoor Viewer AWS Docker Setup

This project uses Docker Compose to manage a Node.js backend, MongoDB, and PostGIS for both development and production environments with support for live code reloading and database persistence.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development without Docker)
- (Optional) MongoDB Compass, pgAdmin, or other database admin tools for development

---

## Project Structure

- `docker-compose.yml` — Main configuration for all environments
- `docker-compose.override.yml` — Development-only overrides (exposes DB ports)
- `.env` — Environment variables for all services
- `server/` — Node.js backend code
- `public/` — Static frontend files

---

## Environment Variables

Edit the `.env` file to set database credentials and connection strings. Example:

```
MONGO_URL=mongodb://mongo:27017/indoor_map
POSTGIS_URL=postgres://postgis:postgis@postgis:5432/indoor_map
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=adminpassword
MONGO_INITDB_DATABASE=indoor_map
POSTGRES_DB=indoor_map
POSTGRES_USER=postgis
POSTGRES_PASSWORD=postgispassword
```

---

## Quick Start

### First Time Setup (ALWAYS Use --build)

1. **Clone and setup environment:**

   ```bash
   git clone <repository-url>
   cd indoor-viewer-aws
   cp .env.example .env  # Edit with your database credentials
   ```

2. **Build and start all services:**

   ```bash
   docker-compose -f docker-compose.dev.yml up -d --build
   ```

3. **Access the application:**
   - Backend API: [http://localhost](http://localhost)
   - MongoDB: `localhost:27017` (for MongoDB Compass)
   - PostGIS: `localhost:5432` (for pgAdmin/other tools)

## When to Use --build Flag

### ✅ ALWAYS Use --build When:

- **First time setup** - Building images for the first time
- **Dockerfile changes** - Any modifications to Dockerfile
- **Package.json changes** - New dependencies added/removed
- **Build context changes** - Files copied during build process
- **After system cleanup** - If you pruned Docker images

### ❌ DON'T Need --build When:

- Only `.env` file changes
- Source code changes (development uses volume mounts)
- Database data changes
- Just restarting services

## Development Workflow

### Standard Development Commands

1. **Start all services (first time or after changes requiring rebuild):**

   ```bash
   docker-compose -f docker-compose.dev.yml up -d --build
   ```

2. **Start services (no build needed):**

   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Restart specific service:**

   ```bash
   docker-compose -f docker-compose.dev.yml restart web
   ```

4. **View logs:**

   ```bash
   docker-compose -f docker-compose.dev.yml logs -f web
   docker-compose -f docker-compose.dev.yml logs -f mongo
   docker-compose -f docker-compose.dev.yml logs -f postgis
   ```

5. **Stop all services:**
   ```bash
   docker-compose -f docker-compose.dev.yml down
   ```

### Development Features

- **Live Code Reloading**: Source code is mounted as volume - changes reflect immediately
- **Nodemon Auto-Restart**: Uses `Dockerfile.dev` with nodemon for automatic server restarts
- **Development Dependencies**: Includes all dev dependencies (not just production)
- **Database Access**: Both MongoDB (27017) and PostGIS (5432) ports exposed for admin tools
- **Persistent Data**: Database data survives container restarts via bind mounts
- **Environment Variables**: Uses `.env` and `.env.local` for configuration

### Dockerfile Usage

| Environment        | Dockerfile Used      | Purpose                                                          |
| ------------------ | -------------------- | ---------------------------------------------------------------- |
| **Development**    | `Dockerfile.dev`     | Nodemon, dev dependencies, optimized for development             |
| **Production**     | `Dockerfile`         | Production build, minimal dependencies, optimized for deployment |
| **PostGIS Custom** | `Dockerfile.postgis` | Custom PostGIS with pre-installed extensions                     |

### Common Development Scenarios

**Added New npm Package:**

```bash
# Rebuild required to install new dependencies
docker-compose -f docker-compose.dev.yml up -d --build
```

**Changed Dockerfile:**

```bash
# Force complete rebuild
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d
```

**Only Changed Source Code:**

```bash
# No build needed - volume mounts provide live updates
# Application will restart automatically (if nodemon is configured)
# Or manually restart:
docker-compose -f docker-compose.dev.yml restart web
```

**Environment Variable Changes:**

```bash
# No build needed - just restart to load new env vars
docker-compose -f docker-compose.dev.yml restart web
```

---

## Production Workflow

### Production Deployment

1. **Build and start (production mode):**

   ```bash
   docker-compose -f docker-compose.yml up -d --build
   ```

2. **Production-like testing with development setup:**

   ```bash
   docker-compose -f docker-compose.dev.yml up -d --build
   ```

3. **Stop services:**
   ```bash
   docker-compose -f docker-compose.yml down
   # OR
   docker-compose -f docker-compose.dev.yml down
   ```

### Production vs Development Differences

| Feature             | Development                   | Production            |
| ------------------- | ----------------------------- | --------------------- |
| **Database Ports**  | Exposed (27017, 5432)         | Not exposed           |
| **Code Updates**    | Volume mounts (live reload)   | Copied into image     |
| **Build Frequency** | Only when dependencies change | Every deployment      |
| **Security**        | Convenience-focused           | Security-focused      |
| **Database Access** | Direct host access            | Container-only access |

### Production Security Notes

- Database ports are NOT exposed to host
- Databases only accessible by backend container
- Use environment-specific `.env` files
- Never commit credentials to repository
- Consider using Docker secrets for sensitive data

---

## Data Persistence

- Database data is stored in Docker volumes (`mongo-data`, `postgis-data`) and is not lost when containers are restarted or rebuilt.

---

## Security Notes

- Never commit sensitive credentials to public repositories.
- For production, consider using managed database services and Docker secrets for sensitive data.

---

## Customization

- To use different settings for dev/prod, create additional `.env` files and reference them in your Compose files.
- To add more services, extend the `docker-compose.yml` and override files as needed.

---

## Troubleshooting

- If you can't connect to the databases in production, ensure you are not using the override file.
- For database admin access in production, use SSH tunneling or temporarily expose ports (not recommended for long-term use).

---

## Docker Build Management

### Build Commands Reference

```bash
# Full build and start (recommended for most cases)
docker-compose -f docker-compose.dev.yml up -d --build

# Build only (without starting)
docker-compose -f docker-compose.dev.yml build

# Force rebuild (ignore Docker cache)
docker-compose -f docker-compose.dev.yml build --no-cache

# Build specific service
docker-compose -f docker-compose.dev.yml build web

# Start without building (if images exist)
docker-compose -f docker-compose.dev.yml up -d
```

### Troubleshooting Builds

**Build failing due to cache issues:**

```bash
docker-compose -f docker-compose.dev.yml build --no-cache
```

**Out of disk space:**

```bash
# Remove unused containers, networks, images
docker system prune -f

# Remove unused volumes (⚠️  DATA LOSS)
docker system prune -a --volumes
```

**Check what's using space:**

```bash
docker system df
docker images ls
docker ps -a
```

### Useful Development Commands

```bash
# View real-time logs
docker-compose -f docker-compose.dev.yml logs -f
docker-compose -f docker-compose.dev.yml logs -f web

# Execute commands in running containers
docker exec -it web bash
docker exec -it mongodb mongosh
docker exec -it postgis psql -U postgis -d indoor_map

# Check container status
docker-compose -f docker-compose.dev.yml ps

# Restart specific services
docker-compose -f docker-compose.dev.yml restart web
docker-compose -f docker-compose.dev.yml restart mongo

# Pull latest base images
docker-compose -f docker-compose.dev.yml pull
```

### Database Management

```bash
# Access MongoDB
docker exec -it mongodb mongosh admin -u admin -p adminpassword

# Access PostGIS
docker exec -it postgis psql -U postgis -d indoor_map

# Backup databases
docker exec mongodb mongodump --out /data/backup
docker exec postgis pg_dump -U postgis indoor_map > backup.sql

# Reset database (⚠️ DATA LOSS)
docker-compose -f docker-compose.dev.yml down
rm -rf ./mongodb-data ./postgis-data
docker-compose -f docker-compose.dev.yml up -d --build
```

---

For more details, see the official Docker Compose documentation: https://docs.docker.com/compose/
