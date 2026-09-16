export const LUSAKA_CENTER = { latitude: -15.3875, longitude: 28.3228 };

export const DEFAULT_PICKUP = {
  name: 'Current location',
  coords: LUSAKA_CENTER,
};

export const LUSAKA_PLACES = [
  // Shopping & Malls
  { name: 'East Park Mall', icon: 'bag-handle-outline', category: 'Shopping', coords: { latitude: -15.3837, longitude: 28.3700 } },
  { name: 'Manda Hill Mall', icon: 'bag-handle-outline', category: 'Shopping', coords: { latitude: -15.3947, longitude: 28.3233 } },
  { name: 'Levy Junction Mall', icon: 'bag-handle-outline', category: 'Shopping', coords: { latitude: -15.4052, longitude: 28.2902 } },
  { name: 'Arcades Shopping Centre', icon: 'storefront-outline', category: 'Shopping', coords: { latitude: -15.3918, longitude: 28.3487 } },
  { name: 'Longacres Mall', icon: 'bag-outline', category: 'Shopping', coords: { latitude: -15.3998, longitude: 28.3058 } },
  { name: 'Crossroads Mall', icon: 'bag-handle-outline', category: 'Shopping', coords: { latitude: -15.4020, longitude: 28.3600 } },
  { name: 'Woodlands Shopping Centre', icon: 'storefront-outline', category: 'Shopping', coords: { latitude: -15.3767, longitude: 28.3483 } },
  { name: 'Makeni Mall', icon: 'bag-handle-outline', category: 'Shopping', coords: { latitude: -15.4460, longitude: 28.2900 } },
  // Education
  { name: 'University of Zambia', icon: 'school-outline', category: 'Education', coords: { latitude: -15.3986, longitude: 28.3132 } },
  { name: 'Evelyn Hone College', icon: 'school-outline', category: 'Education', coords: { latitude: -15.4158, longitude: 28.2978 } },
  { name: 'ZCAS University', icon: 'school-outline', category: 'Education', coords: { latitude: -15.4001, longitude: 28.3180 } },
  { name: 'CBU Lusaka Campus', icon: 'school-outline', category: 'Education', coords: { latitude: -15.3870, longitude: 28.3320 } },
  // Transport
  { name: 'Kenneth Kaunda Airport', icon: 'airplane-outline', category: 'Transport', coords: { latitude: -15.3308, longitude: 28.4526 } },
  { name: 'Lusaka Inter-City Bus Terminal', icon: 'bus-outline', category: 'Transport', coords: { latitude: -15.4200, longitude: 28.2820 } },
  // Health
  { name: 'UTH Hospital', icon: 'medical-outline', category: 'Health', coords: { latitude: -15.4149, longitude: 28.2971 } },
  { name: 'Levy Mwanawasa Hospital', icon: 'medical-outline', category: 'Health', coords: { latitude: -15.3763, longitude: 28.3537 } },
  { name: "Children's Hospital", icon: 'medical-outline', category: 'Health', coords: { latitude: -15.4139, longitude: 28.2965 } },
  { name: 'Beit Cure Hospital', icon: 'medical-outline', category: 'Health', coords: { latitude: -15.3956, longitude: 28.3122 } },
  { name: 'Maina Soko Hospital', icon: 'medical-outline', category: 'Health', coords: { latitude: -15.4175, longitude: 28.3050 } },
  // Markets & Business
  { name: 'Lusaka City Market', icon: 'cart-outline', category: 'Market', coords: { latitude: -15.4167, longitude: 28.2833 } },
  { name: 'Soweto Market', icon: 'cart-outline', category: 'Market', coords: { latitude: -15.4203, longitude: 28.2860 } },
  { name: 'Comesa Market', icon: 'cart-outline', category: 'Market', coords: { latitude: -15.4198, longitude: 28.2870 } },
  { name: 'Cairo Road CBD', icon: 'business-outline', category: 'Business', coords: { latitude: -15.4145, longitude: 28.2853 } },
  { name: 'Lusaka Square', icon: 'business-outline', category: 'Business', coords: { latitude: -15.4130, longitude: 28.2900 } },
  // Neighborhoods
  { name: 'Kabulonga', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.3803, longitude: 28.3525 } },
  { name: 'Woodlands', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.3767, longitude: 28.3450 } },
  { name: 'Chelston', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.3610, longitude: 28.3870 } },
  { name: 'Northmead', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.3862, longitude: 28.3348 } },
  { name: 'Roma', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.3980, longitude: 28.3540 } },
  { name: 'Chilenje', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.4120, longitude: 28.3340 } },
  { name: 'Kalingalinga', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.3960, longitude: 28.3620 } },
  { name: 'Mtendere', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.3870, longitude: 28.3960 } },
  { name: 'Mandevu', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.4110, longitude: 28.3020 } },
  { name: 'Kabwata', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.4194, longitude: 28.3000 } },
  { name: 'Emmasdale', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.4122, longitude: 28.3090 } },
  { name: 'Handsworth Park', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.3850, longitude: 28.2990 } },
  { name: 'Rhodes Park', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.4005, longitude: 28.3012 } },
  { name: 'Avondale', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.3947, longitude: 28.3062 } },
  { name: 'Ibex Hill', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.3680, longitude: 28.3580 } },
  { name: 'Makeni', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.4460, longitude: 28.2900 } },
  { name: 'Lilayi', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.4720, longitude: 28.3025 } },
  { name: 'Garden', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.4070, longitude: 28.3350 } },
  { name: 'Olympia', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.4130, longitude: 28.3270 } },
  { name: 'Sunningdale', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.4070, longitude: 28.2900 } },
  { name: 'Thornpark', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.3920, longitude: 28.2993 } },
  { name: 'Mass Media', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.3872, longitude: 28.3200 } },
  { name: 'Lusaka West', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.4100, longitude: 28.2620 } },
  { name: 'Chawama', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.4370, longitude: 28.3130 } },
  { name: 'George Compound', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.4160, longitude: 28.3170 } },
  { name: 'Matero', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.4200, longitude: 28.3410 } },
  { name: 'Libala', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.4301, longitude: 28.3000 } },
  { name: "Ng'ombe", icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.3620, longitude: 28.3350 } },
  { name: 'Chudleigh', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.3780, longitude: 28.3050 } },
  { name: 'Fairview', icon: 'home-outline', category: 'Neighborhood', coords: { latitude: -15.3990, longitude: 28.3450 } },
  // Landmarks & Sports
  { name: 'Heroes Stadium', icon: 'trophy-outline', category: 'Sports', coords: { latitude: -15.3870, longitude: 28.3150 } },
  { name: 'Woodlands Stadium', icon: 'trophy-outline', category: 'Sports', coords: { latitude: -15.3700, longitude: 28.3450 } },
  { name: 'Independence Avenue', icon: 'business-outline', category: 'Landmark', coords: { latitude: -15.3997, longitude: 28.2978 } },
  { name: 'Lusaka National Museum', icon: 'book-outline', category: 'Culture', coords: { latitude: -15.4118, longitude: 28.2892 } },
];

