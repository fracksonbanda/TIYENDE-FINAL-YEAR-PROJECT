import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Animated, StatusBar, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows, radius } from '../../theme';
import { useAppContext } from '../../context/AppContext';
import { createServiceRequest } from '../../services/requestService';
import {
  DEFAULT_PICKUP, distanceKm, estimateDurationMinutes, formatDistance, LUSAKA_PLACES,
} from '../../utils/geo';

const PARCEL_SIZES = [
  { id: 'envelope', label: 'Envelope', sub: 'Documents, letters', icon: 'mail-outline', basePrice: 20, ratePerKm: 3 },
  { id: 'small',    label: 'Small Box', sub: 'Up to 2 kg',        icon: 'cube-outline', basePrice: 30, ratePerKm: 4 },
  { id: 'medium',   label: 'Medium Box', sub: 'Up to 10 kg',      icon: 'archive-outline', basePrice: 50, ratePerKm: 6 },
  { id: 'large',    label: 'Large Parcel', sub: 'Up to 30 kg',    icon: 'file-tray-full-outline', basePrice: 75, ratePerKm: 9 },
];

const PAYMENT_METHODS = [
  { id: 'mobile', label: 'Mobile Money', icon: 'phone-portrait-outline' },
  { id: 'cash',   label: 'Cash',         icon: 'cash-outline' },
  { id: 'wallet', label: 'Wallet',       icon: 'wallet-outline' },
  { id: 'card',   label: 'Card',         icon: 'card-outline' },
];

