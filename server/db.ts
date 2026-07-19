import { eq, desc, and, sql, like, gte, lte, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { 
  InsertUser, users,
  properties, InsertProperty,
  valuations, InsertValuation,
  transactions, InsertTransaction,
  payments, InsertPayment,
  favorites, InsertFavorite,
  savedSearches, InsertSavedSearch,
  propertyViews, InsertPropertyView,
  agents, InsertAgent,
  propertyComparisons, InsertPropertyComparison,
  messages, InsertMessage,
  searchAlerts, InsertSearchAlert,
  notifications, InsertNotification,
  virtualTours, InsertVirtualTour,
  documents, InsertDocument,
  builders, InsertBuilder,
  builderProjects, InsertBuilderProject,
  projectMilestones, InsertProjectMilestone,
  builderReviews, InsertBuilderReview,
  shortLetProperties, InsertShortLetProperty,
  shortLetBookings, InsertShortLetBooking,
  appointments, InsertAppointment,
  agentAvailability, InsertAgentAvailability,
  userActivity, InsertUserActivity,
  buyerProfiles, InsertBuyerProfile,
  buyerIntentSignals, InsertBuyerIntentSignal,
  propertyReports,
  userReports,
  reviewReports,
  moderationActions,
  propertyApprovals,
  escrowAccounts,
  escrowMilestones,
  escrowTransactions,
  escrowDisputes
} from "../drizzle/schema";
import { cofOVerificationHistory, InsertCofOVerificationHistory } from "../drizzle/schema-land-records";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Property queries
export async function createProperty(property: InsertProperty) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(properties).values(property).returning({ id: properties.id })
  return result.id;
}

export async function getPropertyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateProperty(id: number, updates: Partial<InsertProperty>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(properties).set(updates).where(eq(properties.id, id));
}

export async function deleteProperty(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(properties).where(eq(properties.id, id));
}

export async function searchProperties(filters: {
  city?: string;
  state?: string;
  propertyType?: string;
  listingType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  // Build filter conditions
  const conditions = [];
  if (filters.city)         conditions.push(eq(properties.city, filters.city));
  if (filters.state)        conditions.push(eq(properties.state, filters.state));
  if (filters.status)       conditions.push(eq(properties.status, filters.status as any));
  if (filters.propertyType) conditions.push(eq(properties.propertyType, filters.propertyType as any));
  if (filters.listingType)  conditions.push(eq(properties.listingType, filters.listingType as any));
  if (filters.minPrice)     conditions.push(gte(properties.price, filters.minPrice.toString()));
  if (filters.maxPrice)     conditions.push(lte(properties.price, filters.maxPrice.toString()));
  if (filters.minBedrooms)  conditions.push(gte(properties.bedrooms, filters.minBedrooms));
  if (filters.minBathrooms) conditions.push(gte(properties.bathrooms, filters.minBathrooms.toString()));

  const limit  = Math.min(filters.limit  ?? 20, 100); // cap at 100
  const offset = filters.offset ?? 0;

  const baseQuery = db.select().from(properties);
  const filteredQuery = conditions.length > 0
    ? baseQuery.where(and(...conditions))
    : baseQuery;

  return await filteredQuery.limit(limit).offset(offset);
}

export async function getNearbyProperties(lat: number, lng: number, radiusMiles: number = 5) {
  const db = await getDb();
  if (!db) return [];
  
  // Simple distance calculation using Haversine formula approximation
  // For production, use PostGIS or spatial index
  const latDiff = radiusMiles / 69; // 1 degree latitude ≈ 69 miles
  const lngDiff = radiusMiles / (69 * Math.cos(lat * Math.PI / 180));
  
  const minLat = (lat - latDiff).toString();
  const maxLat = (lat + latDiff).toString();
  const minLng = (lng - lngDiff).toString();
  const maxLng = (lng + lngDiff).toString();
  
  const result = await db.select().from(properties)
    .where(eq(properties.status, 'active'))
    .limit(50);
  
  return result.filter(p => {
    const pLat = parseFloat(p.latitude);
    const pLng = parseFloat(p.longitude);
    return pLat >= parseFloat(minLat) && pLat <= parseFloat(maxLat) &&
           pLng >= parseFloat(minLng) && pLng <= parseFloat(maxLng);
  });
}

export async function incrementPropertyViews(propertyId: number) {
  const db = await getDb();
  if (!db) return;
  
  // Fetch current property
  const property = await getPropertyById(propertyId);
  if (!property) return;
  
  await db.update(properties)
    .set({ viewCount: (property.viewCount || 0) + 1 })
    .where(eq(properties.id, propertyId));
}

// Valuation queries
export async function createValuation(valuation: InsertValuation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(valuations).values(valuation).returning({ id: valuations.id })
  return result.id;
}

export async function getPropertyValuations(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(valuations)
    .where(eq(valuations.propertyId, propertyId))
    .orderBy(valuations.createdAt);
}

export async function getLatestValuation(propertyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(valuations)
    .where(eq(valuations.propertyId, propertyId))
    .orderBy(valuations.createdAt)
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

// Transaction queries
export async function createTransaction(transaction: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(transactions).values(transaction).returning({ id: transactions.id })
  return result.id;
}

export async function getTransactionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserTransactions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(transactions)
    .orderBy(transactions.createdAt);
}

export async function updateTransaction(id: number, updates: Partial<InsertTransaction>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(transactions).set(updates).where(eq(transactions.id, id));
}

// Payment queries
export async function createPayment(payment: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(payments).values(payment).returning({ id: payments.id })
  return result.id;
}

export async function getPaymentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTransactionPayments(transactionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(payments)
    .where(eq(payments.transactionId, transactionId))
    .orderBy(payments.createdAt);
}

export async function updatePayment(id: number, updates: Partial<InsertPayment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(payments).set(updates).where(eq(payments.id, id));
}

// Favorites queries
export async function addFavorite(userId: number, propertyId: number, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(favorites).values({ userId, propertyId, notes }).returning({ id: favorites.id })
  return result.id;
}

export async function removeFavorite(userId: number, propertyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)));
}

