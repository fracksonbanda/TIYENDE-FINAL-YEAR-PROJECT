import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  StatusBar, TextInput, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import ProfilePhotoButton from '../../components/ProfilePhotoButton';
import { pickProfileImage, saveUserProfile, uploadProfileImage } from '../../services/profileService';
import { colors, shadows, radius } from '../../theme';

export default function OnboardingSelector({ navigation }) {
  const [fullName, setFullName]         = useState('');
  const [phone, setPhone]               = useState('');
  const [photoUri, setPhotoUri]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [loadingRole, setLoadingRole]   = useState(null); // 'passenger' | 'driver' | 'restaurant'
  const [pickingImage, setPickingImage] = useState(false);
  const [nameFocused, setNameFocused]   = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const card1Anim = useRef(new Animated.Value(50)).current;
  const card2Anim = useRef(new Animated.Value(50)).current;
  const card1Fade = useRef(new Animated.Value(0)).current;
  const card2Fade = useRef(new Animated.Value(0)).current;

  /* Load the name that was entered on the login screen */
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const name = data.fullName || data.identifier || data.displayName || '';
        if (name) setFullName(name);
        if (data.phone) setPhone(data.phone);
      }
      setProfileLoaded(true);
    }).catch(() => {
      setProfileLoaded(true); // still let the user proceed
    });
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(card1Anim, { toValue: 0, tension: 65, friction: 10, useNativeDriver: true }),
        Animated.timing(card1Fade, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(340),
      Animated.parallel([
        Animated.spring(card2Anim, { toValue: 0, tension: 65, friction: 10, useNativeDriver: true }),
        Animated.timing(card2Fade, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const pickPhoto = async () => {
    setPickingImage(true);
    try {
      const uri = await pickProfileImage();
      if (uri) setPhotoUri(uri);
    } catch (error) {
      Alert.alert('Profile Photo', error.message);
    } finally {
      setPickingImage(false);
    }
  };

  const selectRole = async (roleId) => {
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    if (!cleanName) {
      Alert.alert('Name Required', 'Please enter your full name before continuing.');
      return;
    }
    if (!cleanPhone) {
      Alert.alert('Phone Number Required', 'Please enter a phone number so drivers and passengers can reach you.');
      return;
    }

    setLoading(true);
    setLoadingRole(roleId);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Session expired. Please go back and sign in again.');

      /* 1 — Write role + name + phone to Firestore */
      const firestoreRole = roleId === 'driver' ? 'driver_pending'
        : roleId === 'restaurant' ? 'restaurant_pending'
        : 'passenger';
      await setDoc(doc(db, 'users', user.uid), {
        role: firestoreRole,
        fullName: cleanName,
        phone: cleanPhone,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      /* 2 — Upload photo if one was picked */
      let photoURL = '';
      if (photoUri) {
        try {
          photoURL = await uploadProfileImage(photoUri);
        } catch {
          // Photo upload failure is non-fatal
        }
      }

      /* 3 — Sync display name to Firebase Auth (best-effort) */
      try {
        await saveUserProfile({ fullName: cleanName, ...(photoURL ? { photoURL } : {}) });
      } catch {
        // Auth profile update failure is non-fatal
      }

      /* 4 — Navigate driver/restaurant to their onboarding step 2 */
      if (roleId === 'driver') {
        navigation.navigate('DriverOnboarding');
      } else if (roleId === 'restaurant') {
        navigation.navigate('RestaurantOnboarding');
      }
      /* Passenger: App.js will detect role change via onSnapshot and switch navigator */
    } catch (error) {
      Alert.alert('Account Setup Failed', error.message || 'Something went wrong. Please try again.');
      setLoading(false);
      setLoadingRole(null);
    }
  };

  const ROLES = [
    {
      id: 'driver',
      icon: 'car-sport',
      title: 'Drive & Earn',
      desc: 'Accept live ride, food, delivery and cargo requests from customers near you.',
      tags: ['Flexible hours', 'Set your price', 'Live requests'],
      bg: colors.primary,
      textColor: colors.white,
      tagBg: 'rgba(255,255,255,0.18)',
      tagColor: 'rgba(255,255,255,0.92)',
      iconBg: 'rgba(255,255,255,0.15)',
      iconColor: colors.white,
    },
    {
      id: 'passenger',
      icon: 'person',
      title: 'Book Services',
      desc: 'Book rides, order food, and send parcels — all from one seamless home screen.',
      tags: ['Rides', 'Food', 'Delivery', 'Cargo'],
      bg: colors.white,
      textColor: colors.textPrimary,
      tagBg: colors.primaryGhost,
      tagColor: colors.primary,
      iconBg: colors.primaryGhost,
      iconColor: colors.primary,
    },
    {
      id: 'restaurant',
      icon: 'restaurant',
      title: 'List Your Restaurant',
      desc: 'Add your menu, set prices, manage food orders in real time, and reach customers on Tiyende.',
      tags: ['Menu management', 'Live orders', 'Own discounts'],
      bg: colors.white,
      textColor: colors.textPrimary,
      tagBg: '#FFF3E0',
      tagColor: '#E65100',
      iconBg: '#FFF3E0',
      iconColor: '#E65100',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.offWhite} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.topBlock, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>STEP 2 OF 2  ·  PROFILE SETUP</Text>
          </View>
          <Text style={styles.heading}>Almost there!</Text>
          <Text style={styles.subheading}>Confirm your name and choose how you'll use Tiyende.</Text>
        </Animated.View>

        {/* Name + Photo card */}
        <Animated.View style={[styles.profileCard, { opacity: fadeAnim }]}>
          <ProfilePhotoButton
            name={fullName}
            photoURL={photoUri}
            size={70}
            onPress={pickPhoto}
            loading={pickingImage}
          />
          <View style={styles.nameField}>
            <Text style={styles.fieldLabel}>YOUR FULL NAME</Text>
            {!profileLoaded ? (
              <View style={styles.nameLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.nameLoadingText}>Loading…</Text>
              </View>
            ) : (
              <View style={[styles.inputWrap, nameFocused && styles.inputWrapFocused]}>
                <Ionicons
                  name="person-outline"
                  size={15}
                  color={nameFocused ? colors.primary : colors.textTertiary}
                  style={{ marginLeft: 12 }}
                />
                <TextInput
                  style={styles.nameInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="e.g. Frackson Banda"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words"
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  returnKeyType="next"
                />
              </View>
            )}
          </View>
        </Animated.View>

        {/* Phone card */}
        <Animated.View style={[styles.phoneCard, { opacity: fadeAnim }]}>
          <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
          <Text style={styles.phoneHint}>Shown to your driver or passenger once a trip is booked.</Text>
          <View style={[styles.inputWrap, phoneFocused && styles.inputWrapFocused]}>
            <Ionicons
              name="call-outline"
              size={15}
              color={phoneFocused ? colors.primary : colors.textTertiary}
              style={{ marginLeft: 12 }}
            />
            <TextInput
              style={styles.nameInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="+260 97 1234567"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
              returnKeyType="done"
            />
          </View>
        </Animated.View>

        {/* Role cards */}
        {ROLES.map((role, idx) => {
          const cardSlide = idx === 0 ? card1Anim : card2Anim;
          const cardFade  = idx === 0 ? card1Fade : card2Fade;
          const isThisLoading = loading && loadingRole === role.id;
          const isOtherLoading = loading && loadingRole !== role.id;

          return (
            <Animated.View key={role.id} style={{ opacity: cardFade, transform: [{ translateY: cardSlide }] }}>
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  { backgroundColor: role.bg },
                  (role.id === 'passenger' || role.id === 'restaurant') && styles.roleCardOutline,
                  (loading || !profileLoaded) && styles.disabled,
                ]}
                onPress={() => selectRole(role.id)}
                activeOpacity={0.86}
                disabled={loading || !profileLoaded}
              >
                <View style={[styles.roleIconBg, { backgroundColor: role.iconBg }]}>
                  <Ionicons name={role.icon} size={26} color={role.iconColor} />
                </View>

                <View style={styles.roleContent}>
                  <Text style={[styles.roleTitle, { color: role.textColor }]}>{role.title}</Text>
                  <Text style={[
                    styles.roleDesc,
                    { color: role.id === 'passenger' ? colors.textSecondary : 'rgba(255,255,255,0.8)' },
                  ]}>
                    {role.desc}
                  </Text>
                  <View style={styles.tagRow}>
                    {role.tags.map((tag) => (
                      <View key={tag} style={[styles.tag, { backgroundColor: role.tagBg }]}>
                        <Text style={[styles.tagText, { color: role.tagColor }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {isThisLoading ? (
                  <ActivityIndicator color={role.id === 'driver' ? colors.white : colors.primary} size="small" />
                ) : isOtherLoading ? (
                  <View style={{ width: 20 }} />
                ) : (
                  <View style={[styles.chevronBg, { backgroundColor: role.iconBg }]}>
                    <Ionicons name="chevron-forward" size={16} color={role.iconColor} />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {loading && (
          <View style={styles.loadingBar}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.loadingText}>
              {loadingRole === 'driver' ? 'Setting up your driver account…'
                : loadingRole === 'restaurant' ? 'Starting your restaurant setup…'
                : 'Setting up your account…'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.offWhite },
  scrollContent:{ padding: 22, paddingTop: 60, paddingBottom: 44 },

  topBlock:  { marginBottom: 22 },
  stepPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryGhost,
    borderRadius: radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
    marginBottom: 14,
  },
  stepPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: colors.primary },
  heading:      { fontSize: 28, fontWeight: '900', color: colors.textPrimary, marginBottom: 6 },
  subheading:   { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.white, borderRadius: radius.xl,
    padding: 14, borderWidth: 1, borderColor: colors.borderLight,
    marginBottom: 16, ...shadows.small,
  },
  nameField:  { flex: 1 },
  phoneCard: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    padding: 14, borderWidth: 1, borderColor: colors.borderLight,
    marginBottom: 16, ...shadows.small,
  },
  phoneHint:  { fontSize: 11, color: colors.textTertiary, marginBottom: 8, marginTop: -3 },
  fieldLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: colors.textTertiary, marginBottom: 7 },
  inputWrap:  {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, backgroundColor: colors.offWhite,
  },
  inputWrapFocused: { borderColor: colors.primary, backgroundColor: colors.white },
  nameInput:  { flex: 1, paddingHorizontal: 10, paddingVertical: 12, fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  nameLoading:{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  nameLoadingText: { fontSize: 13, color: colors.textTertiary },

  roleCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.xxl, padding: 18, marginBottom: 14,
    ...shadows.medium,
  },
  roleCardOutline: { borderWidth: 1.5, borderColor: colors.border, ...shadows.small },
  disabled:   { opacity: 0.55 },

  roleIconBg: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  roleContent:{ flex: 1 },
  roleTitle:  { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  roleDesc:   { fontSize: 12.5, lineHeight: 17, marginBottom: 10 },
  tagRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag:        { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  tagText:    { fontSize: 10, fontWeight: '700' },

  chevronBg: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },

  loadingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.primaryGhost,
    borderRadius: radius.lg, padding: 14, marginTop: 4,
    borderWidth: 1, borderColor: colors.primaryMuted,
  },
  loadingText: { fontSize: 13, fontWeight: '600', color: colors.primary },
});
