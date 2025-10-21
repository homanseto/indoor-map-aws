// Database configuration that adapts to environment
export function getDatabaseConfig() {
  const environment = process.env.NODE_ENV || "development";

  // Enhanced Docker detection
  const dockerEnv = process.env.DOCKER_ENV === "true";
  const hasDockerHostname = process.env.HOSTNAME?.length > 12; // Docker hostnames are typically long hex strings
  const hasContainerIndicator = !!process.env.DOCKER_CONTAINER;
  const isRunningInContainer =
    dockerEnv || hasDockerHostname || hasContainerIndicator;

  console.log(`🔧 Environment: ${environment}`);
  console.log(`🔧 DOCKER_ENV: ${process.env.DOCKER_ENV}`);
  console.log(`🔧 HOSTNAME: ${process.env.HOSTNAME}`);
  console.log(`🔧 Is Docker: ${isRunningInContainer}`);

  // Base configuration
  const config = {
    username: process.env.MONGO_INITDB_ROOT_USERNAME || "admin",
    password: process.env.MONGO_INITDB_ROOT_PASSWORD || "adminpassword",
    database: process.env.MONGO_INITDB_DATABASE || "indoor_map",
    authSource: "admin",
    replicaSet: "rs0",
  };

  // Smart hostname selection based on environment and replica set config
  let hostname;

  if (isRunningInContainer) {
    // Running inside Docker container
    console.log("🐳 Running in Docker container");
    hostname = "mongo:27017";
  } else {
    // Running on host machine (VS Code debug)
    console.log("🖥️ Running on host machine");
    hostname = "localhost:27017";
  }

  // Build connection URL
  let mongoUrl;

  if (isRunningInContainer) {
    // Docker containers - use replica set with mongo hostname
    mongoUrl = `mongodb://${config.username}:${config.password}@${hostname}/${config.database}?authSource=${config.authSource}&replicaSet=${config.replicaSet}`;
  } else {
    // Host machine - connect directly to localhost without replica set discovery
    // This bypasses the replica set hostname resolution issue
    mongoUrl = `mongodb://${config.username}:${config.password}@${hostname}/${config.database}?authSource=${config.authSource}&directConnection=true`;
  }

  console.log(`🔗 MongoDB URL: ${mongoUrl}`);

  return {
    mongoUrl,
    hostname,
    isDocker: isRunningInContainer,
    environment,
    ...config,
  };
}
