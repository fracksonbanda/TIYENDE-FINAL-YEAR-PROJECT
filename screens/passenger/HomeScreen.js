import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Animated, StatusBar, KeyboardAvoidingView, Platform, ScrollView,
  Dimensions, Alert, ActivityIndicator, Image, Linking, Modal,
} from 'react-native';
import MapView, { Marker, UrlTile, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as SMS from 'expo-sms';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { onValue, ref as dbRef } from 'firebase/database';
import { auth, db, rtdb } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { colors, shadows, radius } from '../../theme';
import { useAppContext } from '../../context/AppContext';
import useUserProfile from '../../hooks/useUserProfile';
import {
  buildMapRegion,
  DEFAULT_PICKUP,
  distanceKm,
  estimateDurationMinutes,
  estimateFare,
  formatDistance,
  initialsFromName,
  LUSAKA_CENTER,
  LUSAKA_PLACES,
  RIDE_TYPES,
} from '../../utils/geo';
import {
  createRideRequest,
  rateDriver,
  statusLabel,
  updateRequestStatus,
  watchPassengerActiveRequest,
} from '../../services/requestService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PAYMENT_METHODS = [
  { id: 'mobile', label: 'Mobile Money', icon: 'phone-portrait-outline' },
  { id: 'cash',   label: 'Cash',         icon: 'cash-outline' },
  { id: 'wallet', label: 'Wallet',       icon: 'wallet-outline' },
  { id: 'card',   label: 'Card',         icon: 'card-outline' },
];

const SERVICE_CARDS = [
  { id: 'Ride',     label: 'Ride',     sub: 'Book a car',   icon: 'car-sport-outline',  accent: colors.primary },
  { id: 'Food',     label: 'Food',     sub: 'Order meals',  icon: 'fast-food-outline',  accent: '#FF6B6B' },
  { id: 'Delivery', label: 'Delivery', sub: 'Send parcels', icon: 'bicycle-outline',    accent: '#0EA5E9' },
  { id: 'Cargo',    label: 'Cargo',    sub: 'Move items',   icon: 'cube-outline',       accent: '#F59E0B' },
];

const QUICK_PLACES = [
  { label: 'Airport',  icon: 'airplane-outline',   dest: 'Kenneth Kaunda Airport' },
  { label: 'Hospital', icon: 'medical-outline',    dest: 'UTH Hospital' },
  { label: 'East Park',icon: 'bag-handle-outline', dest: 'East Park Mall' },
  { label: 'UNZA',     icon: 'school-outline',     dest: 'University of Zambia' },
];

const TRIP_STAGES = ['pending', 'accepted', 'arrived', 'in_progress'];

