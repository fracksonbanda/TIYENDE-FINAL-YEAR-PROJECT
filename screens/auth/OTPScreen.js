import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Animated, StatusBar,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows, radius } from '../../theme';

export default function OTPScreen({ route, navigation }) {
  // confirmationResult is the object returned by signInWithPhoneNumber()
  const { confirmationResult, phoneNumber } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    const interval = setInterval(() => setTimer((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      shake();
      Alert.alert('Incomplete Code', 'Please enter all 6 digits.');
      return;
    }
    setLoading(true);
    try {
      // confirmationResult.confirm() is the Firebase web SDK method
      await confirmationResult.confirm(code);
      // Auth state change in App.js will navigate to OnboardingSelector automatically
      navigation.navigate('OnboardingSelector');
    } catch (error) {
      shake();
      setCode('');
      if (error.code === 'auth/invalid-verification-code') {
        Alert.alert('Wrong Code', 'The code you entered is incorrect. Please try again.');
      } else if (error.code === 'auth/code-expired') {
        Alert.alert('Code Expired', 'This code has expired. Please go back and request a new one.');
      } else {
        Alert.alert('Verification Failed', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const maskedPhone = phoneNumber.replace(/(\+260)(\d{2})(\d{3})(\d+)/, '$1 $2 $3 $4');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Ionicons name="shield-checkmark" size={28} color={colors.white} />
        </View>
        <Text style={styles.headerTitle}>Verify Phone</Text>
        <Text style={styles.headerSub}>Code sent to {maskedPhone}</Text>
      </View>

      <View style={styles.body}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.label}>ENTER 6-DIGIT CODE</Text>

          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <TextInput
              style={[styles.otpInput, code.length === 6 && styles.otpInputComplete]}
              value={code}
              onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="• • • • • •"
              placeholderTextColor={colors.border}
              autoFocus
            />
          </Animated.View>

          {/* Dot progress indicators */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[styles.dotIndicator, i < code.length && styles.dotFilled]} />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.verifyBtn, (loading || code.length !== 6) && styles.verifyBtnDisabled]}
            onPress={verifyCode}
            disabled={loading || code.length !== 6}
            activeOpacity={0.85}
          >
            {loading ? (
              <Text style={styles.verifyBtnText}>Verifying…</Text>
            ) : (
              <>
                <Text style={styles.verifyBtnText}>Verify & Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            {timer > 0 ? (
              <Text style={styles.resendWait}>
                Resend code in <Text style={styles.resendTimer}>{timer}s</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={() => { setTimer(60); navigation.goBack(); }}>
                <Text style={styles.resendLink}>Resend verification code</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary, paddingTop: 60, paddingBottom: 32,
    paddingHorizontal: 24, alignItems: 'center',
  },
  backBtn: { position: 'absolute', top: 56, left: 20, padding: 8 },
  headerIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center',
    alignItems: 'center', marginBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.white, marginBottom: 6 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.3 },
  body: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 24, paddingTop: 40 },
  label: {
    fontSize: 10, fontWeight: '700', letterSpacing: 2,
    color: colors.textTertiary, marginBottom: 14, textAlign: 'center',
  },
  otpInput: {
    borderWidth: 2, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: 20, fontSize: 32, color: colors.textPrimary,
    textAlign: 'center', letterSpacing: 16, backgroundColor: colors.offWhite, fontWeight: '700',
  },
  otpInputComplete: { borderColor: colors.primary, backgroundColor: colors.primaryGhost },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 16, marginBottom: 32 },
  dotIndicator: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  dotFilled: { backgroundColor: colors.primary },
  verifyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 16, gap: 8, ...shadows.green,
  },
  verifyBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  verifyBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  resendRow: { marginTop: 28, alignItems: 'center' },
  resendWait: { fontSize: 14, color: colors.textSecondary },
  resendTimer: { color: colors.primary, fontWeight: '700' },
  resendLink: { fontSize: 14, color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
});
