/**
 * Real-time Metrics Service
 * 
 * Provides WebSocket-based real-time updates for analytics dashboard
 * Uses Socket.IO for bidirectional communication
 */

import type { Server as SocketIOServer } from 'socket.io';
import { getDashboardMetrics, getPlatformHealthMetrics } from './analyticsService';
import { logger } from "./logger";

let metricsUpdateInterval: NodeJS.Timeout | null = null;

/**
 * Initialize real-time metrics broadcasting
 */
export function initializeRealtimeMetrics(io: SocketIOServer) {
  logger.info('[Real-time Metrics] Initializing...');

  // Create a namespace for analytics
  const analyticsNamespace = io.of('/analytics');

  analyticsNamespace.on('connection', (socket) => {
    console.log('[Real-time Metrics] Client connected:', socket.id);

    // Send initial metrics immediately upon connection
    sendMetricsUpdate(socket);

    // Handle client requests for specific metrics
    socket.on('request:dashboard-metrics', async () => {
      try {
        const metrics = await getDashboardMetrics();
        socket.emit('metrics:dashboard', metrics);
      } catch (error) {
        logger.error('[Real-time Metrics] Error fetching dashboard metrics:', { error: String(error) });
        socket.emit('metrics:error', { message: 'Failed to fetch metrics' });
      }
    });

    socket.on('request:health-metrics', async () => {
      try {
        const health = await getPlatformHealthMetrics();
        socket.emit('metrics:health', health);
      } catch (error) {
        logger.error('[Real-time Metrics] Error fetching health metrics:', { error: String(error) });
        socket.emit('metrics:error', { message: 'Failed to fetch health metrics' });
      }
    });

    socket.on('disconnect', () => {
      console.log('[Real-time Metrics] Client disconnected:', socket.id);
    });
  });

  // Start broadcasting metrics updates every 30 seconds
  startMetricsBroadcast(analyticsNamespace);
}

/**
 * Send metrics update to a specific socket
 */
async function sendMetricsUpdate(socket: any) {
  try {
    const metrics = await getDashboardMetrics();
    socket.emit('metrics:dashboard', metrics);
  } catch (error) {
    logger.error('[Real-time Metrics] Error sending metrics update:', { error: String(error) });
  }
}

/**
 * Start broadcasting metrics to all connected clients
 */
function startMetricsBroadcast(namespace: any) {
  if (metricsUpdateInterval) {
    clearInterval(metricsUpdateInterval);
  }

  metricsUpdateInterval = setInterval(async () => {
    try {
      const metrics = await getDashboardMetrics();
      const health = await getPlatformHealthMetrics();

      // Broadcast to all connected clients
      namespace.emit('metrics:dashboard', metrics);
      namespace.emit('metrics:health', health);

      console.log('[Real-time Metrics] Broadcasted updates to', namespace.sockets.size, 'clients');
    } catch (error) {
      logger.error('[Real-time Metrics] Error broadcasting metrics:', { error: String(error) });
    }
  }, 30000); // Update every 30 seconds

  logger.info('[Real-time Metrics] Started broadcasting (30s interval)');
}

/**
 * Stop metrics broadcasting (for cleanup)
 */
export function stopMetricsBroadcast() {
  if (metricsUpdateInterval) {
    clearInterval(metricsUpdateInterval);
    metricsUpdateInterval = null;
    logger.info('[Real-time Metrics] Stopped broadcasting');
  }
}

/**
 * Trigger an immediate metrics update broadcast
 * Call this when significant events occur (e.g., new transaction, property approval)
 */
export function triggerMetricsUpdate(io: SocketIOServer) {
  const analyticsNamespace = io.of('/analytics');
  
  getDashboardMetrics().then(metrics => {
    analyticsNamespace.emit('metrics:dashboard', metrics);
    logger.info('[Real-time Metrics] Triggered immediate update');
  }).catch(error => {
    logger.error('[Real-time Metrics] Error triggering update:', { error: String(error) });
  });
}

/**
 * Emit a specific event update
 */
export function emitEvent(io: SocketIOServer, event: string, data: any) {
  const analyticsNamespace = io.of('/analytics');
  analyticsNamespace.emit(event, data);
  logger.info('[Real-time Metrics] Emitted event:', { detail: String(event) });
}

/**
 * Activity feed events
 */
export interface ActivityEvent {
  id: string;
  type: 'property_listed' | 'property_sold' | 'user_registered' | 'transaction_completed' | 'escrow_funded' | 'report_filed';
  title: string;
  description: string;
  timestamp: Date;
  userId?: number;
  propertyId?: number;
  metadata?: Record<string, any>;
}

/**
 * Broadcast an activity event to the feed
 */
export function broadcastActivity(io: SocketIOServer, activity: ActivityEvent) {
  const analyticsNamespace = io.of('/analytics');
  analyticsNamespace.emit('activity:new', activity);
  console.log('[Real-time Metrics] Broadcasted activity:', activity.type);
}