function SmallAvatar({ name, photoURL, size = 36 }) {
  if (photoURL) {
    return (
      <Image source={{ uri: photoURL }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryGhost }} />
    );
  }
  return (
    <View style={[styles.smallAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.smallAvatarText}>{initialsFromName(name)}</Text>
    </View>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getStatusLabel(status) {
  return {
    pending:     'Finding your driver',
    accepted:    'Driver on the way',
    arrived:     'Driver has arrived',
    in_progress: 'Heading to destination',
  }[status] || 'In progress';
}

function getEtaLabel(status, etaMin) {
  if (status === 'arrived') return 'Driver is here';
  if (etaMin === 0) return 'Arriving now';
  return `~${etaMin} min`;
}

export default function HomeScreen({ navigation }) {
  const { darkMode, notifications, promoUsed, markPromoUsed } = useAppContext();
  const { profile } = useUserProfile();

  // 'home' | 'booking' | 'tracking'
  const [view, setView] = useState('home');
  const [etaMin, setEtaMin] = useState(null);

  // Booking state
  const [destination, setDestination]     = useState('');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [fareOffer, setFareOffer]         = useState('56');
  const [promoCode, setPromoCode]         = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [rideType, setRideType]           = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('mobile');
  const [booking, setBooking]             = useState(false);
  const [extraStop, setExtraStop]         = useState('');
  const [selectedExtraStop, setSelectedExtraStop] = useState(null);
  const [showExtraStopSugg, setShowExtraStopSugg] = useState(false);
  const [savedPlaces, setSavedPlaces]     = useState({ home: null, work: null });
  const [showReceipt, setShowReceipt]     = useState(false);
  const [tripRating, setTripRating]       = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingDone, setRatingDone]       = useState(false);
  const lastTripRef = useRef(null);

  // Real device location, falling back to the Lusaka default when denied/unavailable
  const [pickup, setPickup] = useState(DEFAULT_PICKUP);

  // Live driver position (Realtime Database), while a driver is assigned
  const [driverLiveLocation, setDriverLiveLocation] = useState(null);

  // Map / active trip
  const [activeRequest, setActiveRequest] = useState(null);
  const [mapRegion, setMapRegion]         = useState({ ...LUSAKA_CENTER, latitudeDelta: 0.05, longitudeDelta: 0.05 });

  const sheetAnim = useRef(new Animated.Value(0)).current;
  const inputRef  = useRef(null);

  // Get the device's real position once on mount; fall back to the Lusaka
  // default silently if permission is denied or location is unavailable.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        setPickup({
          name: 'Current location',
          coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
        });
      } catch {
        // keep DEFAULT_PICKUP
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Ask for notification permission once, only if the user has the setting on
  useEffect(() => {
    if (!notifications) return;
    Notifications.requestPermissionsAsync().catch(() => {});
  }, [notifications]);

  // Watch active request from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return undefined;
    return watchPassengerActiveRequest(
      user.uid,
      (request) => {
        setActiveRequest(request);
        if (request?.destinationCoords) {
          setMapRegion(buildMapRegion(pickup.coords, request.destinationCoords));
        }
      },
      () => {}
    );
  }, [pickup]);

  // Live driver position from the Realtime Database, once a driver is assigned
  useEffect(() => {
    if (!activeRequest?.driverId) { setDriverLiveLocation(null); return undefined; }
    const locRef = dbRef(rtdb, `drivers/${activeRequest.driverId}/location`);
    const unsub = onValue(locRef, (snap) => {
      if (snap.exists()) setDriverLiveLocation(snap.val());
    });
    return () => unsub();
  }, [activeRequest?.driverId]);

  // Notify the passenger of key status changes, if notifications are enabled
  const lastNotifiedStatus = useRef(null);
  useEffect(() => {
    if (!notifications || !activeRequest) return;
    if (lastNotifiedStatus.current === activeRequest.status) return;
    lastNotifiedStatus.current = activeRequest.status;
    if (!['accepted', 'arrived', 'in_progress'].includes(activeRequest.status)) return;
    Notifications.scheduleNotificationAsync({
      content: { title: 'Tiyende', body: getStatusLabel(activeRequest.status) },
      trigger: null,
    }).catch(() => {});
  }, [activeRequest?.status, notifications]);

  // Switch to tracking view when an active request appears
  useEffect(() => {
    if (activeRequest && TRIP_STAGES.includes(activeRequest.status)) {
      lastTripRef.current = activeRequest;
      setView('tracking');
      const baseKm    = activeRequest.distanceKm || 4;
      const duration  = estimateDurationMinutes(baseKm, 'ride');
      const offset    = { pending: 10, accepted: 6, arrived: 0, in_progress: 0 }[activeRequest.status] ?? 5;
      setEtaMin(Math.max(1, duration + offset));
    } else if (!activeRequest && view === 'tracking') {
      const finishedTrip = lastTripRef.current;
      if (finishedTrip) {
        // The trip just dropped out of the active-status query, which happens
        // on both completion AND cancellation — read its real final status
        // before deciding whether "Trip Complete" is actually true.
        getDoc(doc(db, 'serviceRequests', finishedTrip.id)).then((snap) => {
          const finalStatus = snap.exists() ? snap.data().status : null;
          if (finalStatus === 'completed') {
            setTripRating(0);
            setRatingDone(false);
            setShowReceipt(true);
          } else if (finalStatus === 'cancelled') {
            Alert.alert('Ride Cancelled', 'This ride was cancelled.');
          }
        }).catch(() => {});
      }
      setView('home');
      setEtaMin(null);
    }
  }, [activeRequest?.id, activeRequest?.status]);

  // Countdown every minute while tracking
  useEffect(() => {
    if (etaMin === null || etaMin <= 0) return undefined;
    const timer = setInterval(() => setEtaMin((p) => Math.max(0, p - 1)), 60_000);
    return () => clearInterval(timer);
  }, [etaMin]);

  // Load saved home/work places from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists() && snap.data().savedPlaces) setSavedPlaces(snap.data().savedPlaces);
    }).catch(() => {});
  }, []);

  // Animate sheet into view when entering booking
  useEffect(() => {
    if (view === 'booking') {
      sheetAnim.setValue(0);
      Animated.timing(sheetAnim, { toValue: 1, duration: 420, delay: 80, useNativeDriver: true }).start();
    }
  }, [view]);

  // Theme tokens
  const bg         = darkMode ? '#0D1117' : '#F4F6F8';
  const cardBg     = darkMode ? '#161B22' : colors.white;
  const inputBg    = darkMode ? '#21262D' : '#F0F2F4';
  const textColor  = darkMode ? colors.textOnDark : colors.textPrimary;
  const subText    = darkMode ? '#8B949E' : colors.textSecondary;
  const borderColor= darkMode ? '#30363D' : colors.border;

  // Derived booking values
  const selectedRide  = RIDE_TYPES.find((t) => t.id === rideType) || RIDE_TYPES[0];
  const filtered      = destination.length > 0
    ? LUSAKA_PLACES.filter((p) => p.name.toLowerCase().includes(destination.toLowerCase()))
    : [];
  const extraFiltered = extraStop.length > 0
    ? LUSAKA_PLACES.filter((p) => p.name.toLowerCase().includes(extraStop.toLowerCase()) && p.name !== destination)
    : [];
  const km            = selectedPlace ? distanceKm(pickup.coords, selectedPlace.coords) : 0;
  const suggestedFare = selectedPlace ? estimateFare({ distance: km, serviceType: 'ride', rideType }) : 0;
  const promoValid    = promoCode.trim().toUpperCase() === 'TIYENDE10' && !promoUsed.ride;
  const promoDiscount = promoValid ? Math.ceil((Number.parseInt(fareOffer, 10) || suggestedFare) * 0.1) : 0;
  const finalFare     = Math.max(1, (Number.parseInt(fareOffer, 10) || suggestedFare || 0) - promoDiscount);

  const profileName = profile?.fullName || profile?.displayName || profile?.email || 'Tiyende rider';
  const firstName   = profileName.split(' ')[0];

  const savePlaceToFirestore = async (type, place) => {
    const user = auth.currentUser;
    if (!user || !place) return;
    const updated = { ...savedPlaces, [type]: place };
    setSavedPlaces(updated);
    try {
      await setDoc(doc(db, 'users', user.uid), { savedPlaces: updated }, { merge: true });
      Alert.alert(`${type === 'home' ? 'Home' : 'Work'} Saved`, `"${place.name}" set as your ${type}.`);
    } catch (e) {
      Alert.alert('Error', 'Could not save location.');
    }
  };

  const selectDestination = (place) => {
    const nextKm   = distanceKm(pickup.coords, place.coords);
    const nextFare = estimateFare({ distance: nextKm, serviceType: 'ride', rideType });
    setDestination(place.name);
    setSelectedPlace(place);
    setFareOffer(String(nextFare));
    setShowSuggestions(false);
    inputRef.current?.blur();
    setMapRegion(buildMapRegion(pickup.coords, place.coords));
  };

  const handleServicePress = (id) => {
    if (id === 'Ride')     { setView('booking'); return; }
    if (id === 'Food')     navigation.navigate('Food');
    if (id === 'Delivery') navigation.navigate('Delivery');
    if (id === 'Cargo')    navigation.navigate('Cargo');
  };

  const handleFindDriver = async () => {
    if (!selectedPlace) {
      inputRef.current?.focus();
      Alert.alert('Destination Needed', 'Choose where you are going first.');
      return;
    }
    setBooking(true);
    try {
      await createRideRequest({
        destination: selectedPlace,
        rideType,
        fareOffer: String(Number.parseInt(fareOffer, 10) || suggestedFare),
        paymentMethod,
        promoCode,
        extraStop: selectedExtraStop,
        pickup,
      });
      if (promoValid) markPromoUsed('ride');
    } catch (error) {
      Alert.alert('Could Not Book Ride', error.message);
    } finally {
      setBooking(false);
    }
  };

  const cancelActiveRequest = () => {
    if (!activeRequest) return;
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel?', [
      { text: 'Keep Waiting', style: 'cancel' },
      {
        text: 'Cancel Ride', style: 'destructive',
        onPress: async () => {
          try { await updateRequestStatus(activeRequest.id, 'cancelled', { cancelledBy: 'passenger' }); }
          catch (e) { Alert.alert('Cancel Failed', e.message); }
        },
      },
    ]);
  };

  const shareTrip = async () => {
    if (!activeRequest) return;
    const msg = `I'm using Tiyende from ${activeRequest.pickupName} to ${activeRequest.destinationName}. Driver: ${activeRequest.driverName || 'pending'}. Fare: ZK ${activeRequest.fare}.`;
    const ok = await SMS.isAvailableAsync();
    if (ok) await SMS.sendSMSAsync([], msg);
    else Alert.alert('Trip Details', msg);
  };

  const submitTripRating = async () => {
    const trip = lastTripRef.current;
    if (!trip || tripRating < 1) return;
    setSubmittingRating(true);
    try {
      await rateDriver(trip.id, trip.driverId, tripRating);
      setRatingDone(true);
    } catch (error) {
      Alert.alert('Rating Failed', error.message);
    } finally {
      setSubmittingRating(false);
    }
  };

  const routeTarget = activeRequest?.destinationCoords || selectedPlace?.coords;
  const routeCoords = routeTarget ? [pickup.coords, routeTarget] : [];

  // ─────────────────────────────────────────────
  // HOME VIEW — clean, map-free landing screen
  // ─────────────────────────────────────────────
  if (view === 'home') {
    return (
      <View style={[styles.homeWrap, { backgroundColor: bg }]}>
        <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={cardBg} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.homeScroll}>

          {/* Hero card: greeting + search */}
          <View style={[styles.heroCard, { backgroundColor: cardBg }]}>
            <View style={styles.heroTop}>
              <View>
                <Text style={[styles.heroGreeting, { color: subText }]}>{getGreeting()}</Text>
                <Text style={[styles.heroName, { color: textColor }]}>{firstName} 👋</Text>
              </View>
              <SmallAvatar name={profileName} photoURL={profile?.photoURL} size={44} />
            </View>
            <TouchableOpacity
              style={[styles.searchPill, { backgroundColor: inputBg }]}
              onPress={() => setView('booking')}
              activeOpacity={0.85}
            >
              <View style={styles.searchPillDot} />
              <Text style={[styles.searchPillText, { color: subText }]}>Where are you going?</Text>
              <View style={[styles.searchPillArrow, { backgroundColor: colors.primary }]}>
                <Ionicons name="arrow-forward" size={14} color={colors.white} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Services */}
          <Text style={[styles.sectionHeading, { color: textColor }]}>Services</Text>
          <View style={styles.svcGrid}>
            {SERVICE_CARDS.map((svc) => (
              <TouchableOpacity
                key={svc.id}
                style={[styles.svcCard, { backgroundColor: cardBg }]}
                onPress={() => handleServicePress(svc.id)}
                activeOpacity={0.82}
              >
                <View style={[styles.svcIconWrap, { backgroundColor: svc.accent + '18' }]}>
                  <Ionicons name={svc.icon} size={22} color={svc.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.svcLabel, { color: textColor }]}>{svc.label}</Text>
                  <Text style={[styles.svcSub, { color: subText }]}>{svc.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={subText} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick destinations */}
          <Text style={[styles.sectionHeading, { color: textColor }]}>Quick destinations</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}
          >
            {QUICK_PLACES.map((place) => (
              <TouchableOpacity
                key={place.label}
                style={[styles.quickCard, { backgroundColor: cardBg }]}
                onPress={() => {
                  const match = LUSAKA_PLACES.find((p) => p.name === place.dest);
                  if (match) { selectDestination(match); setView('booking'); }
                }}
              >
                <View style={[styles.quickCardIcon, { backgroundColor: colors.primaryGhost }]}>
                  <Ionicons name={place.icon} size={18} color={colors.primary} />
                </View>
                <Text style={[styles.quickCardLabel, { color: textColor }]}>{place.label}</Text>
                <Text style={[styles.quickCardSub, { color: subText }]} numberOfLines={1}>{place.dest}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Saved home / work quick access */}
          {(savedPlaces.home || savedPlaces.work) && (
            <View style={styles.savedRow}>
              {savedPlaces.home && (
                <TouchableOpacity
                  style={[styles.savedChip, { backgroundColor: cardBg }]}
                  onPress={() => { selectDestination(savedPlaces.home); setView('booking'); }}
                >
                  <Ionicons name="home" size={15} color={colors.primary} />
                  <View>
                    <Text style={[styles.savedChipLabel, { color: textColor }]}>Home</Text>
                    <Text style={[styles.savedChipSub, { color: subText }]} numberOfLines={1}>{savedPlaces.home.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
              {savedPlaces.work && (
                <TouchableOpacity
                  style={[styles.savedChip, { backgroundColor: cardBg }]}
                  onPress={() => { selectDestination(savedPlaces.work); setView('booking'); }}
                >
                  <Ionicons name="briefcase" size={15} color={colors.primary} />
                  <View>
                    <Text style={[styles.savedChipLabel, { color: textColor }]}>Work</Text>
                    <Text style={[styles.savedChipSub, { color: subText }]} numberOfLines={1}>{savedPlaces.work.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Promo banner */}
          <TouchableOpacity
            style={[styles.promoBannerCard, { backgroundColor: darkMode ? '#1C2A22' : colors.primaryGhost }]}
            onPress={() => setView('booking')}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.promoBannerTitle}>Use code TIYENDE10</Text>
              <Text style={[styles.promoBannerSub, { color: subText }]}>10% off your next ride · one use only</Text>
            </View>
            <View style={[styles.promoBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.promoBadgeText}>10%{'\n'}OFF</Text>
            </View>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Trip receipt modal */}
        <Modal visible={showReceipt} animationType="slide" transparent>
          <View style={styles.receiptOverlay}>
            <View style={[styles.receiptCard, { backgroundColor: cardBg }]}>
              <View style={styles.receiptTop}>
                <View style={[styles.receiptIcon, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="checkmark-circle" size={36} color={colors.success} />
                </View>
                <Text style={[styles.receiptTitle, { color: textColor }]}>Trip Complete!</Text>
                <Text style={[styles.receiptSub, { color: subText }]}>Thanks for riding with Tiyende</Text>
              </View>
              {lastTripRef.current && (
                <View style={[styles.receiptBody, { borderColor }]}>
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: subText }]}>Route</Text>
                    <Text style={[styles.receiptValue, { color: textColor }]} numberOfLines={2}>
                      {lastTripRef.current.pickupName} → {lastTripRef.current.destinationName}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: subText }]}>Fare paid</Text>
                    <Text style={styles.receiptFare}>ZK {lastTripRef.current.fare}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: subText }]}>Distance</Text>
                    <Text style={[styles.receiptValue, { color: textColor }]}>
                      {lastTripRef.current.distanceText} · {lastTripRef.current.durationMinutes} min
                    </Text>
                  </View>
                  {lastTripRef.current.driverName && (
                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: subText }]}>Driver</Text>
                      <Text style={[styles.receiptValue, { color: textColor }]}>{lastTripRef.current.driverName}</Text>
                    </View>
                  )}
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: subText }]}>Payment</Text>
                    <Text style={[styles.receiptValue, { color: textColor, textTransform: 'capitalize' }]}>
                      {lastTripRef.current.paymentMethod}
                    </Text>
                  </View>
                </View>
              )}
              {lastTripRef.current?.driverId && (
                <View style={styles.rateBox}>
                  <Text style={[styles.rateLabel, { color: textColor }]}>
                    {ratingDone ? 'Thanks for your feedback!' : 'Rate your driver'}
                  </Text>
                  {!ratingDone && (
                    <View style={styles.rateStars}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <TouchableOpacity key={n} onPress={() => setTripRating(n)} disabled={submittingRating}>
                          <Ionicons
                            name={n <= tripRating ? 'star' : 'star-outline'}
                            size={32}
                            color={colors.accent}
                            style={{ marginHorizontal: 3 }}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {!ratingDone && tripRating > 0 && (
                    <TouchableOpacity
                      style={[styles.rateSubmitBtn, submittingRating && { opacity: 0.65 }]}
                      onPress={submitTripRating}
                      disabled={submittingRating}
                    >
                      <Text style={styles.rateSubmitText}>{submittingRating ? 'Submitting…' : 'Submit Rating'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <TouchableOpacity
                style={[styles.receiptBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowReceipt(false)}
              >
                <Text style={styles.receiptBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ─────────────────────────────────────────────
  // BOOKING VIEW — map + ride booking form
  // ─────────────────────────────────────────────
  if (view === 'booking') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Map fills the top */}
        <MapView style={styles.map} region={mapRegion} mapType="none" showsUserLocation={false}>
          <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} flipY={false} />
          <Marker coordinate={pickup.coords}>
            <View style={styles.myDot}><View style={styles.myDotInner} /></View>
          </Marker>
          {routeTarget && (
            <>
              <Marker coordinate={routeTarget}>
                <View style={styles.destPin}><Ionicons name="location" size={30} color={colors.error} /></View>
              </Marker>
              <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={4} lineDashPattern={[8, 4]} />
            </>
          )}
        </MapView>

        {/* Back button */}
        <TouchableOpacity
          style={[styles.mapBackBtn, { backgroundColor: cardBg }]}
          onPress={() => { setView('home'); setDestination(''); setSelectedPlace(null); setShowSuggestions(false); setExtraStop(''); setSelectedExtraStop(null); setShowExtraStopSugg(false); }}
        >
          <Ionicons name="arrow-back" size={20} color={textColor} />
        </TouchableOpacity>

        {/* ETA badge when destination is selected */}
        {selectedPlace && (
          <View style={[styles.etaBadge, { backgroundColor: cardBg }]}>
            <Ionicons name="time-outline" size={13} color={colors.primary} />
            <Text style={[styles.etaBadgeText, { color: textColor }]}>{estimateDurationMinutes(km, 'ride')} min</Text>
            <View style={styles.etaDivider} />
            <Ionicons name="navigate-outline" size={13} color={subText} />
            <Text style={[styles.etaBadgeText, { color: subText }]}>{formatDistance(km)}</Text>
          </View>
        )}

        {/* Bottom booking sheet */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Animated.View style={[styles.sheet, {
            backgroundColor: cardBg,
            transform: [{ translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [340, 0] }) }],
            opacity: sheetAnim,
          }]}>
            <View style={styles.sheetHandle} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Search destination */}
            <View style={styles.searchRow}>
              <View style={styles.routeDot} />
              <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: showSuggestions ? colors.primary : borderColor }]}>
                <Ionicons name="search-outline" size={16} color={subText} style={{ marginLeft: 12 }} />
                <TextInput
                  ref={inputRef}
                  style={[styles.searchInput, { color: textColor }]}
                  placeholder="Where are you going?"
                  placeholderTextColor={subText}
                  value={destination}
                  onChangeText={(t) => { setDestination(t); setShowSuggestions(t.length > 0); if (!t) setSelectedPlace(null); }}
                  onFocus={() => setShowSuggestions(destination.length > 0)}
                  returnKeyType="done"
                  blurOnSubmit
                />
                {destination.length > 0 && (
                  <TouchableOpacity onPress={() => { setDestination(''); setSelectedPlace(null); setShowSuggestions(false); }} style={{ padding: 10 }}>
                    <Ionicons name="close-circle" size={16} color={subText} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Suggestions */}
            {showSuggestions && filtered.length > 0 && (
              <View style={[styles.suggestions, { backgroundColor: cardBg, borderColor: darkMode ? '#30363D' : colors.borderLight }]}>
                {filtered.slice(0, 5).map((item) => (
                  <TouchableOpacity
                    key={item.name}
                    style={[styles.suggRow, { borderBottomColor: darkMode ? '#21262D' : colors.borderLight }]}
                    onPress={() => selectDestination(item)}
                  >
                    <View style={[styles.suggIcon, { backgroundColor: darkMode ? '#21262D' : colors.primaryGhost }]}>
                      <Ionicons name={item.icon} size={14} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.suggName, { color: textColor }]}>{item.name}</Text>
                      <Text style={[styles.suggCat, { color: subText }]}>{item.category} · Lusaka</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Extra stop */}
            <View style={styles.searchRow}>
              <View style={styles.routeDotMid} />
              <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: showExtraStopSugg ? colors.primary : borderColor }]}>
                <Ionicons name="add-circle-outline" size={16} color={subText} style={{ marginLeft: 12 }} />
                <TextInput
                  style={[styles.searchInput, { color: textColor }]}
                  placeholder="Add a stop (optional)"
                  placeholderTextColor={subText}
                  value={extraStop}
                  onChangeText={(t) => { setExtraStop(t); setShowExtraStopSugg(t.length > 0); if (!t) setSelectedExtraStop(null); }}
                  onFocus={() => setShowExtraStopSugg(extraStop.length > 0)}
                  returnKeyType="done"
                  blurOnSubmit
                />
                {extraStop.length > 0 && (
                  <TouchableOpacity onPress={() => { setExtraStop(''); setSelectedExtraStop(null); setShowExtraStopSugg(false); }} style={{ padding: 10 }}>
                    <Ionicons name="close-circle" size={16} color={subText} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {showExtraStopSugg && extraFiltered.length > 0 && (
              <View style={[styles.suggestions, { backgroundColor: cardBg, borderColor: darkMode ? '#30363D' : colors.borderLight }]}>
                {extraFiltered.slice(0, 3).map((item) => (
                  <TouchableOpacity
                    key={item.name}
                    style={[styles.suggRow, { borderBottomColor: darkMode ? '#21262D' : colors.borderLight }]}
                    onPress={() => { setExtraStop(item.name); setSelectedExtraStop(item); setShowExtraStopSugg(false); }}
                  >
                    <View style={[styles.suggIcon, { backgroundColor: darkMode ? '#21262D' : colors.primaryGhost }]}>
                      <Ionicons name={item.icon} size={14} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.suggName, { color: textColor }]}>{item.name}</Text>
                      <Text style={[styles.suggCat, { color: subText }]}>{item.category} · Lusaka</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Upfront fare breakdown */}
            {selectedPlace && (
              <View style={[styles.fareBreakdown, { backgroundColor: darkMode ? '#21262D' : colors.primaryGhost }]}>
                <View style={styles.fareBreakdownRow}>
                  <Text style={[styles.fareBreakdownLabel, { color: subText }]}>Estimated fare</Text>
                  <Text style={styles.fareBreakdownAmt}>ZK {suggestedFare}</Text>
                </View>
                <View style={styles.fareBreakdownRow}>
                  <Text style={[styles.fareBreakdownLabel, { color: subText }]}>
                    {formatDistance(km)} · {estimateDurationMinutes(km, 'ride')} min
                    {selectedExtraStop ? ` · Via ${selectedExtraStop.name}` : ''}
                  </Text>
                  <View style={styles.savePlaceRow}>
                    <TouchableOpacity onPress={() => savePlaceToFirestore('home', selectedPlace)}>
                      <Text style={styles.savePlaceBtn}>Save Home</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => savePlaceToFirestore('work', selectedPlace)}>
                      <Text style={styles.savePlaceBtn}>Save Work</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Ride type */}
            <View style={styles.rideTypeRow}>
              {RIDE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.rideType, {
                    borderColor: rideType === type.id ? colors.primary : borderColor,
                    backgroundColor: rideType === type.id ? colors.primaryGhost : 'transparent',
                  }]}
                  onPress={() => {
                    setRideType(type.id);
                    if (selectedPlace) setFareOffer(String(estimateFare({ distance: km, serviceType: 'ride', rideType: type.id })));
                  }}
                >
                  <Ionicons name={type.icon} size={14} color={rideType === type.id ? colors.primary : subText} />
                  <Text style={[styles.rideTypeText, { color: rideType === type.id ? colors.primary : subText }]}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Payment method */}
            <View style={styles.payRow}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.payChip, { borderColor: paymentMethod === m.id ? colors.primary : borderColor }, paymentMethod === m.id && styles.payChipSelected]}
                  onPress={() => setPaymentMethod(m.id)}
                >
                  <Ionicons name={m.icon} size={12} color={paymentMethod === m.id ? colors.primary : subText} />
                  <Text style={[styles.payChipText, { color: paymentMethod === m.id ? colors.primary : subText }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Promo code */}
            <View style={styles.promoRow}>
              <View style={[styles.promoBox, { backgroundColor: inputBg, borderColor }]}>
                <Ionicons name="ticket-outline" size={14} color={subText} />
                <TextInput
                  style={[styles.promoInput, { color: textColor }]}
                  placeholder="Promo code (TIYENDE10)"
                  placeholderTextColor={subText}
                  value={promoCode}
                  onChangeText={setPromoCode}
                  autoCapitalize="characters"
                />
              </View>
              {promoDiscount > 0 && (
                <View style={styles.discountPill}>
                  <Text style={styles.discountText}>-ZK {promoDiscount}</Text>
                </View>
              )}
            </View>
            {promoCode.trim().toUpperCase() === 'TIYENDE10' && promoUsed.ride && (
              <Text style={styles.promoUsedMsg}>Promo already used for rides</Text>
            )}

            {/* Fare + find driver */}
            <View style={styles.fareRow}>
              <View style={[styles.fareBox, { backgroundColor: darkMode ? '#21262D' : colors.primaryGhost, borderColor: colors.primary }]}>
                <Text style={styles.fareCurrency}>ZK</Text>
                <TextInput
                  style={styles.fareInput}
                  value={String(finalFare)}
                  onChangeText={setFareOffer}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
                <Text style={styles.fareHint}>{selectedRide.label}</Text>
              </View>
              <TouchableOpacity
                style={[styles.findBtn, (!selectedPlace || booking) && styles.findBtnOff]}
                onPress={handleFindDriver}
                disabled={!selectedPlace || booking}
                activeOpacity={0.85}
              >
                {booking
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <Ionicons name="radio" size={18} color={colors.white} />
                }
                <Text style={styles.findBtnText}>{booking ? 'Sending…' : 'Find Driver'}</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ─────────────────────────────────────────────
  // TRACKING VIEW — map + live trip status
  // ─────────────────────────────────────────────
  if (view === 'tracking' && activeRequest) {
    const stageIndex  = TRIP_STAGES.indexOf(activeRequest.status);
    const inProgress  = activeRequest.status === 'in_progress';
    const hasDriver   = !!activeRequest.driverId;
    const etaLabel    = getEtaLabel(activeRequest.status, etaMin);
    const statusLbl   = getStatusLabel(activeRequest.status);

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Map — larger in tracking mode */}
        <MapView
          style={styles.trackingMap}
          region={mapRegion}
          mapType="none"
          showsUserLocation={false}
        >
          <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} flipY={false} />
          <Marker coordinate={pickup.coords}>
            <View style={styles.myDot}><View style={styles.myDotInner} /></View>
          </Marker>
          {driverLiveLocation && (
            <Marker coordinate={driverLiveLocation}>
              <View style={styles.driverMarker}><Ionicons name="car-sport" size={16} color={colors.white} /></View>
            </Marker>
          )}
          {activeRequest.destinationCoords && (
            <>
              <Marker coordinate={activeRequest.destinationCoords}>
                <View style={styles.destPin}><Ionicons name="location" size={30} color={colors.error} /></View>
              </Marker>
              <Polyline
                coordinates={[pickup.coords, activeRequest.destinationCoords]}
                strokeColor={colors.primary}
                strokeWidth={4}
                lineDashPattern={[8, 4]}
              />
            </>
          )}
        </MapView>

        {/* ETA overlay chip on map */}
        <View style={[styles.trackingEtaChip, { backgroundColor: inProgress ? colors.primary : cardBg }]}>
          <Ionicons
            name={activeRequest.status === 'arrived' ? 'checkmark-circle' : 'time-outline'}
            size={16}
            color={inProgress ? colors.white : colors.primary}
          />
          <Text style={[styles.trackingEtaText, { color: inProgress ? colors.white : colors.primary }]}>
            {etaLabel}
          </Text>
          <Text style={[styles.trackingEtaSub, { color: inProgress ? 'rgba(255,255,255,0.75)' : subText }]}>
            {statusLbl}
          </Text>
        </View>

        {/* Tracking panel */}
        <View style={[styles.trackingPanel, { backgroundColor: cardBg }]}>
          <View style={styles.sheetHandle} />

          {/* Fare and route */}
          <View style={styles.trackingTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.trackingRoute, { color: subText }]} numberOfLines={1}>
                {activeRequest.pickupName} → {activeRequest.destinationName}
              </Text>
            </View>
            <Text style={styles.trackingFare}>ZK {activeRequest.fare}</Text>
          </View>

          {/* Progress bar + dots */}
          <View style={styles.progressRow}>
            {TRIP_STAGES.map((s, idx) => (
              <View key={s} style={[styles.progressSegment, idx <= stageIndex && styles.progressSegmentOn]} />
            ))}
          </View>
          <View style={styles.progressDotRow}>
            {TRIP_STAGES.map((s, idx) => (
              <View key={s} style={{ alignItems: 'center', flex: 1 }}>
                <View style={[styles.progressDot, idx <= stageIndex && styles.progressDotOn]}>
                  {idx <= stageIndex && <Ionicons name="checkmark" size={9} color={colors.white} />}
                </View>
              </View>
            ))}
          </View>

          {/* Driver card (when assigned) or waiting */}
          {hasDriver ? (
            <View style={[styles.driverCard, { backgroundColor: darkMode ? '#21262D' : colors.offWhite }]}>
              <SmallAvatar name={activeRequest.driverName} photoURL={activeRequest.driverPhotoURL} size={46} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.driverName, { color: textColor }]}>{activeRequest.driverName}</Text>
                <Text style={[styles.driverVehicle, { color: subText }]}>
                  {[activeRequest.vehicleModel, activeRequest.licensePlate].filter(Boolean).join(' · ')}
                </Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={11} color={colors.accent} />
                  <Text style={[styles.ratingText, { color: subText }]}>{activeRequest.driverRating || '5.0'}</Text>
                </View>
              </View>
              <View style={styles.driverActions}>
                <TouchableOpacity style={[styles.driverAction, { backgroundColor: colors.primaryGhost }]} onPress={() => navigation.navigate('TripChat', { request: activeRequest })}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.driverAction, { backgroundColor: colors.primaryGhost }]} onPress={() => navigation.navigate('DataCall', { request: activeRequest })}>
                  <Ionicons name="videocam-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.waitingCard, { backgroundColor: darkMode ? '#21262D' : colors.offWhite }]}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[styles.waitingText, { color: subText }]}>Waiting for a driver to accept your ride…</Text>
            </View>
          )}

          {/* Action row */}
          <View style={styles.trackingActions}>
            <TouchableOpacity style={[styles.trackingActionBtn, { borderColor }]} onPress={shareTrip}>
              <Ionicons name="share-social-outline" size={16} color={colors.primary} />
              <Text style={[styles.trackingActionText, { color: colors.primary }]}>Share trip</Text>
            </TouchableOpacity>
            {['pending', 'accepted'].includes(activeRequest.status) && (
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelActiveRequest}>
                <Text style={styles.cancelBtnText}>Cancel ride</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return null;
}

