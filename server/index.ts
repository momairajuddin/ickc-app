import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";

const app = express();
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_INTERNAL_APP_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");

    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    const isReplitDomain = origin?.includes(".replit.dev") || origin?.includes(".replit.app");

    if (origin && (origins.has(origin) || isLocalhost || isReplitDomain)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (!origin) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function resolveProductionHost(req: Request): string {
  const forwardedHost = req.header("x-forwarded-host");
  if (forwardedHost && forwardedHost.includes(".replit.app")) {
    return forwardedHost.replace(/^https?:\/\//, "").split(":")[0];
  }

  const internalDomain = process.env.REPLIT_INTERNAL_APP_DOMAIN;
  if (internalDomain && internalDomain.includes(".replit.app")) {
    return internalDomain.replace(/^https?:\/\//, "").split(":")[0];
  }

  if (forwardedHost && !forwardedHost.startsWith("127.")) {
    return forwardedHost.replace(/^https?:\/\//, "").split(":")[0];
  }

  if (internalDomain && !internalDomain.startsWith("127.")) {
    return internalDomain.replace(/^https?:\/\//, "").split(":")[0];
  }

  const hostHeader = req.get("host");
  if (hostHeader && !hostHeader.startsWith("127.")) {
    return hostHeader.replace(/^https?:\/\//, "").split(":")[0];
  }

  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) {
    return devDomain.replace(/^https?:\/\//, "").split(":")[0];
  }

  return "islamic-center-connect.replit.app";
}

function serveExpoManifest(platform: string, req: Request, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const effectiveHost = resolveProductionHost(req);

  log(`[manifest] Serving manifest for ${platform}`);
  log(`[manifest] effectiveHost: ${effectiveHost}`);
  log(`[manifest] x-forwarded-host: ${req.header("x-forwarded-host")}`);
  log(`[manifest] REPLIT_INTERNAL_APP_DOMAIN: ${process.env.REPLIT_INTERNAL_APP_DOMAIN}`);

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    if (manifest.extra?.expoClient) {
      manifest.extra.expoClient.hostUri = effectiveHost;
      manifest.extra.expoClient.apiBaseUrl = `https://${effectiveHost}`;
    }
    if (manifest.extra?.expoGo) {
      manifest.extra.expoGo.debuggerHost = effectiveHost;
    }

    if (manifest.launchAsset?.url) {
      manifest.launchAsset.url = manifest.launchAsset.url.replace(
        /https?:\/\/[^/]+/,
        `https://${effectiveHost}`
      );
    }

    if (manifest.assets && Array.isArray(manifest.assets)) {
      for (const asset of manifest.assets) {
        if (asset.url) {
          asset.url = asset.url.replace(
            /https?:\/\/[^/]+/,
            `https://${effectiveHost}`
          );
        }
      }
    }

    log(`[manifest] Injected host: https://${effectiveHost}`);
    return res.send(JSON.stringify(manifest));
  } catch (err) {
    log(`[manifest] Error processing manifest: ${err}`);
    const raw = fs.readFileSync(manifestPath, "utf-8");
    return res.send(raw);
  }
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const host = resolveProductionHost(req);
  const baseUrl = `https://${host}`;
  const expsUrl = host;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  log("Serving static Expo files with dynamic manifest routing");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/admin")) {
      return next();
    }

    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, req, res);
    }

    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      });
    }

    next();
  });

  app.use("/public", express.static(path.resolve(process.cwd(), "server", "public")));
  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
}

(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`express server serving on port ${port}`);
    },
  );
})();
