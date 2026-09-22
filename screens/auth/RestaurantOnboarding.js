import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  StatusBar, TextInput, Alert, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
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

const STORE_CATEGORIES = [
  { id: 'grocery',      label: 'Groceries & Foodstuffs', icon: 'basket-outline' },
  { id: 'electronics',  label: 'Electronics & Gadgets',  icon: 'phone-portrait-outline' },
  { id: 'fashion',      label: 'Clothing & Fashion',     icon: 'shirt-outline' },
  { id: 'hardware',     label: 'Hardware & Home',        icon: 'hammer-outline' },
  { id: 'pharmacy',     label: 'Pharmacy & Health',      icon: 'medkit-outline' },
  { id: 'beauty',       label: 'Beauty & Cosmetics',     icon: 'sparkles-outline' },
  { id: 'other',        label: 'Other',                  icon: 'storefront-outline' },
];

const BUSINESS_TYPES = [
  { id: 'restaurant', label: 'Restaurant', icon: 'restaurant-outline', sub: 'Food & drink' },
  { id: 'store',      label: 'Store',      icon: 'storefront-outline', sub: 'Goods & products' },
];

export default function RestaurantOnboarding({ navigation }) {
  const [step, setStep]               = useState(1); // 1 = basics, 2 = details
  const [businessType, setBusinessType] = useState('restaurant'); // 'restaurant' | 'store'
  const [name, setName]               = useState('');
  const [address, setAddress]         = useState('');
  const [phone, setPhone]             = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [description, setDescription] = useState('');
  const [openHours, setOpenHours]     = useState('08:00 – 21:00');
  const [logoBase64, setLogoBase64]   = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isStore = businessType === 'store';
  const CATEGORY_OPTIONS = isStore ? STORE_CATEGORIES : CUISINE_OPTIONS;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, [step]);

  const pickLogo = async () => {
    try {
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
    } catch (error) {
      Alert.alert('Logo Upload Failed', `${error.message}\n\nYou can add a logo later from your restaurant profile.`);
    }
  };

  const handleBack = () => {
    if (step === 2) { fadeAnim.setValue(0); setStep(1); return; }
    // Leaving step 1 means abandoning business signup — reset the role so
    // the user lands back on role selection instead of being stuck here
    // (App.js routes straight to this screen whenever role is 'restaurant_pending').
    Alert.alert('Cancel Business Signup?', 'You can choose a different account type instead.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Cancel Signup',
        style: 'destructive',
        onPress: async () => {
          const user = auth.currentUser;
          if (user) {
            try { await setDoc(doc(db, 'users', user.uid), { role: 'new' }, { merge: true }); } catch {}
          }
          navigation.navigate('OnboardingSelector');
        },
      },
    ]);
  };

  const goNext = () => {
    if (!name.trim()) { Alert.alert(isStore ? 'Store name required' : 'Restaurant name required'); return; }
    if (!address.trim()) { Alert.alert('Address required'); return; }
    if (!cuisineType) { Alert.alert(isStore ? 'Select a store category' : 'Select a cuisine type'); return; }
    fadeAnim.setValue(0);
    setStep(2);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Session expired — please sign in again.');
      await createRestaurantProfile({
        businessType,
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
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </TouchableOpacity>
          <View>
            <Text style={styles.stepLabel}>STEP {step} OF 2  ·  {isStore ? 'STORE SETUP' : 'RESTAURANT SETUP'}</Text>
            <Text style={styles.headerTitle}>{step === 1 ? (isStore ? 'Your store' : 'Your restaurant') : 'More details'}</Text>
          </View>
        </View>

        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 ? (
            <>
              {/* Business type */}
              <Text style={styles.sectionLabel}>WHAT ARE YOU SETTING UP? *</Text>
              <View style={styles.typeRow}>
                {BUSINESS_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.typeCard, businessType === t.id && styles.typeCardOn]}
                    onPress={() => { setBusinessType(t.id); setCuisineType(''); }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={t.icon} size={22} color={businessType === t.id ? colors.white : colors.primary} />
                    <Text style={[styles.typeCardLabel, businessType === t.id && { color: colors.white }]}>{t.label}</Text>
                    <Text style={[styles.typeCardSub, businessType === t.id && { color: 'rgba(255,255,255,0.8)' }]}>{t.sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>

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

              <Field label={isStore ? 'STORE NAME *' : 'RESTAURANT NAME *'} icon={isStore ? 'storefront-outline' : 'restaurant-outline'}>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder={isStore ? 'e.g. Chanda Electronics' : 'e.g. Chicken Inn Manda Hill'}
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

              <Text style={styles.sectionLabel}>{isStore ? 'STORE CATEGORY *' : 'CUISINE TYPE *'}</Text>
              <View style={styles.cuisineGrid}>
                {CATEGORY_OPTIONS.map((opt) => (
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

              <Field label={isStore ? 'ABOUT YOUR STORE' : 'ABOUT YOUR RESTAURANT'} icon="information-circle-outline">
                <TextInput
                  style={[styles.input, { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={isStore ? "Tell customers what you sell..." : "Tell customers what makes your food special..."}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                />
              </Field>

              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={18} color={colors.info} />
                <Text style={styles.infoText}>
                  {isStore
                    ? 'After setup you can add your full catalog with photos, prices, and stock levels from your dashboard.'
                    : 'After setup you can add your full menu with photos, prices, and categories from your restaurant dashboard.'}
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
                <Text style={styles.nextBtnText}>{submitting ? 'Creating your business…' : 'Open for business!'}</Text>
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

  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  typeCard: {
    flex: 1, alignItems: 'center', gap: 4, borderRadius: radius.lg, padding: 16,
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.offWhite,
  },
  typeCardOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeCardLabel: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginTop: 4 },
  typeCardSub: { fontSize: 11, color: colors.textTertiary, fontWeight: '600' },
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
