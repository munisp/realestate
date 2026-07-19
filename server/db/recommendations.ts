/**
 * Database queries for property recommendations
 */

import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { getDb } from '../db';
import {
  properties,
  propertyViews,
  favorites,
  savedSearches,
  buyerProfiles,
  userActivity,
} from '../../drizzle/schema';

/**
 * Get user's browsing history
 */
export async function getUserBrowsingHistory(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    // Get viewed properties (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const viewedPropertiesData = await db
      .select({
        id: properties.id,
        price: properties.price,
        bedrooms: properties.bedrooms,
        bathrooms: properties.bathrooms,
        propertyType: properties.propertyType,
        city: properties.city,
        viewDuration: propertyViews.viewDuration,
        viewedAt: propertyViews.createdAt,
      })
      .from(propertyViews)
      .innerJoin(properties, eq(propertyViews.propertyId, properties.id))
      .where(
        and(
          eq(propertyViews.userId, userId),
          gte(propertyViews.createdAt, thirtyDaysAgo)
        )
      )
      .orderBy(desc(propertyViews.createdAt))
      .limit(50);
    
    // Get favorited properties
    const favoritedPropertiesData = await db
      .select({
        id: properties.id,
        price: properties.price,
        bedrooms: properties.bedrooms,
        bathrooms: properties.bathrooms,
        propertyType: properties.propertyType,
        city: properties.city,
        favoritedAt: favorites.createdAt,
      })
      .from(favorites)
      .innerJoin(properties, eq(favorites.propertyId, properties.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt))
      .limit(20);
    
    // Get saved searches
    const savedSearchesData = await db
      .select({
        criteria: savedSearches.criteria,
        frequency: sql<number>`1`.as('frequency'),
      })
      .from(savedSearches)
      .where(eq(savedSearches.userId, userId))
      .orderBy(desc(savedSearches.createdAt))
      .limit(10);
    
    return {
      viewedProperties: viewedPropertiesData.map(v => ({
        ...v,
        viewDuration: v.viewDuration || 0,
      })),
      favoritedProperties: favoritedPropertiesData,
      savedSearches: savedSearchesData.map(s => ({
        criteria: s.criteria || '{}',
        frequency: s.frequency,
      })),
    };
  } catch (error) {
    console.error('Error getting user browsing history:', error);
    return null;
  }
}

/**
 * Get buyer profile preferences
 */
export async function getBuyerProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const profile = await db
      .select()
      .from(buyerProfiles)
      .where(eq(buyerProfiles.userId, userId))
      .limit(1);
    
    if (profile.length === 0) return null;
    
    const p = profile[0];
    return {
      minBudget: p.minBudget,
      maxBudget: p.maxBudget,
      preferredPropertyTypes: p.preferredPropertyTypes ? JSON.parse(p.preferredPropertyTypes) : [],
      preferredLocations: p.preferredLocations ? JSON.parse(p.preferredLocations) : [],
      minBedrooms: p.minBedrooms,
      maxBedrooms: p.maxBedrooms,
      requiredAmenities: p.requiredAmenities ? JSON.parse(p.requiredAmenities) : [],
    };
  } catch (error) {
    console.error('Error getting buyer profile:', error);
    return null;
  }
}

/**
 * Get available properties for recommendations
 */
export async function getAvailableProperties(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const props = await db
      .select({
        id: properties.id,
        price: properties.price,
        bedrooms: properties.bedrooms,
        bathrooms: properties.bathrooms,
        squareFeet: properties.squareFeet,
        propertyType: properties.propertyType,
        city: properties.city,
        addressLine1: properties.addressLine1,
        title: properties.title,
        description: properties.description,
        latitude: properties.latitude,
        longitude: properties.longitude,
      })
      .from(properties)
      .where(eq(properties.status, 'active'))
      .orderBy(desc(properties.createdAt))
      .limit(limit);
    
    return props;
  } catch (error) {
    console.error('Error getting available properties:', error);
    return [];
  }
}

/**
 * Track recommendation view
 */
export async function trackRecommendationView(
  userId: number,
  propertyId: number,
  source: string = 'recommendations'
) {
  const db = await getDb();
  if (!db) return;
  
  try {
    await db.insert(userActivity).values({
      userId,
      activityType: 'property_view',
      propertyId,
      metadata: JSON.stringify({ source }),
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error tracking recommendation view:', error);
  }
}
