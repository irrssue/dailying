//
// logger.ts
//
// One shared pino logger. Fastify gets its own instance wired in server.ts;
// this is for everything outside the request lifecycle (jobs, providers).
//

import { pino } from "pino";
import { env, isProd } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  // Pretty transport only in dev; structured JSON in prod for log shippers.
  transport: isProd
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
});