export default function DeliveryScreen({ navigation }) {
  const { darkMode } = useAppContext();
  const [selectedSize, setSelectedSize] = useState(PARCEL_SIZES[0]);
  const [pickup, setPickup]           = useState('');
  const [dropoff, setDropoff]         = useState('');
  const [pickupPlace, setPickupPlace] = useState(null);
  const [dropoffPlace, setDropoffPlace] = useState(null);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mobile');
  const [booking, setBooking] = useState(false);
  const [deliveryTracking, setDeliveryTracking] = useState(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const trackAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const bg        = darkMode ? '#0D1117' : colors.offWhite;
  const cardBg    = darkMode ? '#161B22' : colors.white;
  const inputBg   = darkMode ? '#21262D' : colors.offWhite;
  const textColor = darkMode ? colors.textOnDark : colors.textPrimary;
  const subText   = darkMode ? '#8B949E' : colors.textSecondary;
  const borderColor = darkMode ? '#30363D' : colors.border;

  // Derived address suggestions (hide when a place is already selected)
  const pickupSuggestions = pickup.length > 1
    ? LUSAKA_PLACES.filter((p) => p.name.toLowerCase().includes(pickup.toLowerCase())).slice(0, 5)
    : [];
  const dropoffSuggestions = dropoff.length > 1
    ? LUSAKA_PLACES.filter((p) => p.name.toLowerCase().includes(dropoff.toLowerCase())).slice(0, 5)
    : [];
  const showPickupSugg  = !pickupPlace  && pickupSuggestions.length > 0;
  const showDropoffSugg = !dropoffPlace && dropoffSuggestions.length > 0;

  // Dynamic price based on parcel type + distance
  const pickupCoords  = pickupPlace?.coords  || DEFAULT_PICKUP.coords;
  const dropoffCoords = dropoffPlace?.coords || null;
  const km            = dropoffCoords ? distanceKm(pickupCoords, dropoffCoords) : 0;
  const dynamicPrice  = Math.round(selectedSize.basePrice + km * selectedSize.ratePerKm);

  const bookDelivery = async () => {
    if (!pickup.trim() || !dropoff.trim() || !recipientName.trim() || !recipientPhone.trim()) {
      Alert.alert('Missing Info', 'Please fill in all required fields.');
      return;
    }
    setBooking(true);
    try {
      const finalPickupCoords   = pickupPlace?.coords  || DEFAULT_PICKUP.coords;
      const finalDropoffCoords  = dropoffPlace?.coords || DEFAULT_PICKUP.coords;
      const finalKm = distanceKm(finalPickupCoords, finalDropoffCoords);
      const finalPrice = Math.round(selectedSize.basePrice + finalKm * selectedSize.ratePerKm);
      await createServiceRequest({
        serviceType: 'delivery',
        pickupName: pickup.trim(),
        pickupCoords: finalPickupCoords,
        destinationName: dropoff.trim(),
        destinationCoords: finalDropoffCoords,
        fare: finalPrice,
        package: selectedSize,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        notes: instructions.trim(),
        paymentMethod,
        distanceKm: Number(finalKm.toFixed(2)),
        distanceText: formatDistance(finalKm),
        durationMinutes: estimateDurationMinutes(finalKm, 'delivery'),
      });
      const etaMin = Math.max(10, estimateDurationMinutes(finalKm, 'delivery') + 5);
      setDeliveryTracking({
        pickup: pickup.trim(),
        dropoff: dropoff.trim(),
        recipient: recipientName.trim(),
        parcel: selectedSize.label,
        fare: finalPrice,
        etaMin,
        stage: 0,
      });
      trackAnim.setValue(0);
      Animated.timing(trackAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      setPickup(''); setDropoff('');
      setPickupPlace(null); setDropoffPlace(null);
      setRecipientName(''); setRecipientPhone(''); setInstructions('');
    } catch (error) {
      Alert.alert('Booking Failed', error.message);
    } finally {
      setBooking(false);
    }
  };

  const SuggestionList = ({ suggestions, onSelect }) => (
    <View style={[styles.suggBox, { backgroundColor: cardBg, borderColor: darkMode ? '#30363D' : colors.borderLight }]}>
      {suggestions.map((place) => (
        <TouchableOpacity
          key={place.name}
          style={[styles.suggRow, { borderBottomColor: darkMode ? '#21262D' : colors.borderLight }]}
          onPress={() => onSelect(place)}
        >
          <View style={[styles.suggIcon, { backgroundColor: darkMode ? '#21262D' : colors.primaryGhost }]}>
            <Ionicons name={place.icon} size={13} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.suggName, { color: textColor }]}>{place.name}</Text>
            <Text style={[styles.suggCat, { color: subText }]}>{place.category} · Lusaka</Text>
          </View>
          <Ionicons name="return-down-back-outline" size={14} color={subText} />
        </TouchableOpacity>
      ))}
    </View>
  );

  const DELIVERY_STAGES = [
    { label: 'Looking for driver', icon: 'radio-outline' },
    { label: 'Driver accepted',    icon: 'person-outline' },
    { label: 'Heading to pickup',  icon: 'navigate-outline' },
    { label: 'Parcel collected',   icon: 'cube-outline' },
    { label: 'Delivered',          icon: 'home-outline' },
  ];

  if (deliveryTracking) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 14 }}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tracking Delivery</Text>
          <Text style={styles.headerSub}>{deliveryTracking.pickup} → {deliveryTracking.dropoff}</Text>
        </View>

        <Animated.ScrollView style={{ opacity: trackAnim }} contentContainerStyle={styles.content}>
          {/* ETA card */}
          <View style={[styles.trackEtaCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.trackEtaLabel}>Estimated delivery</Text>
            <Text style={styles.trackEtaTime}>{deliveryTracking.etaMin} min</Text>
            <Text style={styles.trackEtaSub}>{deliveryTracking.parcel} · ZK {deliveryTracking.fare}</Text>
          </View>

          {/* Recipient */}
          <View style={[styles.trackInfoCard, { backgroundColor: cardBg }]}>
            <View style={styles.trackInfoRow}>
              <Ionicons name="person-outline" size={15} color={subText} />
              <Text style={[styles.trackInfoLabel, { color: subText }]}>Recipient</Text>
              <Text style={[styles.trackInfoValue, { color: textColor }]}>{deliveryTracking.recipient}</Text>
            </View>
          </View>

          {/* Stage tracker */}
          <View style={[styles.trackInfoCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionLabel, { color: subText }]}>DELIVERY STATUS</Text>
            {DELIVERY_STAGES.map((stage, idx) => {
              const done    = idx <= deliveryTracking.stage;
              const current = idx === deliveryTracking.stage;
              return (
                <View key={idx} style={styles.trackStageRow}>
                  <View style={[styles.trackStageIcon, done ? styles.trackStageDone : { backgroundColor: darkMode ? '#30363D' : colors.borderLight }]}>
                    <Ionicons name={stage.icon} size={15} color={done ? colors.white : subText} />
                  </View>
                  {idx < DELIVERY_STAGES.length - 1 && (
                    <View style={[styles.trackStageLine, { backgroundColor: done ? colors.primary : (darkMode ? '#30363D' : colors.borderLight) }]} />
                  )}
                  <Text style={[styles.trackStageLabel, { color: current ? colors.primary : (done ? textColor : subText), fontWeight: current ? '800' : '500' }]}>
                    {stage.label}{current ? ' ●' : ''}
                  </Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.bookBtn, { marginTop: 4 }]}
            onPress={() => setDeliveryTracking((prev) => ({
              ...prev,
              stage: Math.min(prev.stage + 1, DELIVERY_STAGES.length - 1),
            }))}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.white} />
            <Text style={styles.bookBtnText}>
              {deliveryTracking.stage < DELIVERY_STAGES.length - 1 ? 'Simulate next stage' : 'Delivery complete!'}
            </Text>
          </TouchableOpacity>

          {deliveryTracking.stage === DELIVERY_STAGES.length - 1 && (
            <TouchableOpacity
              style={[styles.bookBtn, { backgroundColor: colors.success, marginTop: 10 }]}
              onPress={() => { setDeliveryTracking(null); navigation.goBack(); }}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} />
              <Text style={styles.bookBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </Animated.ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 14 }}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send a Delivery</Text>
          <Text style={styles.headerSub}>Fast, tracked parcel delivery across Lusaka</Text>
        </View>

        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          {/* Parcel size */}
          <Text style={[styles.sectionLabel, { color: subText }]}>PARCEL SIZE</Text>
          <View style={styles.sizeGrid}>
            {PARCEL_SIZES.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.sizeCard,
                  { backgroundColor: cardBg, borderColor: selectedSize.id === s.id ? colors.primary : borderColor },
                  selectedSize.id === s.id && { backgroundColor: darkMode ? '#1C2A22' : colors.primaryGhost },
                ]}
                onPress={() => setSelectedSize(s)}
                activeOpacity={0.8}
              >
                <View style={[styles.sizeIcon, { backgroundColor: selectedSize.id === s.id ? colors.primary : (darkMode ? '#21262D' : colors.primaryGhost) }]}>
                  <Ionicons name={s.icon} size={20} color={selectedSize.id === s.id ? colors.white : colors.primary} />
                </View>
                <Text style={[styles.sizeLabel, { color: textColor }]}>{s.label}</Text>
                <Text style={[styles.sizeSub, { color: subText }]}>{s.sub}</Text>
                <Text style={[styles.sizePrice, { color: colors.primary }]}>from ZK {s.basePrice}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Route with address suggestions */}
          <Text style={[styles.sectionLabel, { color: subText }]}>ROUTE</Text>
          <View style={[styles.routeCard, { backgroundColor: cardBg }]}>
            <View style={styles.routeLine}>
              <View style={styles.dotPickup} />
              <View style={[styles.connector, { backgroundColor: borderColor }]} />
              <View style={styles.dotDropoff} />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                style={[styles.routeInput, { color: textColor, borderBottomColor: borderColor }]}
                placeholder="Pickup address"
                placeholderTextColor={subText}
                value={pickup}
                onChangeText={(t) => { setPickup(t); setPickupPlace(null); }}
                returnKeyType="next"
                blurOnSubmit={false}
              />
              <TextInput
                style={[styles.routeInput, { color: textColor }]}
                placeholder="Delivery address"
                placeholderTextColor={subText}
                value={dropoff}
                onChangeText={(t) => { setDropoff(t); setDropoffPlace(null); }}
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>
          </View>

          {showPickupSugg && (
            <SuggestionList
              suggestions={pickupSuggestions}
              onSelect={(place) => { setPickup(place.name); setPickupPlace(place); }}
            />
          )}
          {showDropoffSugg && (
            <SuggestionList
              suggestions={dropoffSuggestions}
              onSelect={(place) => { setDropoff(place.name); setDropoffPlace(place); }}
            />
          )}

          {/* Price estimate chip */}
          {km > 0 && (
            <View style={[styles.priceChip, { backgroundColor: darkMode ? '#1C2A22' : colors.primaryGhost }]}>
              <Ionicons name="navigate-outline" size={14} color={colors.primary} />
              <Text style={[styles.priceChipText, { color: colors.primary }]}>
                {formatDistance(km)} · Est. delivery time {estimateDurationMinutes(km, 'delivery')} min
              </Text>
            </View>
          )}

          {/* Recipient details */}
          <Text style={[styles.sectionLabel, { color: subText }]}>RECIPIENT DETAILS</Text>
          <View style={[styles.detailCard, { backgroundColor: cardBg }]}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: subText }]}>FULL NAME</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
                <Ionicons name="person-outline" size={15} color={subText} style={{ marginLeft: 12 }} />
                <TextInput
                  style={[styles.fieldInput, { color: textColor }]}
                  value={recipientName}
                  onChangeText={setRecipientName}
                  placeholder="Recipient full name"
                  placeholderTextColor={subText}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: subText }]}>PHONE NUMBER</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
                <Ionicons name="call-outline" size={15} color={subText} style={{ marginLeft: 12 }} />
                <TextInput
                  style={[styles.fieldInput, { color: textColor }]}
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                  placeholder="+260 97..."
                  placeholderTextColor={subText}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>
            </View>
            <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
              <Text style={[styles.fieldLabel, { color: subText }]}>SPECIAL INSTRUCTIONS</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
                <Ionicons name="document-text-outline" size={15} color={subText} style={{ marginLeft: 12 }} />
                <TextInput
                  style={[styles.fieldInput, { color: textColor }]}
                  value={instructions}
                  onChangeText={setInstructions}
                  placeholder="e.g. Fragile, leave at gate..."
                  placeholderTextColor={subText}
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>

          {/* Payment method */}
          <Text style={[styles.sectionLabel, { color: subText }]}>PAYMENT METHOD</Text>
          <View style={styles.payRow}>
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.payChip,
                  { borderColor: paymentMethod === m.id ? colors.primary : borderColor },
                  paymentMethod === m.id && { backgroundColor: colors.primaryGhost },
                ]}
                onPress={() => setPaymentMethod(m.id)}
              >
                <Ionicons name={m.icon} size={13} color={paymentMethod === m.id ? colors.primary : subText} />
                <Text style={[styles.payChipText, { color: paymentMethod === m.id ? colors.primary : subText }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Price summary */}
          <View style={[styles.summaryCard, { backgroundColor: darkMode ? '#1C2A22' : colors.primaryGhost }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: subText }]}>Parcel type</Text>
              <Text style={[styles.summaryVal, { color: textColor }]}>{selectedSize.label}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: subText }]}>Distance</Text>
              <Text style={[styles.summaryVal, { color: textColor }]}>{km > 0 ? formatDistance(km) : 'Enter addresses'}</Text>
            </View>
            <View style={[styles.summaryRow, { marginBottom: 0 }]}>
              <Text style={[styles.summaryLabel, { color: colors.primary, fontWeight: '800', fontSize: 14 }]}>Estimated cost</Text>
              <Text style={[styles.summaryPrice, { color: colors.primary }]}>ZK {dynamicPrice}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.bookBtn, booking && { opacity: 0.65 }]}
            activeOpacity={0.85}
            onPress={bookDelivery}
            disabled={booking}
          >
            {booking
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Ionicons name="bicycle-outline" size={20} color={colors.white} />
            }
            <Text style={styles.bookBtnText}>
              {booking ? 'Sending Request...' : `Book Delivery - ZK ${dynamicPrice}`}
            </Text>
          </TouchableOpacity>
        </Animated.ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 },
  headerTitle:  { fontSize: 22, fontWeight: '800', color: colors.white, marginBottom: 4 },
  headerSub:    { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  content:      { padding: 16, paddingBottom: 60 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, marginTop: 4, marginLeft: 2 },

  sizeGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  sizeCard:  { width: '47.5%', borderRadius: radius.lg, padding: 14, alignItems: 'center', borderWidth: 1.5, ...shadows.xs },
  sizeIcon:  { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  sizeLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  sizeSub:   { fontSize: 11, textAlign: 'center', marginTop: 2 },
  sizePrice: { fontSize: 13, fontWeight: '800', marginTop: 6 },

  routeCard:  { borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8, ...shadows.xs },
  routeLine:  { width: 20, alignItems: 'center', marginRight: 12, paddingVertical: 4 },
  dotPickup:  { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  connector:  { width: 2, height: 28, marginVertical: 3 },
  dotDropoff: { width: 10, height: 10, borderRadius: 2, backgroundColor: colors.error },
  routeInput: { paddingVertical: 11, fontSize: 15, fontWeight: '500', borderBottomWidth: 0 },

  suggBox:   { borderWidth: 1, borderRadius: radius.md, marginBottom: 8, overflow: 'hidden', ...shadows.xs },
  suggRow:   { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderBottomWidth: 1 },
  suggIcon:  { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  suggName:  { fontSize: 13, fontWeight: '600' },
  suggCat:   { fontSize: 11, marginTop: 1 },

  priceChip:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 16 },
  priceChipText: { fontSize: 12, fontWeight: '700' },

  detailCard:   { borderRadius: radius.lg, padding: 16, marginBottom: 16, ...shadows.xs },
  fieldGroup:   { marginBottom: 14 },
  fieldLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radius.md },
  fieldInput:   { flex: 1, paddingHorizontal: 10, paddingVertical: 13, fontSize: 14 },

  payRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  payChip:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1.5 },
  payChipText:   { fontSize: 11, fontWeight: '700' },

  summaryCard:  { borderRadius: radius.md, padding: 16, marginBottom: 20 },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 13 },
  summaryVal:   { fontSize: 13, fontWeight: '600' },
  summaryPrice: { fontSize: 18, fontWeight: '900' },

  bookBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, gap: 10, ...shadows.green },
  bookBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },

  // Tracking styles
  trackEtaCard:  { borderRadius: radius.xl, padding: 28, alignItems: 'center', marginBottom: 14 },
  trackEtaLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  trackEtaTime:  { fontSize: 52, fontWeight: '900', color: colors.white, marginVertical: 6 },
  trackEtaSub:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  trackInfoCard: { borderRadius: radius.lg, padding: 16, marginBottom: 12, ...shadows.xs },
  trackInfoRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trackInfoLabel:{ fontSize: 12, fontWeight: '600' },
  trackInfoValue:{ flex: 1, fontSize: 14, fontWeight: '700', textAlign: 'right' },

  trackStageRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  trackStageIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  trackStageDone: { backgroundColor: colors.primary },
  trackStageLine: { position: 'absolute', left: 15, top: 32, width: 2, height: 24, zIndex: -1 },
  trackStageLabel:{ fontSize: 14, paddingTop: 6 },
});
