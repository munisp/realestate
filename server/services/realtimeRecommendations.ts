/**
 * Real-time Recommendation Service
 * 
 * Provides WebSocket-based real-time updates for new property matches:
 * - Monitors new property listings
 * - Matches against user preferences
 * - Pushes instant notifications to connected users
 * - Maintains user subscription state
 */

import type { Server as SocketIOServer, Socket } from 'socket.io';
import { getDb } from '../db';
import { properties, savedSearches, users } from '../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

// ============================================================================
// Types
// ============================================================================

export interface PropertyMatch {
  propertyId: number;
  userId: number;
  matchScore: number;
  matchReasons: string[];
  property: any;
}

export interface UserSubscription {
  userId: number;
  socketId: string;
  preferences: {
    minPrice?: number;
    maxPrice?: number;
    propertyTypes?: string[];
    locations?: string[];
    minBedrooms?: number;
    minBathrooms?: number;
  };
}

// ============================================================================
// Global State
// ============================================================================

const userSubscriptions = new Map<number, UserSubscription>();
let realtimeNamespace: any = null;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize real-time recommendation service
 */
export function initializeRealtimeRecommendations(io: SocketIOServer): void {
  console.log('[Real-time Recommendations] Initializing...');

  // Create namespace for recommendations
  realtimeNamespace = io.of('/recommendations');

  realtimeNamespace.on('connection', (socket: Socket) => {
    console.log('[Real-time Recommendations] Client connected:', socket.id);

    // Handle user subscription
    socket.on('subscribe', async (data: { userId: number; preferences?: any }) => {
      try {
        const { userId, preferences } = data;

        // Store subscription
        userSubscriptions.set(userId, {
          userId,
          socketId: socket.id,
          preferences: preferences || {},
        });

        socket.join(`user_${userId}`);
        console.log(`[Real-time Recommendations] User ${userId} subscribed`);

        // Send confirmation
        socket.emit('subscribed', {
          success: true,
          message: 'Successfully subscribed to real-time recommendations',
        });

        // Send any pending matches
        await sendPendingMatches(userId);
      } catch (error) {
        console.error('[Real-time Recommendations] Subscription error:', error);
        socket.emit('error', { message: 'Failed to subscribe' });
      }
    });

    // Handle unsubscribe
    socket.on('unsubscribe', (data: { userId: number }) => {
      const { userId } = data;
      userSubscriptions.delete(userId);
      socket.leave(`user_${userId}`);
      console.log(`[Real-time Recommendations] User ${userId} unsubscribed`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      // Remove subscription by socket ID
      for (const [userId, sub] of userSubscriptions.entries()) {
        if (sub.socketId === socket.id) {
          userSubscriptions.delete(userId);
          console.log(`[Real-time Recommendations] User ${userId} disconnected`);
          break;
        }
      }
    });

    // Handle preference updates
    socket.on('update_preferences', (data: { userId: number; preferences: any }) => {
      const { userId, preferences } = data;
      const subscription = userSubscriptions.get(userId);
      if (subscription) {
        subscription.preferences = preferences;
        userSubscriptions.set(userId, subscription);
        console.log(`[Real-time Recommendations] Updated preferences for user ${userId}`);
      }
    });
  });

  console.log('[Real-time Recommendations] Service initialized');
}

// ============================================================================
// Property Matching
// ============================================================================

/**
 * Calculate match score between property and user preferences
 */
function calculateMatchScore(
  property: any,
  preferences: UserSubscription['preferences']
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const maxScore = 100;

  // Price match (30 points)
  if (preferences.minPrice !== undefined && preferences.maxPrice !== undefined) {
    if (property.price >= preferences.minPrice && property.price <= preferences.maxPrice) {
      score += 30;
      reasons.push('Price within your range');
    } else if (
      property.price >= preferences.minPrice * 0.9 &&
      property.price <= preferences.maxPrice * 1.1
    ) {
      score += 15;
      reasons.push('Price close to your range');
    }
  }

  // Property type match (25 points)
  if (preferences.propertyTypes && preferences.propertyTypes.length > 0) {
    if (preferences.propertyTypes.includes(property.propertyType)) {
      score += 25;
      reasons.push(`Matches your preferred type: ${property.propertyType}`);
    }
  }

  // Location match (25 points)
  if (preferences.locations && preferences.locations.length > 0) {
    const propertyLocation = `${property.city}, ${property.state}`;
    if (preferences.locations.some(loc => propertyLocation.includes(loc))) {
      score += 25;
      reasons.push('In your preferred location');
    }
  }

  // Bedrooms match (10 points)
  if (preferences.minBedrooms !== undefined) {
    if (property.bedrooms >= preferences.minBedrooms) {
      score += 10;
      reasons.push(`Has ${property.bedrooms} bedrooms`);
    }
  }

  // Bathrooms match (10 points)
  if (preferences.minBathrooms !== undefined) {
    if (property.bathrooms >= preferences.minBathrooms) {
      score += 10;
      reasons.push(`Has ${property.bathrooms} bathrooms`);
    }
  }

  return {
    score: Math.min(score, maxScore),
    reasons,
  };
}

/**
 * Check if property matches user's saved searches
 */
async function matchPropertyToUsers(property: any): Promise<PropertyMatch[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const matches: PropertyMatch[] = [];

  // Check each subscribed user
  for (const [userId, subscription] of userSubscriptions.entries()) {
    const { score, reasons } = calculateMatchScore(property, subscription.preferences);

    // Only notify if match score is above threshold (70%)
    if (score >= 70) {
      matches.push({
        propertyId: property.id,
        userId,
        matchScore: score,
        matchReasons: reasons,
        property,
      });
    }
  }

  return matches;
}

// ============================================================================
// Notification
// ============================================================================

/**
 * Notify user of new property match
 */
export async function notifyNewPropertyMatch(propertyId: number): Promise<void> {
  if (!realtimeNamespace) {
    console.warn('[Real-time Recommendations] Namespace not initialized');
    return;
  }

  try {
    const db = await getDb();
    if (!db) {
      return;
    }

    // Get property details
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);

    if (!property) {
      console.warn(`[Real-time Recommendations] Property ${propertyId} not found`);
      return;
    }

    // Find matching users
    const matches = await matchPropertyToUsers(property);

    console.log(`[Real-time Recommendations] Found ${matches.length} matches for property ${propertyId}`);

    // Send notifications to matched users
    for (const match of matches) {
      realtimeNamespace.to(`user_${match.userId}`).emit('new_match', {
        property: match.property,
        matchScore: match.matchScore,
        matchReasons: match.matchReasons,
        timestamp: new Date().toISOString(),
      });

      console.log(`[Real-time Recommendations] Notified user ${match.userId} of new match (score: ${match.matchScore})`);
    }
  } catch (error) {
    console.error('[Real-time Recommendations] Error notifying new match:', error);
  }
}

