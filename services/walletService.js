import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

function walletRef(uid) {
  return doc(db, 'wallets', uid);
}

function transactionsCollection(uid) {
  return collection(db, 'wallets', uid, 'transactions');
}

export function watchWallet(uid, onChange, onError) {
  if (!uid) return () => {};
  return onSnapshot(walletRef(uid), (snap) => {
    onChange(snap.exists() ? snap.data() : { balance: 0, linkedCards: [] });
  }, onError);
}

export function watchWalletTransactions(uid, onChange, onError) {
  if (!uid) return () => {};
  const q = query(transactionsCollection(uid), orderBy('createdAt', 'desc'), limit(30));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

async function recordTransaction(uid, entry) {
  await addDoc(transactionsCollection(uid), { ...entry, createdAt: serverTimestamp() });
}

export async function topUpWallet(uid, amount) {
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(walletRef(uid));
    const balance = (snap.exists() ? snap.data().balance : 0) || 0;
    transaction.set(walletRef(uid), { balance: balance + amount, updatedAt: serverTimestamp() }, { merge: true });
  });
  await recordTransaction(uid, { type: 'Top-up', amount, positive: true, icon: 'arrow-down-circle' });
}

export async function sendWalletMoney(uid, amount, recipientPhone) {
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(walletRef(uid));
    const balance = (snap.exists() ? snap.data().balance : 0) || 0;
    if (amount > balance) throw new Error(`Your balance is ZK ${balance}`);
    transaction.set(walletRef(uid), { balance: balance - amount, updatedAt: serverTimestamp() }, { merge: true });
  });
  await recordTransaction(uid, { type: `Sent to ${recipientPhone}`, amount: -amount, positive: false, icon: 'send' });
}

export async function linkWalletCard(uid, cardLabel) {
  await setDoc(walletRef(uid), { linkedCards: arrayUnion(cardLabel) }, { merge: true });
}
