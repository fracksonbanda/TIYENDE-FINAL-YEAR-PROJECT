import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable, StyleSheet,
  Alert, Animated, StatusBar, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import ProfilePhotoButton from '../../components/ProfilePhotoButton';
import { pickProfileImage, saveUserProfile, uploadProfileImage } from '../../services/profileService';
import { colors, shadows, radius } from '../../theme';

export default function EmailLoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [profileImageUri, setProfileImageUri] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedRole, setSelectedRole] = useState('passenger');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  useEffect(() => () => fadeAnim.stopAnimation(), []);

  const toggleMode = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setIsRegistering((value) => !value);
      setPassword('');
      setConfirmPassword('');
      Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    });
  };

  const handlePickImage = async () => {
    setPickingImage(true);
    try {
      const uri = await pickProfileImage();
      if (uri) setProfileImageUri(uri);
    } catch (error) {
      Alert.alert('Profile Photo', error.message);
    } finally {
      setPickingImage(false);
    }
  };

  const handleAuth = async () => {
    const cleanEmail = email.trim();
    const cleanName = fullName.trim();
    if (!cleanEmail || !password) {
      Alert.alert('Required', 'Please fill in all required fields.');
      return;
    }
    if (isRegistering && !cleanName) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    if (isRegistering && password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Your passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        const { user } = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await setDoc(doc(db, 'users', user.uid), {
          role: selectedRole === 'driver' ? 'driver_pending' : 'passenger',
          fullName: cleanName,
          email: cleanEmail,
          createdAt: new Date().toISOString(),
        }, { merge: true });

        let photoURL = '';
        if (profileImageUri) {
          photoURL = await uploadProfileImage(profileImageUri);
        }
        await saveUserProfile({ fullName: cleanName, ...(photoURL ? { photoURL } : {}) });

        if (selectedRole === 'driver') {
          navigation.navigate('DriverOnboarding');
        }
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
    } catch (error) {
      const messages = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/email-already-in-use': 'An account already exists with this email.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/invalid-credential': 'Incorrect email or password.',
        'auth/network-request-failed': 'No internet connection. Please try again.',
      };
      Alert.alert('Error', messages[error.code] || error.message);
    } finally {
      setLoading(false);
    }
  };

  const isFocused = (field) => focusedField === field;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <View style={styles.headerIcon}>
            <Ionicons name={isRegistering ? 'person-add' : 'log-in-outline'} size={28} color={colors.white} />
          </View>
          <Text style={styles.headerTitle}>{isRegistering ? 'Create Account' : 'Sign In'}</Text>
          <Text style={styles.headerSub}>{isRegistering ? 'Set up your Tiyende profile' : 'Welcome back'}</Text>
        </Animated.View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="always">
        <Animated.View style={{ opacity: fadeAnim }}>
          {isRegistering && (
            <View style={styles.roleSection}>
              <View style={styles.photoRow}>
                <ProfilePhotoButton
                  name={fullName || email}
                  photoURL={profileImageUri}
                  size={78}
                  loading={pickingImage}
                  onPress={handlePickImage}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.photoTitle}>Profile photo</Text>
                  <Text style={styles.photoSub}>Add a clear photo so passengers and drivers can recognize you.</Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>I WANT TO</Text>
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[styles.roleCard, selectedRole === 'passenger' && styles.roleCardSelected]}
                  onPress={() => setSelectedRole('passenger')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.roleIcon, selectedRole === 'passenger' && styles.roleIconSelected]}>
                    <Ionicons name="person" size={22} color={selectedRole === 'passenger' ? colors.white : colors.primary} />
                  </View>
                  <Text style={[styles.roleLabel, selectedRole === 'passenger' && styles.roleLabelSelected]}>Book</Text>
                  <Text style={[styles.roleSub, selectedRole === 'passenger' && { color: 'rgba(255,255,255,0.8)' }]}>Passenger</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleCard, selectedRole === 'driver' && styles.roleCardSelected]}
                  onPress={() => setSelectedRole('driver')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.roleIcon, selectedRole === 'driver' && styles.roleIconSelected]}>
                    <Ionicons name="car-sport" size={22} color={selectedRole === 'driver' ? colors.white : colors.primary} />
                  </View>
                  <Text style={[styles.roleLabel, selectedRole === 'driver' && styles.roleLabelSelected]}>Drive</Text>
                  <Text style={[styles.roleSub, selectedRole === 'driver' && { color: 'rgba(255,255,255,0.8)' }]}>Driver</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isRegistering && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <Pressable
                style={[styles.inputWrapper, isFocused('name') && styles.inputFocused]}
                onPress={() => nameInputRef.current?.focus()}
              >
                <Ionicons name="person-outline" size={17} color={isFocused('name') ? colors.primary : colors.textTertiary} style={styles.inputIcon} pointerEvents="none" />
                <TextInput
                  ref={nameInputRef}
                  style={styles.input}
                  placeholder="Your full name"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailInputRef.current?.focus()}
                  placeholderTextColor={colors.textTertiary}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                />
              </Pressable>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            <Pressable
              style={[styles.inputWrapper, isFocused('email') && styles.inputFocused]}
              onPress={() => emailInputRef.current?.focus()}
            >
              <Ionicons name="mail-outline" size={17} color={isFocused('email') ? colors.primary : colors.textTertiary} style={styles.inputIcon} pointerEvents="none" />
              <TextInput
                ref={emailInputRef}
                style={styles.input}
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                placeholderTextColor={colors.textTertiary}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <Pressable
              style={[styles.inputWrapper, isFocused('pass') && styles.inputFocused]}
              onPress={() => passwordInputRef.current?.focus()}
            >
              <Ionicons name="lock-closed-outline" size={17} color={isFocused('pass') ? colors.primary : colors.textTertiary} style={styles.inputIcon} pointerEvents="none" />
              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="Min. 6 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                textContentType={isRegistering ? 'newPassword' : 'password'}
                returnKeyType={isRegistering ? 'next' : 'done'}
                onSubmitEditing={() => {
                  if (isRegistering) {
                    confirmPasswordInputRef.current?.focus();
                  } else {
                    handleAuth();
                  }
                }}
                placeholderTextColor={colors.textTertiary}
                onFocus={() => setFocusedField('pass')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </Pressable>
          </View>

          {isRegistering && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
              <Pressable
                style={[
                  styles.inputWrapper,
                  isFocused('confirm') && styles.inputFocused,
                  confirmPassword && password !== confirmPassword && styles.inputError,
                ]}
                onPress={() => confirmPasswordInputRef.current?.focus()}
              >
                <Ionicons name="shield-outline" size={17} color={isFocused('confirm') ? colors.primary : colors.textTertiary} style={styles.inputIcon} pointerEvents="none" />
                <TextInput
                  ref={confirmPasswordInputRef}
                  style={styles.input}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={handleAuth}
                  placeholderTextColor={colors.textTertiary}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                />
                {confirmPassword.length > 0 && (
                  <Ionicons
                    name={password === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={password === confirmPassword ? colors.success : colors.error}
                    style={{ marginRight: 12 }}
                  />
                )}
              </Pressable>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={styles.errorHint}>Passwords do not match</Text>
              )}
            </View>
          )}

          {isRegistering && (
            <View style={[styles.infoBanner, { backgroundColor: selectedRole === 'driver' ? colors.primaryGhost : '#EFF6FF' }]}>
              <Ionicons
                name={selectedRole === 'driver' ? 'car-outline' : 'information-circle-outline'}
                size={16}
                color={selectedRole === 'driver' ? colors.primary : colors.info}
              />
              <Text style={[styles.infoText, { color: selectedRole === 'driver' ? colors.primary : colors.info }]}>
                {selectedRole === 'driver'
                  ? 'After sign up you will add vehicle details.'
                  : 'After sign up you can book rides, food, delivery, and cargo.'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <Text style={styles.submitBtnText}>Please wait...</Text>
            ) : (
              <>
                <Text style={styles.submitBtnText}>
                  {isRegistering
                    ? (selectedRole === 'driver' ? 'Create Driver Account' : 'Create Passenger Account')
                    : 'Sign In'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchRow} onPress={toggleMode}>
            <Text style={styles.switchText}>
              {isRegistering ? 'Already have an account?  ' : "Don't have an account?  "}
            </Text>
            <Text style={styles.switchLink}>{isRegistering ? 'Sign In' : 'Register'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 32,
    paddingHorizontal: 24, alignItems: 'center',
  },
  backBtn: { position: 'absolute', top: 52, left: 20, padding: 8 },
  headerIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center',
    alignItems: 'center', marginBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.white, marginBottom: 6 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  body: { flex: 1, backgroundColor: colors.white },
  bodyContent: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 48 },
  roleSection: { marginBottom: 24 },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.offWhite,
    marginBottom: 18,
  },
  photoTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 3 },
  photoSub: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  roleRow: { flexDirection: 'row', gap: 12 },
  roleCard: {
    flex: 1, borderRadius: radius.lg, padding: 16, alignItems: 'center',
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.offWhite,
  },
  roleCardSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleIcon: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  roleIconSelected: { backgroundColor: 'rgba(255,255,255,0.2)' },
  roleLabel: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginBottom: 2 },
  roleLabelSelected: { color: colors.white },
  roleSub: { fontSize: 11, color: colors.textTertiary, fontWeight: '600' },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.textTertiary, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, backgroundColor: colors.offWhite,
  },
  inputFocused: { borderColor: colors.primary, backgroundColor: colors.white, ...shadows.xs },
  inputError: { borderColor: colors.error },
  inputIcon: { marginLeft: 14 },
  input: { flex: 1, paddingHorizontal: 10, paddingVertical: 14, fontSize: 15, color: colors.textPrimary },
  eyeBtn: { padding: 14 },
  errorHint: { fontSize: 11, color: colors.error, marginTop: 5, marginLeft: 4 },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: radius.md, padding: 12, marginBottom: 18,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 16, gap: 8, ...shadows.green,
  },
  submitBtnDisabled: { opacity: 0.6, shadowOpacity: 0 },
  submitBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { fontSize: 14, color: colors.textSecondary },
  switchLink: { fontSize: 14, color: colors.primary, fontWeight: '700' },
});
