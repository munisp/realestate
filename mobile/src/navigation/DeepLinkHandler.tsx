/**
 * Enhanced Deep Link Handler
 * Handles universal links (HTTPS) and custom scheme (realestate://)
 * Supports: /property/:id, /search?q=..., /agent/:id, /invite/:code, /tour/:id
 */
import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';

export const DEEP_LINK_PREFIXES = [
  'https://realestate.manus.space',
  'https://www.realestate.manus.space',
  'realestate://',
];

export const LINKING_CONFIG = {
  prefixes: DEEP_LINK_PREFIXES,
  config: {
    screens: {
      HomeTabs: {
        screens: {
          Home: '',
          Search: 'search',
          Favorites: 'favorites',
          Profile: 'profile',
        },
      },
      PropertyDetail: 'property/:propertyId',
      AgentProfile: 'agent/:agentId',
      TourBooking: 'tour/:tourId',
      InviteAccept: 'invite/:code',
      KYC: 'kyc',
      // Magic link auth
      MagicLinkAuth: 'auth/magic/:token',
    },
  },
};

interface DeepLinkHandlerProps {
  navigation?: any;
}

export function DeepLinkHandler({ navigation }: DeepLinkHandlerProps) {
  useEffect(() => {
    // Handle links that open the app from cold start
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink(url, navigation);
    });

    // Handle links while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url, navigation);
    });

    return () => subscription.remove();
  }, [navigation]);

  return null;
}

function handleDeepLink(url: string, navigation?: any) {
  if (!url || !navigation) return;

  try {
    // Normalize custom scheme to HTTPS for parsing
    const normalized = url.replace('realestate://', 'https://realestate.manus.space/');
    const parsed = new URL(normalized);
    const path = parsed.pathname;
    const params = Object.fromEntries(parsed.searchParams.entries());

    if (path.startsWith('/property/')) {
      const propertyId = path.split('/property/')[1];
      if (propertyId) navigation.navigate('PropertyDetail', { propertyId });
    } else if (path === '/search') {
      navigation.navigate('HomeTabs', { screen: 'Search', params: { query: params.q || '' } });
    } else if (path.startsWith('/agent/')) {
      const agentId = path.split('/agent/')[1];
      if (agentId) navigation.navigate('AgentProfile', { agentId });
    } else if (path.startsWith('/invite/')) {
      const code = path.split('/invite/')[1];
      if (code) navigation.navigate('InviteAccept', { code });
    } else if (path.startsWith('/auth/magic/')) {
      const token = path.split('/auth/magic/')[1];
      if (token) navigation.navigate('MagicLinkAuth', { token });
    } else if (path === '/kyc') {
      navigation.navigate('KYC');
    }
  } catch (e) {
    console.warn('Deep link parse error:', e);
  }
}

export default DeepLinkHandler;
