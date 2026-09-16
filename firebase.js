import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBnFAVh0kkYY8rZLJAne9B6i2lWdt4BDIQ',
  authDomain: 'tiyende-v3.firebaseapp.com',
  databaseURL: 'https://tiyende-v3-default-rtdb.firebaseio.com',
  projectId: 'tiyende-v3',
  storageBucket: 'tiyende-v3.firebasestorage.app',
  messagingSenderId: '691210842862',
  appId: '1:691210842862:web:c84a68939bead68250b9ff',
  measurementId: 'G-WRK50MFXP0',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
