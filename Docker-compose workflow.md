# Docker Compose Workflow Explained

This document explains the workflow of `docker-compose.mac.yml` for building and running your multi-container application. It covers the roles of each service, how Docker Compose manages containers, and clarifies common points of confusion.

---

## 1. How Docker Compose Manages Containers

- **Project Name:** By default, Docker Compose uses the folder name (e.g., `indoor-viewer-aws`) as the project name. This is used as a prefix for container, network, and volume names unless you specify `container_name`.
- **Project vs. Container:** `indoor-viewer-aws` is **not** a container itself. It is the name of your project/folder, and is used by Docker Compose to group related containers, networks, and volumes. You may see `indoor-viewer-aws` listed in Docker Desktop's Containers tab, but it represents the project group, not an actual running container.
- **Service Containers:** Each service defined in the Compose file (e.g., `web`, `mongodb`, `postgis`) becomes a separate container. There is **not** a single container that "includes" the others; instead, all containers run side by side and communicate via Docker networks.
- **Naming:** If you set `container_name`, Docker uses that name. Otherwise, it uses the pattern `[project]_[service]_1` (e.g., `indoor-viewer-aws_web_1`).

---

## 2. Service Breakdown

### Web Service

- **Build:** Uses the local `Dockerfile` to build a custom image for your Node.js app.
- **Image:** Tags the built image as `indoor_app:latest`. The `latest` tag is just a label for the most recently built image with that tag.
- **Container Name:** Set to `web` for clarity.
- **Ports:** Maps port 80 on your host to port 3000 in the container (the app listens on 3000).
- **Environment:** Loads variables from `.env` and passes them to the container.
- **Depends On:** Ensures the `web` service starts after `mongo` and `postgis` containers are created (but not necessarily ready).
- **Network:** All services are attached to `backend_network` for secure communication.

### MongoDB Service

- **Image:** Uses the official `mongo:noble` image from Docker Hub.
- **Container Name:** Set to `mongodb`.
- **Restart Policy:** Restarts automatically if the container fails.
- **Volumes:**
  - `./mongodb-data:/data/db` is a bind mount.
  - The `mongodb-data` folder on your host stores the database files from `/data/db` inside the container (the default MongoDB data directory).
  - You will not see a `/data/db` folder inside `mongodb-data`; the files are stored directly in `mongodb-data`.
- **Environment:** Loads variables from `.env` and passes them to the container.
- **Ports:** Maps port 27017 on your host to 27017 in the container.
- **Network:** Attached to `backend_network`.

### PostGIS Service

- **Image:** Uses the official `postgis/postgis:16-master` image.
- **Container Name:** Set to `postgis`.
- **Platform:** `linux/amd64` is specified for Apple Silicon compatibility.
- **Restart Policy:** Restarts automatically if the container fails.
- **Volumes:**
  - `./postgis-data:/var/lib/postgresql/data` is a bind mount.
  - The `postgis-data` folder on your host stores the database files from `/var/lib/postgresql/data` inside the container (the default Postgres/PostGIS data directory).
  - You will not see a `/var/lib/postgresql/data` folder inside `postgis-data`; the files are stored directly in `postgis-data`.
- **Environment:** Loads variables from `.env` and passes them to the container.
- **Ports:** Maps port 5432 on your host to 5432 in the container.
- **Network:** Attached to `backend_network`.

---

## 3. Key Points and Clarifications

- **No Parent Container:** There is no single container that "includes" the others. Each service is a separate container managed by Docker Compose.
- **Project Grouping in Docker Desktop:** In Docker Desktop's Containers tab, you may see `indoor-viewer-aws` as a group header, with `web`, `mongodb`, and `postgis` listed underneath. This is for organizational purposes only; `indoor-viewer-aws` is not a running container.
- **Data Persistence:** Bind mounts (`./mongodb-data`, `./postgis-data`) ensure your database data persists even if you remove or recreate containers.
- **Default Data Paths:**
  - MongoDB: `/data/db` (inside container)
  - PostGIS/Postgres: `/var/lib/postgresql/data` (inside container)
- **Platform Compatibility:** The `platform: linux/amd64` line is required for PostGIS on Apple Silicon Macs.
- **Network Isolation:** All services are attached to a custom bridge network for secure, isolated communication.

