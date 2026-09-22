import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Animated, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import ProfilePhotoButton from '../../components/ProfilePhotoButton';
import useUserProfile from '../../hooks/useUserProfile';
import { pickProfileImage, saveUserProfile, uploadProfileImage } from '../../services/profileService';
import { colors, shadows, radius } from '../../theme';

const VEHICLE_TYPES = ['Sedan', 'SUV / 4x4', 'Minibus', 'Pickup Truck', 'Van', 'Boda Boda (Motorcycle)'];

export default function DriverOnboarding({ navigation }) {
  const { profile } = useUserProfile();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);

  const progressAnim = useRef(new Animated.Value(0.5)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (profile?.fullName && !fullName) setFullName(profile.fullName);
    if (profile?.phone && !phone) setPhone(profile.phone);
  }, [profile?.fullName, profile?.phone]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [step]);

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

  const goStep2 = () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required', 'Please enter a phone number so passengers can reach you.');
      return;
    }
    fadeAnim.setValue(0);
    setStep(2);
    Animated.parallel([
      Animated.timing(progressAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  };

  const handleRegister = async () => {
    if (!vehicleModel.trim() || !licensePlate.trim() || !vehicleType) {
      Alert.alert('Required Fields', 'Please complete all vehicle details.');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('You need to sign in first.');

      // A photo-upload failure must never strand the account mid-registration —
      // vehicle details are already validated, so complete the signup regardless
      // and let the driver retry the photo later from Settings if it failed.
      let photoURL = '';
      if (photoUri) {
        try {
          photoURL = await uploadProfileImage(photoUri);
        } catch (photoError) {
          Alert.alert('Photo Upload Failed', `${photoError.message}\n\nContinuing without a photo — you can add one later from Settings.`);
        }
      }

      await setDoc(doc(db, 'users', user.uid), {
        role: 'driver',
        fullName: fullName.trim(),
        phone: phone.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleType,
        licensePlate: licensePlate.trim().toUpperCase(),
        status: 'active',
        driverOnline: false,
        rating: profile?.rating || 5,
        createdAt: profile?.createdAt || new Date().toISOString(),
        ...(photoURL ? { photoURL } : {}),
      }, { merge: true });

      await saveUserProfile({ fullName: fullName.trim(), ...(photoURL ? { photoURL } : {}) });
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const photoPreview = photoUri || profile?.photoURL || '';

  const handleBack = () => {
    if (step === 2) { setStep(1); return; }
    // Leaving step 1 means abandoning driver signup — reset the role so the
    // user lands back on role selection instead of being stuck here forever
    // (App.js routes straight to this screen whenever role is 'driver_pending').
    Alert.alert('Cancel Driver Signup?', 'You can choose a different account type instead.', [
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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Registration</Text>
        <Text style={styles.stepText}>Step {step} of 2</Text>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, {
            width: progressAnim.interpolate({ inputRange: [0.5, 1], outputRange: ['50%', '100%'] }),
          }]} />
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: fadeAnim }}>
          {step === 1 ? (
            <>
              <View style={styles.photoBlock}>
                <ProfilePhotoButton
                  name={fullName}
                  photoURL={photoPreview}
                  size={92}
                  onPress={pickPhoto}
                  loading={pickingImage}
                />
                <Text style={styles.photoTitle}>Driver profile photo</Text>
                <Text style={styles.photoSub}>Passengers see this when you accept their request.</Text>
              </View>

              <Text style={styles.stepHeading}>Personal Details</Text>
              <Text style={styles.stepSub}>Tell riders who is picking them up.</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>FULL NAME</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={16} color={colors.textTertiary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Frackson Banda"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                <Text style={styles.fieldHint}>Shown to passengers once you accept their request.</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={16} color={colors.textTertiary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="+260 97 1234567"
                    value={phone}
                    onChangeText={setPhone}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={goStep2} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.stepIcon}>
                <Ionicons name="car-outline" size={30} color={colors.primary} />
              </View>
              <Text style={styles.stepHeading}>Vehicle Details</Text>
              <Text style={styles.stepSub}>This is shown on accepted ride requests.</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>VEHICLE TYPE</Text>
                <View style={styles.chipRow}>
                  {VEHICLE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.chip, vehicleType === type && styles.chipSelected]}
                      onPress={() => setVehicleType(type)}
                    >
                      <Text style={[styles.chipText, vehicleType === type && styles.chipTextSelected]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>VEHICLE MODEL</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="car-outline" size={16} color={colors.textTertiary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Toyota Corolla 2019"
                    value={vehicleModel}
                    onChangeText={setVehicleModel}
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>LICENSE PLATE</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="id-card-outline" size={16} color={colors.textTertiary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. ABC 1234"
                    value={licensePlate}
                    onChangeText={setLicensePlate}
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <Text style={styles.primaryBtnText}>Registering...</Text>
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Complete Registration</Text>
                    <Ionicons name="checkmark" size={18} color={colors.white} />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary, paddingTop: 60, paddingBottom: 28,
    paddingHorizontal: 24,
  },
  backBtn: { marginBottom: 16, alignSelf: 'flex-start', padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.white, marginBottom: 4 },
  stepText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 16 },
  progressTrack: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.white, borderRadius: 2 },
  body: { flex: 1, backgroundColor: colors.white },
  bodyContent: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 48 },
  photoBlock: { alignItems: 'center', marginBottom: 24 },
  photoTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginTop: 10 },
  photoSub: { fontSize: 12, color: colors.textSecondary, marginTop: 3, textAlign: 'center' },
  stepIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primaryGhost,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  stepHeading: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  stepSub: { fontSize: 14, color: colors.textSecondary, marginBottom: 28 },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.textTertiary, marginBottom: 8 },
  fieldHint: { fontSize: 11, color: colors.textTertiary, marginTop: -4, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.offWhite,
  },
  inputIcon: { marginLeft: 14 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 15, fontSize: 15, color: colors.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.offWhite,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  chipTextSelected: { color: colors.white },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 16, marginTop: 8, gap: 8, ...shadows.green,
  },
  primaryBtnDisabled: { opacity: 0.6, shadowOpacity: 0 },
  primaryBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
