import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple logger that works in both dev and production
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Production stub - does nothing
export async function setupVite(app: Express, server: Server) {
  if (process.env.NODE_ENV === 'production') {
    // In production, Vite isn't needed - static files are served directly
    return;
  }

  // Only import vite in development
  const { createServer: createViteServer, createLogger } = await import("vite");
  const viteConfig = await import("../vite.config");
  
  const viteLogger = createLogger();
  
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig.default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    if (url === "/health") {
      return next();
    }

    try {
      const indexPath = path.resolve(process.cwd(), "index.html");
      let html = fs.readFileSync(indexPath, "utf-8");
      html = await vite.transformIndexHtml(url, html);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e: any) {
      vite.ssrFixStacktrace(e);
      console.error(e);
      res.status(500).end(e.message);
    }
  });
}

// Production stub for serving static files
export function serveStatic(app: Express) {
  if (process.env.NODE_ENV !== 'production') {
    // In development, Vite handles this
    return;
  }

  const staticPath = path.resolve(process.cwd(), "dist", "public");
  
  if (fs.existsSync(staticPath)) {
    // Serve static files in production
    app.use(express.static(staticPath, {
      maxAge: "1d",
      etag: true,
    }));

    // Fallback to index.html for client-side routing
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api")) {
        res.sendFile(path.join(staticPath, "index.html"));
      }
    });
  } else {
    console.warn(`Static directory not found: ${staticPath}`);
  }
}