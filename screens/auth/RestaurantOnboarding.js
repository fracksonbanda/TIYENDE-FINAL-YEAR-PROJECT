import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  StatusBar, TextInput, Alert, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../../firebase';
import { createRestaurantProfile } from '../../services/restaurantService';
import { colors, shadows, radius } from '../../theme';

const CUISINE_OPTIONS = [
  { id: 'burger',   label: 'Burgers / Fast Food', icon: 'fast-food-outline' },
  { id: 'pizza',    label: 'Pizza / Italian',      icon: 'pizza-outline' },
  { id: 'chicken',  label: 'Chicken / Grills',     icon: 'flame-outline' },
  { id: 'coffee',   label: 'Coffee / Bakery',      icon: 'cafe-outline' },
  { id: 'local',    label: 'Local / Zambian',      icon: 'leaf-outline' },
  { id: 'seafood',  label: 'Seafood',              icon: 'fish-outline' },
  { id: 'other',    label: 'Other',                icon: 'restaurant-outline' },
];

export default function RestaurantOnboarding({ navigation }) {
  const [step, setStep]               = useState(1); // 1 = basics, 2 = details
  const [name, setName]               = useState('');
  const [address, setAddress]         = useState('');
  const [phone, setPhone]             = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [description, setDescription] = useState('');
  const [openHours, setOpenHours]     = useState('08:00 – 21:00');
  const [logoBase64, setLogoBase64]   = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, [step]);

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photos to pick a logo.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setLogoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const goNext = () => {
    if (!name.trim()) { Alert.alert('Restaurant name required'); return; }
    if (!address.trim()) { Alert.alert('Address required'); return; }
    if (!cuisineType) { Alert.alert('Select a cuisine type'); return; }
    fadeAnim.setValue(0);
    setStep(2);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Session expired — please sign in again.');
      await createRestaurantProfile({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        cuisineType,
        description: description.trim(),
        openHours: openHours.trim() || '08:00 – 21:00',
        logoBase64: logoBase64 || null,
        coords: { latitude: -15.4167, longitude: 28.2833 }, // Lusaka default
      });
      // App.js onSnapshot will detect role: 'restaurant' and switch to RestaurantNavigator
    } catch (err) {
      Alert.alert('Setup failed', err.message);
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          {step === 2 && (
            <TouchableOpacity onPress={() => { fadeAnim.setValue(0); setStep(1); }} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={colors.white} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.stepLabel}>STEP {step} OF 2  ·  RESTAURANT SETUP</Text>
            <Text style={styles.headerTitle}>{step === 1 ? 'Your restaurant' : 'More details'}</Text>
          </View>
        </View>

        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 ? (
            <>
              {/* Logo picker */}
              <TouchableOpacity style={styles.logoPicker} onPress={pickLogo}>
                {logoBase64 ? (
                  <Animated.Image source={{ uri: logoBase64 }} style={styles.logoPreview} />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Ionicons name="camera-outline" size={30} color={colors.primary} />
                    <Text style={styles.logoPlaceholderText}>Add Logo</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Field label="RESTAURANT NAME *" icon="restaurant-outline">
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Chicken Inn Manda Hill"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words"
                />
              </Field>

              <Field label="ADDRESS *" icon="location-outline">
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="e.g. Manda Hill Shopping Centre, Lusaka"
                  placeholderTextColor={colors.textTertiary}
                />
              </Field>

              <Field label="PHONE NUMBER" icon="call-outline">
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+260 97 1234567"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                />
              </Field>

              <Text style={styles.sectionLabel}>CUISINE TYPE *</Text>
              <View style={styles.cuisineGrid}>
                {CUISINE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.cuisineChip, cuisineType === opt.id && styles.cuisineChipOn]}
                    onPress={() => setCuisineType(opt.id)}
                  >
                    <Ionicons name={opt.icon} size={15} color={cuisineType === opt.id ? colors.white : colors.primary} />
                    <Text style={[styles.cuisineChipText, cuisineType === opt.id && { color: colors.white }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
                <Text style={styles.nextBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Field label="OPENING HOURS" icon="time-outline">
                <TextInput
                  style={styles.input}
                  value={openHours}
                  onChangeText={setOpenHours}
                  placeholder="08:00 – 21:00"
                  placeholderTextColor={colors.textTertiary}
                />
              </Field>

              <Field label="ABOUT YOUR RESTAURANT" icon="information-circle-outline">
                <TextInput
                  style={[styles.input, { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Tell customers what makes your food special..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                />
              </Field>

              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={18} color={colors.info} />
                <Text style={styles.infoText}>
                  After setup you can add your full menu with photos, prices, and categories from your restaurant dashboard.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.nextBtn, submitting && { opacity: 0.6 }]}
                onPress={submit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color={colors.white} />
                  : <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />}
                <Text style={styles.nextBtnText}>{submitting ? 'Creating your restaurant…' : 'Open for business!'}</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ label, icon, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.fieldWrap}>
        <Ionicons name={icon} size={16} color={colors.textTertiary} style={{ marginLeft: 12 }} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.primary,
    paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.white },
  content: { padding: 20, paddingBottom: 44 },

  logoPicker: { alignSelf: 'center', marginBottom: 20 },
  logoPreview: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: colors.primary },
  logoPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2.5, borderColor: colors.primary, borderStyle: 'dashed',
    backgroundColor: colors.primaryGhost, alignItems: 'center', justifyContent: 'center',
  },
  logoPlaceholderText: { fontSize: 11, fontWeight: '700', color: colors.primary, marginTop: 4 },

  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: colors.textTertiary, marginBottom: 8 },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, ...shadows.xs,
  },
  input: { flex: 1, paddingHorizontal: 10, paddingVertical: 13, fontSize: 14, fontWeight: '500', color: colors.textPrimary },

  cuisineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  cuisineChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primaryGhost, borderRadius: radius.full,
    paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1.5, borderColor: colors.primaryMuted,
  },
  cuisineChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  cuisineChipText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 16, marginTop: 8,
    ...shadows.green,
  },
  nextBtnText: { fontSize: 16, fontWeight: '800', color: colors.white },

  infoCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: colors.infoLight, borderRadius: radius.md,
    padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#B8D9F8',
  },
  infoText: { flex: 1, fontSize: 13, color: colors.info, lineHeight: 19 },
});
