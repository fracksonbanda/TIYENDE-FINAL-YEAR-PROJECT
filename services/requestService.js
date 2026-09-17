import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  DEFAULT_PICKUP,
  distanceKm,
  estimateDurationMinutes,
  estimateFare,
  formatDistance,
} from '../utils/geo';

const ACTIVE_STATUSES = [
  'pending', 'accepted', 'arrived', 'in_progress',
  'pending_restaurant', 'restaurant_confirmed', 'preparing',
  'ready_for_pickup', 'at_restaurant',
];
const DRIVER_ACTIVE_STATUSES = ['accepted', 'arrived', 'in_progress', 'at_restaurant'];

export function requestCollection() {
  return collection(db, 'serviceRequests');
}

export function normalizeRequest(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAtMs: data.createdAt?.toMillis?.() ?? 0,
    updatedAtMs: data.updatedAt?.toMillis?.() ?? 0,
  };
}

export async function getCurrentUserProfile() {
  const user = auth.currentUser;
  if (!user) return null;
  const snap = await getDoc(doc(db, 'users', user.uid));
  return {
    id: user.uid,
    email: user.email,
    phoneNumber: user.phoneNumber,
    displayName: user.displayName,
    photoURL: user.photoURL,
    ...(snap.exists() ? snap.data() : {}),
  };
}

export function watchPassengerActiveRequest(passengerId, onChange, onError) {
  const q = query(
    requestCollection(),
    where('passengerId', '==', passengerId),
    where('status', 'in', ACTIVE_STATUSES),
  );

  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(normalizeRequest)
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
    onChange(items[0] || null, items);
  }, onError);
}

export function watchPassengerCompletedRequests(passengerId, onChange, onError) {
  const q = query(
    requestCollection(),
    where('passengerId', '==', passengerId),
    where('status', '==', 'completed'),
  );

  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(normalizeRequest)
      .sort((a, b) => b.completedAt?.toMillis?.() - a.completedAt?.toMillis?.());
    onChange(items);
  }, onError);
}

export function watchDriverPendingRequests(onChange, onError) {
  // 'pending' = rides/delivery/cargo; 'ready_for_pickup' = food orders confirmed by restaurant
  const q = query(requestCollection(), where('status', 'in', ['pending', 'ready_for_pickup']));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(normalizeRequest)
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
    onChange(items);
  }, onError);
}

export function watchDriverActiveRequest(driverId, onChange, onError) {
  const q = query(
    requestCollection(),
    where('driverId', '==', driverId),
    where('status', 'in', DRIVER_ACTIVE_STATUSES),
  );
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(normalizeRequest)
      .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    onChange(items[0] || null, items);
  }, onError);
}

export function watchDriverCompletedRequests(driverId, onChange, onError) {
  const q = query(
    requestCollection(),
    where('driverId', '==', driverId),
    where('status', '==', 'completed'),
  );

  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(normalizeRequest)
      .sort((a, b) => b.completedAt?.toMillis?.() - a.completedAt?.toMillis?.());
    onChange(items);
  }, onError);
}

function profileName(profile) {
  return profile?.fullName || profile?.displayName || profile?.email || profile?.phoneNumber || 'Tiyende user';
}

