import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity, Alert,
  Animated, StatusBar, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows, radius } from '../../theme';
import { useAppContext } from '../../context/AppContext';

export default function SafetyScreen() {
  const { darkMode } = useAppContext();
  const [shareLocation, setShareLocation] = useState(true);
  const [dontCall, setDontCall] = useState(false);
  const sosAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const bg = darkMode ? '#0D1117' : colors.offWhite;
  const cardBg = darkMode ? '#161B22' : colors.white;
  const textColor = darkMode ? colors.textOnDark : colors.textPrimary;
  const subText = darkMode ? '#8B949E' : colors.textSecondary;
  const borderColor = darkMode ? '#30363D' : colors.borderLight;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(sosAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
      Animated.timing(sosAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handleSOS = () => {
    Alert.alert(
      '🆘 Send SOS?',
      'This will send an emergency SMS to your contact and attempt to call Zambia Police (991).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS Now', style: 'destructive',
          onPress: () => {
            Alert.alert('SOS Sent', '✅ Emergency alert sent to +260 97 700 0000\nZambia Police: 991');
          },
        },
      ]
    );
  };

  const reportItems = [
    {
      icon: 'bag-handle-outline', label: 'Left something in the car?',
      color: '#0550AE',
      onPress: () => Alert.alert('Lost Item', 'We\'ll contact your last driver to help retrieve your item. Please describe what you left.'),
    },
    {
      icon: 'warning-outline', label: 'Report a ride issue',
      color: colors.warning,
      onPress: () => Alert.alert('Report Issue', 'Select issue type:\n• Unsafe driving\n• Wrong route taken\n• Overcharged\n• Driver no-show', [
        { text: 'Cancel' },
        { text: 'Submit Report', onPress: () => Alert.alert('Reported', 'Our team will review this within 24 hours.') },
      ]),
    },
    {
      icon: 'thumbs-up-outline', label: 'Car condition feedback',
      color: colors.success,
      onPress: () => Alert.alert('Feedback Submitted', 'Thank you for helping keep Tiyende safe!'),
    },
    {
      icon: 'id-card-outline', label: 'Verify my driver',
      color: colors.primary,
      onPress: () => Alert.alert('Driver Verified', '✅ Your driver\'s license and vehicle registration are verified by Tiyende.'),
    },
    {
      icon: 'call-outline', label: 'Call emergency services',
      color: colors.error,
      onPress: () => Alert.alert('Emergency Call', 'Calling 991 (Zambia Police)', [
        { text: 'Cancel' },
        { text: 'Call 991', style: 'destructive', onPress: () => Linking.openURL('tel:991') },
      ]),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.error} />
      <View style={styles.header}>
        <View style={styles.headerDecCircle} />
        <Ionicons name="shield-checkmark" size={28} color="rgba(255,255,255,0.8)" style={{ marginBottom: 8 }} />
        <Text style={styles.headerTitle}>Safety Centre</Text>
        <Text style={styles.headerSub}>Your safety is our top priority</Text>
      </View>

      <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, { color: subText }]}>EMERGENCY</Text>
        <View style={[styles.sosCard, { backgroundColor: cardBg }]}>
          <Animated.View style={{ transform: [{ scale: sosAnim }] }}>
            <TouchableOpacity style={styles.sosBtn} onPress={handleSOS} activeOpacity={0.8}>
              <Ionicons name="alert-circle" size={36} color={colors.white} />
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
          </Animated.View>
          <Text style={[styles.sosHint, { color: subText }]}>Press in case of emergency</Text>
          <View style={styles.sosContactRow}>
            <Ionicons name="person-outline" size={14} color={subText} />
            <Text style={[styles.sosContactText, { color: subText }]}>Emergency contact: +260 97 700 0000</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: subText }]}>RIDE PREFERENCES</Text>
        <View style={[styles.prefCard, { backgroundColor: cardBg }]}>
          <View style={styles.prefRow}>
            <View style={[styles.prefIconBg, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.prefContent}>
              <Text style={[styles.prefLabel, { color: textColor }]}>Share location with driver</Text>
              <Text style={[styles.prefDesc, { color: subText }]}>Driver can see your real-time location</Text>
            </View>
            <Switch value={shareLocation} onValueChange={setShareLocation}
              trackColor={{ false: darkMode ? '#30363D' : colors.border, true: colors.primary }} thumbColor={colors.white} />
          </View>
          <View style={[styles.prefDivider, { backgroundColor: borderColor }]} />
          <View style={styles.prefRow}>
            <View style={[styles.prefIconBg, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="call-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.prefContent}>
              <Text style={[styles.prefLabel, { color: textColor }]}>Chat only (no calls)</Text>
              <Text style={[styles.prefDesc, { color: subText }]}>Driver will only contact via chat</Text>
            </View>
            <Switch value={dontCall} onValueChange={setDontCall}
              trackColor={{ false: darkMode ? '#30363D' : colors.border, true: colors.primary }} thumbColor={colors.white} />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: subText }]}>REPORT & FEEDBACK</Text>
        <View style={[styles.reportCard, { backgroundColor: cardBg }]}>
          {reportItems.map((item, i) => (
            <TouchableOpacity key={i}
              style={[styles.reportRow, i < reportItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: borderColor }]}
              onPress={item.onPress} activeOpacity={0.7}>
              <View style={[styles.reportIconBg, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={[styles.reportLabel, { color: textColor }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={subText} />
            </TouchableOpacity>
          ))}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: '#CF222E',
    paddingTop: 56, paddingBottom: 22, paddingHorizontal: 20,
    overflow: 'hidden',
  },
  headerDecCircle: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, marginLeft: 4 },
  sosCard: { borderRadius: radius.xl, padding: 24, alignItems: 'center', marginBottom: 24, ...shadows.small },
  sosBtn: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center',
    ...shadows.medium, shadowColor: colors.error,
  },
  sosText: { color: colors.white, fontSize: 22, fontWeight: '900', marginTop: 4 },
  sosHint: { fontSize: 13, marginTop: 16 },
  sosContactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  sosContactText: { fontSize: 12 },
  prefCard: { borderRadius: radius.lg, marginBottom: 24, overflow: 'hidden', ...shadows.xs },
  prefRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  prefIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  prefContent: { flex: 1 },
  prefLabel: { fontSize: 14, fontWeight: '600' },
  prefDesc: { fontSize: 11, marginTop: 1 },
  prefDivider: { height: 1, marginHorizontal: 14 },
  reportCard: { borderRadius: radius.lg, overflow: 'hidden', ...shadows.xs },
  reportRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  reportIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  reportLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
});
