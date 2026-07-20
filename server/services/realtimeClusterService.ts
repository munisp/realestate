import { Server as SocketIOServer } from 'socket.io';
import { latLngToCell } from 'h3-js';
import { clusterCacheService } from './clusterCacheService';
import { logger } from "../_core/logger";

/**
 * Real-time Cluster Update Service
 * 
 * Pushes property updates to connected clients viewing map clusters
 * Invalidates cache and notifies clients when properties are added/updated/deleted
 * 
 * Features:
 * - Room-based subscriptions (by zoom level and H3 cell)
 * - Automatic cache invalidation
 * - Property addition/removal notifications
 * - Cluster boundary change notifications
 * - Efficient viewport-based updates
 */

interface PropertyUpdate {
  id: number;
  latitude: number;
  longitude: number;
  price: number;
  title: string;
  action: 'added' | 'updated' | 'removed';
}

interface ClusterUpdate {
  h3Index: string;
  zoom: number;
  action: 'property_added' | 'property_removed' | 'cluster_changed';
  property?: PropertyUpdate;
  newCount?: number;
  newAvgPrice?: number;
}

interface ViewportSubscription {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoom: number;
}

class RealtimeClusterService {
  private io: SocketIOServer | null = null;
  private subscriptions: Map<string, ViewportSubscription> = new Map();

