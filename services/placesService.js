import { distanceKm, LUSAKA_CENTER } from '../utils/geo';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

function normalizeWebsite(value) {
  if (!value) return '';
  return value.startsWith('http') ? value : `https://${value}`;
}

function logoFromTags(tags = {}) {
  if (tags.image?.startsWith('http')) return tags.image;
  const website = normalizeWebsite(tags.website || tags['contact:website']);
  if (!website) return '';
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(website)}&sz=128`;
}

function restaurantFromElement(element) {
  const tags = element.tags || {};
  const coords = element.lat && element.lon
    ? { latitude: element.lat, longitude: element.lon }
    : element.center
      ? { latitude: element.center.lat, longitude: element.center.lon }
      : null;

  if (!coords || !tags.name) return null;

  const km = distanceKm(LUSAKA_CENTER, coords);
  return {
    id: `osm-${element.type}-${element.id}`,
    osmId: element.id,
    osmType: element.type,
    name: tags.name,
    cuisine: tags.cuisine || tags.amenity || 'restaurant',
    brand: tags.brand || '',
    phone: tags.phone || tags['contact:phone'] || '',
    website: normalizeWebsite(tags.website || tags['contact:website']),
    openingHours: tags.opening_hours || '',
    logoURL: logoFromTags(tags),
    coords,
    distanceKm: Number(km.toFixed(2)),
    address: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ') || tags['addr:suburb'] || 'Lusaka',
    source: 'OpenStreetMap',
  };
}

export async function fetchRestaurantsFromOSM() {
  const query = `
    [out:json][timeout:20];
    (
      node["amenity"~"restaurant|fast_food|cafe|food_court"](-15.48,28.20,-15.30,28.48);
      way["amenity"~"restaurant|fast_food|cafe|food_court"](-15.48,28.20,-15.30,28.48);
      relation["amenity"~"restaurant|fast_food|cafe|food_court"](-15.48,28.20,-15.30,28.48);
    );
    out center tags 120;
  `;

  let lastError = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!response.ok) throw new Error(`OpenStreetMap request failed (${response.status})`);
      const payload = await response.json();
      const restaurants = (payload.elements || [])
        .map(restaurantFromElement)
        .filter(Boolean)
        .sort((a, b) => a.distanceKm - b.distanceKm);
      return restaurants;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Could not load restaurants from OpenStreetMap.');
}
