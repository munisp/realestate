import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';

interface PropertyUpdate {
  propertyId: number;
  status?: string;
  price?: number;
  listingType?: string;
  updatedAt: Date;
}

export function useRealtimeProperties(propertyId?: number) {
  const queryClient = useQueryClient();

  trpc.realtime.onPropertyUpdate.useSubscription(
    { propertyId },
    {
      onData(update: PropertyUpdate) {
        // Update the specific property in cache
        queryClient.setQueryData(
          ['properties', 'detail', update.propertyId],
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              ...update,
            };
          }
        );

        // Invalidate property list to refetch
        queryClient.invalidateQueries({
          queryKey: ['properties', 'list'],
        });

        // Show toast notification for significant changes
        if (update.status === 'sold') {
          console.log(`Property ${update.propertyId} has been sold!`);
        } else if (update.price) {
          console.log(`Property ${update.propertyId} price updated to $${update.price}`);
        }
      },
      onError(err) {
        console.error('Real-time property update error:', err);
      },
    }
  );
}

export function useRealtimeBookings(bookingId?: number) {
  const queryClient = useQueryClient();

  trpc.realtime.onBookingUpdate.useSubscription(
    { bookingId },
    {
      onData(update: any) {
        // Update booking in cache
        queryClient.setQueryData(
          ['bookings', 'detail', update.bookingId],
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              ...update,
            };
          }
        );

        // Invalidate booking list
        queryClient.invalidateQueries({
          queryKey: ['bookings', 'list'],
        });

        console.log(`Booking ${update.bookingId} updated:`, update);
      },
      onError(err) {
        console.error('Real-time booking update error:', err);
      },
    }
  );
}

export function useRealtimeNotifications() {
  const queryClient = useQueryClient();

  trpc.realtime.onNotification.useSubscription(undefined, {
    onData(notification: any) {
      // Add notification to cache
      queryClient.setQueryData(['notifications'], (oldData: any) => {
        if (!oldData) return [notification];
        return [notification, ...oldData];
      });

      // Show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.png',
        });
      }

      console.log('New notification:', notification);
    },
    onError(err) {
      console.error('Real-time notification error:', err);
    },
  });
}