  /**
   * Initialize Socket.IO server
   */
  initialize(io: SocketIOServer) {
    this.io = io;

    // Set up namespace for cluster updates
    const clusterNamespace = io.of('/clusters');

    clusterNamespace.on('connection', (socket) => {
      logger.info(`[RealtimeCluster] Client connected: ${socket.id}`);

      // Handle viewport subscription
      socket.on('subscribe:viewport', (data: ViewportSubscription) => {
        const { bounds, zoom } = data;
        
        // Store subscription
        this.subscriptions.set(socket.id, data);

        // Join room for this zoom level
        const zoomRoom = `zoom:${zoom}`;
        socket.join(zoomRoom);

        // Calculate H3 cells for this viewport
        const h3Cells = this.getH3CellsForViewport(bounds, zoom);
        
        // Join rooms for each H3 cell
        h3Cells.forEach(h3Index => {
          socket.join(`cell:${h3Index}`);
        });

        logger.info(`[RealtimeCluster] Client ${socket.id} subscribed to zoom ${zoom}, ${h3Cells.length} cells`);

        socket.emit('subscription:confirmed', {
          zoom,
          cellCount: h3Cells.length,
          cells: h3Cells,
        });
      });

      // Handle viewport update (when user pans/zooms)
      socket.on('update:viewport', (data: ViewportSubscription) => {
        const oldSubscription = this.subscriptions.get(socket.id);
        
        // Leave old rooms
        if (oldSubscription) {
          const oldZoomRoom = `zoom:${oldSubscription.zoom}`;
          socket.leave(oldZoomRoom);

          const oldCells = this.getH3CellsForViewport(oldSubscription.bounds, oldSubscription.zoom);
          oldCells.forEach(h3Index => {
            socket.leave(`cell:${h3Index}`);
          });
        }

        // Join new rooms
        const { bounds, zoom } = data;
        this.subscriptions.set(socket.id, data);

        const zoomRoom = `zoom:${zoom}`;
        socket.join(zoomRoom);

        const h3Cells = this.getH3CellsForViewport(bounds, zoom);
        h3Cells.forEach(h3Index => {
          socket.join(`cell:${h3Index}`);
        });

        logger.info(`[RealtimeCluster] Client ${socket.id} updated viewport: zoom ${zoom}, ${h3Cells.length} cells`);
      });

      // Handle unsubscribe
      socket.on('unsubscribe:viewport', () => {
        const subscription = this.subscriptions.get(socket.id);
        
        if (subscription) {
          const zoomRoom = `zoom:${subscription.zoom}`;
          socket.leave(zoomRoom);

          const h3Cells = this.getH3CellsForViewport(subscription.bounds, subscription.zoom);
          h3Cells.forEach(h3Index => {
            socket.leave(`cell:${h3Index}`);
          });

          this.subscriptions.delete(socket.id);
          logger.info(`[RealtimeCluster] Client ${socket.id} unsubscribed`);
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.subscriptions.delete(socket.id);
        logger.info(`[RealtimeCluster] Client disconnected: ${socket.id}`);
      });
    });

    logger.info('[RealtimeCluster] Service initialized');
  }

  /**
   * Get H3 cells that cover a viewport
   */
  private getH3CellsForViewport(
    bounds: { north: number; south: number; east: number; west: number },
    zoom: number
  ): string[] {
    const resolution = this.getH3Resolution(zoom);
    const cells = new Set<string>();

    // Sample points across the viewport
    const latStep = (bounds.north - bounds.south) / 5;
    const lngStep = (bounds.east - bounds.west) / 5;

    for (let lat = bounds.south; lat <= bounds.north; lat += latStep) {
      for (let lng = bounds.west; lng <= bounds.east; lng += lngStep) {
        try {
          const h3Index = latLngToCell(lat, lng, resolution);
          cells.add(h3Index);
        } catch (err) {
          // Skip invalid coordinates
        }
      }
    }

    return Array.from(cells);
  }

  /**
   * Get H3 resolution based on zoom level
   */
  private getH3Resolution(zoom: number): number {
    if (zoom >= 18) return 11;
    if (zoom >= 16) return 10;
    if (zoom >= 14) return 9;
    if (zoom >= 12) return 8;
    if (zoom >= 10) return 7;
    if (zoom >= 8) return 6;
    if (zoom >= 6) return 5;
    if (zoom >= 4) return 4;
    return 3;
  }

  /**
   * Notify clients when a property is added
   */
  async notifyPropertyAdded(property: {
    id: number;
    latitude: number;
    longitude: number;
    price: number;
    title: string;
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: string;
  }) {
    if (!this.io) return;

    const { latitude, longitude } = property;

    // Invalidate cache
    await clusterCacheService.invalidatePropertyCache(property.id, latitude, longitude);

    // Get H3 cells for all zoom levels
    const zoomLevels = [3, 4, 5, 6, 7, 8, 9, 10, 11];
    const updates: ClusterUpdate[] = [];

    for (const zoom of zoomLevels) {
      const resolution = this.getH3Resolution(zoom);
      const h3Index = latLngToCell(latitude, longitude, resolution);

      updates.push({
        h3Index,
        zoom,
        action: 'property_added',
        property: {
          id: property.id,
          latitude,
          longitude,
          price: property.price,
          title: property.title,
          action: 'added',
        },
      });

      // Emit to specific cell room
      this.io.of('/clusters').to(`cell:${h3Index}`).emit('cluster:update', {
        h3Index,
        zoom,
        action: 'property_added',
        property: {
          ...property,
          position: { lat: latitude, lng: longitude },
        },
      });
    }

    // Emit to all zoom level rooms
    this.io.of('/clusters').emit('property:added', {
      property: {
        ...property,
        position: { lat: latitude, lng: longitude },
      },
      affectedCells: updates.map(u => ({ h3Index: u.h3Index, zoom: u.zoom })),
    });

    logger.info(`[RealtimeCluster] Notified property added: ${property.id}, ${updates.length} cells affected`);
  }

  /**
   * Notify clients when a property is updated
   */
  async notifyPropertyUpdated(property: {
    id: number;
    latitude: number;
    longitude: number;
    price: number;
    title: string;
  }) {
    if (!this.io) return;

    const { latitude, longitude } = property;

    // Invalidate cache
    await clusterCacheService.invalidatePropertyCache(property.id, latitude, longitude);

    // Get H3 cells for all zoom levels
    const zoomLevels = [3, 4, 5, 6, 7, 8, 9, 10, 11];

    for (const zoom of zoomLevels) {
      const resolution = this.getH3Resolution(zoom);
      const h3Index = latLngToCell(latitude, longitude, resolution);

      // Emit to specific cell room
      this.io.of('/clusters').to(`cell:${h3Index}`).emit('cluster:update', {
        h3Index,
        zoom,
        action: 'cluster_changed',
        property: {
          ...property,
          position: { lat: latitude, lng: longitude },
          action: 'updated',
        },
      });
    }

    // Emit to all clients
    this.io.of('/clusters').emit('property:updated', {
      property: {
        ...property,
        position: { lat: latitude, lng: longitude },
      },
    });

    logger.info(`[RealtimeCluster] Notified property updated: ${property.id}`);
  }

  /**
   * Notify clients when a property is removed
   */
  async notifyPropertyRemoved(property: {
    id: number;
    latitude: number;
    longitude: number;
  }) {
    if (!this.io) return;

    const { latitude, longitude } = property;

    // Invalidate cache
    await clusterCacheService.invalidatePropertyCache(property.id, latitude, longitude);

    // Get H3 cells for all zoom levels
    const zoomLevels = [3, 4, 5, 6, 7, 8, 9, 10, 11];

    for (const zoom of zoomLevels) {
      const resolution = this.getH3Resolution(zoom);
      const h3Index = latLngToCell(latitude, longitude, resolution);

      // Emit to specific cell room
      this.io.of('/clusters').to(`cell:${h3Index}`).emit('cluster:update', {
        h3Index,
        zoom,
        action: 'property_removed',
        property: {
          id: property.id,
          latitude,
          longitude,
          action: 'removed',
        },
      });
    }

    // Emit to all clients
    this.io.of('/clusters').emit('property:removed', {
      propertyId: property.id,
      position: { lat: latitude, lng: longitude },
    });

    logger.info(`[RealtimeCluster] Notified property removed: ${property.id}`);
  }

  /**
   * Notify clients of bulk property changes
   */
  async notifyBulkUpdate(action: 'added' | 'updated' | 'removed', count: number) {
    if (!this.io) return;

    // Invalidate all caches
    await clusterCacheService.invalidateAllCaches();

    // Emit to all clients
    this.io.of('/clusters').emit('bulk:update', {
      action,
      count,
      message: `${count} properties ${action}`,
    });

    logger.info(`[RealtimeCluster] Notified bulk update: ${count} properties ${action}`);
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    connectedClients: number;
    activeSubscriptions: number;
  } {
    if (!this.io) {
      return {
        connectedClients: 0,
        activeSubscriptions: 0,
      };
    }

    const clusterNamespace = this.io.of('/clusters');
    const connectedClients = clusterNamespace.sockets.size;
    const activeSubscriptions = this.subscriptions.size;

    return {
      connectedClients,
      activeSubscriptions,
    };
  }
}

// Export singleton instance
export const realtimeClusterService = new RealtimeClusterService();
