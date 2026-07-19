import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { getDb } from "../db";
import { properties } from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { gnnServiceClient } from "./gnnServiceClient";

interface LiveProperty {
  id: number;
  title: string;
  address: string;
  city: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  imageUrl: string;
  isHotDeal: boolean;
  gnnScore: number;
  investmentPotential: number;
  timestamp: Date;
}

export class LivePropertyFeedService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private lastCheckedId: number = 0;

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: "/api/ws/property-feed"
    });

    this.wss.on("connection", (ws: WebSocket) => {
      console.log("[LivePropertyFeed] Client connected");
      this.clients.add(ws);

      // Send initial properties
      this.sendRecentProperties(ws);

      ws.on("close", () => {
        console.log("[LivePropertyFeed] Client disconnected");
        this.clients.delete(ws);
      });

      ws.on("error", (error) => {
        console.error("[LivePropertyFeed] WebSocket error:", error);
        this.clients.delete(ws);
      });
    });

    // Start checking for new properties every 10 seconds
    this.startPropertyMonitoring();

    console.log("[LivePropertyFeed] Service initialized");
  }

  private async sendRecentProperties(ws: WebSocket) {
    try {
      const db = await getDb();
      if (!db) return;

      const recentProperties = await db
        .select()
        .from(properties)
        .where(eq(properties.status, "active"))
        .orderBy(desc(properties.createdAt))
        .limit(10);

      for (const property of recentProperties) {
        const liveProperty = await this.transformToLiveProperty(property);
        if (liveProperty) {
          ws.send(JSON.stringify({
            type: "new-property",
            property: liveProperty,
          }));
        }
      }
    } catch (error) {
      console.error("[LivePropertyFeed] Error sending recent properties:", error);
    }
  }

  private startPropertyMonitoring() {
    // Check for new properties every 10 seconds
    this.checkInterval = setInterval(async () => {
      await this.checkForNewProperties();
    }, 10000);
  }

  private async checkForNewProperties() {
    try {
      const db = await getDb();
      if (!db) return;

      // Get properties added since last check
      const newProperties = await db
        .select()
        .from(properties)
        .where(eq(properties.status, "active"))
        .orderBy(desc(properties.id))
        .limit(5);

      for (const property of newProperties) {
        if (property.id > this.lastCheckedId) {
          this.lastCheckedId = property.id;
          
          const liveProperty = await this.transformToLiveProperty(property);
          if (liveProperty) {
            this.broadcastNewProperty(liveProperty);
          }
        }
      }
    } catch (error) {
      console.error("[LivePropertyFeed] Error checking for new properties:", error);
    }
  }

  private async transformToLiveProperty(property: any): Promise<LiveProperty | null> {
    try {
      // Calculate GNN scores using real service
      const scores = await gnnServiceClient.calculateScores({
        id: property.id,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: property.squareFeet,
        latitude: property.latitude,
        longitude: property.longitude,
        city: property.city,
        address: property.address,
        propertyType: property.propertyType,
        yearBuilt: property.yearBuilt,
      });
      
      const isHotDeal = this.isHotDeal(property, scores.gnnScore, scores.investmentPotential);

      return {
        id: property.id,
        title: property.title,
        address: property.address,
        city: property.city,
        price: property.price,
        currency: property.currency || "USD",
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: property.squareFeet,
        imageUrl: property.imageUrl || "/placeholder-property.jpg",
        isHotDeal,
        gnnScore: scores.gnnScore,
        investmentPotential: scores.investmentPotential,
        timestamp: property.createdAt || new Date(),
      };
    } catch (error) {
      console.error("[LivePropertyFeed] Error transforming property:", error);
      return null;
    }
  }



  private isHotDeal(property: any, gnnScore: number, investmentPotential: number): boolean {
    // Hot deal criteria:
    // 1. GNN score > 85
    // 2. Investment potential > 85
    // 3. Listed in last 24 hours
    const isHighScore = gnnScore > 85 && investmentPotential > 85;
    const isRecent = property.createdAt && 
      (Date.now() - new Date(property.createdAt).getTime()) < 24 * 60 * 60 * 1000;
    
    return isHighScore && isRecent;
  }

  private broadcastNewProperty(property: LiveProperty) {
    const message = JSON.stringify({
      type: "new-property",
      property,
    });

    let successCount = 0;
    let errorCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          successCount++;
        } catch (error) {
          console.error("[LivePropertyFeed] Error sending to client:", error);
          errorCount++;
        }
      }
    });

    console.log(`[LivePropertyFeed] Broadcasted property ${property.id} to ${successCount} clients (${errorCount} errors)`);
  }

  // Manual trigger for testing
  async broadcastTestProperty() {
    const testProperty: LiveProperty = {
      id: 99999,
      title: "Test Luxury Villa in Lekki",
      address: "15 Admiralty Way, Lekki Phase 1",
      city: "Lagos",
      price: 85000000,
      currency: "NGN",
      bedrooms: 4,
      bathrooms: 5,
      squareFeet: 3200,
      imageUrl: "/placeholder-property.jpg",
      isHotDeal: true,
      gnnScore: 92,
      investmentPotential: 88,
      timestamp: new Date(),
    };

    this.broadcastNewProperty(testProperty);
  }

  shutdown() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.clients.forEach((client) => {
      client.close();
    });

    if (this.wss) {
      this.wss.close();
    }

    console.log("[LivePropertyFeed] Service shut down");
  }
}

// Singleton instance
export const livePropertyFeedService = new LivePropertyFeedService();
