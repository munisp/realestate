import { eq, and, gte, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  savedSearches,
  properties,
  users,
  type SavedSearch,
} from "../../drizzle/schema";

/**
 * Saved Search Alerts Service
 * Handles matching new listings against saved searches and sending alerts
 */

interface SearchCriteria {
  city?: string;
  state?: string;
  propertyType?: string;
  listingType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  minSquareFeet?: number;
  maxSquareFeet?: number;
}

interface PropertyMatch {
  property: any;
  savedSearch: SavedSearch;
  user: any;
}

/**
 * Check if a property matches search criteria
 */
function matchesCriteria(property: any, criteria: SearchCriteria): boolean {
  if (criteria.city && property.city !== criteria.city) return false;
  if (criteria.state && property.state !== criteria.state) return false;
  if (criteria.propertyType && property.propertyType !== criteria.propertyType) return false;
  if (criteria.listingType && property.listingType !== criteria.listingType) return false;
  
  if (criteria.minPrice && property.price < criteria.minPrice) return false;
  if (criteria.maxPrice && property.price > criteria.maxPrice) return false;
  
  if (criteria.minBedrooms && property.bedrooms < criteria.minBedrooms) return false;
  if (criteria.minBathrooms && property.bathrooms < criteria.minBathrooms) return false;
  
  if (criteria.minSquareFeet && property.squareFeet < criteria.minSquareFeet) return false;
  if (criteria.maxSquareFeet && property.squareFeet > criteria.maxSquareFeet) return false;
  
  return true;
}

/**
 * Find saved searches that match a new property
 */
export async function findMatchingSavedSearches(propertyId: number): Promise<PropertyMatch[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the property
  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, propertyId));

  if (!property) return [];

  // Get all active saved searches with notifications enabled
  const searches = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.notificationsEnabled, 1));

  const matches: PropertyMatch[] = [];

  for (const search of searches) {
    try {
      const criteria: SearchCriteria = JSON.parse(search.searchCriteria);
      
      if (matchesCriteria(property, criteria)) {
        // Get user info
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, search.userId));

        if (user) {
          matches.push({
            property,
            savedSearch: search,
            user,
          });
        }
      }
    } catch (error) {
      console.error(`Error parsing search criteria for search ${search.id}:`, error);
    }
  }

  return matches;
}

/**
 * Get new properties since last notification for a saved search
 */
export async function getNewPropertiesForSearch(
  searchId: number
): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [search] = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.id, searchId));

  if (!search) return [];

  const criteria: SearchCriteria = JSON.parse(search.searchCriteria);
  const lastNotified = search.lastNotified || new Date(0);

  // Build query based on criteria
  let query = db.select().from(properties);
  
  const conditions: any[] = [
    gte(properties.createdAt, lastNotified),
    eq(properties.status, "active"),
  ];

  if (criteria.city) conditions.push(eq(properties.city, criteria.city));
  if (criteria.state) conditions.push(eq(properties.state, criteria.state));
  if (criteria.propertyType) conditions.push(eq(properties.propertyType, criteria.propertyType as any));
  if (criteria.listingType) conditions.push(eq(properties.listingType, criteria.listingType as any));

  const allProperties = await query.where(and(...conditions));

  // Filter by additional criteria
  return allProperties.filter((property) => matchesCriteria(property, criteria));
}

/**
 * Update last notified timestamp for a saved search
 */
export async function updateLastNotified(searchId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(savedSearches)
    .set({ lastNotified: new Date() })
    .where(eq(savedSearches.id, searchId));
}

/**
 * Get all saved searches that need daily/weekly digests
 */
export async function getSavedSearchesForDigest(): Promise<SavedSearch[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get searches that haven't been notified in the last 24 hours
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);

  return db
    .select()
    .from(savedSearches)
    .where(
      and(
        eq(savedSearches.notificationsEnabled, 1),
        or(
          sql`${savedSearches.lastNotified} IS NULL`,
          sql`${savedSearches.lastNotified} < ${oneDayAgo}`
        )
      )
    );
}

/**
 * Get user's saved searches
 */
export async function getUserSavedSearches(userId: number): Promise<SavedSearch[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, userId))
    .orderBy(sql`${savedSearches.createdAt} DESC`);
}

/**
 * Create a saved search
 */
export async function createSavedSearch(
  userId: number,
  name: string,
  criteria: SearchCriteria,
  notificationsEnabled: boolean = true
): Promise<SavedSearch> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [search] = await db
    .insert(savedSearches)
    .values({
      userId,
      name,
      searchCriteria: JSON.stringify(criteria),
      notificationsEnabled: notificationsEnabled ? 1 : 0,
    })
    .$returningId();

  const [created] = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.id, search.id));

  return created;
}

/**
 * Update saved search notification preferences
 */
export async function updateNotificationPreferences(
  searchId: number,
  enabled: boolean
): Promise<SavedSearch> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(savedSearches)
    .set({ notificationsEnabled: enabled ? 1 : 0 })
    .where(eq(savedSearches.id, searchId));

  const [updated] = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.id, searchId));

  return updated;
}

/**
 * Delete a saved search
 */
export async function deleteSavedSearch(searchId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(savedSearches).where(eq(savedSearches.id, searchId));
}