/**
 * Send pending matches to user (called on subscription)
 */
async function sendPendingMatches(userId: number): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      return;
    }

    const subscription = userSubscriptions.get(userId);
    if (!subscription) {
      return;
    }

    // Get recent properties (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recentProperties = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.status, 'active'),
          sql`${properties.createdAt} >= ${oneDayAgo.toISOString()}`
        )
      )
      .limit(20);

    // Find matches
    const matches: any[] = [];
    for (const property of recentProperties) {
      const { score, reasons } = calculateMatchScore(property, subscription.preferences);
      if (score >= 70) {
        matches.push({
          property,
          matchScore: score,
          matchReasons: reasons,
        });
      }
    }

    if (matches.length > 0) {
      realtimeNamespace.to(`user_${userId}`).emit('pending_matches', {
        matches,
        count: matches.length,
      });

      console.log(`[Real-time Recommendations] Sent ${matches.length} pending matches to user ${userId}`);
    }
  } catch (error) {
    console.error('[Real-time Recommendations] Error sending pending matches:', error);
  }
}

/**
 * Broadcast recommendation update to all connected users
 */
export function broadcastRecommendationUpdate(message: string): void {
  if (!realtimeNamespace) {
    return;
  }

  realtimeNamespace.emit('recommendation_update', {
    message,
    timestamp: new Date().toISOString(),
  });

  console.log('[Real-time Recommendations] Broadcasted update:', message);
}

/**
 * Get current subscription count
 */
export function getSubscriptionCount(): number {
  return userSubscriptions.size;
}

/**
 * Get subscribed user IDs
 */
export function getSubscribedUsers(): number[] {
  return Array.from(userSubscriptions.keys());
}
