/**
 * Keycloak OIDC Integration
 *
 * Verifies Keycloak-issued JWTs using the realm's JWKS endpoint.
 * Supports both Bearer token (Authorization header) and session cookie auth.
 *
 * Environment variables:
 *   KEYCLOAK_URL       - Base URL of the Keycloak server (e.g., https://auth.example.com)
 *   KEYCLOAK_REALM     - Realm name (e.g., realestate)
 *   KEYCLOAK_CLIENT_ID - Client ID registered in Keycloak
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { Request } from "express";

// ==================== CONFIGURATION ====================

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? "";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM ?? "realestate";
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID ?? "realestate-app";

// Keycloak JWKS endpoint URL
function getJwksUrl(): string {
  if (!KEYCLOAK_URL) return "";
  return `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;
}

// Keycloak issuer URL
function getIssuerUrl(): string {
  if (!KEYCLOAK_URL) return "";
  return `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
}

// ==================== JWKS CLIENT ====================

let jwksClient: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwksClient() {
  if (!KEYCLOAK_URL) return null;
  if (!jwksClient) {
    jwksClient = createRemoteJWKSet(new URL(getJwksUrl()));
  }
  return jwksClient;
}

// ==================== TOKEN TYPES ====================

export interface KeycloakTokenPayload extends JWTPayload {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
  azp?: string;
}

export interface KeycloakUser {
  keycloakId: string;
  email: string | null;
  name: string | null;
  username: string | null;
  roles: string[];
  isAdmin: boolean;
  rawPayload: KeycloakTokenPayload;
}

// ==================== JWT VERIFICATION ====================

/**
 * Verifies a Keycloak JWT and returns the decoded payload.
 * Returns null if Keycloak is not configured or verification fails.
 */
export async function verifyKeycloakToken(
  token: string
): Promise<KeycloakTokenPayload | null> {
  const client = getJwksClient();
  if (!client) {
    // Keycloak not configured — skip verification
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, client, {
      issuer: getIssuerUrl(),
      audience: KEYCLOAK_CLIENT_ID,
    });
    return payload as KeycloakTokenPayload;
  } catch (error) {
    // Try without audience check (some Keycloak configurations omit it)
    try {
      const { payload } = await jwtVerify(token, client, {
        issuer: getIssuerUrl(),
      });
      return payload as KeycloakTokenPayload;
    } catch {
      return null;
    }
  }
}

/**
 * Extracts the Bearer token from an Authorization header.
 */
export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

/**
 * Extracts Keycloak user info from a verified token payload.
 */
export function extractKeycloakUser(payload: KeycloakTokenPayload): KeycloakUser {
  const realmRoles = payload.realm_access?.roles ?? [];
  const clientRoles = payload.resource_access?.[KEYCLOAK_CLIENT_ID]?.roles ?? [];
  const allRoles = [...new Set([...realmRoles, ...clientRoles])];

  return {
    keycloakId: payload.sub ?? "",
    email: payload.email ?? null,
    name: payload.name ?? null,
    username: payload.preferred_username ?? null,
    roles: allRoles,
    isAdmin: allRoles.includes("admin") || allRoles.includes("realm-admin"),
    rawPayload: payload,
  };
}

/**
 * Attempts to authenticate a request using a Keycloak Bearer token.
 * Returns the Keycloak user info if successful, null otherwise.
 *
 * This is used as a supplemental auth method alongside the existing
 * session cookie auth. If Keycloak is not configured, it returns null
 * and the system falls back to session cookie auth.
 */
export async function authenticateWithKeycloak(
  req: Request
): Promise<KeycloakUser | null> {
  const token = extractBearerToken(req);
  if (!token) return null;

  const payload = await verifyKeycloakToken(token);
  if (!payload) return null;

  return extractKeycloakUser(payload);
}

/**
 * Returns true if Keycloak integration is configured.
 */
export function isKeycloakConfigured(): boolean {
  return Boolean(KEYCLOAK_URL && KEYCLOAK_REALM && KEYCLOAK_CLIENT_ID);
}

// ==================== KEYCLOAK ADMIN API ====================

/**
 * Fetches user info from Keycloak Admin API.
 * Used for user provisioning and role synchronization.
 */
export async function getKeycloakUserById(
  adminToken: string,
  userId: string
): Promise<Record<string, unknown> | null> {
  if (!KEYCLOAK_URL) return null;

  try {
    const url = `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${userId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
