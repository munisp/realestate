import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { sdk } from './_core/sdk';

export interface NotificationPayload {
  type: 'property_update' | 'price_change' | 'new_listing' | 'transaction_update' | 'valuation_complete';
  title: string;
  message: string;
  propertyId?: number;
  transactionId?: number;
  data?: any;
}

let io: SocketIOServer | null = null;

export function initializeSocketIO(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.VITE_APP_URL 
        : ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use(async (socket: any, next: any) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      // For now, allow connections without strict auth verification
      // In production, implement proper token verification
      socket.data.userId = socket.handshake.auth.userId;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: any) => {
    const userId = socket.data.userId;
    
    if (!userId) {
      socket.disconnect();
      return;
    }

    console.log(`[Socket.IO] User ${userId} connected`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Handle subscription to property updates
    socket.on('subscribe:property', (propertyId: number) => {
      socket.join(`property:${propertyId}`);
      console.log(`[Socket.IO] User ${userId} subscribed to property ${propertyId}`);
    });

    socket.on('unsubscribe:property', (propertyId: number) => {
      socket.leave(`property:${propertyId}`);
      console.log(`[Socket.IO] User ${userId} unsubscribed from property ${propertyId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] User ${userId} disconnected`);
    });
  });

  console.log('[Socket.IO] Real-time server initialized');
  
  // Initialize real-time metrics broadcasting
  import('./_core/realtimeMetrics').then(({ initializeRealtimeMetrics }) => {
    initializeRealtimeMetrics(io!);
  });
  
  // Initialize real-time recommendations
  import('./services/realtimeRecommendations').then(({ initializeRealtimeRecommendations }) => {
    initializeRealtimeRecommendations(io!);
  });
  
  // Initialize real-time cluster updates
  import('./services/realtimeClusterService').then(({ realtimeClusterService }) => {
    realtimeClusterService.initialize(io!);
  });
  
  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

// Send notification to specific user
export function notifyUser(userId: number, notification: NotificationPayload) {
  if (!io) {
    console.warn('[Socket.IO] Server not initialized');
    return;
  }

  io.to(`user:${userId}`).emit('notification', notification);
  console.log(`[Socket.IO] Notification sent to user ${userId}:`, notification.type);
}

// Send notification to all users watching a property
export function notifyPropertyWatchers(propertyId: number, notification: NotificationPayload) {
  if (!io) {
    console.warn('[Socket.IO] Server not initialized');
    return;
  }

  io.to(`property:${propertyId}`).emit('notification', notification);
  console.log(`[Socket.IO] Notification sent to property ${propertyId} watchers:`, notification.type);
}

// Broadcast to all connected users
export function broadcastNotification(notification: NotificationPayload) {
  if (!io) {
    console.warn('[Socket.IO] Server not initialized');
    return;
  }

  io.emit('notification', notification);
  console.log('[Socket.IO] Broadcast notification:', notification.type);
}