export async function createRideRequest({ destination, rideType, fareOffer, paymentMethod, pickup = DEFAULT_PICKUP, promoCode, extraStop }) {
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('You need to sign in before booking.');

  const km = distanceKm(pickup.coords, destination.coords);
  const suggestedFare = estimateFare({ distance: km, serviceType: 'ride', rideType });
  const cleanOffer = Number.parseInt(fareOffer, 10);
  const finalFare = Number.isFinite(cleanOffer) && cleanOffer > 0 ? cleanOffer : suggestedFare;
  const discount = promoCode?.trim().toUpperCase() === 'TIYENDE10' ? Math.ceil(finalFare * 0.1) : 0;

  const payload = {
    serviceType: 'ride',
    status: 'pending',
    passengerId: profile.id,
    passengerName: profileName(profile),
    passengerPhone: profile.phoneNumber || profile.phone || '',
    passengerPhotoURL: profile.photoURL || null,
    passengerRating: profile.rating || 5,
    pickupName: pickup.name,
    pickupCoords: pickup.coords,
    destinationName: destination.name,
    destinationCoords: destination.coords,
    destinationCategory: destination.category || '',
    rideType,
    fare: Math.max(1, finalFare - discount),
    suggestedFare,
    discount,
    promoCode: discount ? promoCode.trim().toUpperCase() : '',
    paymentMethod,
    distanceKm: Number(km.toFixed(2)),
    distanceText: formatDistance(km),
    durationMinutes: estimateDurationMinutes(km, 'ride'),
    ...(extraStop ? { extraStopName: extraStop.name, extraStopCoords: extraStop.coords } : {}),
    driverId: null,
    driverName: null,
    driverPhotoURL: null,
    vehicleModel: null,
    licensePlate: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(requestCollection(), payload);
  return ref.id;
}

export async function createServiceRequest(payload) {
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('You need to sign in before booking.');

  const requestPayload = {
    status: 'pending',
    passengerId: profile.id,
    passengerName: profileName(profile),
    passengerPhone: profile.phoneNumber || profile.phone || '',
    passengerPhotoURL: profile.photoURL || null,
    passengerRating: profile.rating || 5,
    driverId: null,
    driverName: null,
    driverPhotoURL: null,
    vehicleModel: null,
    licensePlate: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...payload,
  };

  const ref = await addDoc(requestCollection(), requestPayload);
  return ref.id;
}

export async function acceptRequest(requestId) {
  const driver = await getCurrentUserProfile();
  if (!driver) throw new Error('You need to sign in as a driver first.');

  const requestRef = doc(db, 'serviceRequests', requestId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(requestRef);
    if (!snap.exists()) throw new Error('This request no longer exists.');
    const request = snap.data();
    const acceptableStatuses = ['pending', 'ready_for_pickup'];
    if (!acceptableStatuses.includes(request.status)) throw new Error('Another driver already accepted this request.');

    transaction.update(requestRef, {
      status: 'accepted',
      driverId: driver.id,
      driverName: profileName(driver),
      driverPhotoURL: driver.photoURL || null,
      driverPhone: driver.phoneNumber || driver.phone || '',
      driverRating: driver.rating || 5,
      vehicleModel: driver.vehicleModel || '',
      vehicleType: driver.vehicleType || '',
      licensePlate: driver.licensePlate || '',
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function updateRequestStatus(requestId, status, extra = {}) {
  const ts = {};
  if (status === 'completed')           ts.completedAt = serverTimestamp();
  if (status === 'cancelled')           ts.cancelledAt = serverTimestamp();
  if (status === 'arrived')             ts.arrivedAt = serverTimestamp();
  if (status === 'in_progress')         ts.startedAt = serverTimestamp();
  if (status === 'restaurant_confirmed') ts.restaurantConfirmedAt = serverTimestamp();
  if (status === 'preparing')           ts.preparingAt = serverTimestamp();
  if (status === 'ready_for_pickup')    ts.readyAt = serverTimestamp();
  if (status === 'at_restaurant')       ts.atRestaurantAt = serverTimestamp();
  if (status === 'delivered')           ts.deliveredAt = serverTimestamp();

  await updateDoc(doc(db, 'serviceRequests', requestId), {
    status,
    ...extra,
    ...ts,
    updatedAt: serverTimestamp(),
  });
}

export function statusLabel(status, serviceType = 'ride') {
  if (serviceType === 'food') {
    const foodLabels = {
      pending_restaurant:  'Waiting for restaurant to confirm',
      restaurant_confirmed:'Restaurant confirmed your order',
      preparing:           'Restaurant is preparing your food',
      ready_for_pickup:    'Looking for a courier',
      pending:             'Looking for a courier',
      accepted:            'Courier heading to restaurant',
      at_restaurant:       'Courier at restaurant',
      in_progress:         'On the way to you',
      completed:           'Delivered',
      cancelled:           'Cancelled',
    };
    return foodLabels[status] || status;
  }
  const labels = {
    pending:     'Looking for a driver',
    accepted:    'Driver accepted',
    arrived:     'Driver arrived',
    in_progress: 'Trip in progress',
    completed:   'Completed',
    cancelled:   'Cancelled',
  };
  return labels[status] || status;
}

async function applyRatingToProfile(userId, ratingValue) {
  const userRef = doc(db, 'users', userId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    const data = snap.exists() ? snap.data() : {};
    const prevCount = data.ratingCount || 0;
    const prevSum = data.ratingSum ?? (data.rating ? data.rating * (prevCount || 1) : 0);
    const nextCount = prevCount + 1;
    const nextSum = prevSum + ratingValue;
    const nextRating = Math.round((nextSum / nextCount) * 10) / 10;
    transaction.set(userRef, {
      ratingSum: nextSum,
      ratingCount: nextCount,
      rating: nextRating,
    }, { merge: true });
  });
}

export async function rateDriver(requestId, driverId, ratingValue) {
  await updateDoc(doc(db, 'serviceRequests', requestId), {
    driverRatingByPassenger: ratingValue,
    updatedAt: serverTimestamp(),
  });
  if (driverId) await applyRatingToProfile(driverId, ratingValue);
}

export async function ratePassenger(requestId, passengerId, ratingValue) {
  await updateDoc(doc(db, 'serviceRequests', requestId), {
    passengerRatingByDriver: ratingValue,
    updatedAt: serverTimestamp(),
  });
  if (passengerId) await applyRatingToProfile(passengerId, ratingValue);
}

export function foodStatusToStage(status) {
  const map = {
    pending_restaurant:   0,
    restaurant_confirmed: 1,
    preparing:            2,
    ready_for_pickup:     3,
    pending:              3,
    accepted:             4,
    at_restaurant:        5,
    in_progress:          6,
    completed:            7,
  };
  return map[status] ?? 0;
}