export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(favorites)
    .where(eq(favorites.userId, userId))
    .orderBy(favorites.createdAt);
}

// Saved searches queries
export async function createSavedSearch(search: InsertSavedSearch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(savedSearches).values(search).returning({ id: savedSearches.id })
  return result.id;
}

export async function getUserSavedSearches(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(savedSearches)
    .where(eq(savedSearches.userId, userId))
    .orderBy(savedSearches.createdAt);
}

export async function deleteSavedSearch(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(savedSearches).where(eq(savedSearches.id, id));
}

// Property views queries
export async function trackPropertyView(view: InsertPropertyView) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(propertyViews).values(view);
  await incrementPropertyViews(view.propertyId);
}

export async function getPropertyViewStats(propertyId: number) {
  const db = await getDb();
  if (!db) return { total: 0, unique: 0 };
  
  const views = await db.select().from(propertyViews)
    .where(eq(propertyViews.propertyId, propertyId));
  
  const uniqueUsers = new Set(views.filter(v => v.userId).map(v => v.userId));
  
  return {
    total: views.length,
    unique: uniqueUsers.size,
  };
}

// Agent queries
export async function createAgent(agent: InsertAgent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(agents).values(agent).returning({ id: agents.id })
  return result.id;
}

export async function getAgentByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateAgent(id: number, updates: Partial<InsertAgent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(agents).set(updates).where(eq(agents.id, id));
}

export async function getAllAgents() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(agents).orderBy(desc(agents.rating));
}

// Property Comparisons
export async function createComparison(comparison: InsertPropertyComparison) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(propertyComparisons).values(comparison).returning({ id: propertyComparisons.id })
  return result.id;
}

export async function getUserComparisons(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(propertyComparisons)
    .where(eq(propertyComparisons.userId, userId))
    .orderBy(desc(propertyComparisons.createdAt));
}

export async function getComparisonById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(propertyComparisons)
    .where(eq(propertyComparisons.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteComparison(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(propertyComparisons).where(eq(propertyComparisons.id, id));
}

// Messages
export async function createMessage(message: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(messages).values(message).returning({ id: messages.id })
  return result.id;
}

export async function getUserMessages(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(messages)
    .where(sql`${messages.senderId} = ${userId} OR ${messages.receiverId} = ${userId}`)
    .orderBy(desc(messages.createdAt));
}

export async function getConversation(userId1: number, userId2: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(messages)
    .where(
      sql`(${messages.senderId} = ${userId1} AND ${messages.receiverId} = ${userId2}) OR (${messages.senderId} = ${userId2} AND ${messages.receiverId} = ${userId1})`
    )
    .orderBy(desc(messages.createdAt));
}

export async function markMessageAsRead(messageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(messages)
    .set({ isRead: 1, readAt: new Date() })
    .where(eq(messages.id, messageId));
}

export async function getUnreadCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(and(eq(messages.receiverId, userId), eq(messages.isRead, 0)));
  
  return result[0]?.count || 0;
}

// Search Alerts
export async function createSearchAlert(alert: InsertSearchAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(searchAlerts).values(alert).returning({ id: searchAlerts.id })
  return result.id;
}

export async function getUserSearchAlerts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(searchAlerts)
    .where(eq(searchAlerts.userId, userId))
    .orderBy(desc(searchAlerts.createdAt));
}

