import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';

interface Notification {
  type: 'property_update' | 'price_change' | 'new_listing' | 'transaction_update' | 'valuation_complete';
  title: string;
  message: string;
  propertyId?: number;
  transactionId?: number;
  data?: any;
}

export function useNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const socketInstance = io({
      path: '/socket.io',
      auth: {
        token: 'placeholder', // In production, use actual auth token
        userId: user.id,
      },
    });

    socketInstance.on('connect', () => {
      console.log('[Socket.IO] Connected');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected');
      setConnected(false);
    });

    socketInstance.on('notification', (notification: Notification) => {
      console.log('[Socket.IO] Notification received:', notification);
      
      // Show toast notification
      toast(notification.title, {
        description: notification.message,
        action: notification.propertyId ? {
          label: 'View',
          onClick: () => {
            window.location.href = `/property/${notification.propertyId}`;
          },
        } : undefined,
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [isAuthenticated, user]);

  const subscribeToProperty = (propertyId: number) => {
    if (socket && connected) {
      socket.emit('subscribe:property', propertyId);
    }
  };

  const unsubscribeFromProperty = (propertyId: number) => {
    if (socket && connected) {
      socket.emit('unsubscribe:property', propertyId);
    }
  };

  return {
    connected,
    subscribeToProperty,
    unsubscribeFromProperty,
  };
}
