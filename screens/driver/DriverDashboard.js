import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Animated, StatusBar, Alert, Modal, ActivityIndicator, Image, Linking, Platform,
} from 'react-native';
import MapView, { Marker, UrlTile, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc } from 'firebase/firestore';
import { ref as dbRef, remove as dbRemove, set as dbSet } from 'firebase/database';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { auth, db, rtdb } from '../../firebase';
import { colors, shadows, radius } from '../../theme';
import { useAppContext } from '../../context/AppContext';
import useUserProfile from '../../hooks/useUserProfile';
import {
  acceptRequest,
  ratePassenger,
  statusLabel,
  updateRequestStatus,
  watchDriverActiveRequest,
  watchDriverCompletedRequests,
  watchDriverPendingRequests,
} from '../../services/requestService';
import { buildMapRegion, DEFAULT_PICKUP, distanceKm, formatDistance, initialsFromName, LUSAKA_CENTER } from '../../utils/geo';

const NEARBY_RADIUS_KM = 25;

const FILTERS = [
  { id: 'all', label: 'All', icon: 'apps-outline' },
  { id: 'ride', label: 'Rides', icon: 'car-sport-outline' },
  { id: 'food', label: 'Food', icon: 'fast-food-outline' },
  { id: 'delivery', label: 'Delivery', icon: 'bicycle-outline' },
  { id: 'cargo', label: 'Cargo', icon: 'cube-outline' },
];

const PAYMENT_OPTIONS = [
  { id: 'mobile', label: 'Mobile Money', icon: 'phone-portrait-outline' },
  { id: 'cash', label: 'Cash', icon: 'cash-outline' },
  { id: 'wallet', label: 'Wallet', icon: 'wallet-outline' },
];

function Avatar({ name, photoURL, size = 42, ring }) {
  const inner = photoURL ? (
    <Image source={{ uri: photoURL }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryGhost }} />
  ) : (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{initialsFromName(name)}</Text>
    </View>
  );
  if (!ring) return inner;
  return (
    <View style={[styles.avatarRing, { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2, borderColor: ring }]}>
      {inner}
    </View>
  );
}

function serviceIcon(type) {
  return {
    ride: 'car-sport-outline',
    food: 'fast-food-outline',
    delivery: 'bicycle-outline',
    cargo: 'cube-outline',
  }[type] || 'navigate-outline';
}

function serviceLabel(type) {
  return {
    ride: 'Ride',
    food: 'Food',
    delivery: 'Delivery',
    cargo: 'Cargo',
  }[type] || 'Request';
}

