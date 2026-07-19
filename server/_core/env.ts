/**
 * Environment variable configuration with startup validation.
 *
 * REQUIRED variables will cause the process to exit immediately if absent
 * in production, preventing a misconfigured server from silently starting.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    console.error(`[ENV] FATAL: Required environment variable "${name}" is not set.`);
    process.exit(1);
  }
  return value ?? "";
}

export const ENV = {
  appId:               process.env.VITE_APP_ID ?? "",
  cookieSecret:        requireEnv("JWT_SECRET"),
  databaseUrl:         requireEnv("DATABASE_URL"),
  oAuthServerUrl:      process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId:         process.env.OWNER_OPEN_ID ?? "",
  isProduction:        process.env.NODE_ENV === "production",
  forgeApiUrl:         process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey:         process.env.BUILT_IN_FORGE_API_KEY ?? "",
  stripeSecretKey:     process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  redisUrl:            process.env.REDIS_URL ?? "redis://localhost:6379",
  sentryDsn:           process.env.SENTRY_DSN ?? "",
  appUrl:              process.env.VITE_APP_URL ?? "http://localhost:3000",
  // Keycloak OIDC configuration
  keycloakUrl:         process.env.KEYCLOAK_URL ?? "",
  keycloakRealm:       process.env.KEYCLOAK_REALM ?? "realestate",
  keycloakClientId:    process.env.KEYCLOAK_CLIENT_ID ?? "realestate-app",
  // Fluvio streaming configuration
  fluvioEndpoint:      process.env.FLUVIO_ENDPOINT ?? "",
  fluvioApiKey:        process.env.FLUVIO_API_KEY ?? "",
  // Permify authorization configuration
  permifyEndpoint:     process.env.PERMIFY_ENDPOINT ?? "",
  permifyApiKey:       process.env.PERMIFY_API_KEY ?? "",
  permifyTenantId:     process.env.PERMIFY_TENANT_ID ?? "t1",
};

// Warn about missing optional-but-recommended variables in production
if (ENV.isProduction) {
  const recommended = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "SENTRY_DSN",
    "VITE_APP_URL",
    "REDIS_URL",
  ];
  for (const name of recommended) {
    if (!process.env[name]) {
      console.warn(`[ENV] WARNING: Recommended variable "${name}" is not set.`);
    }
  }
}
