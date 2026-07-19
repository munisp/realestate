import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  isLoading: boolean;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default',
    isLoading: true,
  });

  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      if (!isSupported) {
        setState((prev) => ({ ...prev, isSupported: false, isLoading: false }));
        return;
      }

      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[Push] Service Worker registered:', registration);

        // Check current subscription
        const subscription = await registration.pushManager.getSubscription();
        const permission = Notification.permission;

        setState({
          isSupported: true,
          isSubscribed: !!subscription,
          permission,
          isLoading: false,
        });
      } catch (error) {
        console.error('[Push] Error checking support:', error);
        setState((prev) => ({ ...prev, isSupported: false, isLoading: false }));
      }
    };

    checkSupport();
  }, []);

  // Subscribe to push notifications
  const subscribe = async () => {
    if (!state.isSupported) {
      toast.error('Push notifications are not supported in your browser');
      return false;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        setState((prev) => ({ ...prev, permission, isLoading: false }));
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from server
      const { publicKey } = await subscribeMutation.mutateAsync({
        action: 'getPublicKey',
      });

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      await subscribeMutation.mutateAsync({
        action: 'subscribe',
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      });

      setState({
        isSupported: true,
        isSubscribed: true,
        permission: 'granted',
        isLoading: false,
      });

      toast.success('Push notifications enabled!');
      return true;
    } catch (error) {
      console.error('[Push] Error subscribing:', error);
      toast.error('Failed to enable push notifications');
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get current subscription
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Notify server
        await unsubscribeMutation.mutateAsync({
          endpoint: subscription.endpoint,
        });
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      toast.success('Push notifications disabled');
      return true;
    } catch (error) {
      console.error('[Push] Error unsubscribing:', error);
      toast.error('Failed to disable push notifications');
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  // Request permission (without subscribing)
  const requestPermission = async () => {
    if (!state.isSupported) {
      toast.error('Push notifications are not supported in your browser');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission }));
      return permission;
    } catch (error) {
      console.error('[Push] Error requesting permission:', error);
      return 'denied';
    }
  };

  return {
    ...state,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