export default function DriverDashboard({ navigation }) {
  const { profile } = useUserProfile();
  const { notifications, darkMode } = useAppContext();
  const [isOnline, setIsOnline] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [declinedIds, setDeclinedIds] = useState([]);
  const [activeRequest, setActiveRequest] = useState(null);
  const [completedRequests, setCompletedRequests] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [acceptingId, setAcceptingId] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('mobile');
  const [passengerRatingInput, setPassengerRatingInput] = useState(5);
  const [mapRegion, setMapRegion] = useState({ ...LUSAKA_CENTER, latitudeDelta: 0.05, longitudeDelta: 0.05 });
  const [driverLocation, setDriverLocation] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Theme tokens — the header stays on the dark brand palette in both modes
  // (matching the rest of the app's headers); only the body surface switches.
  const bg         = darkMode ? colors.black : colors.offWhite;
  const cardBg     = darkMode ? colors.darkCard : colors.white;
  const borderColor= darkMode ? colors.darkBorder : colors.borderLight;
  const textColor  = darkMode ? colors.textOnDark : colors.textPrimary;
  const subText    = darkMode ? colors.textTertiary : colors.textSecondary;
  const chipBg     = darkMode ? colors.darkSurface : colors.white;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (typeof profile?.driverOnline === 'boolean') {
      setIsOnline(profile.driverOnline);
    }
  }, [profile?.driverOnline]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return undefined;

    const offActive = watchDriverActiveRequest(user.uid, (request) => {
      setActiveRequest(request);
      if (request?.pickupCoords && request?.destinationCoords) {
        setMapRegion(buildMapRegion(request.pickupCoords, request.destinationCoords));
      }
    }, (error) => Alert.alert('Driver Updates', error.message));

    const offCompleted = watchDriverCompletedRequests(user.uid, setCompletedRequests, () => {});
    return () => {
      offActive?.();
      offCompleted?.();
    };
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setPendingRequests([]);
      return undefined;
    }
    return watchDriverPendingRequests(setPendingRequests, (error) => Alert.alert('Requests', error.message));
  }, [isOnline]);

  // Broadcast this driver's live position to the Realtime Database while online,
  // so passengers tracking an active trip can see a moving driver marker.
  useEffect(() => {
    if (!isOnline) { setDriverLocation(null); return undefined; }
    const user = auth.currentUser;
    if (!user) return undefined;
    let subscription;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 8000, distanceInterval: 25 },
          (loc) => {
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setDriverLocation(coords);
            dbSet(dbRef(rtdb, `drivers/${user.uid}/location`), { ...coords, updatedAt: Date.now() }).catch(() => {});
          },
        );
      } catch {
        // no GPS available — nearby filtering falls back to showing everything
      }
    })();
    return () => {
      cancelled = true;
      subscription?.remove?.();
      if (user) dbRemove(dbRef(rtdb, `drivers/${user.uid}/location`)).catch(() => {});
    };
  }, [isOnline]);

  // Local alert when a new request appears, if notifications are enabled
  const knownRequestIds = useRef(new Set());
  useEffect(() => {
    if (!notifications) { knownRequestIds.current = new Set(pendingRequests.map((r) => r.id)); return; }
    const freshIds = pendingRequests.map((r) => r.id);
    const hasNew = freshIds.some((id) => !knownRequestIds.current.has(id));
    if (hasNew && knownRequestIds.current.size > 0) {
      Notifications.scheduleNotificationAsync({
        content: { title: 'Tiyende', body: 'A new ride request is available nearby.' },
        trigger: null,
      }).catch(() => {});
    }
    knownRequestIds.current = new Set(freshIds);
  }, [pendingRequests, notifications]);

  useEffect(() => {
    if (!isOnline) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.04, duration: 850, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 850, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [isOnline]);

  const today = new Date().toDateString();
  const todayCompleted = useMemo(() => completedRequests.filter((request) => {
    const completed = request.completedAt?.toDate?.();
    return completed ? completed.toDateString() === today : false;
  }), [completedRequests, today]);
  const todayEarnings = todayCompleted.reduce((sum, request) => sum + Number(request.fare || 0), 0);
  const todayTrips = todayCompleted.length;

  const filteredRequests = pendingRequests
    .filter((request) => !declinedIds.includes(request.id))
    .filter((request) => selectedFilter === 'all' || request.serviceType === selectedFilter)
    .map((request) => ({
      ...request,
      awayKm: driverLocation && request.pickupCoords ? distanceKm(driverLocation, request.pickupCoords) : null,
    }))
    .filter((request) => request.awayKm === null || request.awayKm <= NEARBY_RADIUS_KM)
    .sort((a, b) => (a.awayKm ?? 999) - (b.awayKm ?? 999));

  const toggleOnline = async () => {
    const goingOnline = !isOnline;
    setIsOnline(goingOnline);
    const user = auth.currentUser;
    if (user) {
      await setDoc(doc(db, 'users', user.uid), {
        driverOnline: goingOnline,
        lastOnlineAt: new Date().toISOString(),
      }, { merge: true });
    }
  };

  const handleAccept = async (request) => {
    setAcceptingId(request.id);
    try {
      await acceptRequest(request.id);
    } catch (error) {
      Alert.alert('Accept Failed', error.message);
    } finally {
      setAcceptingId('');
    }
  };

  const declineRequest = (id) => {
    setDeclinedIds((current) => [...current, id]);
  };

  const openTripChat = () => {
    if (!activeRequest?.passengerId) return;
    (navigation.getParent?.() || navigation).navigate('TripChat', { request: activeRequest });
  };

  const openDataCall = () => {
    if (!activeRequest?.passengerId) return;
    (navigation.getParent?.() || navigation).navigate('DataCall', { request: activeRequest });
  };

  const openNavigation = () => {
    if (!activeRequest) return;
    const goingToPickup = activeRequest.status === 'accepted';
    const coords = goingToPickup
      ? activeRequest.pickupCoords
      : activeRequest.destinationCoords;
    if (!coords) return;
    const { latitude, longitude } = coords;
    const label = goingToPickup ? activeRequest.pickupName : activeRequest.destinationName;
    const url = Platform.OS === 'ios'
      ? `maps://app?daddr=${latitude},${longitude}&q=${encodeURIComponent(label)}`
      : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`);
    });
  };

  const openRestaurantChat = () => {
    if (!activeRequest?.id) return;
    (navigation.getParent?.() || navigation).navigate('RestaurantChat', {
      requestId: activeRequest.id,
      restaurantName: activeRequest.pickupName,
      senderRole: 'driver',
      senderName: driverName,
    });
  };

  const advanceActiveRequest = async () => {
    if (!activeRequest) return;
    const isFood = activeRequest.serviceType === 'food';
    try {
      if (activeRequest.status === 'accepted') {
        // Food: heading to restaurant → at restaurant; Ride: heading to passenger → arrived
        await updateRequestStatus(activeRequest.id, isFood ? 'at_restaurant' : 'arrived');
      } else if (activeRequest.status === 'at_restaurant') {
        // Food only: picked up food, now heading to customer
        await updateRequestStatus(activeRequest.id, 'in_progress');
      } else if (activeRequest.status === 'arrived') {
        await updateRequestStatus(activeRequest.id, 'in_progress');
      } else if (activeRequest.status === 'in_progress') {
        setShowPayment(true);
      }
    } catch (error) {
      Alert.alert('Update Failed', error.message);
    }
  };

  const cancelActiveRequest = () => {
    if (!activeRequest) return;
    Alert.alert('Cancel Request', 'Cancel this accepted request?', [
      { text: 'Keep It', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateRequestStatus(activeRequest.id, 'cancelled', { cancelledBy: 'driver' });
          } catch (error) {
            Alert.alert('Cancel Failed', error.message);
          }
        },
      },
    ]);
  };

  const finalizeRequest = async () => {
    if (!activeRequest) return;
    try {
      await updateRequestStatus(activeRequest.id, 'completed', {
        paymentConfirmedByDriver: true,
        paymentConfirmedMethod: selectedPayment,
        payoutAmount: Number(activeRequest.fare || 0),
      });
      if (activeRequest.passengerId) {
        await ratePassenger(activeRequest.id, activeRequest.passengerId, passengerRatingInput).catch(() => {});
      }
      setShowPayment(false);
      setPassengerRatingInput(5);
      Alert.alert('Completed', `You earned ZK ${activeRequest.fare}.`);
    } catch (error) {
      Alert.alert('Complete Failed', error.message);
    }
  };

  const routeCoords = activeRequest?.pickupCoords && activeRequest?.destinationCoords
    ? [activeRequest.pickupCoords, activeRequest.destinationCoords]
    : [];
  const driverName = profile?.fullName || profile?.displayName || 'Driver';
  const isActiveFood = activeRequest?.serviceType === 'food';
  const actionLabel = activeRequest?.status === 'accepted'
    ? (isActiveFood ? 'At Restaurant' : 'Arrived')
    : (activeRequest?.status === 'at_restaurant')
      ? 'Picked Up Food'
      : activeRequest?.status === 'arrived'
        ? 'Start Trip'
        : 'Complete';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.charcoal} />

      {activeRequest && (
        <View style={styles.mapContainer}>
          <MapView style={styles.map} region={mapRegion} mapType="none">
            <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} flipY={false} />
            <Marker coordinate={activeRequest.pickupCoords || DEFAULT_PICKUP.coords} title={activeRequest.pickupName}>
              <View style={styles.pickupMarker}><Ionicons name={serviceIcon(activeRequest.serviceType)} size={16} color={colors.white} /></View>
            </Marker>
            <Marker coordinate={activeRequest.destinationCoords || DEFAULT_PICKUP.coords} title={activeRequest.destinationName}>
              <Ionicons name="location" size={30} color={colors.error} />
            </Marker>
            <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={4} lineDashPattern={[10, 5]} />
          </MapView>
          <View style={styles.navBanner}>
            <Ionicons name="navigate" size={18} color={colors.white} />
            <Text style={styles.navBannerText}>{statusLabel(activeRequest.status, activeRequest.serviceType)}</Text>
            <Text style={styles.navBannerEta}>{activeRequest.durationMinutes || '--'} min</Text>
          </View>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.driverIntro}>
            <Avatar name={driverName} photoURL={profile?.photoURL} size={48} ring={isOnline ? colors.success : 'rgba(255,255,255,0.15)'} />
            <View>
              <Text style={styles.greeting}>Good day</Text>
              <Text style={styles.driverName}>{driverName}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.statusPill, isOnline && styles.statusPillOn]}
            onPress={toggleOnline}
            activeOpacity={0.85}
            disabled={!!activeRequest}
          >
            <Animated.View style={[styles.statusDot, isOnline && styles.statusDotOn, isOnline && { transform: [{ scale: pulseAnim }] }]} />
            <Text style={[styles.statusText, isOnline && { color: colors.success }]}>{isOnline ? 'Online' : 'Offline'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          {[
            { val: `ZK ${todayEarnings}`, lbl: 'Today', icon: 'cash-outline' },
            { val: String(todayTrips), lbl: 'Jobs', icon: 'checkmark-done-outline' },
            { val: String(profile?.rating || 5), lbl: 'Rating', icon: 'star', gold: true },
          ].map((item) => (
            <View key={item.lbl} style={styles.statCard}>
              <View style={[styles.statIconBg, item.gold && { backgroundColor: 'rgba(240,192,64,0.18)' }]}>
                <Ionicons name={item.icon} size={15} color={item.gold ? colors.accent : colors.primaryLight} />
              </View>
              <Text style={styles.statVal}>{item.val}</Text>
              <Text style={styles.statLbl}>{item.lbl}</Text>
            </View>
          ))}
        </View>

        {!activeRequest && (
          <TouchableOpacity style={[styles.onlineBtn, isOnline && styles.offlineBtn]} onPress={toggleOnline} activeOpacity={0.85}>
            <Ionicons name="power" size={19} color={colors.white} />
            <Text style={styles.onlineBtnText}>{isOnline ? 'Go Offline' : 'Go Online'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        {activeRequest ? (
          <View style={[styles.activeRidePanel, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.activeRideHeader}>
              <Avatar name={activeRequest.passengerName} photoURL={activeRequest.passengerPhotoURL} size={50} />
              <View style={{ flex: 1 }}>
                <View style={styles.requestTypeRow}>
                  <Ionicons name={serviceIcon(activeRequest.serviceType)} size={13} color={colors.primaryLight} />
                  <Text style={styles.requestType}>{serviceLabel(activeRequest.serviceType)}</Text>
                </View>
                <Text style={[styles.passengerName, { color: textColor }]}>{activeRequest.passengerName}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color={colors.accent} />
                  <Text style={styles.passengerRating}>{activeRequest.passengerRating || 5}</Text>
                  {activeRequest.passengerPhone && (
                    <>
                      <Text style={[styles.passengerRating, { color: subText }]}>  ·  </Text>
                      <Ionicons name="call-outline" size={11} color={subText} />
                      <Text style={[styles.passengerRating, { color: subText }]}> {activeRequest.passengerPhone}</Text>
                    </>
                  )}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.rideFare}>ZK {activeRequest.fare}</Text>
                <Text style={[styles.rideDistance, { color: subText }]}>{activeRequest.distanceText || ''}</Text>
              </View>
            </View>

            <View style={[styles.routeCard, { backgroundColor: darkMode ? colors.darkSurface : colors.offWhite }]}>
              <View style={styles.routeInfo}>
                <View style={styles.routeDotGreen} />
                <Text style={[styles.routePickup, { color: subText }]} numberOfLines={1}>{activeRequest.pickupName}</Text>
              </View>
              <View style={styles.routeConnector} />
              <View style={styles.routeInfo}>
                <View style={styles.routeDotRed} />
                <Text style={[styles.routeDest, { color: textColor }]} numberOfLines={1}>{activeRequest.destinationName}</Text>
              </View>
            </View>

            {activeRequest.serviceType === 'food' && activeRequest.items?.length ? (
              <View style={[styles.foodItems, { backgroundColor: darkMode ? colors.darkSurface : colors.offWhite }]}>
                {activeRequest.items.map((item) => (
                  <Text key={item.id} style={[styles.foodItemText, { color: textColor }]}>{item.qty} x {item.name}</Text>
                ))}
              </View>
            ) : null}

            <View style={styles.contactActions}>
              {activeRequest.passengerPhone && (
                <TouchableOpacity style={styles.iconActionBtn} onPress={() => Linking.openURL(`tel:${activeRequest.passengerPhone}`)}>
                  <View style={[styles.iconActionCircle, { backgroundColor: 'rgba(26,127,55,0.14)' }]}>
                    <Ionicons name="call" size={18} color={colors.primaryLight} />
                  </View>
                  <Text style={[styles.iconActionText, { color: subText }]}>Call</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.iconActionBtn} onPress={openNavigation}>
                <View style={[styles.iconActionCircle, { backgroundColor: 'rgba(14,165,233,0.14)' }]}>
                  <Ionicons name="navigate" size={18} color="#0EA5E9" />
                </View>
                <Text style={[styles.iconActionText, { color: subText }]}>{activeRequest.status === 'accepted' ? 'To Pickup' : 'Navigate'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconActionBtn} onPress={openTripChat}>
                <View style={styles.iconActionCircle}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primaryLight} />
                </View>
                <Text style={[styles.iconActionText, { color: subText }]}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconActionBtn} onPress={openDataCall}>
                <View style={styles.iconActionCircle}>
                  <Ionicons name="videocam-outline" size={18} color={colors.primaryLight} />
                </View>
                <Text style={[styles.iconActionText, { color: subText }]}>Data Call</Text>
              </TouchableOpacity>
              {activeRequest.serviceType === 'food' && (
                <TouchableOpacity style={styles.iconActionBtn} onPress={openRestaurantChat}>
                  <View style={styles.iconActionCircle}>
                    <Ionicons name="restaurant-outline" size={18} color={colors.primaryLight} />
                  </View>
                  <Text style={[styles.iconActionText, { color: subText }]}>Restaurant</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.activeActions}>
              <TouchableOpacity style={styles.cancelActiveBtn} onPress={cancelActiveRequest}>
                <Text style={styles.cancelActiveText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.completeBtn} onPress={advanceActiveRequest} activeOpacity={0.85}>
                <Ionicons
                  name={
                    activeRequest.status === 'in_progress' ? 'checkmark-circle'
                    : activeRequest.status === 'at_restaurant' ? 'bag-check-outline'
                    : 'arrow-forward'
                  }
                  size={20}
                  color={colors.white}
                />
                <Text style={styles.completeBtnText}>{actionLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isOnline ? (
          <>
            <FlatList
              horizontal
              data={FILTERS}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.filterChip, { backgroundColor: chipBg, borderColor }, selectedFilter === item.id && styles.filterChipOn]}
                  onPress={() => setSelectedFilter(item.id)}
                >
                  <Ionicons name={item.icon} size={14} color={selectedFilter === item.id ? colors.white : colors.primaryLight} />
                  <Text style={[styles.filterText, selectedFilter === item.id && styles.filterTextOn]}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />

            <Text style={[styles.requestsTitle, { color: subText }]}>
              <Text style={[styles.requestsCount, { color: textColor }]}>{filteredRequests.length} </Text>
              {filteredRequests.length === 1 ? 'request' : 'requests'} available
            </Text>
            <FlatList
              data={filteredRequests}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={[styles.rideCard, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.passengerRow}>
                    <View style={[styles.svcIconBg, { backgroundColor: darkMode ? colors.darkSurface : colors.primaryGhost }]}>
                      <Ionicons name={serviceIcon(item.serviceType)} size={17} color={colors.primaryLight} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.passengerLabel, { color: textColor }]}>{item.passengerName}</Text>
                      <Text style={styles.requestTypeSmall}>{serviceLabel(item.serviceType)}</Text>
                    </View>
                    <Text style={styles.requestFare}>ZK {item.fare}</Text>
                  </View>
                  <View style={styles.rideRoute}>
                    <View style={styles.routeDots}>
                      <View style={styles.routeDotGreen} />
                      <View style={[styles.routeLine, { backgroundColor: borderColor }]} />
                      <View style={styles.routeDotRed} />
                    </View>
                    <View style={styles.routeLabels}>
                      <Text style={[styles.routePickupText, { color: subText }]} numberOfLines={1}>{item.pickupName}</Text>
                      <Text style={[styles.routeDestText, { color: textColor }]} numberOfLines={1}>{item.destinationName}</Text>
                    </View>
                  </View>
                  {item.serviceType === 'food' && item.items?.length ? (
                    <View>
                      {item.status === 'ready_for_pickup' && (
                        <View style={styles.readyBadge}>
                          <Ionicons name="bag-check" size={12} color={colors.success} />
                          <Text style={styles.readyBadgeText}>FOOD READY FOR PICKUP</Text>
                        </View>
                      )}
                      <Text style={[styles.orderPreview, { backgroundColor: darkMode ? colors.darkSurface : colors.offWhite, color: subText }]} numberOfLines={2}>
                        {item.items.map((food) => `${food.qty} x ${food.name}`).join(', ')}
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.rideMeta, { borderTopColor: borderColor }]}>
                    {[
                      { icon: 'cash-outline', val: `ZK ${item.fare}`, color: colors.primaryLight },
                      { icon: 'navigate-outline', val: item.distanceText || 'Nearby', color: subText },
                      { icon: 'time-outline', val: `${item.durationMinutes || '--'} min`, color: subText },
                      ...(item.awayKm != null ? [{ icon: 'locate-outline', val: `${formatDistance(item.awayKm)} away`, color: '#0EA5E9' }] : []),
                    ].map((meta) => (
                      <View key={meta.icon} style={styles.metaItem}>
                        <Ionicons name={meta.icon} size={13} color={meta.color} />
                        <Text style={[styles.metaText, { color: meta.color }]}>{meta.val}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.rideActions}>
                    <TouchableOpacity style={[styles.declineBtn, { borderColor }]} onPress={() => declineRequest(item.id)}>
                      <Text style={[styles.declineBtnText, { color: subText }]}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item)} disabled={acceptingId === item.id}>
                      {acceptingId === item.id ? <ActivityIndicator color={colors.white} /> : <Ionicons name="checkmark" size={16} color={colors.white} />}
                      <Text style={styles.acceptBtnText}>{acceptingId === item.id ? 'Accepting' : 'Accept'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <View style={[styles.emptyIconBg, { backgroundColor: cardBg }]}>
                    <Ionicons name="search-outline" size={32} color={subText} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: textColor }]}>Listening for requests</Text>
                  <Text style={[styles.emptySub, { color: subText }]}>Passenger ride and order requests appear here live.</Text>
                </View>
              }
            />
          </>
        ) : (
          <View style={styles.offline}>
            <View style={[styles.emptyIconBg, { backgroundColor: cardBg }]}>
              <Ionicons name="power-outline" size={40} color={subText} />
            </View>
            <Text style={[styles.offlineTitle, { color: textColor }]}>You are offline</Text>
            <Text style={[styles.offlineSub, { color: subText }]}>Go online to receive live ride, food, delivery, and cargo requests.</Text>
          </View>
        )}
      </Animated.View>

      <Modal visible={showPayment} transparent animationType="slide" onRequestClose={() => setShowPayment(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.paySheet, { backgroundColor: cardBg }]}>
            <View style={[styles.sheetHandle, { backgroundColor: borderColor }]} />
            <Text style={[styles.payTitle, { color: textColor }]}>Confirm Payment</Text>
            <Text style={[styles.paySub, { color: subText }]}>Complete this {serviceLabel(activeRequest?.serviceType).toLowerCase()} for ZK {activeRequest?.fare}</Text>
            {PAYMENT_OPTIONS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[styles.payOption, { borderColor }, selectedPayment === method.id && styles.payOptionSelected]}
                onPress={() => setSelectedPayment(method.id)}
              >
                <View style={[styles.payOptionIcon, { backgroundColor: selectedPayment === method.id ? colors.primary : colors.primaryGhost }]}>
                  <Ionicons name={method.icon} size={20} color={selectedPayment === method.id ? colors.white : colors.primary} />
                </View>
                <Text style={[styles.payOptionText, { color: textColor }, selectedPayment === method.id && { color: colors.primary, fontWeight: '800' }]}>{method.label}</Text>
                {selectedPayment === method.id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
            <Text style={[styles.rateLabel, { color: textColor }]}>Rate this passenger</Text>
            <View style={styles.rateStars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setPassengerRatingInput(n)}>
                  <Ionicons
                    name={n <= passengerRatingInput ? 'star' : 'star-outline'}
                    size={26}
                    color={colors.accent}
                    style={{ marginHorizontal: 3 }}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.confirmPayBtn} onPress={finalizeRequest}>
              <Text style={styles.confirmPayBtnText}>Complete Request</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPayment(false)} style={styles.closePayBtn}>
              <Text style={[styles.closePayText, { color: subText }]}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { height: 220, position: 'relative' },
  map: { flex: 1 },
  navBanner: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  navBannerText: { flex: 1, color: colors.white, fontSize: 13, fontWeight: '800' },
  navBannerEta: { color: 'rgba(255,255,255,0.82)', fontSize: 12 },
  pickupMarker: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },

  header: {
    backgroundColor: colors.charcoal, paddingTop: 54, paddingHorizontal: 20, paddingBottom: 24,
    borderBottomLeftRadius: radius.xxl, borderBottomRightRadius: radius.xxl, overflow: 'hidden',
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  driverIntro: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  avatarRing: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: 12, color: '#8B949E', fontWeight: '600', marginBottom: 2 },
  driverName: { fontSize: 18, fontWeight: '800', color: colors.white },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2D333B', borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 8 },
  statusPillOn: { backgroundColor: 'rgba(26,127,55,0.2)' },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#8B949E' },
  statusDotOn: { backgroundColor: colors.success },
  statusText: { fontSize: 12, fontWeight: '700', color: '#8B949E' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#22282F', borderRadius: radius.lg, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333A42' },
  statIconBg: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(45,147,84,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statVal: { fontSize: 15, fontWeight: '800', color: colors.white },
  statLbl: { fontSize: 9.5, color: '#8B949E', marginTop: 2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  onlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.lg, padding: 15, gap: 8, ...shadows.green },
  offlineBtn: { backgroundColor: colors.error, shadowColor: colors.error },
  onlineBtnText: { color: colors.white, fontSize: 16, fontWeight: '800' },

  filterList: { gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.full, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1 },
  filterChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, color: colors.primaryLight, fontWeight: '800' },
  filterTextOn: { color: colors.white },
  requestsTitle: { fontSize: 14, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, fontWeight: '600' },
  requestsCount: { fontSize: 20, fontWeight: '900' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  rideCard: { borderRadius: radius.xl, padding: 16, marginBottom: 12, borderWidth: 1, ...shadows.small },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  svcIconBg: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  passengerLabel: { fontSize: 14, fontWeight: '800' },
  requestTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  requestType: { fontSize: 12, color: colors.primaryLight, fontWeight: '800' },
  requestTypeSmall: { fontSize: 11, color: colors.primaryLight, fontWeight: '800', marginTop: 2 },
  requestFare: { fontSize: 18, color: colors.primaryLight, fontWeight: '900' },
  rideRoute: { flexDirection: 'row', marginBottom: 10 },
  routeDots: { width: 16, alignItems: 'center', marginRight: 10, paddingTop: 3 },
  routeDotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryLight },
  routeLine: { width: 1.5, height: 20, marginVertical: 2 },
  routeDotRed: { width: 8, height: 8, borderRadius: 2, backgroundColor: colors.error },
  routeLabels: { flex: 1, justifyContent: 'space-between' },
  routePickupText: { fontSize: 12, marginBottom: 12 },
  routeDestText: { fontSize: 15, fontWeight: '700' },
  readyBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.successLight, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 6 },
  readyBadgeText: { fontSize: 10, fontWeight: '900', color: colors.success, letterSpacing: 0.5 },
  orderPreview: { fontSize: 12, borderRadius: radius.sm, padding: 8, marginBottom: 8 },
  rideMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingVertical: 10, borderTopWidth: 1 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '700' },
  rideActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  declineBtn: { flex: 1, padding: 12, borderRadius: radius.full, borderWidth: 1.5, alignItems: 'center' },
  declineBtnText: { fontSize: 14, fontWeight: '800' },
  acceptBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.full, padding: 12, gap: 6, ...shadows.green },
  acceptBtnText: { fontSize: 14, fontWeight: '800', color: colors.white },

  activeRidePanel: { margin: 16, borderRadius: radius.xxl, padding: 18, borderWidth: 1, ...shadows.medium },
  activeRideHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  passengerName: { fontSize: 16, fontWeight: '900' },
  ratingRow: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 3 },
  passengerRating: { fontSize: 12, color: '#9A6700', fontWeight: '700' },
  rideFare: { fontSize: 18, fontWeight: '900', color: colors.primaryLight },
  rideDistance: { fontSize: 12, marginTop: 2 },
  routeCard: { borderRadius: radius.lg, padding: 12, marginBottom: 4 },
  routeInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeConnector: { width: 1.5, height: 14, backgroundColor: colors.border, marginLeft: 3.5, marginVertical: 2 },
  routePickup: { flex: 1, fontSize: 13 },
  routeDest: { flex: 1, fontSize: 15, fontWeight: '800' },
  foodItems: { borderRadius: radius.md, padding: 10, marginTop: 12 },
  foodItemText: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  contactActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  iconActionBtn: { alignItems: 'center', gap: 6 },
  iconActionCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryGhost, alignItems: 'center', justifyContent: 'center' },
  iconActionText: { fontSize: 11, fontWeight: '700' },
  activeActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelActiveBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.error, borderRadius: radius.full },
  cancelActiveText: { color: colors.error, fontSize: 14, fontWeight: '800' },
  completeBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.full, padding: 14, gap: 8, ...shadows.green },
  completeBtnText: { color: colors.white, fontSize: 15, fontWeight: '800' },

  empty: { alignItems: 'center', paddingTop: 40 },
  emptyIconBg: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14, ...shadows.xs },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  emptySub: { fontSize: 13, marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },
  offline: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  offlineTitle: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  offlineSub: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  paySheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  payTitle: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  paySub: { fontSize: 13, marginBottom: 20 },
  payOption: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, marginBottom: 10 },
  payOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryGhost },
  payOptionIcon: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  payOptionText: { flex: 1, fontSize: 15, fontWeight: '600' },
  rateLabel: { fontSize: 13, fontWeight: '700', marginTop: 4, marginBottom: 8 },
  rateStars: { flexDirection: 'row', marginBottom: 16 },
  confirmPayBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: 8, ...shadows.green },
  confirmPayBtnText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  closePayBtn: { alignItems: 'center', paddingVertical: 14 },
  closePayText: { fontWeight: '700' },
});