export async function updateSearchAlert(id: number, updates: Partial<InsertSearchAlert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(searchAlerts).set(updates).where(eq(searchAlerts.id, id));
}

export async function deleteSearchAlert(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(searchAlerts).where(eq(searchAlerts.id, id));
}

// Notifications
export async function createNotification(notification: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(notifications).values(notification).returning({ id: notifications.id })
  return result.id;
}

export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notifications)
    .set({ isRead: 1, readAt: new Date() })
    .where(eq(notifications.id, notificationId));
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
  
  return result[0]?.count || 0;
}

// Virtual Tours
export async function createVirtualTour(tour: InsertVirtualTour) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(virtualTours).values(tour).returning({ id: virtualTours.id })
  return result.id;
}

export async function getPropertyVirtualTours(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(virtualTours)
    .where(eq(virtualTours.propertyId, propertyId))
    .orderBy(desc(virtualTours.createdAt));
}

export async function deleteVirtualTour(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(virtualTours).where(eq(virtualTours.id, id));
}

// Documents
export async function createDocument(document: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(documents).values(document).returning({ id: documents.id })
  return result.id;
}

export async function getTransactionDocuments(transactionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(documents)
    .where(eq(documents.transactionId, transactionId))
    .orderBy(desc(documents.createdAt));
}

export async function getPropertyDocuments(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(documents)
    .where(eq(documents.propertyId, propertyId))
    .orderBy(desc(documents.createdAt));
}

export async function updateDocument(id: number, updates: Partial<InsertDocument>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(documents).set(updates).where(eq(documents.id, id));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(documents).where(eq(documents.id, id));
}

// ============================================================================
// Builder Functions
// ============================================================================

