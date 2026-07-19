import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface DashboardMetrics {
  moderation: any;
  property: any;
  user: any;
  transaction: any;
  escrow: any;
  health: any;
  generatedAt: Date;
}

export function useRealtimeMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Get the current user's token (if available)
    // For now, we'll connect without strict auth
    const token = localStorage.getItem('auth_token') || 'anonymous';
    const userId = localStorage.getItem('user_id') || '0';

    // Connect to the analytics namespace
    const socket = io('/analytics', {
      auth: {
        token,
        userId,
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Real-time Metrics] Connected to server');
      setConnected(true);
      setError(null);
      
      // Request initial metrics
      socket.emit('request:dashboard-metrics');
    });

    socket.on('disconnect', () => {
      console.log('[Real-time Metrics] Disconnected from server');
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[Real-time Metrics] Connection error:', err);
      setError(err.message);
      setConnected(false);
    });

    socket.on('metrics:dashboard', (data: DashboardMetrics) => {
      console.log('[Real-time Metrics] Received dashboard metrics update');
      setMetrics(data);
    });

    socket.on('metrics:health', (data: any) => {
      console.log('[Real-time Metrics] Received health metrics update');
      setMetrics(prev => prev ? { ...prev, health: data } : null);
    });

    socket.on('metrics:error', (data: { message: string }) => {
      console.error('[Real-time Metrics] Server error:', data.message);
      setError(data.message);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const requestUpdate = () => {
    if (socketRef.current && connected) {
      socketRef.current.emit('request:dashboard-metrics');
    }
  };

  return {
    metrics,
    connected,
    error,
    requestUpdate,
  };
}

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

export function useActivityFeed() {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token') || 'anonymous';
    const userId = localStorage.getItem('user_id') || '0';

    const socket = io('/analytics', {
      auth: { token, userId },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('activity:new', (activity: ActivityEvent) => {
      console.log('[Activity Feed] New activity:', activity);
      setActivities(prev => [activity, ...prev].slice(0, 50)); // Keep last 50 activities
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return {
    activities,
    connected,
  };
}
