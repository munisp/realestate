import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { authenticateWithKeycloak, isKeycloakConfigured } from "./keycloak";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Strategy 1: Keycloak Bearer token (if configured)
    if (isKeycloakConfigured()) {
      const keycloakUser = await authenticateWithKeycloak(opts.req);
      if (keycloakUser?.keycloakId) {
        // Upsert user from Keycloak identity
        await db.upsertUser({
          openId: keycloakUser.keycloakId,
          name: keycloakUser.name ?? null,
          email: keycloakUser.email ?? null,
          loginMethod: "keycloak",
          lastSignedIn: new Date(),
        });
        user = await db.getUserByOpenId(keycloakUser.keycloakId);
        if (user) {
          return { req: opts.req, res: opts.res, user };
        }
      }
    }

    // Strategy 2: Manus session cookie (existing auth)
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
