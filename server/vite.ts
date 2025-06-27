import express, { type Express, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";
// __dirname is available in the compiled CommonJS output
const currentDir = __dirname;
const viteLogger = createLogger();
export function log(message: string, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
}
export async function setupVite(app: Express, server: Server) {
    // Dynamically import the Vite config, supporting both ESM and CJS
    const viteConfigModule = await import(path.resolve(currentDir, "../vite.config.js"));
    const viteConfig = viteConfigModule.default || viteConfigModule;
    const serverOptions = {
        middlewareMode: true,
        hmr: { server },
        allowedHosts: true as const,
    };
    const vite = await createViteServer({
        ...viteConfig,
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
    app.use(vite.middlewares as any);
    app.use("*", (async (req: Request, res: Response, next: NextFunction) => {
        const url = req.originalUrl;
        try {
            const clientTemplate = path.resolve(currentDir, "..", "client", "index.html");
            if (!fs.existsSync(clientTemplate)) {
                throw new Error(`Missing index.html at ${clientTemplate}`);
            }
            let template = await fs.promises.readFile(clientTemplate, "utf-8");
            template = template.replace('src="/src/main.tsx"', `src="/src/main.tsx?v=${nanoid()}"`);
            const page = await vite.transformIndexHtml(url, template);
            res.status(200).set({ "Content-Type": "text/html" }).end(page);
        }
        catch (e) {
            vite.ssrFixStacktrace(e as Error);
            next(e);
        }
    }));
}
export function serveStatic(app: Express) {
    const distPath = path.resolve(currentDir, "../dist/public");
    if (!fs.existsSync(distPath)) {
        throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
    }
    app.use(express.static(distPath) as unknown as RequestHandler);
    app.get("*", (_req, res, next) => {
        const indexPath = path.resolve(distPath, "index.html");
        if (!fs.existsSync(indexPath)) {
            log(`Cannot find index.html at ${indexPath}`, "express");
            return next(new Error(`Cannot find index.html at ${indexPath}`));
        }
        return res.sendFile(indexPath);
    });
}
