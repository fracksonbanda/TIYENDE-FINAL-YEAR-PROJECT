import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Animated, StatusBar,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { colors, shadows, radius } from '../../theme';

const { height: H } = Dimensions.get('window');

// Firebase Authentication needs an email + a 6+ character password, but the
// user only ever sees a username and a 4-digit PIN. The username becomes a
// deterministic, invisible email; the PIN (padded to meet Firebase's minimum
// length) becomes the real password, so it still provides real access control.
const SYNTHETIC_DOMAIN = 'tiyende.app';
const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;
const PIN_LENGTH = 4;

function usernameToEmail(username) {
  return `${username.toLowerCase()}@${SYNTHETIC_DOMAIN}`;
}

function pinToPassword(pin) {
  return `tiyende-pin-${pin}`;
}

const ERROR_MESSAGES = {
  'auth/network-request-failed': 'No internet connection. Please try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
  'auth/user-disabled': 'This account has been disabled. Contact support.',
  'auth/operation-not-allowed': 'Sign-in is not enabled for this app. Contact support.',
};

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const cardFade  = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(60)).current;
  const feature1  = useRef(new Animated.Value(0)).current;
  const feature2  = useRef(new Animated.Value(0)).current;
  const feature3  = useRef(new Animated.Value(0)).current;
  const pinRef    = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(250),
      Animated.parallel([
        Animated.timing(cardFade,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(cardSlide, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();

    [feature1, feature2, feature3].forEach((anim, i) => {
      Animated.sequence([
        Animated.delay(600 + i * 120),
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const handleContinue = async () => {
    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) {
      Alert.alert('Username Too Short', 'Please use at least 3 characters.');
      return;
    }
    if (!USERNAME_PATTERN.test(cleanUsername)) {
      Alert.alert('Invalid Username', 'Letters, numbers, underscores, dots and hyphens only — no spaces.');
      return;
    }
    if (pin.length !== PIN_LENGTH) {
      Alert.alert('PIN Required', `Please enter your ${PIN_LENGTH}-digit PIN.`);
      return;
    }

    setLoading(true);
    const syntheticEmail = usernameToEmail(cleanUsername);
    const password = pinToPassword(pin);
    try {
      // Returning user with the right PIN: this succeeds and their profile is intact.
      await signInWithEmailAndPassword(auth, syntheticEmail, password);
    } catch (signInError) {
      const maybeUnclaimed = ['auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(signInError.code);
      if (!maybeUnclaimed) {
        Alert.alert('Sign In Failed', ERROR_MESSAGES[signInError.code] || signInError.message);
        setLoading(false);
        return;
      }
      // Could be a brand-new username, OR an existing username with the wrong
      // PIN (Firebase collapses both into the same error code for privacy).
      // Trying to register disambiguates: it only fails as "already in use"
      // when the username is real and the PIN we just tried was wrong.
      try {
        const { user } = await createUserWithEmailAndPassword(auth, syntheticEmail, password);
        await setDoc(doc(db, 'users', user.uid), {
          username: cleanUsername,
          identifier: cleanUsername,
          role: 'new',
          createdAt: new Date().toISOString(),
        }, { merge: true });
      } catch (registerError) {
        if (registerError.code === 'auth/email-already-in-use') {
          Alert.alert('Incorrect PIN', 'That username exists but the PIN is wrong. Please try again.');
        } else {
          Alert.alert('Could Not Create Account', ERROR_MESSAGES[registerError.code] || registerError.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: 'car-sport-outline',    text: 'Book rides instantly' },
    { icon: 'fast-food-outline',    text: 'Order food & parcels' },
    { icon: 'shield-checkmark-outline', text: 'Safe & secure trips' },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent />

      {/* Green header */}
      <View style={styles.header}>
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />
        <View style={styles.decCircle3} />

        <Animated.View style={[styles.brandBlock, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.logoRing}>
            <View style={styles.logoInner}>
              <Text style={styles.logoLetter}>T</Text>
            </View>
          </View>
          <Text style={styles.appName}>TIYENDE</Text>
          <Text style={styles.appTagline}>Your Journey, Your Price</Text>
        </Animated.View>

        <View style={styles.pillRow}>
          {[feature1, feature2, feature3].map((anim, i) => (
            <Animated.View key={i} style={[styles.pill, { opacity: anim }]}>
              <Ionicons name={features[i].icon} size={13} color="rgba(255,255,255,0.9)" />
              <Text style={styles.pillText}>{features[i].text}</Text>
            </Animated.View>
          ))}
        </View>
      </View>

      {/* Bottom card */}
      <Animated.View style={[styles.card, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
        <View style={styles.sheetHandle} />

        <Text style={styles.welcomeTitle}>Welcome aboard</Text>
        <Text style={styles.welcomeSub}>
          Pick a username and a {PIN_LENGTH}-digit PIN. Sign back in with the same two anytime and your profile is always here.
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>USERNAME</Text>
          <View style={[styles.inputRow, focusedField === 'username' && styles.inputRowFocused]}>
            <View style={styles.inputIconWrap}>
              <Ionicons
                name={focusedField === 'username' ? 'at' : 'at-outline'}
                size={18}
                color={focusedField === 'username' ? colors.primary : colors.textTertiary}
              />
            </View>
            <View style={styles.inputDivider} />
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. frackson_b"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
              onSubmitEditing={() => pinRef.current?.focus()}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{PIN_LENGTH}-DIGIT PIN</Text>
          <View style={[styles.inputRow, focusedField === 'pin' && styles.inputRowFocused]}>
            <View style={styles.inputIconWrap}>
              <Ionicons
                name={focusedField === 'pin' ? 'keypad' : 'keypad-outline'}
                size={18}
                color={focusedField === 'pin' ? colors.primary : colors.textTertiary}
              />
            </View>
            <View style={styles.inputDivider} />
            <TextInput
              ref={pinRef}
              style={styles.input}
              value={pin}
              onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, PIN_LENGTH))}
              placeholder="••••"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              secureTextEntry={!showPin}
              maxLength={PIN_LENGTH}
              returnKeyType="done"
              onFocus={() => setFocusedField('pin')}
              onBlur={() => setFocusedField(null)}
              onSubmitEditing={handleContinue}
            />
            <TouchableOpacity onPress={() => setShowPin((v) => !v)} style={styles.clearBtn}>
              <Ionicons name={showPin ? 'eye-off-outline' : 'eye-outline'} size={17} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.securityRow}>
          <View style={styles.securityBadge}>
            <Ionicons name="save" size={11} color={colors.primary} />
            <Text style={styles.securityText}>Profile always saved</Text>
          </View>
          <View style={styles.securityBadge}>
            <Ionicons name="flash" size={11} color={colors.primary} />
            <Text style={styles.securityText}>Instant access</Text>
          </View>
          <View style={styles.securityBadge}>
            <Ionicons name="lock-closed" size={11} color={colors.primary} />
            <Text style={styles.securityText}>PIN protected</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, (loading || username.trim().length < 3 || pin.length !== PIN_LENGTH) && styles.primaryBtnDisabled]}
          onPress={handleContinue}
          activeOpacity={0.85}
          disabled={loading || username.trim().length < 3 || pin.length !== PIN_LENGTH}
        >
          {loading ? (
            <Text style={styles.primaryBtnText}>Please wait…</Text>
          ) : (
            <>
              <Text style={styles.primaryBtnText}>Continue</Text>
              <View style={styles.btnArrow}>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </View>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.terms}>
          By continuing you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    paddingBottom: 16,
  },
  decCircle1: {
    position: 'absolute', top: -70, right: -70,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  decCircle2: {
    position: 'absolute', bottom: 10, left: -90,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  decCircle3: {
    position: 'absolute', top: '35%', right: -30,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  brandBlock: { alignItems: 'center', marginBottom: 20 },
  logoRing: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.28)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 18,
  },
  logoInner: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoLetter: { fontSize: 36, fontWeight: '900', color: colors.white },
  appName: {
    fontSize: 34, fontWeight: '900', color: colors.white,
    letterSpacing: 9, marginBottom: 8,
  },
  appTagline: {
    fontSize: 12, color: 'rgba(255,255,255,0.65)',
    letterSpacing: 2, textTransform: 'uppercase', fontWeight: '500',
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingHorizontal: 16 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full, paddingHorizontal: 11, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  pillText: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  card: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 28, paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    ...shadows.large,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: colors.borderLight,
    borderRadius: 2, alignSelf: 'center', marginBottom: 22,
  },
  welcomeTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  welcomeSub: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: 22 },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1.5,
    color: colors.textTertiary, marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg, backgroundColor: colors.offWhite, overflow: 'hidden',
  },
  inputRowFocused: {
    borderColor: colors.primary, backgroundColor: colors.white, ...shadows.xs,
  },
  inputIconWrap: { paddingHorizontal: 14, paddingVertical: 16 },
  inputDivider: { width: 1, height: 24, backgroundColor: colors.borderLight },
  input: {
    flex: 1, paddingHorizontal: 13, paddingVertical: 17,
    fontSize: 15, color: colors.textPrimary, fontWeight: '500',
  },
  clearBtn: { paddingHorizontal: 12 },

  securityRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  securityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryGhost, borderRadius: radius.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  securityText: { fontSize: 11, color: colors.primary, fontWeight: '600' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 16, gap: 10, ...shadows.green,
  },
  primaryBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  primaryBtnText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  btnArrow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },

  terms: {
    fontSize: 11, color: colors.textTertiary,
    textAlign: 'center', marginTop: 18, lineHeight: 17,
  },
  termsLink: { color: colors.primary, fontWeight: '600' },
});
