/**
 * Deep Link Handler for React Native App
 * Handles universal links (iOS) and app links (Android)
 */

import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';

interface DeepLinkHandlerProps {
  children: React.ReactNode;
}

export const DeepLinkHandler: React.FC<DeepLinkHandlerProps> = ({ children }) => {
  const navigation = useNavigation();

  useEffect(() => {
    // Handle initial URL when app is opened from a link
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    // Handle URL when app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Handle notification taps
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data.url) {
          handleDeepLink(data.url as string);
        }
      }
    );

    handleInitialURL();

    return () => {
      subscription.remove();
      notificationSubscription.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    console.log('Deep link received:', url);

    try {
      const route = parseDeepLink(url);
      if (route) {
        navigateToRoute(route);
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  };

  const parseDeepLink = (url: string): DeepLinkRoute | null => {
    // Handle both custom scheme (realestate://) and universal links (https://)
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const params = Object.fromEntries(urlObj.searchParams);

    // Property detail: /property/:id
    const propertyMatch = path.match(/^\/property\/(\d+)/);
    if (propertyMatch) {
      return {
        screen: 'PropertyDetail',
        params: { propertyId: propertyMatch[1] },
      };
    }

    // Search: /search?query=...&location=...
    if (path.startsWith('/search')) {
      return {
        screen: 'Search',
        params: {
          query: params.query || '',
          location: params.location || '',
          type: params.type || '',
          minPrice: params.minPrice || '',
          maxPrice: params.maxPrice || '',
        },
      };
    }

    // Agent profile: /agent/:id
    const agentMatch = path.match(/^\/agent\/(\d+)/);
    if (agentMatch) {
      return {
        screen: 'AgentProfile',
        params: { agentId: agentMatch[1] },
      };
    }

    // Saved properties: /favorites
    if (path === '/favorites') {
      return {
        screen: 'Favorites',
        params: {},
      };
    }

    // Messages: /messages/:conversationId?
    const messagesMatch = path.match(/^\/messages(?:\/(\d+))?/);
    if (messagesMatch) {
      return {
        screen: 'Messages',
        params: messagesMatch[1] ? { conversationId: messagesMatch[1] } : {},
      };
    }

    // Profile: /profile
    if (path === '/profile') {
      return {
        screen: 'Profile',
        params: {},
      };
    }

    // Notifications: /notifications
    if (path === '/notifications') {
      return {
        screen: 'Notifications',
        params: {},
      };
    }

    // Map view: /map?lat=...&lng=...
    if (path === '/map') {
      return {
        screen: 'MapView',
        params: {
          latitude: params.lat ? parseFloat(params.lat) : undefined,
          longitude: params.lng ? parseFloat(params.lng) : undefined,
        },
      };
    }

    // Shortlet booking: /shortlet/:id
    const shortletMatch = path.match(/^\/shortlet\/(\d+)/);
    if (shortletMatch) {
      return {
        screen: 'ShortletDetail',
        params: { shortletId: shortletMatch[1] },
      };
    }

    // Builder project: /builder/project/:id
    const builderMatch = path.match(/^\/builder\/project\/(\d+)/);
    if (builderMatch) {
      return {
        screen: 'BuilderProject',
        params: { projectId: builderMatch[1] },
      };
    }

    // Default: Home
    if (path === '/' || path === '') {
      return {
        screen: 'Home',
        params: {},
      };
    }

    return null;
  };

  const navigateToRoute = (route: DeepLinkRoute) => {
    // Use setTimeout to ensure navigation happens after the component is mounted
    setTimeout(() => {
      try {
        navigation.navigate(route.screen as never, route.params as never);
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback to home if navigation fails
        navigation.navigate('Home' as never);
      }
    }, 100);
  };

  return <>{children}</>;
};

interface DeepLinkRoute {
  screen: string;
  params: Record<string, any>;
}

/**
 * Generate deep link URL for sharing
 */
export const generateDeepLink = (screen: string, params: Record<string, any> = {}): string => {
  const baseUrl = 'https://realestate.manus.space';
  
  switch (screen) {
    case 'PropertyDetail':
      return `${baseUrl}/property/${params.propertyId}`;
    
    case 'Search':
      const searchParams = new URLSearchParams(params).toString();
      return `${baseUrl}/search?${searchParams}`;
    
    case 'AgentProfile':
      return `${baseUrl}/agent/${params.agentId}`;
    
    case 'ShortletDetail':
      return `${baseUrl}/shortlet/${params.shortletId}`;
    
    case 'BuilderProject':
      return `${baseUrl}/builder/project/${params.projectId}`;
    
    case 'MapView':
      return `${baseUrl}/map?lat=${params.latitude}&lng=${params.longitude}`;
    
    default:
      return baseUrl;
  }
};

/**
 * Generate QR code data for property
 */
export const generatePropertyQRData = (propertyId: number): string => {
  return generateDeepLink('PropertyDetail', { propertyId });
};

/**
 * Share property via deep link
 */
export const shareProperty = async (propertyId: number, propertyTitle: string) => {
  const url = generateDeepLink('PropertyDetail', { propertyId });
  
  try {
    const { Share } = await import('react-native');
    await Share.share({
      message: `Check out this property: ${propertyTitle}\n${url}`,
      url: url,
      title: propertyTitle,
    });
  } catch (error) {
    console.error('Error sharing:', error);
  }
};

export default DeepLinkHandler;