export const RIDE_TYPES = [
  { id: 'standard', label: 'Standard', icon: 'car-sport-outline', multiplier: 1, seats: 4 },
  { id: 'boda', label: 'Boda', icon: 'bicycle-outline', multiplier: 0.65, seats: 1 },
  { id: 'comfort', label: 'Comfort', icon: 'diamond-outline', multiplier: 1.25, seats: 4 },
  { id: 'xl', label: 'XL', icon: 'bus-outline', multiplier: 1.55, seats: 6 },
];

export function toRad(value) {
  return (value * Math.PI) / 180;
}

export function distanceKm(from, to) {
  if (!from || !to) return 0;
  const earthRadiusKm = 6371;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function estimateDurationMinutes(km, serviceType = 'ride') {
  const speed = serviceType === 'cargo' ? 26 : serviceType === 'food' ? 22 : 30;
  return Math.max(6, Math.round((km / speed) * 60 + 5));
}

export function estimateFare({ distance = 0, serviceType = 'ride', rideType = 'standard', base }) {
  const ride = RIDE_TYPES.find((type) => type.id === rideType) || RIDE_TYPES[0];
  const baseFare = base ?? (
    rideType === 'boda' ? 15
      : serviceType === 'cargo' ? 75
        : serviceType === 'delivery' ? 25
          : serviceType === 'food' ? 20
            : 28
  );
  const perKm = rideType === 'boda' ? 5
    : serviceType === 'cargo' ? 16
      : serviceType === 'delivery' ? 7
        : serviceType === 'food' ? 6
          : 8;
  return Math.max(baseFare, Math.round((baseFare + distance * perKm) * ride.multiplier));
}

export function formatDistance(km) {
  if (!km || km < 0.1) return 'Nearby';
  return `${km.toFixed(km >= 10 ? 0 : 1)} km`;
}

export function initialsFromName(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'T';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

export function buildMapRegion(from, to) {
  if (!to) return { ...from, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  return {
    latitude: (from.latitude + to.latitude) / 2,
    longitude: (from.longitude + to.longitude) / 2,
    latitudeDelta: Math.abs(from.latitude - to.latitude) * 2.5 + 0.02,
    longitudeDelta: Math.abs(from.longitude - to.longitude) * 2.5 + 0.02,
  };
}
