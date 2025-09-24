# Indoor Viewer AWS Docker Setup

This project uses Docker Compose to manage a Node.js backend, MongoDB, and PostGIS for both development and production environments.

## Prerequisites

- Docker and Docker Compose installed
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
MONGO_URL=mongodb://mongo:27017/indoor_app
POSTGIS_URL=postgres://postgis:postgis@postgis:5432/indoor_app
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=adminpassword
MONGO_INITDB_DATABASE=indoor_app
POSTGRES_DB=indoor_app
POSTGRES_USER=postgis
POSTGRES_PASSWORD=postgispassword
```

---

## Development Workflow

1. **Start all services:**

   ```sh
   docker-compose up -d
   ```

   - Uses both `docker-compose.yml` and `docker-compose.override.yml`.
   - MongoDB is available at `localhost:27017` and PostGIS at `localhost:5432` for admin tools.

2. **Access the app:**

   - Visit [http://localhost](http://localhost) in your browser.

3. **Access databases (optional):**

   - Use MongoDB Compass, pgAdmin, or CLI tools to connect to the databases on your host.

4. **Stop all services:**
   ```sh
   docker-compose down
   ```

---

## Production Workflow

1. **Start all services (no DB ports exposed):**

   ```sh
   docker-compose -f docker-compose.yml up -d
   ```

   - Only the backend web service is accessible from outside.
   - Databases are only accessible by the backend container.

2. **Stop all services:**
   ```sh
   docker-compose -f docker-compose.yml down
   ```

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

## Useful Commands

- View logs: `docker-compose logs -f`
- Rebuild images: `docker-compose build --no-cache`
- Remove all containers/volumes: `docker system prune -a --volumes`

---

For more details, see the official Docker Compose documentation: https://docs.docker.com/compose/
