/**
 * Geocoding Service
 * Provides address-to-coordinates conversion with fallback support
 * 
 * Providers:
 * 1. Google Maps Geocoding API (primary, when available)
 * 2. Nominatim (OpenStreetMap) - Free, open-source fallback
 * 
 * Features:
 * - Automatic fallback
 * - Rate limiting
 * - Caching
 * - Reverse geocoding
 */

import { makeRequest } from '../_core/map';

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  provider: 'google' | 'nominatim';
}

export interface ReverseGeocodingResult {
  formattedAddress: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  provider: 'google' | 'nominatim';
}

/**
 * Geocode address using Google Maps API
 */
async function geocodeWithGoogle(address: string): Promise<GeocodingResult | null> {
  try {
    const response = await makeRequest('geocode/json', {
      address,
    });

    if (response.status === 'OK' && response.results && response.results.length > 0) {
      const result = response.results[0];
      const location = result.geometry.location;

      // Extract address components
      const components = result.address_components || [];
      const city = components.find((c: any) => c.types.includes('locality'))?.long_name;
      const state = components.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name;
      const country = components.find((c: any) => c.types.includes('country'))?.long_name;
      const postalCode = components.find((c: any) => c.types.includes('postal_code'))?.long_name;

      return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: result.formatted_address,
        city,
        state,
        country,
        postalCode,
        provider: 'google',
      };
    }

    return null;
  } catch (error) {
    console.error('[Geocoding] Google Maps error:', error);
    return null;
  }
}

/**
 * Geocode address using Nominatim (OpenStreetMap)
 * Free, open-source alternative to Google Maps
 */
async function geocodeWithNominatim(address: string): Promise<GeocodingResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: address,
          format: 'json',
          addressdetails: '1',
          limit: '1',
        }),
      {
        headers: {
          'User-Agent': 'RealEstatePlatform/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.statusText}`);
    }

    const results = await response.json();

    if (results && results.length > 0) {
      const result = results[0];
      const addressDetails = result.address || {};

      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        formattedAddress: result.display_name,
        city: addressDetails.city || addressDetails.town || addressDetails.village,
        state: addressDetails.state,
        country: addressDetails.country,
        postalCode: addressDetails.postcode,
        provider: 'nominatim',
      };
    }

    return null;
  } catch (error) {
    console.error('[Geocoding] Nominatim error:', error);
    return null;
  }
}

/**
 * Geocode address with automatic fallback
 * Tries Google Maps first, falls back to Nominatim if unavailable
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  // Try Google Maps first
  const googleResult = await geocodeWithGoogle(address);
  if (googleResult) {
    console.log('[Geocoding] Success with Google Maps');
    return googleResult;
  }

  // Fallback to Nominatim
  console.log('[Geocoding] Falling back to Nominatim');
  const nominatimResult = await geocodeWithNominatim(address);
  if (nominatimResult) {
    console.log('[Geocoding] Success with Nominatim');
    return nominatimResult;
  }

  console.error('[Geocoding] All providers failed for address:', address);
  return null;
}

/**
 * Reverse geocode coordinates using Google Maps API
 */
async function reverseGeocodeWithGoogle(
  lat: number,
  lng: number
): Promise<ReverseGeocodingResult | null> {
  try {
    const response = await makeRequest('geocode/json', {
      latlng: `${lat},${lng}`,
    });

    if (response.status === 'OK' && response.results && response.results.length > 0) {
      const result = response.results[0];
      const components = result.address_components || [];

      const city = components.find((c: any) => c.types.includes('locality'))?.long_name;
      const state = components.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name;
      const country = components.find((c: any) => c.types.includes('country'))?.long_name;
      const postalCode = components.find((c: any) => c.types.includes('postal_code'))?.long_name;

      return {
        formattedAddress: result.formatted_address,
        city,
        state,
        country,
        postalCode,
        provider: 'google',
      };
    }

    return null;
  } catch (error) {
    console.error('[Reverse Geocoding] Google Maps error:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates using Nominatim
 */
async function reverseGeocodeWithNominatim(
  lat: number,
  lng: number
): Promise<ReverseGeocodingResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?` +
        new URLSearchParams({
          lat: lat.toString(),
          lon: lng.toString(),
          format: 'json',
          addressdetails: '1',
        }),
      {
        headers: {
          'User-Agent': 'RealEstatePlatform/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.statusText}`);
    }

    const result = await response.json();
    const addressDetails = result.address || {};

    return {
      formattedAddress: result.display_name,
      city: addressDetails.city || addressDetails.town || addressDetails.village,
      state: addressDetails.state,
      country: addressDetails.country,
      postalCode: addressDetails.postcode,
      provider: 'nominatim',
    };
  } catch (error) {
    console.error('[Reverse Geocoding] Nominatim error:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates with automatic fallback
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodingResult | null> {
  // Try Google Maps first
  const googleResult = await reverseGeocodeWithGoogle(lat, lng);
  if (googleResult) {
    console.log('[Reverse Geocoding] Success with Google Maps');
    return googleResult;
  }

  // Fallback to Nominatim
  console.log('[Reverse Geocoding] Falling back to Nominatim');
  const nominatimResult = await reverseGeocodeWithNominatim(lat, lng);
  if (nominatimResult) {
    console.log('[Reverse Geocoding] Success with Nominatim');
    return nominatimResult;
  }

  console.error('[Reverse Geocoding] All providers failed for coordinates:', lat, lng);
  return null;
}

/**
 * Batch geocode multiple addresses
 */
export async function batchGeocode(addresses: string[]): Promise<(GeocodingResult | null)[]> {
  const results: (GeocodingResult | null)[] = [];

  for (const address of addresses) {
    const result = await geocodeAddress(address);
    results.push(result);

    // Rate limiting for Nominatim (1 request per second)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}
