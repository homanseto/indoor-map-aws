### express

1. Middleware
   Middleware functions are the core of Express. They process requests before they reach your route handlers (e.g., logging, parsing JSON, authentication).
   In app.js, you’ll see lines like app.use(express.json()) or app.use(express.static('public')).
2. Routing
   Express uses routers to organize endpoints. In app.js, you’ll see app.use('/', indexRouter) and app.use('/users', usersRouter).
   You can modularize routes by creating separate router files.
3. Error Handling
   Express has a special error-handling middleware (with four arguments: err, req, res, next).
   The default generator includes a catch-all 404 handler and a general error handler.
4. Static Files
   The public directory is served as static files (CSS, JS, images, HTML) using express.static.
5. View Engines
   If you use dynamic templates (Pug/Jade, EJS, etc.), the view engine is set up in app.js and templates are stored in the views directory.
6. Environment Variables
   Use environment variables (like process.env.PORT) for configuration, especially in production.
7. Separation of Concerns
   app.js is for application logic (routes, middleware, config).
   www.js is for server/network logic (starting the server, handling errors at the server level).
8. Security and Production Readiness
   For real-world apps, consider adding security middleware (like helmet), request logging (morgan), and proper error handling.

### Docker

## Dockerfile:

1. Dockerfile (for web)
   FROM node:20: Uses the official Node.js 20 image as the base.
   WORKDIR /usr/app: Sets the working directory inside the container.
   COPY package.json ./\*: Copies package.json and package-lock.json for dependency installation.
   RUN npm install --production: Installs only production dependencies.
   COPY . .: Copies the rest of your app’s code into the container.
   EXPOSE 3000: Documents that the app listens on port 3000 (for Docker networking).
   CMD [ "npm", "start"]: The default command to run your app.

## Volumes:

Volumes persist data even if the container is stopped, removed, or recreated. Volumes are the preferred way to store database files, uploads, logs, and other persistent data in Docker. Volumes can be managed by Docker (named volumes) or mapped to a specific path on the host (bind mounts).
What: Persistent storage managed by Docker, independent of the container lifecycle.
Why: Keeps your database data safe if you rebuild, restart, or remove containers.
With volumes: Data persists across container restarts/rebuilds.
Without volumes: Data is lost when the container is removed.
Pros: Data safety, easy backup/restore, no accidental data loss.
Cons: Slightly more setup, but essential for real apps.

Named Volume:

> What happens:
> Docker manages the storage location for you (usually under /var/lib/docker/volumes on Linux, or in a special location on Mac/Windows).
> Data persists:
> Data in a named volume is not deleted when you recreate or restart containers with docker-compose up -d.
> Data is only deleted if you explicitly remove the volume (e.g., with docker-compose down -v or docker volume rm).
> Docker does NOT create a folder for a named volume in your project directory.
> Named volumes are managed internally by Docker, not as visible folders in

Bind Mount:

> What happens:
> You specify an exact folder on your host machine (e.g., ./mongo-data:/data/db).
> Data persists:
> Data is stored in that host folder and is never deleted by Docker unless you manually delete the folder.
> Bind mounts do create or use a folder you specify on your host.

Networks:
What: Isolated virtual networks for containers to communicate securely.
Why: Controls which containers can talk to each other, and how.
With a custom network: Only containers on the same network can communicate; others are isolated.
Without a custom network: All containers are on the default network, which may be less secure or organized.
Pros: Security, organization, prevents accidental exposure.
Cons: Slightly more setup, but best practice for multi-service apps.

### run and debug

**Key Concerns and Important Points for Creating a Debug Config File in VS Code:**

- Always specify the correct entry point for your server (e.g., `server/bin/www` for Express apps).
- Use the `envFile` property to load environment variables from your `.env` file for local development.
- Set `NODE_ENV` to `development` in your debug config to enable dev-specific features and logging.
- For full-stack (compound) debugging, define a `compounds` section to launch both backend and frontend debuggers together.
- If debugging the frontend (e.g., with Chrome), ensure the `url` and `webRoot` match your app's served location and source files.
- Use breakpoints in both backend and frontend code to step through requests end-to-end.
- Make sure your ports in the debug config match those exposed by Docker or your dev server.
- For TypeScript or transpiled projects, set `outFiles` to help VS Code map breakpoints to the correct files.
- Keep sensitive data (like passwords) out of your debug config; use environment variables instead.
- Document each configuration in `launch.json` for clarity, especially if working in a team.

**Example launch.json snippet for Node.js server:**

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Server",
  "program": "${workspaceFolder}/server/bin/www",
  "envFile": "${workspaceFolder}/.env",
  "env": {
    "NODE_ENV": "development"
  }
}
```

**Example compound config:**

```json
{
  "compounds": [
    {
      "name": "Full Stack Debug",
      "configurations": ["Debug Server", "Debug Frontend"]
    }
  ]
}
```
