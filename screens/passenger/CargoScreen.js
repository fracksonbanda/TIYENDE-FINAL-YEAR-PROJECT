import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Animated, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows, radius } from '../../theme';
import { createServiceRequest } from '../../services/requestService';
import { DEFAULT_PICKUP, distanceKm, estimateDurationMinutes, estimateFare, formatDistance, LUSAKA_PLACES } from '../../utils/geo';

const VEHICLE_TYPES = [
  { name: 'Extra Small', capacity: 'Up to 200 kg', icon: 'cube-outline', desc: 'Parcels & small boxes' },
  { name: 'Small Truck', capacity: 'Up to 600 kg', icon: 'car-outline', desc: 'Furniture & appliances' },
  { name: 'Medium Truck', capacity: 'Up to 1.5 tons', icon: 'bus-outline', desc: 'Small business deliveries' },
  { name: 'Large Truck', capacity: 'Up to 3 tons', icon: 'train-outline', desc: 'Bulk commercial goods' },
];

export default function CargoScreen({ navigation }) {
  const [selectedVehicle, setSelectedVehicle] = useState(VEHICLE_TYPES[0]);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [weight, setWeight] = useState('');
  const [description, setDescription] = useState('');
  const [pickupFocused, setPickupFocused] = useState(false);
  const [dropFocused, setDropFocused] = useState(false);
  const [booking, setBooking] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const findPlace = (value) => LUSAKA_PLACES.find((place) => (
    value.toLowerCase().includes(place.name.toLowerCase())
    || place.name.toLowerCase().includes(value.toLowerCase())
  ));

  const bookCargo = async () => {
    if (!pickup || !dropoff || !weight || !description) {
      Alert.alert('Missing Info', 'Please complete the route and item details.');
      return;
    }
    const weightKg = Number.parseFloat(weight);
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      Alert.alert('Invalid Weight', 'Enter a valid cargo weight.');
      return;
    }

    setBooking(true);
    try {
      const pickupPlace = findPlace(pickup);
      const dropoffPlace = findPlace(dropoff);
      const pickupCoords = pickupPlace?.coords || DEFAULT_PICKUP.coords;
      const destinationCoords = dropoffPlace?.coords || DEFAULT_PICKUP.coords;
      const km = distanceKm(pickupCoords, destinationCoords);
      const fare = estimateFare({ distance: km, serviceType: 'cargo' }) + Math.round(weightKg * 0.6);
      await createServiceRequest({
        serviceType: 'cargo',
        pickupName: pickup.trim(),
        pickupCoords,
        destinationName: dropoff.trim(),
        destinationCoords,
        fare,
        cargoVehicle: selectedVehicle,
        weightKg,
        description: description.trim(),
        paymentMethod: 'mobile',
        distanceKm: Number(km.toFixed(2)),
        distanceText: formatDistance(km),
        durationMinutes: estimateDurationMinutes(km, 'cargo'),
      });
      Alert.alert('Cargo Request Sent', 'A driver can now accept this cargo request.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
      setPickup('');
      setDropoff('');
      setWeight('');
      setDescription('');
    } catch (error) {
      Alert.alert('Booking Failed', error.message);
    } finally {
      setBooking(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send a Parcel</Text>
        <Text style={styles.headerSub}>Book a cargo vehicle for your delivery</Text>
      </View>

      <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={styles.content}>

        {/* Vehicle selector */}
        <Text style={styles.sectionLabel}>SELECT VEHICLE SIZE</Text>
        <View style={styles.vehicleGrid}>
          {VEHICLE_TYPES.map((v) => (
            <TouchableOpacity
              key={v.name}
              style={[styles.vehicleCard, selectedVehicle.name === v.name && styles.vehicleCardSelected]}
              onPress={() => setSelectedVehicle(v)}
              activeOpacity={0.8}
            >
              <View style={[styles.vehicleIcon, selectedVehicle.name === v.name && styles.vehicleIconSelected]}>
                <Ionicons name={v.icon} size={22} color={selectedVehicle.name === v.name ? colors.white : colors.primary} />
              </View>
              <Text style={[styles.vehicleName, selectedVehicle.name === v.name && styles.vehicleNameSelected]}>{v.name}</Text>
              <Text style={[styles.vehicleCap, selectedVehicle.name === v.name && styles.vehicleCapSelected]}>{v.capacity}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedVehicle && (
          <View style={styles.vehicleInfoBanner}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={styles.vehicleInfoText}>{selectedVehicle.name}: {selectedVehicle.desc}</Text>
          </View>
        )}

        {/* Route */}
        <Text style={styles.sectionLabel}>ROUTE DETAILS</Text>
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.dotGreen} />
            <View style={[styles.inputWrapper, pickupFocused && styles.focused]}>
              <TextInput
                style={styles.input}
                placeholder="Pickup location"
                value={pickup}
                onChangeText={setPickup}
                placeholderTextColor={colors.textTertiary}
                onFocus={() => setPickupFocused(true)}
                onBlur={() => setPickupFocused(false)}
              />
            </View>
          </View>
          <View style={styles.routeConnector} />
          <View style={styles.routeRow}>
            <View style={styles.dotRed} />
            <View style={[styles.inputWrapper, dropFocused && styles.focused]}>
              <TextInput
                style={styles.input}
                placeholder="Dropoff location"
                value={dropoff}
                onChangeText={setDropoff}
                placeholderTextColor={colors.textTertiary}
                onFocus={() => setDropFocused(true)}
                onBlur={() => setDropFocused(false)}
              />
            </View>
          </View>
        </View>

        {/* Item details */}
        <Text style={styles.sectionLabel}>ITEM DETAILS</Text>
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Ionicons name="scale-outline" size={16} color={colors.textTertiary} style={styles.detailIcon} />
            <TextInput
              style={styles.detailInput}
              placeholder="Weight (kg)"
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={16} color={colors.textTertiary} style={styles.detailIcon} />
            <TextInput
              style={[styles.detailInput, { minHeight: 60 }]}
              placeholder="Describe the item(s)"
              multiline
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        <TouchableOpacity style={[styles.findBtn, booking && { opacity: 0.65 }]} activeOpacity={0.85} onPress={bookCargo} disabled={booking}>
          <Ionicons name={booking ? 'time-outline' : 'search'} size={18} color={colors.white} />
          <Text style={styles.findBtnText}>{booking ? 'Sending Request...' : 'Find Cargo Driver'}</Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  header: { backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24 },
  backBtn: { marginBottom: 16, alignSelf: 'flex-start' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.white, marginBottom: 4 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  content: { padding: 16, paddingBottom: 48 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.textTertiary, marginBottom: 10, marginLeft: 2, marginTop: 4 },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  vehicleCard: {
    width: '47.5%', backgroundColor: colors.white, borderRadius: radius.lg,
    padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border,
  },
  vehicleCardSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  vehicleIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  vehicleIconSelected: { backgroundColor: 'rgba(255,255,255,0.2)' },
  vehicleName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  vehicleNameSelected: { color: colors.white },
  vehicleCap: { fontSize: 11, color: colors.textTertiary, marginTop: 2, textAlign: 'center' },
  vehicleCapSelected: { color: 'rgba(255,255,255,0.8)' },
  vehicleInfoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primaryGhost, borderRadius: radius.md,
    padding: 10, marginBottom: 20,
  },
  vehicleInfoText: { fontSize: 12, color: colors.primary, fontWeight: '500' },
  routeCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, marginBottom: 16, ...shadows.xs },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  dotRed: { width: 10, height: 10, borderRadius: 2, backgroundColor: colors.error },
  routeConnector: { width: 1.5, height: 14, backgroundColor: colors.border, marginLeft: 4, marginVertical: 4 },
  inputWrapper: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.offWhite },
  focused: { borderColor: colors.primary, backgroundColor: colors.white },
  input: { paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: colors.textPrimary },
  detailCard: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', marginBottom: 24, ...shadows.xs },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  detailIcon: { marginTop: 2, marginRight: 10 },
  detailInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
  detailDivider: { height: 1, backgroundColor: colors.borderLight },
  findBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 16, gap: 8, ...shadows.green,
  },
  findBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
