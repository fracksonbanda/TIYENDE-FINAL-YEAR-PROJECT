import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

function getRequestId(requestOrId) {
  return typeof requestOrId === 'string' ? requestOrId : requestOrId?.id;
}

function assertParticipant(request) {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to sign in to chat.');
  if (!request?.id) throw new Error('This request is not ready for chat yet.');

  const isPassenger = request.passengerId === user.uid;
  const isDriver = request.driverId === user.uid;
  if (!isPassenger && !isDriver) {
    throw new Error('Only the passenger and assigned driver can use this chat.');
  }

  return {
    user,
    role: isDriver ? 'driver' : 'passenger',
    name: isDriver ? request.driverName : request.passengerName,
    photoURL: isDriver ? request.driverPhotoURL : request.passengerPhotoURL,
  };
}

export function messageCollection(requestOrId) {
  const requestId = getRequestId(requestOrId);
  return collection(db, 'serviceRequests', requestId, 'messages');
}

export function watchRequestMessages(requestId, onChange, onError) {
  if (!requestId) return () => {};

  const q = query(messageCollection(requestId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAtMs: data.createdAt?.toMillis?.() ?? data.createdAtMs ?? 0,
      };
    }));
  }, onError);
}

export async function sendRequestMessage(request, body) {
  const text = body.trim();
  if (!text) return null;

  const sender = assertParticipant(request);
  const message = {
    type: 'text',
    body: text,
    senderId: sender.user.uid,
    senderRole: sender.role,
    senderName: sender.name || 'Tiyende user',
    senderPhotoURL: sender.photoURL || null,
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  };

  const messageRef = await addDoc(messageCollection(request.id), message);
  await updateDoc(doc(db, 'serviceRequests', request.id), {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
    lastMessageBy: sender.user.uid,
  });
  return messageRef.id;
}

export async function logDataCallStarted(request) {
  const sender = assertParticipant(request);
  await addDoc(messageCollection(request.id), {
    type: 'call',
    body: 'Started a data call',
    senderId: sender.user.uid,
    senderRole: sender.role,
    senderName: sender.name || 'Tiyende user',
    senderPhotoURL: sender.photoURL || null,
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  });
  await updateDoc(doc(db, 'serviceRequests', request.id), {
    lastMessage: 'Data call started',
    lastMessageAt: serverTimestamp(),
    lastMessageBy: sender.user.uid,
  });
}

export function getPeerForRequest(request) {
  const user = auth.currentUser;
  const isDriver = request?.driverId === user?.uid;
  return {
    name: isDriver ? request?.passengerName : request?.driverName,
    photoURL: isDriver ? request?.passengerPhotoURL : request?.driverPhotoURL,
    role: isDriver ? 'Passenger' : 'Driver',
  };
}

export function buildDataCallUrl(request) {
  const safeRoom = `Tiyende-${request.id}`.replace(/[^a-zA-Z0-9-]/g, '');
  return `https://meet.jit.si/${safeRoom}`;
}

// ── Restaurant chat (customer ↔ restaurant notes, relayed by driver) ──

export function restaurantMessageCollection(requestId) {
  return collection(db, 'serviceRequests', requestId, 'restaurantChat');
}

export function watchRestaurantMessages(requestId, onChange, onError) {
  if (!requestId) return () => {};
  const q = query(restaurantMessageCollection(requestId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAtMs: data.createdAt?.toMillis?.() ?? data.createdAtMs ?? 0,
      };
    }));
  }, onError);
}

export async function sendRestaurantMessage(requestId, body, senderInfo = {}) {
  const text = body.trim();
  if (!text) return null;
  const user = auth.currentUser;
  if (!user) throw new Error('You need to sign in to send a message.');

  const message = {
    type: 'text',
    body: text,
    senderId: user.uid,
    senderName: senderInfo.name || 'Customer',
    senderRole: senderInfo.role || 'customer',
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  };

  const ref = await addDoc(restaurantMessageCollection(requestId), message);
  await updateDoc(doc(db, 'serviceRequests', requestId), {
    restaurantLastMessage: text,
    restaurantLastMessageAt: serverTimestamp(),
  });
  return ref.id;
}
