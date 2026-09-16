import React, { useRef, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Animated, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../firebase';
import { colors, shadows, radius } from '../../theme';
import { watchDriverCompletedRequests } from '../../services/requestService';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(timestamp) {
  const date = timestamp?.toDate?.();
  if (!date) return 'Recent';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function serviceIcon(type) {
  return {
    ride: 'car-sport-outline',
    food: 'fast-food-outline',
    delivery: 'bicycle-outline',
    cargo: 'cube-outline',
  }[type] || 'navigate-outline';
}

export default function EarningsScreen() {
  const [completedRequests, setCompletedRequests] = useState([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return undefined;
    return watchDriverCompletedRequests(user.uid, setCompletedRequests, () => {});
  }, []);

  const daily = useMemo(() => {
    const today = new Date();
    const buckets = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return {
        key: date.toDateString(),
        day: DAYS[date.getDay()],
        date,
        amount: 0,
        trips: 0,
      };
    });

    completedRequests.forEach((request) => {
      const completed = request.completedAt?.toDate?.();
      if (!completed) return;
      const bucket = buckets.find((item) => item.key === completed.toDateString());
      if (!bucket) return;
      bucket.amount += Number(request.fare || 0);
      bucket.trips += 1;
    });

    return buckets;
  }, [completedRequests]);

  const weekTotal = daily.reduce((sum, item) => sum + item.amount, 0);
  const weekTrips = daily.reduce((sum, item) => sum + item.trips, 0);
  const maxAmount = Math.max(1, ...daily.map((item) => item.amount));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.charcoal} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
        <Text style={styles.weekLabel}>Last 7 Days</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>ZK {weekTotal}</Text>
            <Text style={styles.summaryLabel}>Total earned</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{weekTrips}</Text>
            <Text style={styles.summaryLabel}>Jobs done</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>ZK {weekTrips ? Math.round(weekTotal / weekTrips) : 0}</Text>
            <Text style={styles.summaryLabel}>Avg job</Text>
          </View>
        </View>
      </View>

      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Daily Breakdown</Text>
          <View style={styles.chart}>
            {daily.map((item) => (
              <View key={item.key} style={styles.barGroup}>
                <Text style={styles.barAmount}>ZK{item.amount}</Text>
                <View style={styles.barTrack}>
                  <Animated.View
                    style={[styles.bar, { height: `${Math.max(4, (item.amount / maxAmount) * 100)}%` }]}
                  />
                </View>
                <Text style={styles.barDay}>{item.day}</Text>
              </View>
            ))}
          </View>
        </View>

        <FlatList
          data={completedRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.earningItem}>
              <View style={styles.dayIcon}>
                <Ionicons name={serviceIcon(item.serviceType)} size={16} color={colors.primary} />
              </View>
              <View style={styles.dayInfo}>
                <Text style={styles.dayName}>{item.passengerName || 'Passenger'}</Text>
                <Text style={styles.dayDate}>{formatDate(item.completedAt)} - {item.destinationName}</Text>
              </View>
              <View style={styles.dayRight}>
                <Text style={styles.dayAmount}>ZK {item.fare}</Text>
                <Text style={styles.dayTrips}>{item.serviceType}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="wallet-outline" size={46} color={colors.border} />
              <Text style={styles.emptyTitle}>No completed jobs yet</Text>
              <Text style={styles.emptySub}>Completed driver requests will show here.</Text>
            </View>
          }
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  header: { backgroundColor: colors.charcoal, paddingTop: 52, paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.white, marginBottom: 2 },
  weekLabel: { fontSize: 12, color: '#8B949E', marginBottom: 16, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', backgroundColor: '#2D333B', borderRadius: radius.lg, padding: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '800', color: colors.white },
  summaryLabel: { fontSize: 10, color: '#8B949E', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' },
  summaryDivider: { width: 1, backgroundColor: '#444C56', marginVertical: 4 },
  chartSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  chartTitle: { fontSize: 14, fontWeight: '800', color: colors.textSecondary, marginBottom: 12 },
  chart: { flexDirection: 'row', height: 112, alignItems: 'flex-end', gap: 8 },
  barGroup: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barAmount: { fontSize: 9, color: colors.textTertiary, marginBottom: 4 },
  barTrack: { width: '80%', flex: 1, justifyContent: 'flex-end', backgroundColor: colors.borderLight, borderRadius: 4, overflow: 'hidden' },
  bar: { width: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  barDay: { fontSize: 10, color: colors.textSecondary, fontWeight: '800', marginTop: 4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  earningItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: 14, marginBottom: 10, ...shadows.xs,
  },
  dayIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  dayInfo: { flex: 1 },
  dayName: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  dayDate: { fontSize: 12, color: colors.textTertiary, marginTop: 1 },
  dayRight: { alignItems: 'flex-end' },
  dayAmount: { fontSize: 15, fontWeight: '900', color: colors.primary },
  dayTrips: { fontSize: 11, color: colors.textTertiary, marginTop: 2, textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingTop: 46 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginTop: 14 },
  emptySub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
});
