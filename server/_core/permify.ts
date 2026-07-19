/**
 * Permify Authorization Client
 *
 * Provides fine-grained authorization checks using Permify's relationship-based
 * access control (ReBAC) model. Integrates with the schema defined in
 * infrastructure/permify/schema.perm.
 *
 * Supports graceful degradation: if Permify is not configured, falls back to
 * simple role-based checks using the user's local role field.
 *
 * Environment variables:
 *   PERMIFY_ENDPOINT  - Permify gRPC/HTTP endpoint (e.g., http://permify:3476)
 *   PERMIFY_API_KEY   - API key for authentication
 *   PERMIFY_TENANT_ID - Tenant ID (default: "t1")
 */

const PERMIFY_ENDPOINT = process.env.PERMIFY_ENDPOINT ?? "";
const PERMIFY_API_KEY = process.env.PERMIFY_API_KEY ?? "";
const PERMIFY_TENANT_ID = process.env.PERMIFY_TENANT_ID ?? "t1";

// ==================== TYPES ====================

export type PermifyEntity =
  | "user"
  | "property"
  | "transaction"
  | "document"
  | "payment"
  | "review"
  | "message"
  | "conversation"
  | "shortlet"
  | "builder_project"
  | "report"
  | "notification"
  | "subscription"
  | "admin_role"
  | "verification"
  | "organization";

export type PermifyPermission =
  | "view"
  | "edit"
  | "delete"
  | "create"
  | "manage"
  | "approve"
  | "reject"
  | "book"
  | "cancel"
  | "download"
  | "share"
  | "initiate"
  | "process"
  | "refund"
  | "send"
  | "report"
  | "moderate"
  | "view_all_properties"
  | "view_all_users"
  | "view_all_transactions"
  | "moderate_content"
  | "manage_users"
  | "manage_system"
  | "view_analytics"
  | "export_data";

export interface PermifyCheckRequest {
  entity: PermifyEntity;
  entityId: string;
  permission: PermifyPermission;
  subjectId: string;
  subjectType?: string;
}

export interface PermifyRelationshipRequest {
  entity: PermifyEntity;
  entityId: string;
  relation: string;
  subjectId: string;
  subjectType?: string;
}

// ==================== HTTP CLIENT ====================

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (PERMIFY_API_KEY) {
    headers["Authorization"] = `Bearer ${PERMIFY_API_KEY}`;
  }
  return headers;
}

/**
 * Checks if a subject has a specific permission on an entity via Permify API.
 * Returns null if Permify is not configured.
 */
