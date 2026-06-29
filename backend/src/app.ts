//
// app.ts
//
// Builds the Fastify instance: plugins, error handling, and all route groups.
// Separated from server.ts so tests can build an app without binding a port.
//

import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { ZodError } from "zod";
import { env, corsOrigins, isProd } from "./config/env.js";
import { authPlugin } from "./auth/plugin.js";
import { AppError } from "./lib/errors.js";
import { authRoutes } from "./routes/auth.js";
import { briefingRoutes } from "./routes/briefing.js";
import { settingsRoutes } from "./routes/settings.js";
import { healthRoutes } from "./routes/health.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: isProd
        ? undefined
        : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
    },
    // Trust the proxy in front (Cloud Run, nginx) for correct client IPs.
    trustProxy: true,
  });

  await app.register(cors, {
    origin: corsOrigins.length ? corsOrigins : false,
    credentials: true,
  });
  await app.register(cookie);
  await app.register(authPlugin);

  // Centralized error handling: AppError → its status; Zod → 400; else 500.
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      reply.code(err.statusCode).send({
        error: err.code,
        message: err.expose ? err.message : "Something went wrong",
      });
      if (!err.expose) req.log.error({ err }, "unhandled AppError");
      return;
    }
    if (err instanceof ZodError) {
      reply.code(400).send({ error: "bad_request", message: "Invalid request", issues: err.issues });
      return;
    }
    req.log.error({ err }, "unhandled error");
    reply.code(500).send({ error: "internal_error", message: "Something went wrong" });
  });

  // Routes.
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(briefingRoutes);
  await app.register(settingsRoutes);

  return app;
}