export async function getBuilderByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(builders).where(eq(builders.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBuilderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(builders).where(eq(builders.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllVerifiedBuilders() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(builders)
    .where(eq(builders.verificationStatus, 'verified'))
    .orderBy(desc(builders.trustScore));
}

export async function getBuilderProjects(builderId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(builderProjects)
    .where(eq(builderProjects.builderId, builderId))
    .orderBy(desc(builderProjects.createdAt));
}

export async function getBuilderProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(builderProjects).where(eq(builderProjects.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPublishedBuilderProjects() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(builderProjects)
    .where(eq(builderProjects.status, 'published'))
    .orderBy(desc(builderProjects.publishedAt));
}

export async function getProjectMilestones(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(projectMilestones)
    .where(eq(projectMilestones.projectId, projectId))
    .orderBy(projectMilestones.milestoneNumber);
}

export async function getBuilderReviews(builderId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(builderReviews)
    .where(
      and(
        eq(builderReviews.builderId, builderId),
        eq(builderReviews.status, 'published')
      )
    )
    .orderBy(desc(builderReviews.createdAt));
}

export async function getAllBuilders() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(builders)
    .orderBy(desc(builders.createdAt));
}

export async function createBuilder(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(builders).values(data);
  return { id: result.id };
}

export async function updateBuilderDocument(builderId: number, documentType: string, url: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updates: any = {};
  if (documentType === "cac_certificate") updates.cacCertificate = url;
  if (documentType === "building_license") updates.buildingLicense = url;
  if (documentType === "portfolio") updates.portfolio = url;

  await db.update(builders).set(updates).where(eq(builders.id, builderId));
}

export async function updateBuilderVerificationStatus(builderId: number, status: string, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updates: any = { verificationStatus: status };
  if (notes) updates.verificationNotes = notes;
  if (status === "verified") updates.verifiedAt = new Date();

  await db.update(builders).set(updates).where(eq(builders.id, builderId));
  return { success: true };
}

// ============================================================================
// Short-let Functions
// ============================================================================

export async function getShortLetProperties() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(shortLetProperties)
    .where(eq(shortLetProperties.status, 'active'))
    .orderBy(desc(shortLetProperties.createdAt));
}

export async function getShortLetPropertyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(shortLetProperties).where(eq(shortLetProperties.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getShortLetByPropertyId(propertyId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(shortLetProperties).where(eq(shortLetProperties.propertyId, propertyId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getHostShortLets(hostId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(shortLetProperties)
    .where(eq(shortLetProperties.hostId, hostId))
    .orderBy(desc(shortLetProperties.createdAt));
}

export async function getShortLetBookings(propertyId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(shortLetBookings)
    .where(eq(shortLetBookings.propertyId, propertyId))
    .orderBy(desc(shortLetBookings.checkIn));
}

export async function getGuestBookings(guestId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(shortLetBookings)
    .where(eq(shortLetBookings.guestId, guestId))
    .orderBy(desc(shortLetBookings.checkIn));
}

export async function getHostBookings(hostId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(shortLetBookings)
    .where(eq(shortLetBookings.hostId, hostId))
    .orderBy(desc(shortLetBookings.checkIn));
}

// ============================================================================
// Short-let Bookings
// ============================================================================

export async function getShortLetBookingsByProperty(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select().from(shortLetBookings)
    .where(eq(shortLetBookings.propertyId, propertyId))
    .orderBy(desc(shortLetBookings.createdAt));
  
  return results;
}



// Property Recommendations
export async function getSimilarProperties(propertyId: number, limit: number = 6) {
  const db = await getDb();
  if (!db) return [];

  // Get the reference property
  const [refProperty] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
  if (!refProperty) return [];

  // Find similar properties based on:
  // 1. Same city or state
  // 2. Similar price range (+/- 30%)
  // 3. Similar bedrooms (+/- 1)
  // 4. Same property type
  const priceMin = refProperty.price * 0.7;
  const priceMax = refProperty.price * 1.3;

  const similar = await db
    .select()
    .from(properties)
    .where(
      and(
        ne(properties.id, propertyId),
        eq(properties.status, "available"),
        or(
          eq(properties.city, refProperty.city),
          eq(properties.state, refProperty.state)
        )
      )
    )
    .limit(limit * 3); // Get more to filter

  // Score and sort by similarity
  const scored = similar.map(prop => {
    let score = 0;
    
    // Location match (highest weight)
    if (prop.city === refProperty.city) score += 40;
    else if (prop.state === refProperty.state) score += 20;
    
    // Price similarity
    if (prop.price >= priceMin && prop.price <= priceMax) score += 30;
    
    // Bedrooms similarity
    if (prop.bedrooms === refProperty.bedrooms) score += 15;
    else if (Math.abs((prop.bedrooms || 0) - (refProperty.bedrooms || 0)) === 1) score += 10;
    
    // Property type match
    if (prop.propertyType === refProperty.propertyType) score += 15;

    return { ...prop, similarityScore: score };
  });

  // Sort by score and return top matches
  return scored
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}

export async function getRecommendedProperties(userId: number, limit: number = 6) {
  const db = await getDb();
  if (!db) return [];

  // Get user's favorites and views to understand preferences
  const userFavorites = await db
    .select({ propertyId: favorites.propertyId })
    .from(favorites)
    .where(eq(favorites.userId, userId))
    .limit(10);

  const userViews = await db
    .select({ propertyId: propertyViews.propertyId })
    .from(propertyViews)
    .where(eq(propertyViews.userId, userId))
    .orderBy(desc(propertyViews.viewedAt))
    .limit(20);

  const interactedPropertyIds = [
    ...userFavorites.map(f => f.propertyId),
    ...userViews.map(v => v.propertyId),
  ];

  if (interactedPropertyIds.length === 0) {
    // No history - return popular properties
    return await db
      .select()
      .from(properties)
      .where(eq(properties.status, "available"))
      .orderBy(desc(properties.createdAt))
      .limit(limit);
  }

  // Get properties user interacted with
  const interactedProperties = await db
    .select()
    .from(properties)
    .where(
      and(
        sql`${properties.id} IN (${sql.join(interactedPropertyIds.map(id => sql`${id}`), sql`, `)})`,
        eq(properties.status, "available")
      )
    );

  if (interactedProperties.length === 0) {
    return await db
      .select()
      .from(properties)
      .where(eq(properties.status, "available"))
      .limit(limit);
  }

  // Calculate average preferences
  const avgPrice = interactedProperties.reduce((sum, p) => sum + p.price, 0) / interactedProperties.length;
  const avgBedrooms = interactedProperties.reduce((sum, p) => sum + (p.bedrooms || 0), 0) / interactedProperties.length;
  const commonCity = interactedProperties.reduce((acc, p) => {
    acc[p.city] = (acc[p.city] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const preferredCity = Object.entries(commonCity).sort(([,a], [,b]) => b - a)[0]?.[0];

  // Find recommendations based on preferences
  const priceMin = avgPrice * 0.6;
  const priceMax = avgPrice * 1.4;

  const recommendations = await db
    .select()
    .from(properties)
    .where(
      and(
        sql`${properties.id} NOT IN (${sql.join(interactedPropertyIds.map(id => sql`${id}`), sql`, `)})`,
        eq(properties.status, "available")
      )
    )
    .limit(limit * 3);

  // Score recommendations
  const scored = recommendations.map(prop => {
    let score = 0;
    
    if (prop.city === preferredCity) score += 40;
    if (prop.price >= priceMin && prop.price <= priceMax) score += 30;
    if (Math.abs((prop.bedrooms || 0) - avgBedrooms) <= 1) score += 20;
    if (prop.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) score += 10; // Recent listings

    return { ...prop, recommendationScore: score };
  });

  return scored
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
}

export async function getRecentPropertyViews(propertyIds: number[], limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  try {
    if (propertyIds.length === 0) return [];
    
    const views = await db
      .select()
      .from(propertyViews)
      .where(sql`${propertyViews.propertyId} IN (${sql.join(propertyIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(desc(propertyViews.viewedAt))
      .limit(limit);

    return views;
  } catch (error) {
    console.error("[Database] Failed to get recent property views:", error);
    return [];
  }
}

export async function getPropertiesByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(properties)
      .where(eq(properties.ownerId, ownerId))
      .orderBy(desc(properties.createdAt));

    return result;
  } catch (error) {
    console.error("[Database] Failed to get properties by owner:", error);
    return [];
  }
}

// Appointments
export async function createAppointment(appointment: InsertAppointment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(appointments).values(appointment).returning({ id: appointments.id })
  return result.id;
}

export async function getAppointmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAppointments(filters: {
  propertyId?: number;
  buyerId?: number;
  agentId?: number;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(appointments);
  
  const conditions = [];
  if (filters.propertyId) conditions.push(eq(appointments.propertyId, filters.propertyId));
  if (filters.buyerId) conditions.push(eq(appointments.buyerId, filters.buyerId));
  if (filters.agentId) conditions.push(eq(appointments.agentId, filters.agentId));
  if (filters.status) conditions.push(eq(appointments.status, filters.status as any));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return await query.orderBy(desc(appointments.appointmentDate));
}

export async function updateAppointment(id: number, updates: Partial<InsertAppointment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(appointments).set(updates).where(eq(appointments.id, id));
}

export async function getUpcomingAppointments(beforeDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(appointments)
    .where(
      and(
        sql`${appointments.appointmentDate} <= ${beforeDate}`,
        sql`${appointments.appointmentDate} >= NOW()`,
        eq(appointments.status, 'confirmed')
      )
    )
    .orderBy(appointments.appointmentDate);
}

// Agent Availability
export async function getAgentAvailability(agentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(agentAvailability)
    .where(and(
      eq(agentAvailability.agentId, agentId),
      eq(agentAvailability.isAvailable, 1)
    ))
    .orderBy(agentAvailability.dayOfWeek);
}

export async function setAgentAvailability(agentId: number, availability: InsertAgentAvailability[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete existing availability
  await db.delete(agentAvailability).where(eq(agentAvailability.agentId, agentId));
  
  // Insert new availability
  if (availability.length > 0) {
    await db.insert(agentAvailability).values(availability);
  }
}

// User Activity Tracking
export async function trackUserActivity(activity: InsertUserActivity) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(userActivity).values(activity);
}

export async function getUserActivities(userId: number, daysBack: number = 90) {
  const db = await getDb();
  if (!db) return [];
  
  const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  
  return await db.select().from(userActivity)
    .where(
      and(
        eq(userActivity.userId, userId),
        sql`${userActivity.timestamp} >= ${cutoffDate}`
      )
    )
    .orderBy(desc(userActivity.timestamp));
}

// Buyer Profiles
export async function getBuyerProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(buyerProfiles)
    .where(eq(buyerProfiles.userId, userId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertBuyerProfile(profile: InsertBuyerProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getBuyerProfile(profile.userId);
  
  if (existing) {
    await db.update(buyerProfiles)
      .set(profile)
      .where(eq(buyerProfiles.userId, profile.userId));
  } else {
    await db.insert(buyerProfiles).values(profile);
  }
}

// Buyer Intent Signals
export async function trackIntentSignal(signal: InsertBuyerIntentSignal) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(buyerIntentSignals).values(signal);
}

export async function getBuyerIntentSignals(userId: number, daysBack: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  
  return await db.select().from(buyerIntentSignals)
    .where(
      and(
        eq(buyerIntentSignals.userId, userId),
        sql`${buyerIntentSignals.timestamp} >= ${cutoffDate}`
      )
    )
    .orderBy(desc(buyerIntentSignals.timestamp));
}

export async function calculateBuyerIntent(userId: number): Promise<number> {
  const signals = await getBuyerIntentSignals(userId);
  
  const weights: Record<string, number> = {
    repeat_view: 5,
    long_view: 3,
    favorite: 10,
    inquiry: 20,
    comparison: 15,
    download_docs: 12,
    mortgage_calc: 18,
  };
  
  let score = 0;
  for (const signal of signals) {
    score += (weights[signal.signalType] || 0) * signal.weight;
  }
  
  // Normalize to 0-100
  return Math.min(100, score);
}


// ============================================================================
// Document Management Functions
// ============================================================================

export async function getUserDocuments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.createdAt));
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  
  return result[0];
}

export async function getDocumentsByCategory(userId: number, category: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(documents)
    .where(
      and(
        eq(documents.userId, userId),
        sql`${documents.category} = ${category}`
      )
    )
    .orderBy(desc(documents.createdAt));
}

// ============================================================================
// Admin Moderation Functions
// ============================================================================

export async function getPendingPropertyReports() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    report: propertyReports,
    property: properties,
    reporter: users
  })
    .from(propertyReports)
    .leftJoin(properties, eq(propertyReports.propertyId, properties.id))
    .leftJoin(users, eq(propertyReports.reportedByUserId, users.id))
    .where(eq(propertyReports.status, 'pending'))
    .orderBy(desc(propertyReports.createdAt));
}

export async function getPendingUserReports() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    report: userReports,
    reportedUser: users,
  })
    .from(userReports)
    .leftJoin(users, eq(userReports.reportedUserId, users.id))
    .where(eq(userReports.status, 'pending'))
    .orderBy(desc(userReports.createdAt));
}

export async function getPendingReviewReports() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(reviewReports)
    .where(eq(reviewReports.status, 'pending'))
    .orderBy(desc(reviewReports.createdAt));
}

export async function updatePropertyReportStatus(
  reportId: number, 
  status: string, 
  adminId: number, 
  reviewNotes?: string,
  action?: string
) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(propertyReports)
    .set({
      status: status as any,
      reviewedByAdminId: adminId,
      reviewNotes,
      action: action as any,
      resolvedAt: status === 'resolved' ? new Date() : undefined
    })
    .where(eq(propertyReports.id, reportId));
}

export async function updateUserReportStatus(
  reportId: number, 
  status: string, 
  adminId: number, 
  reviewNotes?: string,
  action?: string
) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(userReports)
    .set({
      status: status as any,
      reviewedByAdminId: adminId,
      reviewNotes,
      action: action as any,
      resolvedAt: status === 'resolved' ? new Date() : undefined
    })
    .where(eq(userReports.id, reportId));
}

export async function logModerationAction(action: {
  adminId: number;
  actionType: string;
  targetType: string;
  targetId: number;
  reason?: string;
  notes?: string;
  metadata?: any;
}) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(moderationActions).values({
    ...action,
    actionType: action.actionType as any,
    targetType: action.targetType as any,
    metadata: action.metadata ? JSON.stringify(action.metadata) : undefined
  });
}

export async function getPendingPropertyApprovals() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    approval: propertyApprovals,
    property: properties
  })
    .from(propertyApprovals)
    .leftJoin(properties, eq(propertyApprovals.propertyId, properties.id))
    .where(eq(propertyApprovals.status, 'pending'))
    .orderBy(desc(propertyApprovals.submittedAt));
}

export async function updatePropertyApprovalStatus(
  approvalId: number,
  status: string,
  adminId: number,
  reviewNotes?: string,
  rejectionReason?: string
) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(propertyApprovals)
    .set({
      status: status as any,
      reviewedByAdminId: adminId,
      reviewNotes,
      rejectionReason,
      reviewedAt: new Date()
    })
    .where(eq(propertyApprovals.id, approvalId));
}

// ============================================================================
// Escrow System Functions
// ============================================================================

export async function createEscrowAccount(escrow: {
  transactionId: number;
  propertyId: number;
  buyerId: number;
  sellerId: number;
  totalAmount: number;
  heldAmount: number;
}) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.insert(escrowAccounts).values(escrow);
  return result[0];
}

export async function getEscrowByTransactionId(transactionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(escrowAccounts)
    .where(eq(escrowAccounts.transactionId, transactionId))
    .limit(1);
  
  return result[0];
}

export async function getEscrowById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(escrowAccounts)
    .where(eq(escrowAccounts.id, id))
    .limit(1);
  
  return result[0];
}

export async function updateEscrowStatus(
  escrowId: number, 
  status: string,
  updates?: {
    releasedAmount?: number;
    refundedAmount?: number;
    completedAt?: Date;
  }
) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(escrowAccounts)
    .set({
      status: status as any,
      ...updates
    })
    .where(eq(escrowAccounts.id, escrowId));
}

export async function getEscrowMilestones(escrowAccountId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(escrowMilestones)
    .where(eq(escrowMilestones.escrowAccountId, escrowAccountId))
    .orderBy(escrowMilestones.sequence);
}

export async function createEscrowMilestone(milestone: any) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.insert(escrowMilestones).values(milestone);
  return result[0];
}

export async function updateMilestoneStatus(
  milestoneId: number,
  status: string,
  updates?: {
    completedAt?: Date;
    releasedAt?: Date;
    approvedByBuyer?: number;
    approvedBySeller?: number;
    approvedByInspector?: number;
  }
) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(escrowMilestones)
    .set({
      status: status as any,
      ...updates
    })
    .where(eq(escrowMilestones.id, milestoneId));
}

export async function createEscrowTransaction(transaction: any) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.insert(escrowTransactions).values(transaction);
  return result[0];
}

export async function getEscrowTransactions(escrowAccountId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(escrowTransactions)
    .where(eq(escrowTransactions.escrowAccountId, escrowAccountId))
    .orderBy(desc(escrowTransactions.createdAt));
}

export async function createEscrowDispute(dispute: any) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.insert(escrowDisputes).values(dispute);
  return result[0];
}

export async function getEscrowDisputes(escrowAccountId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(escrowDisputes)
    .where(eq(escrowDisputes.escrowAccountId, escrowAccountId))
    .orderBy(desc(escrowDisputes.createdAt));
}

export async function updateDisputeStatus(
  disputeId: number,
  status: string,
  resolvedByAdminId?: number,
  resolution?: string,
  resolvedAmount?: number
) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(escrowDisputes)
    .set({
      status: status as any,
      resolvedByAdminId,
      resolution,
      resolvedAmount,
      resolvedAt: status === 'resolved' ? new Date() : undefined
    })
    .where(eq(escrowDisputes.id, disputeId));
}

export async function getBuyerEscrows(buyerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    escrow: escrowAccounts,
    property: properties
  })
    .from(escrowAccounts)
    .leftJoin(properties, eq(escrowAccounts.propertyId, properties.id))
    .where(eq(escrowAccounts.buyerId, buyerId))
    .orderBy(desc(escrowAccounts.createdAt));
}

export async function getSellerEscrows(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    escrow: escrowAccounts,
    property: properties
  })
    .from(escrowAccounts)
    .leftJoin(properties, eq(escrowAccounts.propertyId, properties.id))
    .where(eq(escrowAccounts.sellerId, sellerId))
    .orderBy(desc(escrowAccounts.createdAt));
}


// ==================== C of O Verification History ====================

/**
 * Save verification history record
 */
export async function saveVerificationHistory(
  data: InsertCofOVerificationHistory
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save verification history: database not available");
    return;
  }

  try {
    await db.insert(cofOVerificationHistory).values(data);
  } catch (error) {
    console.error("[Database] Failed to save verification history:", error);
    throw error;
  }
}

/**
 * Get verification history for a user
 */
export async function getUserVerificationHistory(
  userId: number,
  options: {
    page?: number;
    pageSize?: number;
    search?: string;
    state?: string;
    status?: string;
    sortBy?: "date" | "state" | "status";
    sortOrder?: "asc" | "desc";
    dateFrom?: string;
    dateTo?: string;
  }
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get verification history: database not available");
    return { items: [], total: 0, page: 1, pageSize: 25, totalPages: 0 };
  }

  try {
    const {
      page = 1,
      pageSize = 25,
      search,
      state,
      status,
      sortBy = "date",
      sortOrder = "desc",
      dateFrom,
      dateTo,
    } = options;

    // Build where conditions
    const conditions = [eq(cofOVerificationHistory.userId, userId)];

    // Search filter
    if (search) {
      conditions.push(like(cofOVerificationHistory.cofONumber, `%${search}%`));
    }

    // State filter
    if (state && state !== "multi") {
      conditions.push(eq(cofOVerificationHistory.state, state));
    } else if (state === "multi") {
      conditions.push(eq(cofOVerificationHistory.multiState, true));
    }

    // Status filter
    if (status === "verified") {
      conditions.push(eq(cofOVerificationHistory.isValid, true));
    } else if (status === "invalid") {
      conditions.push(eq(cofOVerificationHistory.isValid, false));
    }

    // Date range filter
    if (dateFrom) {
      conditions.push(gte(cofOVerificationHistory.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(cofOVerificationHistory.createdAt, new Date(dateTo)));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(cofOVerificationHistory)
      .where(and(...conditions));
    const total = Number(countResult[0]?.count || 0);

    // Build order by
    let orderByClause;
    if (sortBy === "date") {
      orderByClause = sortOrder === "asc" 
        ? asc(cofOVerificationHistory.createdAt)
        : desc(cofOVerificationHistory.createdAt);
    } else if (sortBy === "state") {
      orderByClause = sortOrder === "asc"
        ? asc(cofOVerificationHistory.state)
        : desc(cofOVerificationHistory.state);
    } else if (sortBy === "status") {
      orderByClause = sortOrder === "asc"
        ? asc(cofOVerificationHistory.isValid)
        : desc(cofOVerificationHistory.isValid);
    } else {
      orderByClause = desc(cofOVerificationHistory.createdAt);
    }

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const results = await db
      .select()
      .from(cofOVerificationHistory)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(pageSize)
      .offset(offset);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items: results,
      total,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error("[Database] Failed to get verification history:", error);
    return { items: [], total: 0, page: options.page || 1, pageSize: options.pageSize || 25, totalPages: 0 };
  }
}

/**
 * Get all verification history (admin only)
 */
export async function getAllVerificationHistory(limit: number = 100) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get verification history: database not available");
    return [];
  }

  try {
    const results = await db
      .select()
      .from(cofOVerificationHistory)
      .orderBy(desc(cofOVerificationHistory.createdAt))
      .limit(limit);
    return results;
  } catch (error) {
    console.error("[Database] Failed to get verification history:", error);
    return [];
  }
}

/**
 * Get verification statistics
 */
export async function getVerificationStats(userId?: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get verification stats: database not available");
    return null;
  }

  try {
    // Basic stats query
    const query = userId
      ? db.select().from(cofOVerificationHistory).where(eq(cofOVerificationHistory.userId, userId))
      : db.select().from(cofOVerificationHistory);

    const results = await query;

    const totalVerifications = results.length;
    const successfulVerifications = results.filter((r) => r.isValid === true).length;
    const failedVerifications = results.filter((r) => r.isValid === false).length;
    const cachedResults = results.filter((r) => r.cached === true).length;

    const responseTimes = results
      .filter((r) => r.responseTime !== null)
      .map((r) => r.responseTime as number);
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const cacheHitRate =
      totalVerifications > 0 ? (cachedResults / totalVerifications) * 100 : 0;

    return {
      totalVerifications,
      successfulVerifications,
      failedVerifications,
      averageResponseTime: Math.round(averageResponseTime),
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      cachedResults,
    };
  } catch (error) {
    console.error("[Database] Failed to get verification stats:", error);
    return null;
  }
}