async function permifyCheck(
  req: PermifyCheckRequest
): Promise<boolean | null> {
  if (!PERMIFY_ENDPOINT) return null;

  try {
    const url = `${PERMIFY_ENDPOINT}/v1/tenants/${PERMIFY_TENANT_ID}/permissions/check`;
    const body = {
      metadata: { schema_version: "", snap_token: "", depth: 20 },
      entity: { type: req.entity, id: req.entityId },
      permission: req.permission,
      subject: {
        type: req.subjectType ?? "user",
        id: req.subjectId,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (!response.ok) {
      console.warn(`[Permify] Check failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as { can: string };
    return data.can === "RESULT_ALLOWED";
  } catch (error) {
    console.warn(`[Permify] Check error:`, error);
    return null;
  }
}

/**
 * Writes a relationship tuple to Permify.
 */
async function permifyWriteRelationship(
  req: PermifyRelationshipRequest
): Promise<boolean> {
  if (!PERMIFY_ENDPOINT) return false;

  try {
    const url = `${PERMIFY_ENDPOINT}/v1/tenants/${PERMIFY_TENANT_ID}/relationships/write`;
    const body = {
      metadata: { schema_version: "" },
      tuples: [
        {
          entity: { type: req.entity, id: req.entityId },
          relation: req.relation,
          subject: {
            type: req.subjectType ?? "user",
            id: req.subjectId,
          },
        },
      ],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });

    return response.ok;
  } catch (error) {
    console.warn(`[Permify] Write relationship error:`, error);
    return false;
  }
}

/**
 * Deletes a relationship tuple from Permify.
 */
async function permifyDeleteRelationship(
  req: PermifyRelationshipRequest
): Promise<boolean> {
  if (!PERMIFY_ENDPOINT) return false;

  try {
    const url = `${PERMIFY_ENDPOINT}/v1/tenants/${PERMIFY_TENANT_ID}/relationships/delete`;
    const body = {
      filter: {
        entity: { type: req.entity, id: req.entityId },
        relation: req.relation,
        subject: {
          type: req.subjectType ?? "user",
          id: req.subjectId,
        },
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });

    return response.ok;
  } catch (error) {
    console.warn(`[Permify] Delete relationship error:`, error);
    return false;
  }
}

// ==================== PUBLIC API ====================

/**
 * Checks if a user has a specific permission on an entity.
 *
 * Falls back to `fallback` result if Permify is not configured or returns an error.
 * This ensures the system remains functional without Permify.
 *
 * @example
 * const canEdit = await checkPermission({
 *   entity: "property",
 *   entityId: "123",
 *   permission: "edit",
 *   subjectId: user.openId,
 *   fallback: user.role === "admin",
 * });
 */
export async function checkPermission(
  req: PermifyCheckRequest & { fallback?: boolean }
): Promise<boolean> {
  const result = await permifyCheck(req);
  if (result !== null) return result;
  // Fallback when Permify is not available
  return req.fallback ?? false;
}

/**
 * Grants a relationship between a user and an entity in Permify.
 * Used when creating resources (e.g., user becomes owner of a new property).
 */
export async function grantRelationship(
  req: PermifyRelationshipRequest
): Promise<void> {
  const success = await permifyWriteRelationship(req);
  if (!success && PERMIFY_ENDPOINT) {
    console.warn(`[Permify] Failed to write relationship: ${req.entity}:${req.entityId}#${req.relation}@${req.subjectId}`);
  }
}

/**
 * Revokes a relationship between a user and an entity in Permify.
 */
export async function revokeRelationship(
  req: PermifyRelationshipRequest
): Promise<void> {
  const success = await permifyDeleteRelationship(req);
  if (!success && PERMIFY_ENDPOINT) {
    console.warn(`[Permify] Failed to delete relationship: ${req.entity}:${req.entityId}#${req.relation}@${req.subjectId}`);
  }
}

/**
 * Returns true if Permify integration is configured.
 */
export function isPermifyConfigured(): boolean {
  return Boolean(PERMIFY_ENDPOINT);
}

// ==================== CONVENIENCE HELPERS ====================

/**
 * Checks if a user can view a property.
 */
export async function canViewProperty(
  userId: string,
  propertyId: string,
  isPublicProperty = true
): Promise<boolean> {
  return checkPermission({
    entity: "property",
    entityId: propertyId,
    permission: "view",
    subjectId: userId,
    fallback: isPublicProperty, // Public properties are viewable by default
  });
}

/**
 * Checks if a user can edit a property.
 */
export async function canEditProperty(
  userId: string,
  propertyId: string,
  isOwner = false
): Promise<boolean> {
  return checkPermission({
    entity: "property",
    entityId: propertyId,
    permission: "edit",
    subjectId: userId,
    fallback: isOwner,
  });
}

/**
 * Checks if a user can view a transaction.
 */
export async function canViewTransaction(
  userId: string,
  transactionId: string,
  isParticipant = false
): Promise<boolean> {
  return checkPermission({
    entity: "transaction",
    entityId: transactionId,
    permission: "view",
    subjectId: userId,
    fallback: isParticipant,
  });
}

/**
 * Checks if a user has admin-level access.
 */
export async function isAdmin(
  userId: string,
  userRole?: string
): Promise<boolean> {
  return checkPermission({
    entity: "admin_role",
    entityId: "global",
    permission: "view_all_properties",
    subjectId: userId,
    fallback: userRole === "admin",
  });
}

/**
 * Sets up ownership relationship when a user creates a property.
 * Call this after inserting a new property into the database.
 */
export async function setupPropertyOwnership(
  userId: string,
  propertyId: string
): Promise<void> {
  await grantRelationship({
    entity: "property",
    entityId: propertyId,
    relation: "owner",
    subjectId: userId,
  });
}

/**
 * Sets up transaction relationships for buyer and seller.
 * Call this after creating a new transaction.
 */
export async function setupTransactionRelationships(
  transactionId: string,
  buyerId: string,
  sellerId: string
): Promise<void> {
  await Promise.all([
    grantRelationship({
      entity: "transaction",
      entityId: transactionId,
      relation: "buyer",
      subjectId: buyerId,
    }),
    grantRelationship({
      entity: "transaction",
      entityId: transactionId,
      relation: "seller",
      subjectId: sellerId,
    }),
  ]);
}
