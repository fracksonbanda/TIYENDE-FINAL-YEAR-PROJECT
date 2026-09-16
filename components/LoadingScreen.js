import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing, StatusBar, Dimensions,
} from 'react-native';
import { colors } from '../theme';

const { width: W, height: H } = Dimensions.get('window');

export default function LoadingScreen() {
  const logoFade    = useRef(new Animated.Value(0)).current;
  const logoScale   = useRef(new Animated.Value(0.65)).current;
  const ring1Scale  = useRef(new Animated.Value(0.5)).current;
  const ring1Opacity= useRef(new Animated.Value(0)).current;
  const ring2Scale  = useRef(new Animated.Value(0.5)).current;
  const ring2Opacity= useRef(new Animated.Value(0)).current;
  const textFade    = useRef(new Animated.Value(0)).current;
  const textSlide   = useRef(new Animated.Value(24)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;
  const lineWidth   = useRef(new Animated.Value(0)).current;
  const creditFade  = useRef(new Animated.Value(0)).current;
  const dot1        = useRef(new Animated.Value(0.3)).current;
  const dot2        = useRef(new Animated.Value(0.3)).current;
  const dot3        = useRef(new Animated.Value(0.3)).current;
  const bgCircle1   = useRef(new Animated.Value(0)).current;
  const bgCircle2   = useRef(new Animated.Value(0)).current;
  const bgCircle3   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Background orbs fade in
    Animated.parallel([
      Animated.timing(bgCircle1, { toValue: 1, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(bgCircle2, { toValue: 1, duration: 1200, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(bgCircle3, { toValue: 1, duration: 900, delay: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    // Logo spring in
    Animated.sequence([
      Animated.delay(180),
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 52, friction: 7, useNativeDriver: true }),
        Animated.timing(logoFade, { toValue: 1, duration: 550, useNativeDriver: true }),
      ]),
    ]).start();

    // Pulse ring 1
    Animated.sequence([
      Animated.delay(520),
      Animated.parallel([
        Animated.timing(ring1Scale,   { toValue: 1.6, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(ring1Opacity, { toValue: 0.45, duration: 300, useNativeDriver: true }),
          Animated.timing(ring1Opacity, { toValue: 0,    duration: 600, useNativeDriver: true }),
        ]),
      ]),
    ]).start();

    // Pulse ring 2
    Animated.sequence([
      Animated.delay(700),
      Animated.parallel([
        Animated.timing(ring2Scale,   { toValue: 2.1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(ring2Opacity, { toValue: 0.28, duration: 400, useNativeDriver: true }),
          Animated.timing(ring2Opacity, { toValue: 0,    duration: 700, useNativeDriver: true }),
        ]),
      ]),
    ]).start();

    // Brand text slide up + divider expand
    Animated.sequence([
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(textFade,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(textSlide, { toValue: 0, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(lineWidth, { toValue: 1, duration: 700, delay: 120, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      ]),
    ]).start();

    // Tagline
    Animated.sequence([
      Animated.delay(1000),
      Animated.timing(taglineFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // Credit
    Animated.sequence([
      Animated.delay(1300),
      Animated.timing(creditFade, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    // Loading dots
    const pulseDot = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1,   duration: 380, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.25, duration: 380, useNativeDriver: true }),
        ])
      ).start();

    pulseDot(dot1, 850);
    pulseDot(dot2, 1050);
    pulseDot(dot3, 1250);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent />

      {/* Decorative background orbs */}
      <Animated.View style={[styles.orb1, {
        opacity: bgCircle1.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }),
        transform: [{ scale: bgCircle1.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
      }]} />
      <Animated.View style={[styles.orb2, {
        opacity: bgCircle2.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] }),
        transform: [{ scale: bgCircle2.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
      }]} />
      <Animated.View style={[styles.orb3, {
        opacity: bgCircle3.interpolate({ inputRange: [0, 1], outputRange: [0, 0.06] }),
        transform: [{ scale: bgCircle3.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
      }]} />
      {/* Subtle grid lines */}
      <View style={styles.gridLine1} />
      <View style={styles.gridLine2} />

      {/* Center content */}
      <View style={styles.center}>
        {/* Pulse rings (positioned relative to logo center) */}
        <View style={styles.ringsWrap}>
          <Animated.View style={[styles.ring, { opacity: ring2Opacity, transform: [{ scale: ring2Scale }] }]} />
          <Animated.View style={[styles.ring, { opacity: ring1Opacity, transform: [{ scale: ring1Scale }] }]} />

          {/* Logo */}
          <Animated.View style={[styles.logoContainer, { opacity: logoFade, transform: [{ scale: logoScale }] }]}>
            <View style={styles.logoRingOuter}>
              <View style={styles.logoRingInner}>
                <Text style={styles.logoLetter}>T</Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Brand name */}
        <Animated.View style={[styles.brandBlock, { opacity: textFade, transform: [{ translateY: textSlide }] }]}>
          <Text style={styles.brandName}>TIYENDE</Text>
          <Animated.View
            style={[styles.divider, {
              width: lineWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '72%'] }),
            }]}
          />
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: taglineFade }]}>
          Your Journey, Your Price
        </Animated.Text>
      </View>

      {/* Loading dots */}
      <View style={styles.dotsRow}>
        {[dot1, dot2, dot3].map((anim, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: anim }]} />
        ))}
      </View>

      {/* Credit line */}
      <Animated.View style={[styles.creditWrap, { opacity: creditFade }]}>
        <View style={styles.creditLine} />
        <Text style={styles.creditText}>Developed by Frackson Banda</Text>
        <View style={styles.creditLine} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Background orbs */
  orb1: {
    position: 'absolute',
    top: -H * 0.12,
    right: -W * 0.22,
    width: W * 0.85,
    height: W * 0.85,
    borderRadius: W * 0.425,
    backgroundColor: '#FFFFFF',
  },
  orb2: {
    position: 'absolute',
    bottom: H * 0.08,
    left: -W * 0.28,
    width: W * 0.9,
    height: W * 0.9,
    borderRadius: W * 0.45,
    backgroundColor: '#FFFFFF',
  },
  orb3: {
    position: 'absolute',
    top: H * 0.4,
    right: -W * 0.1,
    width: W * 0.45,
    height: W * 0.45,
    borderRadius: W * 0.225,
    backgroundColor: '#FFFFFF',
  },
  gridLine1: {
    position: 'absolute',
    top: 0, left: '30%', bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  gridLine2: {
    position: 'absolute',
    top: 0, left: '70%', bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  /* Center layout */
  center: {
    alignItems: 'center',
  },
  ringsWrap: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  ring: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
  },

  /* Logo */
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRingOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoRingInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    fontSize: 46,
    fontWeight: '900',
    color: colors.white,
    includeFontPadding: false,
  },

  /* Brand */
  brandBlock: {
    alignItems: 'center',
    marginBottom: 14,
  },
  brandName: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 11,
    marginBottom: 14,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  divider: {
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.45)',
    alignSelf: 'center',
  },
  tagline: {
    fontSize: 12.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2.8,
    textTransform: 'uppercase',
  },

  /* Loading dots */
  dotsRow: {
    position: 'absolute',
    bottom: 106,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },

  /* Credit */
  creditWrap: {
    position: 'absolute',
    bottom: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  creditLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  creditText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.48)',
    letterSpacing: 0.5,
  },
});
