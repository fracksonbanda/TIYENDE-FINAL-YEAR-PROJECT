import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows, radius } from '../../theme';

export default function RideCompletionScreen({ route, navigation }) {
  const fare = route?.params?.fare || 'ZK 56';
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(checkAnim, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.offWhite} />
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>

        {/* Success icon */}
        <View style={styles.successRing}>
          <Animated.View style={{ transform: [{ scale: checkAnim }] }}>
            <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
          </Animated.View>
        </View>

        <Text style={styles.arrivedText}>You've arrived!</Text>
        <Text style={styles.fareAmount}>{fare}</Text>
        <Text style={styles.fareBreakdown}>Ride fare: ZK 55 · Wait time: ZK 1</Text>

        {/* Rating */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Rate your trip</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <TouchableOpacity key={i} onPress={() => !submitted && setRating(i)}>
                <Ionicons
                  name={i <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color={i <= rating ? '#F0C040' : colors.border}
                />
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Text style={styles.ratingHint}>
              {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
            </Text>
          )}
        </View>

        {/* Feedback */}
        <TouchableOpacity style={styles.feedbackBtn}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.feedbackText}>Leave anonymous feedback</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.issueBtn}>
          <Text style={styles.issueBtnText}>Report a ride issue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneBtn} activeOpacity={0.85}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite, justifyContent: 'center', padding: 24 },
  content: { backgroundColor: colors.white, borderRadius: radius.xxl, padding: 28, ...shadows.medium },
  successRing: { alignSelf: 'center', marginBottom: 16 },
  arrivedText: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  fareAmount: { fontSize: 40, fontWeight: '800', color: colors.primary, textAlign: 'center', marginBottom: 6 },
  fareBreakdown: { fontSize: 12, color: colors.textTertiary, textAlign: 'center', marginBottom: 28 },
  ratingSection: { alignItems: 'center', marginBottom: 20 },
  ratingLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 12 },
  starsRow: { flexDirection: 'row', gap: 8 },
  ratingHint: { fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 8 },
  feedbackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: 12, gap: 8, marginBottom: 10,
  },
  feedbackText: { fontSize: 14, color: colors.textSecondary },
  issueBtn: { alignSelf: 'center', marginBottom: 20 },
  issueBtnText: { fontSize: 13, color: colors.primary, textDecorationLine: 'underline', fontWeight: '500' },
  doneBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md, padding: 15, alignItems: 'center', ...shadows.green,
  },
  doneBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