---

## Important Note: Database Init Scripts and Volumes

- **MongoDB and PostGIS init scripts (in `/docker-entrypoint-initdb.d/`) only run when the database container starts with an empty data directory (i.e., the Docker volume is new or has been deleted).**
- If you start the container before mounting your init script, or if the data volume already exists, the script will NOT run—even if you add it later.
- **To re-trigger initialization:**
  1. Stop all containers. ** docker-compose -f docker-compose.dev.yml down **
  2. Remove the relevant data volume (e.g., `docker volume rm indoor-viewer-aws_mongodb-data`).
  3. Make sure your init script is present and correctly mounted.
  4. Start the containers again.
- This behavior is a safety feature to prevent accidental data loss in production.
- After initialization, the database persists data in the volume and ignores further init scripts.

---

## 4. Pros and Cons

### Pros

- Clear separation of services (web, database, GIS)
- Persistent data with bind mounts
- Easy environment variable management
- Secure, isolated networking
- Cross-platform compatibility (with platform override)

### Cons

- Slightly more setup for bind mounts and platform overrides
- Database containers may not be "ready" when web starts (use healthchecks for production)

---

## 5. Summary

- Each service in your Compose file is a separate container.
- There is no "parent" container; Docker Compose orchestrates all containers as a group.
- The project name (e.g., `indoor-viewer-aws`) is used for grouping and naming, not as a container itself.
- Data is persisted on your host via bind mounts.
- Default data paths are set by the official images.

---

## Bind Mounts vs. Named Volumes in Docker Compose

- **Bind Mounts:**

  - Example: `./mongodb-data:/data/db`
  - Data is stored in a folder you specify on your host (e.g., inside your project directory).
  - You can see, back up, or edit the files directly from your host.
  - Bind mounts are NOT listed in `docker volume ls` because they are not managed by Docker—they are just folders on your filesystem.
  - No need to define anything under a `volumes:` section at the bottom of your compose file for bind mounts.

- **Named Volumes:**

  - Example: `mongodb-data:/data/db` (and then define `mongodb-data:` under `volumes:` at the bottom)
  - Data is managed by Docker and stored in Docker's internal storage location.
  - Named volumes ARE listed in `docker volume ls`.
  - Good for portability and when you don't need to access the raw files directly.

- **Advanced Named Volume with Bind Mount:**

  - You can use `driver_opts` to create a named volume that is actually a bind mount to a specific path (often used for Windows or custom setups).
  - Example:
    ```yaml
    volumes:
      mongodb-data:
        driver: local
        driver_opts:
          type: none
          device: /absolute/path/to/mongodb-data
          o: bind
    ```

- **Summary Table:**

  | Type         | Data Location        | Listed in `docker volume ls` | Define under `volumes:` | Use Case              |
  | ------------ | -------------------- | ---------------------------- | ----------------------- | --------------------- |
  | Bind Mount   | Host folder          | No                           | No                      | Dev, easy backup/edit |
  | Named Volume | Docker-managed store | Yes                          | Yes                     | Prod, portability     |

- **Your Current Setup:**
  - You are using bind mounts for both MongoDB and PostGIS, so your data is in `./mongodb-data` and `./postgis-data` in your project folder.
  - This is why you do not see these as named volumes in `docker volume ls`.

---

## docker commands:

- run docker-compose.yml:
  docker-compose -f docker-compose.dev.yml up -d --build

  -f or -file: flag specifies the Docker Compose configuration file to use.docker-compose.dev.yml is the filename of the Compose file that contains the configuration for your services, networks, and volumes.

  up: This subcommand creates and starts containers defined in the Docker Compose file. If the containers are already created, it will start them if they are stopped

  -d or -detach: flag runs the containers in the background (detached mode).
  Without this flag, the logs of all containers would be shown in the terminal, and
  you would need to stop the containers with Ctrl+C.

  --build: This flag forces Docker Compose to build images before starting the containers. It ensures that any changes to your Dockerfile or the files used in the build context are incorporated into the images.

- list the actual Docker volumes on your system:
  docker volume ls

- stop your containers and remove the named volumes:
  docker-compose -f docker-compose.dev.yml down

- remove volume by name:
  docker volume rm volume-name

- remove a directory and its contents forcefully
  rm -rf mongodb-data
