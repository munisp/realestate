/**
 * Native Share Sheet utility
 * Uses React Native Share API for native iOS/Android share sheets
 */
import { Share, Platform, Alert } from 'react-native';

export interface SharePropertyOptions {
  propertyId: string;
  title: string;
  price: string;
  location: string;
  imageUrl?: string;
  baseUrl?: string;
}

export async function shareProperty(opts: SharePropertyOptions): Promise<boolean> {
  const url = `${opts.baseUrl || 'https://realestate.manus.space'}/property/${opts.propertyId}`;
  const message = `🏠 Check out this property on NaijaHomes!\n\n${opts.title}\n📍 ${opts.location}\n💰 ${opts.price}\n\n${url}`;

  try {
    const result = await Share.share(
      {
        message,
        url: Platform.OS === 'ios' ? url : undefined, // iOS shows URL separately
        title: `${opts.title} - NaijaHomes`,
      },
      {
        dialogTitle: 'Share Property', // Android only
        subject: `${opts.title} on NaijaHomes`, // Email subject
        tintColor: '#3b82f6', // iOS only
      }
    );
    return result.action === Share.sharedAction;
  } catch (error: any) {
    Alert.alert('Share Failed', error.message || 'Could not share this property.');
    return false;
  }
}

export async function shareSearchResults(query: string, count: number, baseUrl = 'https://realestate.manus.space'): Promise<boolean> {
  const url = `${baseUrl}/search?q=${encodeURIComponent(query)}`;
  const message = `Found ${count} properties for "${query}" on NaijaHomes!\n\n${url}`;
  try {
    const result = await Share.share({ message, url: Platform.OS === 'ios' ? url : undefined, title: 'Property Search Results' });
    return result.action === Share.sharedAction;
  } catch { return false; }
}

export async function shareReferralLink(userId: string, baseUrl = 'https://realestate.manus.space'): Promise<boolean> {
  const url = `${baseUrl}/join?ref=${userId}`;
  const message = `Join me on NaijaHomes — Nigeria's smartest property platform!\n\nUse my referral link to get started:\n${url}`;
  try {
    const result = await Share.share({ message, url: Platform.OS === 'ios' ? url : undefined, title: 'Join NaijaHomes' });
    return result.action === Share.sharedAction;
  } catch { return false; }
}
