import { Linking } from "react-native";

/**
 * Opens the system browser or Google Maps app at the given coordinates.
 */
export function openGoogleMapsAt(lat: number, lng: number): void {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  void Linking.openURL(url);
}

/**
 * Opens Google Maps with a free-text search (address / place name).
 */
export function openGoogleMapsSearch(query: string): void {
  const q = query.trim();
  if (q.length === 0) {
    return;
  }
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  void Linking.openURL(url);
}

type ShopUserForMaps = {
  workshopLat: number | null;
  workshopLng: number | null;
  address: string | null;
  city: string | null;
  district: { name: string; nameAr: string; city: string } | null;
};

export function buildShopMapsSearchQuery(user: ShopUserForMaps): string {
  const line = [
    user.address?.trim(),
    user.district ? `${user.district.name}, ${user.district.city}` : null,
    user.city?.trim(),
    "Iraq",
  ].filter((s): s is string => Boolean(s && s.length > 0));
  return line.join(", ");
}

/**
 * Prefers saved workshop GPS; otherwise searches by address + city/district.
 */
export function openShopInGoogleMaps(user: ShopUserForMaps): void {
  const lat = user.workshopLat;
  const lng = user.workshopLng;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    openGoogleMapsAt(lat, lng);
    return;
  }
  const q = buildShopMapsSearchQuery(user);
  if (q.trim().length > 0) {
    openGoogleMapsSearch(q);
  }
}

export function canOpenShopInGoogleMaps(user: ShopUserForMaps): boolean {
  const lat = user.workshopLat;
  const lng = user.workshopLng;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return true;
  }
  return buildShopMapsSearchQuery(user).trim().length > 0;
}
