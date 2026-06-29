//
// plugin.ts
//
// Fastify auth plugin. Registers @fastify/jwt for signing/verifying the app's
// own access tokens and decorates the instance with an `authenticate`
// preHandler that route groups can attach to require a logged-in user.
//
// On success `request.user` carries the verified claims ({ sub, email }).
//

import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import type { SessionTokenClaims } from "./tokens.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: SessionTokenClaims;
    user: SessionTokenClaims;
  }
}

export const authPlugin = fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_TTL },
  });

  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401).send({ error: "unauthorized", message: "Invalid or expired token" });
    }
  });
});
