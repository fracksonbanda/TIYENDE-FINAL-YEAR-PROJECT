import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, Alert, Image, ScrollView,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import MapView, { Marker, UrlTile, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { onValue, ref as dbRef } from 'firebase/database';
import { onSnapshot, doc } from 'firebase/firestore';
import { colors, radius, shadows } from '../../theme';
import { useAppContext } from '../../context/AppContext';
import { fetchRestaurantsFromOSM } from '../../services/placesService';
import { createServiceRequest, foodStatusToStage, statusLabel } from '../../services/requestService';
import { watchOpenRestaurants, fetchMenuItems, validateRestaurantDiscount } from '../../services/restaurantService';
import { auth, db, rtdb } from '../../firebase';
import {
  DEFAULT_PICKUP, distanceKm, estimateDurationMinutes, formatDistance,
  initialsFromName, LUSAKA_PLACES, buildMapRegion,
} from '../../utils/geo';

const PAYMENT_METHODS = [
  { id: 'mobile', label: 'Mobile Money', icon: 'phone-portrait-outline' },
  { id: 'cash',   label: 'Cash',         icon: 'cash-outline' },
  { id: 'wallet', label: 'Wallet',       icon: 'wallet-outline' },
  { id: 'card',   label: 'Card',         icon: 'card-outline' },
];

// Fallback menus for OSM restaurants that have no Firestore menu
const CUISINE_MENUS = {
  burger: {
    Burgers: [
      { id: 'bg1', name: 'Classic Beef Burger', price: 65, desc: 'Beef patty, lettuce, tomato, cheese' },
      { id: 'bg2', name: 'Double Smash Burger', price: 89, desc: 'Two smash patties, special sauce' },
      { id: 'bg3', name: 'Chicken Burger', price: 72, desc: 'Crispy fried chicken, coleslaw, mayo' },
      { id: 'bg4', name: 'Veggie Burger', price: 58, desc: 'Grilled vegetable patty, fresh greens' },
    ],
    Sides: [
      { id: 'bg5', name: 'Seasoned Fries', price: 28, desc: 'Crispy golden fries' },
      { id: 'bg6', name: 'Onion Rings', price: 32, desc: 'Beer-battered onion rings' },
    ],
    Drinks: [
      { id: 'bg8', name: 'Coke 500ml', price: 18, desc: '' },
      { id: 'bg9', name: 'Milkshake', price: 38, desc: 'Chocolate, vanilla or strawberry' },
    ],
  },
  pizza: {
    Pizzas: [
      { id: 'pz1', name: 'Margherita', price: 95, desc: 'Tomato sauce, mozzarella, basil' },
      { id: 'pz2', name: 'BBQ Chicken', price: 115, desc: 'BBQ sauce, chicken, red onion' },
      { id: 'pz3', name: 'Pepperoni Feast', price: 120, desc: 'Double pepperoni, mozzarella' },
      { id: 'pz4', name: 'Meat Lovers', price: 135, desc: 'Beef, chicken, bacon, sausage' },
    ],
    Sides: [{ id: 'pz6', name: 'Garlic Bread', price: 28, desc: '' }],
    Drinks: [{ id: 'pz8', name: 'Coke 500ml', price: 18, desc: '' }],
  },
  chicken: {
    Chicken: [
      { id: 'ck1', name: '2 Pc Chicken & Chips', price: 78, desc: 'Two pieces with seasoned chips' },
      { id: 'ck2', name: '4 Pc Bucket', price: 145, desc: 'Four pieces, coleslaw and roll' },
      { id: 'ck3', name: 'Wings (6 pc)', price: 82, desc: 'Spicy or BBQ glaze' },
    ],
    Sides: [{ id: 'ck5', name: 'Seasoned Chips', price: 25, desc: '' }],
    Drinks: [{ id: 'ck8', name: 'Coke 500ml', price: 18, desc: '' }],
  },
  coffee: {
    'Hot Drinks': [
      { id: 'cf1', name: 'Cappuccino', price: 42, desc: 'Espresso with steamed milk foam' },
      { id: 'cf2', name: 'Americano', price: 35, desc: 'Double espresso, hot water' },
    ],
    'Cold Drinks': [
      { id: 'cf5', name: 'Iced Latte', price: 52, desc: 'Espresso over cold milk and ice' },
    ],
    Snacks: [
      { id: 'cf8', name: 'Croissant', price: 28, desc: 'Buttery plain or filled' },
      { id: 'cf9', name: 'Club Sandwich', price: 65, desc: 'Triple-decker with fries' },
    ],
  },
  default: {
    Mains: [
      { id: 'df1', name: 'Grilled Chicken', price: 85, desc: 'Served with rice and vegetables' },
      { id: 'df2', name: 'Beef Stew', price: 78, desc: 'Slow-cooked beef with nshima' },
      { id: 'df3', name: 'Grilled Bream', price: 95, desc: 'With chips and salad' },
      { id: 'df4', name: 'Kapenta & Nshima', price: 55, desc: 'Traditional dried kapenta' },
    ],
    Snacks: [
      { id: 'df6', name: 'Samosas (3 pc)', price: 30, desc: 'Beef or vegetable filling' },
    ],
    Drinks: [
      { id: 'df8', name: 'Coke 500ml', price: 18, desc: '' },
      { id: 'df10', name: 'Maheu 500ml', price: 15, desc: 'Fermented maize drink' },
    ],
  },
};

function getFallbackMenu(cuisine = '') {
  const c = cuisine.toLowerCase();
  if (c.includes('burger') || c.includes('american') || c.includes('fast food')) return CUISINE_MENUS.burger;
  if (c.includes('pizza') || c.includes('italian')) return CUISINE_MENUS.pizza;
  if (c.includes('chicken') || c.includes('fried') || c.includes('kfc')) return CUISINE_MENUS.chicken;
  if (c.includes('coffee') || c.includes('cafe') || c.includes('café') || c.includes('bakery')) return CUISINE_MENUS.coffee;
  return CUISINE_MENUS.default;
}

function flattenMenu(menuObj) {
  return Object.entries(menuObj).flatMap(([cat, items]) =>
    items.map((item) => ({ ...item, category: cat })),
  );
}

// Tracking stage definitions (8 stages for Firestore restaurants)
const FOOD_STAGES_FULL = [
  { label: 'Order received',            icon: 'checkmark-circle-outline', sub: 'Sent to restaurant' },
  { label: 'Restaurant confirmed',      icon: 'restaurant-outline',       sub: 'They got your order' },
  { label: 'Being prepared',            icon: 'flame-outline',            sub: 'Kitchen is working on it' },
  { label: 'Ready for pickup',          icon: 'bag-check-outline',        sub: 'Waiting for courier' },
  { label: 'Courier heading to restaurant', icon: 'bicycle-outline',     sub: 'On the way to pick up' },
  { label: 'Courier at restaurant',     icon: 'location-outline',         sub: 'Collecting your food' },
  { label: 'Food on the way',           icon: 'navigate-outline',         sub: 'Heading to your address' },
  { label: 'Delivered!',                icon: 'home-outline',             sub: 'Enjoy your meal' },
];

// Simplified 5-stage for OSM restaurants (driver-direct flow)
const FOOD_STAGES_SIMPLE = [
  { label: 'Order placed',         icon: 'checkmark-circle-outline' },
  { label: 'Courier found',        icon: 'bicycle-outline' },
  { label: 'Courier at restaurant',icon: 'location-outline' },
  { label: 'Food on the way',      icon: 'navigate-outline' },
  { label: 'Delivered!',           icon: 'home-outline' },
];

const STATUS_TO_SIMPLE_STAGE = {
  pending: 0, accepted: 1, at_restaurant: 2, in_progress: 3, completed: 4,
};

function RestaurantLogo({ restaurant, size = 46 }) {
  const logoUri = restaurant.logoBase64 || restaurant.logoURL;
  if (logoUri) {
    return <Image source={{ uri: logoUri }} style={{ width: size, height: size, borderRadius: 12, backgroundColor: colors.primaryGhost }} />;
  }
  return (
    <View style={[styles.logoFallback, { width: size, height: size, borderRadius: 12 }]}>
      <Text style={styles.logoText}>{initialsFromName(restaurant.name)}</Text>
    </View>
  );
}

function MenuItemImage({ item, size = 56 }) {
  if (item.imageBase64) {
    return <Image source={{ uri: item.imageBase64 }} style={{ width: size, height: size, borderRadius: 10, backgroundColor: colors.primaryGhost }} />;
  }
  return null;
}

export default function FoodScreen({ navigation }) {
  const { darkMode, promoUsed, markPromoUsed } = useAppContext();

  // Restaurant list (Firestore + OSM)
  const [firestoreRestaurants, setFirestoreRestaurants] = useState([]);
  const [osmRestaurants, setOsmRestaurants]             = useState([]);
  const [osmLoading, setOsmLoading]                     = useState(false);
  const [error, setError]                               = useState('');
  const [search, setSearch]                             = useState('');

  // Selected restaurant
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  // Menu for the selected restaurant
  const [firestoreMenu, setFirestoreMenu] = useState(null); // array of items or null
  const [menuLoading, setMenuLoading]     = useState(false);

  // Cart
  const [cart, setCart]           = useState({});
  const [menuCategory, setMenuCategory] = useState('');

  // Checkout fields
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedPlace, setSelectedPlace]     = useState(null);
  const [notes, setNotes]                     = useState('');
  const [promoCode, setPromoCode]             = useState('');
  const [paymentMethod, setPaymentMethod]     = useState('mobile');
  const [submitting, setSubmitting]           = useState(false);

  // Promo validation for Firestore restaurant
  const [restaurantDiscount, setRestaurantDiscount] = useState(null); // matched discount object
  const [promoChecking, setPromoChecking]           = useState(false);

  // Tracking
  const [orderTracking, setOrderTracking] = useState(null);
  // Live order status from Firestore
  const [liveOrder, setLiveOrder]         = useState(null);
  // Live driver location from RTDB
  const [driverLocation, setDriverLocation] = useState(null);
  // Map region for tracking
  const [trackingRegion, setTrackingRegion] = useState(null);

  const trackAnim = useRef(new Animated.Value(0)).current;

  const bg        = darkMode ? '#0D1117' : colors.offWhite;
  const cardBg    = darkMode ? '#161B22' : colors.white;
  const inputBg   = darkMode ? '#21262D' : colors.offWhite;
  const textColor = darkMode ? colors.textOnDark : colors.textPrimary;
  const subText   = darkMode ? '#8B949E' : colors.textSecondary;
  const borderColor = darkMode ? '#30363D' : colors.border;

  // ─── Load restaurants ─────────────────────────────────────────────────────

  useEffect(() => {
    // Firestore restaurants (real, registered on the app)
    const off = watchOpenRestaurants((list) => {
      setFirestoreRestaurants(list.map((r) => ({
        ...r,
        source: 'firestore',
        cuisine: r.cuisineType || '',
        coords: r.coords || DEFAULT_PICKUP.coords,
        distanceKm: r.coords ? distanceKm(DEFAULT_PICKUP.coords, r.coords) : 0,
      })));
    }, () => {});

    // OSM restaurants (fallback)
    setOsmLoading(true);
    fetchRestaurantsFromOSM()
      .then((data) => setOsmRestaurants(data.map((r) => ({ ...r, source: 'osm' }))))
      .catch(() => {})
      .finally(() => setOsmLoading(false));

    return off;
  }, []);

  const restaurants = useMemo(() => {
    // Firestore restaurants first, then OSM
    const all = [...firestoreRestaurants, ...osmRestaurants];
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter((r) => r.name.toLowerCase().includes(term) || (r.cuisine || '').toLowerCase().includes(term));
  }, [firestoreRestaurants, osmRestaurants, search]);

  const loading = osmLoading && firestoreRestaurants.length === 0 && osmRestaurants.length === 0;

  // ─── Load menu for selected restaurant ───────────────────────────────────

  useEffect(() => {
    if (!selectedRestaurant) { setFirestoreMenu(null); return; }
    setCart({});
    setMenuCategory('');
    setRestaurantDiscount(null);
    setPromoCode('');

    if (selectedRestaurant.source === 'firestore') {
      setMenuLoading(true);
      fetchMenuItems(selectedRestaurant.id)
        .then((items) => {
          setFirestoreMenu(items.filter((i) => i.available !== false));
          // Set first category
          const cats = [...new Set(items.map((i) => i.category || 'Other'))];
          setMenuCategory(cats[0] || '');
        })
        .catch(() => setFirestoreMenu([]))
        .finally(() => setMenuLoading(false));
    } else {
      setFirestoreMenu(null); // use fallback
      const m = getFallbackMenu(selectedRestaurant.cuisine);
      setMenuCategory(Object.keys(m)[0] || '');
    }
  }, [selectedRestaurant?.id]);

  // ─── Validate promo code ─────────────────────────────────────────────────

  const checkPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    // Built-in app code (FOOD20 for OSM restaurants)
    if (code === 'FOOD20' && selectedRestaurant?.source === 'osm') return;

    // Restaurant-specific discount
    if (selectedRestaurant?.source === 'firestore') {
      setPromoChecking(true);
      try {
        const discount = await validateRestaurantDiscount(selectedRestaurant.id, code);
        setRestaurantDiscount(discount);
        if (!discount) Alert.alert('Invalid Code', 'This promo code is not valid for this restaurant.');
      } catch { setRestaurantDiscount(null); }
      finally { setPromoChecking(false); }
    }
  };

  // ─── Derived menu data ────────────────────────────────────────────────────

  const isFirestoreRestaurant = selectedRestaurant?.source === 'firestore';

  const { menu, menuCategories, allMenuItems } = useMemo(() => {
    if (!selectedRestaurant) return { menu: {}, menuCategories: [], allMenuItems: [] };
    if (isFirestoreRestaurant && firestoreMenu) {
      // Group Firestore items by category
      const grouped = {};
      firestoreMenu.forEach((item) => {
        const cat = item.category || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      });
      const cats = Object.keys(grouped);
      return { menu: grouped, menuCategories: cats, allMenuItems: firestoreMenu };
    }
    // OSM fallback menu
    const m = getFallbackMenu(selectedRestaurant.cuisine);
    return { menu: m, menuCategories: Object.keys(m), allMenuItems: flattenMenu(m) };
  }, [selectedRestaurant?.id, firestoreMenu, isFirestoreRestaurant]);

  const cartItems = allMenuItems.filter((item) => (cart[item.id] || 0) > 0);
  const totalCartQty = cartItems.reduce((s, i) => s + (cart[i.id] || 0), 0);

  const addToCart = (item) => setCart((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
  const removeFromCart = (item) => setCart((prev) => {
    const qty = (prev[item.id] || 0) - 1;
    if (qty <= 0) { const next = { ...prev }; delete next[item.id]; return next; }
    return { ...prev, [item.id]: qty };
  });

  // ─── Pricing ─────────────────────────────────────────────────────────────

  const deliveryCoords = selectedPlace?.coords || DEFAULT_PICKUP.coords;
  const km             = selectedRestaurant ? distanceKm(selectedRestaurant.coords, deliveryCoords) : 0;
  const deliveryFee    = Math.max(18, Math.round(18 + km * 6));

  const itemsTotal = cartItems.reduce((sum, item) => {
    const qty   = cart[item.id] || 0;
    const pct   = item.discountPercent || 0;
    const price = pct > 0 ? Math.round(item.price * (1 - pct / 100)) : item.price;
    return sum + price * qty;
  }, 0);

  // Promo logic: FOOD20 for OSM, restaurant's own code for Firestore
  const builtinPromoValid  = promoCode.trim().toUpperCase() === 'FOOD20' && !promoUsed.food && !isFirestoreRestaurant;
  const restaurantPromoValid = Boolean(restaurantDiscount) && itemsTotal >= (restaurantDiscount?.minOrderAmount || 0);
  const promoDiscount = builtinPromoValid
    ? Math.ceil(itemsTotal * 0.2)
    : restaurantPromoValid
      ? Math.ceil(itemsTotal * (restaurantDiscount.percent / 100))
      : 0;

  const total = (itemsTotal - promoDiscount) + deliveryFee;

  // ─── Subscribe to live order (tracking) ──────────────────────────────────

  useEffect(() => {
    if (!orderTracking?.requestId) return;
    const unsub = onSnapshot(doc(db, 'serviceRequests', orderTracking.requestId), (snap) => {
      if (snap.exists()) setLiveOrder({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [orderTracking?.requestId]);

  // Subscribe to driver location once driver is assigned
  useEffect(() => {
    if (!liveOrder?.driverId) { setDriverLocation(null); return; }
    const locRef = dbRef(rtdb, `drivers/${liveOrder.driverId}/location`);
    const unsub = onValue(locRef, (snap) => {
      if (snap.exists()) setDriverLocation(snap.val());
    });
    return () => unsub();
  }, [liveOrder?.driverId]);

  // Build map region when tracking
  useEffect(() => {
    if (!orderTracking?.restaurantCoords) return;
    const dest = orderTracking.deliveryCoords || DEFAULT_PICKUP.coords;
    setTrackingRegion(buildMapRegion(orderTracking.restaurantCoords, dest));
  }, [orderTracking?.requestId]);

  // ─── Place order ──────────────────────────────────────────────────────────

  const submitOrder = async () => {
    if (!selectedRestaurant) { Alert.alert('Restaurant Needed', 'Choose a restaurant first.'); return; }
    if (cartItems.length === 0) { Alert.alert('Order Empty', 'Add at least one item from the menu.'); return; }
    if (!deliveryAddress.trim()) { Alert.alert('Delivery Address Needed', 'Enter your delivery address.'); return; }
    setSubmitting(true);
    try {
      // Food orders for Firestore restaurants go to 'pending_restaurant' first
      // OSM restaurants go directly to 'pending' (driver sees immediately)
      const status = isFirestoreRestaurant ? 'pending_restaurant' : 'pending';

      const requestId = await createServiceRequest({
        serviceType: 'food',
        status,
        pickupName: selectedRestaurant.name,
        pickupCoords: selectedRestaurant.coords,
        destinationName: deliveryAddress.trim(),
        destinationCoords: deliveryCoords,
        restaurant: { id: selectedRestaurant.id, name: selectedRestaurant.name, source: selectedRestaurant.source },
        restaurantId: isFirestoreRestaurant ? selectedRestaurant.id : null,
        items: cartItems.map((item) => ({
          id: item.id,
          name: item.name,
          qty: cart[item.id],
          price: item.price,
          category: item.category || '',
        })),
        notes: notes.trim(),
        fare: total,
        itemsTotal: itemsTotal - promoDiscount,
        deliveryFee,
        promoCode: promoCode.trim().toUpperCase() || null,
        promoDiscount,
        paymentMethod,
        distanceKm: Number(km.toFixed(2)),
        distanceText: formatDistance(km),
        durationMinutes: estimateDurationMinutes(km, 'food'),
      });

      if (builtinPromoValid) markPromoUsed('food');

      const etaMin = Math.max(25, estimateDurationMinutes(km, 'food') + (isFirestoreRestaurant ? 15 : 8));
      setOrderTracking({
        requestId,
        restaurantName: selectedRestaurant.name,
        restaurantCoords: selectedRestaurant.coords,
        deliveryCoords,
        itemCount: totalCartQty,
        total,
        etaMin,
        isFirestoreRestaurant,
      });

      trackAnim.setValue(0);
      Animated.timing(trackAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

      setCart({});
      setNotes('');
      setDeliveryAddress('');
      setSelectedPlace(null);
      setPromoCode('');
      setRestaurantDiscount(null);
    } catch (err) {
      Alert.alert('Order Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Tracking view ────────────────────────────────────────────────────────

  if (orderTracking) {
    const stages      = orderTracking.isFirestoreRestaurant ? FOOD_STAGES_FULL : FOOD_STAGES_SIMPLE;
    const currentStage = liveOrder
      ? (orderTracking.isFirestoreRestaurant
          ? foodStatusToStage(liveOrder.status)
          : (STATUS_TO_SIMPLE_STAGE[liveOrder.status] ?? 0))
      : 0;

    const isDelivered = liveOrder?.status === 'completed';

    const mapRegion = trackingRegion || {
      latitude: orderTracking.restaurantCoords?.latitude ?? -15.4167,
      longitude: orderTracking.restaurantCoords?.longitude ?? 28.2833,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    };

    const driverCoord = driverLocation
      ? { latitude: driverLocation.latitude, longitude: driverLocation.longitude }
      : null;

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('HomeMain')}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Order Tracking</Text>
            <Text style={styles.headerSub}>{orderTracking.restaurantName}</Text>
          </View>
        </View>

        <Animated.ScrollView style={{ opacity: trackAnim }} contentContainerStyle={styles.content}>
          {/* ETA card */}
          <View style={[styles.etaCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.etaCardLabel}>
              {isDelivered ? 'Delivered!' : 'Estimated delivery'}
            </Text>
            {isDelivered
              ? <Ionicons name="checkmark-circle" size={52} color={colors.white} style={{ marginVertical: 6 }} />
              : <Text style={styles.etaCardTime}>{orderTracking.etaMin} min</Text>}
            <Text style={styles.etaCardSub}>
              {orderTracking.itemCount} item{orderTracking.itemCount !== 1 ? 's' : ''} · ZK {orderTracking.total}
            </Text>
          </View>

          {/* Live status label */}
          {liveOrder && (
            <View style={[styles.liveStatusRow, { backgroundColor: cardBg }]}>
              <View style={styles.liveDot} />
              <Text style={[styles.liveStatusText, { color: textColor }]}>
                {statusLabel(liveOrder.status, 'food')}
              </Text>
            </View>
          )}

          {/* Mini map (shown once driver is assigned) */}
          {driverCoord && (
            <View style={styles.miniMapWrap}>
              <MapView
                style={styles.miniMap}
                region={{
                  latitude: driverCoord.latitude,
                  longitude: driverCoord.longitude,
                  latitudeDelta: 0.03,
                  longitudeDelta: 0.03,
                }}
                mapType="none"
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} flipY={false} />
                {/* Restaurant */}
                <Marker coordinate={orderTracking.restaurantCoords} title={orderTracking.restaurantName}>
                  <View style={styles.restaurantMarker}>
                    <Ionicons name="restaurant" size={13} color={colors.white} />
                  </View>
                </Marker>
                {/* Delivery address */}
                <Marker coordinate={orderTracking.deliveryCoords} title="Delivery">
                  <Ionicons name="location" size={28} color={colors.error} />
                </Marker>
                {/* Driver */}
                <Marker coordinate={driverCoord} title={liveOrder?.driverName || 'Courier'}>
                  <View style={styles.driverMarker}>
                    <Ionicons name="bicycle" size={14} color={colors.white} />
                  </View>
                </Marker>
              </MapView>
              <View style={styles.mapLabel}>
                <Ionicons name="bicycle-outline" size={13} color={colors.primary} />
                <Text style={[styles.mapLabelText, { color: textColor }]}>
                  {liveOrder?.driverName || 'Your courier'} is on the way
                </Text>
              </View>
            </View>
          )}

          {/* Restaurant chat button */}
          {orderTracking.requestId && (
            <TouchableOpacity
              style={[styles.restaurantChatBtn, { backgroundColor: cardBg }]}
              onPress={() => navigation.navigate('RestaurantChat', {
                requestId: orderTracking.requestId,
                restaurantName: orderTracking.restaurantName,
                senderRole: 'customer',
              })}
              activeOpacity={0.82}
            >
              <View style={styles.restaurantChatIcon}>
                <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.restaurantChatTitle, { color: textColor }]}>Message Restaurant</Text>
                <Text style={[styles.restaurantChatSub, { color: subText }]}>Send special instructions or custom order notes</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={subText} />
            </TouchableOpacity>
          )}

          {/* Stage tracker */}
          <View style={[styles.trackCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionLabel, { color: subText }]}>ORDER STATUS</Text>
            {stages.map((stage, idx) => {
              const done    = idx <= currentStage;
              const current = idx === currentStage;
              return (
                <View key={idx} style={styles.stageRow}>
                  <View style={[styles.stageIconWrap, done ? styles.stageIconDone : { backgroundColor: darkMode ? '#30363D' : colors.borderLight }]}>
                    <Ionicons name={stage.icon} size={15} color={done ? colors.white : subText} />
                  </View>
                  {idx < stages.length - 1 && (
                    <View style={[styles.stageLine, { backgroundColor: done ? colors.primary : (darkMode ? '#30363D' : colors.borderLight) }]} />
                  )}
                  <View style={{ flex: 1, paddingTop: 4 }}>
                    <Text style={[styles.stageLabel, { color: current ? colors.primary : (done ? textColor : subText), fontWeight: current ? '800' : '500' }]}>
                      {stage.label}
                      {current && <Text style={{ color: colors.primary }}> ●</Text>}
                    </Text>
                    {stage.sub && current ? (
                      <Text style={{ fontSize: 11, color: subText, marginTop: 2 }}>{stage.sub}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Courier info (once assigned) */}
          {liveOrder?.driverName && (
            <View style={[styles.courierCard, { backgroundColor: cardBg }]}>
              <Ionicons name="bicycle-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.courierName, { color: textColor }]}>{liveOrder.driverName}</Text>
                {liveOrder.vehicleModel ? <Text style={[styles.courierVehicle, { color: subText }]}>{liveOrder.vehicleModel}</Text> : null}
              </View>
              <View style={[styles.ratingPill, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="star" size={11} color={colors.warning} />
                <Text style={styles.ratingText}>{liveOrder.driverRating || 5}</Text>
              </View>
            </View>
          )}

          {isDelivered ? (
            <TouchableOpacity
              style={[styles.orderBtn, { backgroundColor: colors.success, marginTop: 10 }]}
              onPress={() => { setOrderTracking(null); setLiveOrder(null); setDriverLocation(null); navigation.navigate('HomeMain'); }}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} />
              <Text style={styles.orderBtnText}>Done — back to home</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.ScrollView>
      </View>
    );
  }

  // ─── Ordering view ────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Order Food</Text>
            <Text style={styles.headerSub}>Browse menus · App & restaurant promo codes</Text>
          </View>
          {totalCartQty > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalCartQty}</Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.centerText, { color: subText }]}>Loading nearby restaurants...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Search */}
            <View style={[styles.searchBox, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name="search-outline" size={17} color={subText} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Search restaurant or cuisine"
                placeholderTextColor={subText}
              />
            </View>

            {/* Firestore restaurant badge legend */}
            {firestoreRestaurants.length > 0 && (
              <View style={styles.legendRow}>
                <View style={styles.verifiedDot} />
                <Text style={[styles.legendText, { color: subText }]}>Green dot = verified Tiyende restaurant with real menu</Text>
              </View>
            )}

            {/* Restaurant list */}
            <FlatList
              horizontal
              data={restaurants.slice(0, 30)}
              keyExtractor={(item) => `${item.source}-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.restaurantList}
              renderItem={({ item }) => {
                const selected = selectedRestaurant?.id === item.id && selectedRestaurant?.source === item.source;
                return (
                  <TouchableOpacity
                    style={[styles.restaurantCard, { backgroundColor: cardBg, borderColor: selected ? colors.primary : borderColor }]}
                    onPress={() => setSelectedRestaurant(item)}
                    activeOpacity={0.85}
                  >
                    {item.source === 'firestore' && <View style={styles.verifiedBadge} />}
                    <RestaurantLogo restaurant={item} />
                    <Text style={[styles.restaurantName, { color: textColor }]} numberOfLines={2}>{item.name}</Text>
                    <Text style={[styles.restaurantMeta, { color: subText }]} numberOfLines={1}>
                      {(item.cuisine || item.cuisineType || 'Restaurant').replace(/;/g, ', ')}
                    </Text>
                    <Text style={styles.restaurantDistance}>{formatDistance(item.distanceKm)}</Text>
                    {item.openHours ? <Text style={[styles.restaurantHours, { color: subText }]} numberOfLines={1}>{item.openHours}</Text> : null}
                  </TouchableOpacity>
                );
              }}
            />

            {selectedRestaurant && (
              <View style={[styles.selectedCard, { backgroundColor: cardBg }]}>
                {/* Restaurant header */}
                <View style={styles.selectedTop}>
                  <RestaurantLogo restaurant={selectedRestaurant} size={52} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.selectedNameRow}>
                      <Text style={[styles.selectedName, { color: textColor }]}>{selectedRestaurant.name}</Text>
                      {selectedRestaurant.source === 'firestore' && (
                        <View style={styles.verifiedChip}>
                          <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                          <Text style={styles.verifiedChipText}>Verified</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.selectedMeta, { color: subText }]}>{selectedRestaurant.address}</Text>
                    {selectedRestaurant.openHours ? (
                      <Text style={[styles.selectedHours, { color: colors.primary }]} numberOfLines={1}>
                        {selectedRestaurant.openHours}
                      </Text>
                    ) : null}
                    {selectedRestaurant.description ? (
                      <Text style={[styles.selectedDesc, { color: subText }]} numberOfLines={2}>{selectedRestaurant.description}</Text>
                    ) : null}
                    {selectedRestaurant.rating ? (
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color={colors.accent} />
                        <Text style={[styles.ratingVal, { color: textColor }]}>{selectedRestaurant.rating.toFixed(1)}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {menuLoading ? (
                  <View style={styles.menuLoadingRow}>
                    <ActivityIndicator color={colors.primary} size="small" />
                    <Text style={[styles.menuLoadingText, { color: subText }]}>Loading menu…</Text>
                  </View>
                ) : (
                  <>
                    {/* Category tabs */}
                    <Text style={[styles.sectionLabel, { color: subText }]}>MENU</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.catTabRow}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {menuCategories.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[styles.catTab, menuCategory === cat && styles.catTabActive]}
                          onPress={() => setMenuCategory(cat)}
                        >
                          <Text style={[styles.catTabText, menuCategory === cat && styles.catTabTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Menu items */}
                    {(menu[menuCategory] || []).map((item) => {
                      const qty = cart[item.id] || 0;
                      const discountedPrice = item.discountPercent > 0
                        ? Math.round(item.price * (1 - item.discountPercent / 100))
                        : null;
                      return (
                        <View key={item.id} style={[styles.menuItem, { borderBottomColor: borderColor }]}>
                          <MenuItemImage item={item} />
                          <View style={{ flex: 1 }}>
                            <View style={styles.menuItemHeader}>
                              <Text style={[styles.menuItemName, { color: textColor }]}>{item.name}</Text>
                              {item.discountPercent > 0 && (
                                <View style={styles.itemDiscountBadge}>
                                  <Text style={styles.itemDiscountText}>{item.discountPercent}% OFF</Text>
                                </View>
                              )}
                            </View>
                            {item.description || item.desc ? (
                              <Text style={[styles.menuItemDesc, { color: subText }]}>{item.description || item.desc}</Text>
                            ) : null}
                            <View style={styles.priceRow}>
                              <Text style={styles.menuItemPrice}>ZK {discountedPrice ?? item.price}</Text>
                              {discountedPrice && (
                                <Text style={styles.menuItemOrigPrice}>ZK {item.price}</Text>
                              )}
                            </View>
                          </View>
                          <View style={styles.qtyControls}>
                            {qty > 0 && (
                              <>
                                <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item)}>
                                  <Ionicons name="remove" size={14} color={colors.primary} />
                                </TouchableOpacity>
                                <Text style={[styles.qtyNum, { color: textColor }]}>{qty}</Text>
                              </>
                            )}
                            <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnAdd]} onPress={() => addToCart(item)}>
                              <Ionicons name="add" size={14} color={colors.white} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}

                    {/* Cart summary */}
                    {cartItems.length > 0 && (
                      <View style={[styles.cartSection, { backgroundColor: darkMode ? '#21262D' : colors.offWhite }]}>
                        <Text style={[styles.sectionLabel, { color: subText }]}>YOUR ORDER ({totalCartQty} items)</Text>
                        {cartItems.map((item) => (
                          <View key={item.id} style={[styles.cartRow, { borderBottomColor: borderColor }]}>
                            <Text style={[styles.cartQty, { color: colors.primary }]}>{cart[item.id]}×</Text>
                            <Text style={[styles.cartName, { color: textColor }]}>{item.name}</Text>
                            <Text style={[styles.cartPrice, { color: textColor }]}>ZK {item.price * cart[item.id]}</Text>
                            <TouchableOpacity onPress={() => setCart((prev) => { const n = { ...prev }; delete n[item.id]; return n; })}>
                              <Ionicons name="close-circle" size={18} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Promo code */}
                    <Text style={[styles.sectionLabel, { color: subText }]}>PROMO CODE</Text>
                    <View style={[styles.promoRow, { backgroundColor: inputBg, borderColor }]}>
                      <Ionicons name="ticket-outline" size={14} color={subText} />
                      <TextInput
                        style={[styles.promoInput, { color: textColor }]}
                        placeholder={isFirestoreRestaurant ? 'Enter restaurant promo code' : 'e.g. FOOD20 (20% off)'}
                        placeholderTextColor={subText}
                        value={promoCode}
                        onChangeText={(v) => { setPromoCode(v); setRestaurantDiscount(null); }}
                        autoCapitalize="characters"
                        onBlur={checkPromo}
                        onSubmitEditing={checkPromo}
                        returnKeyType="done"
                      />
                      {promoChecking && <ActivityIndicator size="small" color={colors.primary} />}
                      {promoDiscount > 0 && (
                        <View style={styles.discountPill}>
                          <Text style={styles.discountText}>-ZK {promoDiscount}</Text>
                        </View>
                      )}
                    </View>
                    {restaurantDiscount && restaurantPromoValid ? (
                      <Text style={[styles.promoValidText]}>✓ {restaurantDiscount.description || `${restaurantDiscount.percent}% off applied`}</Text>
                    ) : null}
                    {promoCode.trim().toUpperCase() === 'FOOD20' && promoUsed.food && !isFirestoreRestaurant ? (
                      <Text style={styles.promoUsedText}>Promo code already used for food orders</Text>
                    ) : null}

                    {/* Delivery address */}
                    <Text style={[styles.sectionLabel, { color: subText }]}>DELIVER TO</Text>
                    <TextInput
                      style={[styles.addressInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
                      value={deliveryAddress}
                      onChangeText={setDeliveryAddress}
                      placeholder="Delivery address"
                      placeholderTextColor={subText}
                    />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.placeChips}>
                      {LUSAKA_PLACES.slice(0, 10).map((place) => (
                        <TouchableOpacity
                          key={place.name}
                          style={[styles.placeChip, selectedPlace?.name === place.name && styles.placeChipSelected]}
                          onPress={() => { setSelectedPlace(place); setDeliveryAddress(place.name); }}
                        >
                          <Text style={[styles.placeChipText, selectedPlace?.name === place.name && styles.placeChipTextSelected]}>
                            {place.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Notes */}
                    <TextInput
                      style={[styles.notesInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Order notes (allergies, substitutions, special requests)"
                      placeholderTextColor={subText}
                      multiline
                    />

                    {/* Payment */}
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

                    {/* Order flow note for Firestore restaurants */}
                    {isFirestoreRestaurant && (
                      <View style={styles.flowNote}>
                        <Ionicons name="information-circle-outline" size={14} color={colors.info} />
                        <Text style={[styles.flowNoteText, { color: colors.info }]}>
                          Your order goes to the restaurant first. They'll confirm and prepare before a courier is assigned.
                        </Text>
                      </View>
                    )}

                    {/* Summary */}
                    <View style={[styles.summaryCard, { backgroundColor: darkMode ? '#1C2A22' : colors.primaryGhost }]}>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: subText }]}>Items subtotal</Text>
                        <Text style={[styles.summaryValue, { color: textColor }]}>ZK {itemsTotal}</Text>
                      </View>
                      {promoDiscount > 0 && (
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: colors.success }]}>
                            Promo ({promoCode.trim().toUpperCase()} -{restaurantDiscount ? restaurantDiscount.percent : 20}%)
                          </Text>
                          <Text style={[styles.summaryValue, { color: colors.success }]}>-ZK {promoDiscount}</Text>
                        </View>
                      )}
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: subText }]}>Delivery · {formatDistance(km)}</Text>
                        <Text style={[styles.summaryValue, { color: textColor }]}>ZK {deliveryFee}</Text>
                      </View>
                      <View style={[styles.summaryRow, { marginBottom: 0 }]}>
                        <Text style={[styles.totalLabel, { color: colors.primary }]}>Total</Text>
                        <Text style={styles.totalValue}>ZK {total}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.orderBtn, (submitting || cartItems.length === 0) && styles.disabled]}
                      onPress={submitOrder}
                      disabled={submitting || cartItems.length === 0}
                    >
                      {submitting
                        ? <ActivityIndicator color={colors.white} />
                        : <Ionicons name="fast-food-outline" size={20} color={colors.white} />}
                      <Text style={styles.orderBtnText}>
                        {submitting ? 'Sending Order...' : `Place Order · ZK ${total}`}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.primary,
    paddingTop: 56, paddingBottom: 22, paddingHorizontal: 20,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.white },
  headerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  cartBadge:   { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontSize: 14, fontWeight: '900', color: colors.textPrimary },

  content: { padding: 16, paddingBottom: 48 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { fontSize: 13, textAlign: 'center', marginTop: 8 },

  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  verifiedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  legendText: { fontSize: 11 },

  searchBox:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, marginBottom: 14 },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 15, fontWeight: '600' },

  restaurantList: { gap: 10, paddingBottom: 16 },
  restaurantCard: { width: 148, borderWidth: 1.5, borderRadius: radius.lg, padding: 12, ...shadows.xs, position: 'relative' },
  verifiedBadge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  logoFallback: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoText:     { color: colors.white, fontWeight: '800', fontSize: 15 },
  restaurantName:     { fontSize: 13, fontWeight: '800', marginTop: 9, minHeight: 34 },
  restaurantMeta:     { fontSize: 11, marginTop: 2 },
  restaurantDistance: { fontSize: 12, color: colors.primary, fontWeight: '800', marginTop: 8 },
  restaurantHours:    { fontSize: 10, marginTop: 2 },

  selectedCard: { borderRadius: radius.xl, padding: 16, ...shadows.small },
  selectedTop:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 16 },
  selectedNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 },
  selectedName: { fontSize: 17, fontWeight: '900' },
  verifiedChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primaryGhost, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 3 },
  verifiedChipText: { fontSize: 10, fontWeight: '800', color: colors.primary },
  selectedMeta: { fontSize: 12, marginTop: 2 },
  selectedHours:{ fontSize: 11, fontWeight: '700', marginTop: 3, color: colors.primary },
  selectedDesc: { fontSize: 11, marginTop: 4, lineHeight: 16 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingVal: { fontSize: 12, fontWeight: '800' },

  menuLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  menuLoadingText: { fontSize: 13 },

  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 8, marginTop: 12 },

  catTabRow:         { marginBottom: 4 },
  catTab:            { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.primaryGhost },
  catTabActive:      { backgroundColor: colors.primary },
  catTabText:        { fontSize: 12, fontWeight: '700', color: colors.primary },
  catTabTextActive:  { color: colors.white },

  menuItem:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  menuItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 },
  menuItemName:  { fontSize: 14, fontWeight: '700', flex: 1 },
  menuItemDesc:  { fontSize: 11, marginTop: 2, lineHeight: 16 },
  priceRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  menuItemPrice: { fontSize: 14, fontWeight: '800', color: colors.primary },
  menuItemOrigPrice: { fontSize: 12, color: colors.textTertiary, textDecorationLine: 'line-through' },
  itemDiscountBadge: { backgroundColor: colors.errorLight, borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  itemDiscountText: { fontSize: 9, fontWeight: '900', color: colors.error },
  qtyControls:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn:        { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  qtyBtnAdd:     { backgroundColor: colors.primary, borderWidth: 0 },
  qtyNum:        { fontSize: 15, fontWeight: '800', minWidth: 20, textAlign: 'center' },

  cartSection: { borderRadius: radius.md, padding: 12, marginTop: 12 },
  cartRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1 },
  cartQty:   { fontSize: 13, fontWeight: '800', minWidth: 26 },
  cartName:  { flex: 1, fontSize: 13, fontWeight: '600' },
  cartPrice: { fontSize: 13, fontWeight: '800' },

  promoRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4 },
  promoInput:    { flex: 1, fontSize: 13, fontWeight: '600' },
  discountPill:  { backgroundColor: colors.successLight, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  discountText:  { fontSize: 12, color: colors.success, fontWeight: '800' },
  promoValidText: { fontSize: 11, color: colors.success, marginBottom: 8, marginLeft: 2 },
  promoUsedText: { fontSize: 10, color: colors.error, marginBottom: 8, marginLeft: 2 },

  addressInput: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 13, fontSize: 14, fontWeight: '600' },
  placeChips:   { gap: 8, paddingVertical: 10 },
  placeChip:         { borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.primaryGhost },
  placeChipSelected: { backgroundColor: colors.primary },
  placeChipText:         { color: colors.primary, fontSize: 12, fontWeight: '700' },
  placeChipTextSelected: { color: colors.white },

  notesInput: { minHeight: 68, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, textAlignVertical: 'top', marginBottom: 12 },

  payRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  payChip:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1.5 },
  payChipSelected: { backgroundColor: colors.primaryGhost },
  payChipText:   { fontSize: 11, fontWeight: '700' },

  flowNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.infoLight, borderRadius: radius.md, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#B8D9F8' },
  flowNoteText: { flex: 1, fontSize: 12, lineHeight: 18 },

  summaryCard:  { borderRadius: radius.md, padding: 14, marginBottom: 14 },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '800' },
  totalLabel:   { fontSize: 15, fontWeight: '900' },
  totalValue:   { fontSize: 18, color: colors.primary, fontWeight: '900' },

  orderBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, ...shadows.green },
  orderBtnText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  disabled:     { opacity: 0.65 },

  // Tracking
  etaCard:       { borderRadius: radius.xl, padding: 24, alignItems: 'center', marginBottom: 16 },
  etaCardLabel:  { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 1, textTransform: 'uppercase' },
  etaCardTime:   { fontSize: 52, fontWeight: '900', color: colors.white, marginVertical: 6 },
  etaCardSub:    { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  liveStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.lg, padding: 12, marginBottom: 14, ...shadows.xs },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  liveStatusText: { fontSize: 13, fontWeight: '700' },

  miniMapWrap: { borderRadius: radius.xl, overflow: 'hidden', marginBottom: 14, ...shadows.small },
  miniMap: { height: 200, width: '100%' },
  mapLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, backgroundColor: colors.primaryGhost },
  mapLabelText: { fontSize: 12, fontWeight: '700' },
  restaurantMarker: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  driverMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF6B35', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },

  restaurantChatBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, padding: 14, marginBottom: 16, ...shadows.xs },
  restaurantChatIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryGhost, alignItems: 'center', justifyContent: 'center' },
  restaurantChatTitle: { fontSize: 14, fontWeight: '800' },
  restaurantChatSub:   { fontSize: 12, marginTop: 2 },

  trackCard:     { borderRadius: radius.xl, padding: 16, marginBottom: 16, ...shadows.small },
  stageRow:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  stageIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  stageIconDone: { backgroundColor: colors.primary },
  stageLine:     { position: 'absolute', left: 15, top: 32, width: 2, height: 26, zIndex: -1 },
  stageLabel:    { fontSize: 14 },

  courierCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, padding: 14, marginBottom: 14, ...shadows.xs },
  courierName: { fontSize: 14, fontWeight: '800' },
  courierVehicle: { fontSize: 12, marginTop: 2 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  ratingText: { fontSize: 12, fontWeight: '800', color: colors.warning },
});
