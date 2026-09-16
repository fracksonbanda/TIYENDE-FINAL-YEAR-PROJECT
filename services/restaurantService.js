import {
  addDoc, collection, deleteDoc, doc, getDocs,
  onSnapshot, query, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

export const restaurantRef = (uid) => doc(db, 'restaurants', uid);
export const menuCollection = (rid) => collection(db, 'restaurants', rid, 'menuItems');
export const discountCollection = (rid) => collection(db, 'restaurants', rid, 'discounts');

// ─── Restaurant Profile ───────────────────────────────────────────────────────

export async function createRestaurantProfile(profileData) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');
  await setDoc(restaurantRef(user.uid), {
    ownerId: user.uid,
    isOpen: true,
    rating: 5.0,
    ratingCount: 0,
    ...profileData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', user.uid), {
    role: 'restaurant',
    updatedAt: new Date().toISOString(),
  });
}

export function watchRestaurantProfile(uid, onChange, onError) {
  return onSnapshot(restaurantRef(uid), (snap) => {
    onChange(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  }, onError ?? (() => {}));
}

export async function updateRestaurantProfile(uid, updates) {
  await updateDoc(restaurantRef(uid), { ...updates, updatedAt: serverTimestamp() });
}

// ─── Menu Items ───────────────────────────────────────────────────────────────

export function watchMenuItems(restaurantId, onChange, onError) {
  return onSnapshot(menuCollection(restaurantId), (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onChange(items.sort((a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0)));
  }, onError ?? (() => {}));
}

export async function fetchMenuItems(restaurantId) {
  const snap = await getDocs(menuCollection(restaurantId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addMenuItem(restaurantId, item) {
  const ref = await addDoc(menuCollection(restaurantId), {
    available: true,
    discountPercent: 0,
    ...item,
    createdAtMs: Date.now(),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMenuItem(restaurantId, itemId, updates) {
  await updateDoc(doc(db, 'restaurants', restaurantId, 'menuItems', itemId), updates);
}

export async function deleteMenuItem(restaurantId, itemId) {
  await deleteDoc(doc(db, 'restaurants', restaurantId, 'menuItems', itemId));
}

// ─── Discount Codes ───────────────────────────────────────────────────────────

export function watchDiscounts(restaurantId, onChange, onError) {
  return onSnapshot(discountCollection(restaurantId), (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onChange(items.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0)));
  }, onError ?? (() => {}));
}

export async function addDiscount(restaurantId, discount) {
  const ref = await addDoc(discountCollection(restaurantId), {
    active: true,
    usageCount: 0,
    ...discount,
    code: discount.code.toUpperCase().trim(),
    createdAtMs: Date.now(),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDiscount(restaurantId, discountId, updates) {
  await updateDoc(
    doc(db, 'restaurants', restaurantId, 'discounts', discountId),
    updates,
  );
}

export async function deleteDiscount(restaurantId, discountId) {
  await deleteDoc(doc(db, 'restaurants', restaurantId, 'discounts', discountId));
}

// Returns the matching active discount object or null
export async function validateRestaurantDiscount(restaurantId, code) {
  const snap = await getDocs(discountCollection(restaurantId));
  const discounts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return discounts.find((d) => d.active && d.code === code.toUpperCase().trim()) || null;
}

// ─── Orders (restaurant view) ─────────────────────────────────────────────────

export function watchRestaurantOrders(restaurantId, onChange, onError) {
  const q = query(
    collection(db, 'serviceRequests'),
    where('restaurantId', '==', restaurantId),
  );
  return onSnapshot(q, (snap) => {
    const orders = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAtMs: d.data().createdAt?.toMillis?.() ?? d.data().createdAtMs ?? 0,
    }));
    onChange(orders.sort((a, b) => b.createdAtMs - a.createdAtMs));
  }, onError ?? (() => {}));
}

// ─── All Open Restaurants (customer view) ─────────────────────────────────────

export function watchOpenRestaurants(onChange, onError) {
  const q = query(collection(db, 'restaurants'), where('isOpen', '==', true));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({
      id: d.id,
      source: 'firestore',
      ...d.data(),
    })));
  }, onError ?? (() => {}));
}

export async function fetchOpenRestaurants() {
  const q = query(collection(db, 'restaurants'), where('isOpen', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, source: 'firestore', ...d.data() }));
}