const cardW = (SCREEN_WIDTH - 48) / 2;

const styles = StyleSheet.create({
  // ── Shared
  container:      { flex: 1 },
  myDot:          { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(26,107,58,0.2)', justifyContent: 'center', alignItems: 'center' },
  myDotInner:     { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.white },
  destPin:        { alignItems: 'center' },
  smallAvatar:    { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  smallAvatarText:{ fontSize: 13, fontWeight: '800', color: colors.white },
  sheetHandle:    { width: 38, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },

  // ── Home view
  homeWrap:       { flex: 1 },
  homeScroll:     { paddingBottom: 16 },

  heroCard:       { marginHorizontal: 16, marginTop: 52, borderRadius: radius.xl, padding: 20, ...shadows.medium },
  heroTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  heroGreeting:   { fontSize: 13, fontWeight: '600' },
  heroName:       { fontSize: 24, fontWeight: '900', marginTop: 2 },

  searchPill:     { flexDirection: 'row', alignItems: 'center', borderRadius: radius.full, padding: 12, gap: 10 },
  searchPillDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  searchPillText: { flex: 1, fontSize: 15, fontWeight: '600' },
  searchPillArrow:{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  sectionHeading: { fontSize: 16, fontWeight: '800', marginTop: 24, marginBottom: 12, marginHorizontal: 16 },

  svcGrid:        { marginHorizontal: 16, gap: 8 },
  svcCard:        { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: 16, ...shadows.xs },
  svcIconWrap:    { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  svcLabel:       { fontSize: 15, fontWeight: '800' },
  svcSub:         { fontSize: 12, marginTop: 2 },

  quickRow:       { paddingHorizontal: 16, gap: 10 },
  quickCard:      { width: 110, borderRadius: radius.lg, padding: 14, alignItems: 'center', ...shadows.xs },
  quickCardIcon:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickCardLabel: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  quickCardSub:   { fontSize: 10, textAlign: 'center', marginTop: 3 },

  promoBannerCard:{ flexDirection: 'row', alignItems: 'center', margin: 16, borderRadius: radius.lg, padding: 16, gap: 14 },
  promoBannerTitle:{ fontSize: 14, fontWeight: '800', color: colors.primary },
  promoBannerSub: { fontSize: 12, marginTop: 4 },
  promoBadge:     { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  promoBadgeText: { color: colors.white, fontSize: 12, fontWeight: '900', textAlign: 'center', lineHeight: 16 },

  // ── Booking view
  map:            { flex: 1 },
  mapBackBtn:     { position: 'absolute', top: 52, left: 16, width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', ...shadows.medium },

  etaBadge:       { position: 'absolute', top: 52, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 16, ...shadows.small },
  etaBadgeText:   { fontSize: 12, fontWeight: '700' },
  etaDivider:     { width: 1, height: 13, backgroundColor: colors.border },

  sheet:          { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 28 : 16, ...shadows.xl },

  searchRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  routeDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginRight: 10 },
  searchBox:      { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radius.md },
  searchInput:    { flex: 1, paddingVertical: 13, paddingHorizontal: 8, fontSize: 14, fontWeight: '600' },
  suggestions:    { borderWidth: 1, borderRadius: radius.md, marginLeft: 20, marginBottom: 8, overflow: 'hidden', ...shadows.xs },
  suggRow:        { flexDirection: 'row', alignItems: 'center', padding: 11, gap: 10, borderBottomWidth: 1 },
  suggIcon:       { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  suggName:       { fontSize: 14, fontWeight: '600' },
  suggCat:        { fontSize: 11, marginTop: 1 },

  rideTypeRow:    { flexDirection: 'row', gap: 7, marginBottom: 9 },
  rideType:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: radius.full, borderWidth: 1.5, paddingVertical: 8 },
  rideTypeText:   { fontSize: 11, fontWeight: '700' },

  payRow:         { flexDirection: 'row', gap: 6, marginBottom: 9 },
  payChip:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  payChipSelected:{ backgroundColor: colors.primaryGhost },
  payChipText:    { fontSize: 10, fontWeight: '700' },

  promoRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  promoBox:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 10 },
  promoInput:     { flex: 1, paddingVertical: 9, fontSize: 12, fontWeight: '600' },
  discountPill:   { backgroundColor: colors.successLight, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  discountText:   { fontSize: 12, color: colors.success, fontWeight: '800' },
  promoUsedMsg:   { fontSize: 10, color: colors.error, marginTop: -2, marginBottom: 6, marginLeft: 2 },

  fareRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fareBox:        { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  fareCurrency:   { fontSize: 14, fontWeight: '800', color: colors.primary },
  fareInput:      { flex: 1, fontSize: 22, fontWeight: '800', textAlign: 'center', paddingVertical: 2, color: colors.primary },
  fareHint:       { fontSize: 10, fontWeight: '700', color: colors.primaryLight },
  findBtn:        { minWidth: 140, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16, gap: 7, ...shadows.green },
  findBtnOff:     { opacity: 0.5, shadowOpacity: 0 },
  findBtnText:    { color: colors.white, fontSize: 14, fontWeight: '800' },

  // ── Tracking view
  trackingMap:    { flex: 1 },
  driverMarker:   { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },

  trackingEtaChip:{ position: 'absolute', top: 52, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.full, paddingVertical: 10, paddingHorizontal: 18, ...shadows.medium },
  trackingEtaText:{ fontSize: 18, fontWeight: '900' },
  trackingEtaSub: { fontSize: 11, fontWeight: '600' },

  trackingPanel:  { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 28 : 16, ...shadows.xl },

  trackingTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  trackingRoute:  { fontSize: 13, fontWeight: '600' },
  trackingFare:   { fontSize: 18, fontWeight: '900', color: colors.primary },

  progressRow:    { flexDirection: 'row', gap: 4, marginBottom: 6 },
  progressSegment:{ flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.borderLight },
  progressSegmentOn: { backgroundColor: colors.primary },
  progressDotRow: { flexDirection: 'row', marginBottom: 14 },
  progressDot:    { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  progressDotOn:  { backgroundColor: colors.primary },

  driverCard:     { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: 12, marginBottom: 12 },
  driverName:     { fontSize: 15, fontWeight: '800' },
  driverVehicle:  { fontSize: 11, marginTop: 2 },
  ratingRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText:     { fontSize: 11, fontWeight: '700' },
  driverActions:  { flexDirection: 'row', gap: 8 },
  driverAction:   { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  waitingCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, padding: 14, marginBottom: 12 },
  waitingText:    { flex: 1, fontSize: 13, fontWeight: '600' },

  trackingActions:{ flexDirection: 'row', gap: 10 },
  trackingActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 12 },
  trackingActionText:{ fontWeight: '800', fontSize: 13 },
  cancelBtn:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.errorLight, borderRadius: radius.md, paddingVertical: 12 },
  cancelBtnText:  { color: colors.error, fontWeight: '800', fontSize: 13 },

  // ── Saved places
  savedRow:       { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 8 },
  savedChip:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.lg, padding: 12, ...shadows.xs },
  savedChipLabel: { fontSize: 13, fontWeight: '800' },
  savedChipSub:   { fontSize: 10, marginTop: 1 },

  // ── Extra stop dot
  routeDotMid:    { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F59E0B', marginRight: 10 },

  // ── Fare breakdown
  fareBreakdown:  { borderRadius: radius.md, padding: 10, marginBottom: 8 },
  fareBreakdownRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  fareBreakdownLabel: { fontSize: 11, fontWeight: '600', flex: 1 },
  fareBreakdownAmt:{ fontSize: 14, fontWeight: '900', color: colors.primary },
  savePlaceRow:   { flexDirection: 'row', gap: 10 },
  savePlaceBtn:   { fontSize: 10, fontWeight: '800', color: colors.primary },

  // ── Receipt modal
  receiptOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  receiptCard:    { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  receiptTop:     { alignItems: 'center', marginBottom: 20 },
  receiptIcon:    { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  receiptTitle:   { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  receiptSub:     { fontSize: 13 },
  receiptBody:    { borderTopWidth: 1, borderBottomWidth: 1, marginBottom: 20, paddingVertical: 4 },
  receiptRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  receiptLabel:   { fontSize: 12, fontWeight: '600' },
  receiptValue:   { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right', marginLeft: 8 },
  receiptFare:    { fontSize: 18, fontWeight: '900', color: colors.primary },
  receiptBtn:     { borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  receiptBtnText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  rateBox:        { alignItems: 'center', marginBottom: 16 },
  rateLabel:      { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  rateStars:      { flexDirection: 'row', marginBottom: 12 },
  rateSubmitBtn:  { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 24 },
  rateSubmitText: { color: colors.white, fontSize: 13, fontWeight: '800' },
});
