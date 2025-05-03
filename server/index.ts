import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedInitialData } from "./storage";
import { db } from "./db";

const app = express();
// Increase JSON body parser limit to handle larger payloads from OpenAI
// Make sure JSON parsing is properly enabled and configured
app.use(express.json({ limit: '50mb', strict: false }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Debug middleware for all requests to see what's coming in
app.use((req, res, next) => {
  if (req.method === 'PATCH' || req.path.includes('/test-meal-update')) {
    console.log(`[REQUEST DEBUG] ${req.method} ${req.path} Content-Type:`, req.headers['content-type']);
    console.log(`[REQUEST DEBUG] Request body type:`, typeof req.body);
    console.log(`[REQUEST DEBUG] Request body keys:`, Object.keys(req.body || {}));
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database with seed data if needed
  try {
    await seedInitialData();
    log("Database initialization complete");
  } catch (error) {
    console.error("Database initialization error:", error);
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error("Server error:", err);
    
    // Check for OpenAI API specific errors
    if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && (
      err.message.includes('OpenAI API quota exceeded') ||
      err.message.includes('API rate limit exceeded') ||
      err.message.includes('API authentication error')
    )) {
      // Pass the OpenAI-specific error message to the client
      return res.status(status).json({ message: err.message });
    }

    // For other errors, use a generic message in production
    const isProduction = process.env.NODE_ENV === 'production';
    const clientMessage = isProduction && status === 500 
      ? "An unexpected error occurred. Please try again later."
      : message;
    
    res.status(status).json({ message: clientMessage });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
