// API key authentication middleware for Express
export function apiKeyAuth(req, res, next) {
  const apiKey = req.header("x-api-key") || req.query.api_key || req.body.api_key;
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: "Invalid or missing API key" });
  }
  next();
}
