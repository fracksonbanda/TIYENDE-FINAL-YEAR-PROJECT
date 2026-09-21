import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { auth, db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import AuthNavigator from './navigation/AuthNavigator';
import MainNavigator from './navigation/MainNavigator';
import DriverNavigator from './navigation/DriverNavigator';
import RestaurantNavigator from './navigation/RestaurantNavigator';
import LoadingScreen from './components/LoadingScreen';
import { AppProvider } from './context/AppContext';

// Lets locally-scheduled notifications (ride/order status updates) actually
// display a banner while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [user, setUser] = useState(undefined);
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    let unsubscribeUserDoc = null;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      unsubscribeUserDoc?.();
      unsubscribeUserDoc = null;
      setUser(currentUser);
      if (currentUser) {
        setRoleLoading(true);

        // Fast path: restore last-known role from local cache so the app
        // never shows onboarding again due to a Firestore read failure.
        try {
          const cached = await AsyncStorage.getItem(`userRole_${currentUser.uid}`);
          if (cached) {
            setRole(cached);
            setRoleLoading(false);
          }
        } catch {}

        // Real-time source of truth from Firestore
        unsubscribeUserDoc = onSnapshot(
          doc(db, 'users', currentUser.uid),
          async (userDoc) => {
            const r = userDoc.exists() ? (userDoc.data().role ?? 'passenger') : 'new';
            setRole(r);
            setRoleLoading(false);
            // Keep local cache in sync so the next cold-start is instant
            try { await AsyncStorage.setItem(`userRole_${currentUser.uid}`, r); } catch {}
          },
          () => {
            // Firestore read failed — keep the cached value; fall back to passenger
            setRole((prev) => prev ?? 'passenger');
            setRoleLoading(false);
          },
        );
      } else {
        setRole(null);
        setRoleLoading(false);
      }
    });
    return () => {
      unsubscribeUserDoc?.();
      unsubscribe();
    };
  }, []);

  if (user === undefined || roleLoading) return <LoadingScreen />;

  return (
    <AppProvider>
      <NavigationContainer>
        {!user ? (
          <AuthNavigator />
        ) : role === 'new' ? (
          <AuthNavigator initialRouteName="OnboardingSelector" />
        ) : role === 'driver_pending' ? (
          <AuthNavigator initialRouteName="DriverOnboarding" />
        ) : role === 'restaurant_pending' ? (
          <AuthNavigator initialRouteName="RestaurantOnboarding" />
        ) : role === 'driver' ? (
          <DriverNavigator />
        ) : role === 'restaurant' ? (
          <RestaurantNavigator />
        ) : (
          <MainNavigator />
        )}
      </NavigationContainer>
    </AppProvider>
  );
}
