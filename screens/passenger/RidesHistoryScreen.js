import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Animated, StatusBar,
  TouchableOpacity, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../firebase';
import { colors, shadows, radius } from '../../theme';
import { useAppContext } from '../../context/AppContext';
import { watchPassengerCompletedRequests } from '../../services/requestService';

const SERVICE_CONFIG = {
  ride:     { icon: 'car-sport-outline',  label: 'Ride',     color: colors.primary  },
  food:     { icon: 'fast-food-outline',  label: 'Food',     color: '#FF6B6B'       },
  delivery: { icon: 'bicycle-outline',    label: 'Delivery', color: '#0EA5E9'       },
  cargo:    { icon: 'cube-outline',       label: 'Cargo',    color: '#F59E0B'       },
};

function formatDate(timestamp) {
  const date = timestamp?.toDate?.();
  if (!date) return 'Recent';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function RidesHistoryScreen() {
  const { darkMode } = useAppContext();
  const [requests, setRequests]       = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const bg         = darkMode ? '#0D1117'  : colors.offWhite;
  const cardBg     = darkMode ? '#161B22'  : colors.white;
  const textColor  = darkMode ? colors.textOnDark  : colors.textPrimary;
  const subText    = darkMode ? '#8B949E'  : colors.textSecondary;
  const borderColor= darkMode ? '#30363D'  : colors.borderLight;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }).start();
    const user = auth.currentUser;
    if (!user) return;
    return watchPassengerCompletedRequests(user.uid, setRequests, (e) => Alert.alert('History', e.message));
  }, []);

  const totalSpent = requests.reduce((s, r) => s + Number(r.fare || 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerDecCircle} />
        <Text style={styles.headerTitle}>Activity</Text>
        <Text style={styles.headerSub}>{requests.length} completed services</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Ionicons name="checkmark-circle" size={18} color={colors.white} style={{ marginBottom: 4 }} />
            <Text style={styles.summaryVal}>{requests.length}</Text>
            <Text style={styles.summaryLbl}>Total trips</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="wallet" size={18} color={colors.white} style={{ marginBottom: 4 }} />
            <Text style={styles.summaryVal}>ZK {totalSpent}</Text>
            <Text style={styles.summaryLbl}>Total spent</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="star" size={18} color={colors.accent} style={{ marginBottom: 4 }} />
            <Text style={styles.summaryVal}>5.0</Text>
            <Text style={styles.summaryLbl}>Avg rating</Text>
          </View>
        </View>
      </View>

      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const cfg = SERVICE_CONFIG[item.serviceType] || SERVICE_CONFIG.ride;
            return (
              <TouchableOpacity
                style={[styles.rideCard, { backgroundColor: cardBg }]}
                onPress={() => setSelectedRide(item)}
                activeOpacity={0.78}
              >
                <View style={styles.cardTop}>
                  {/* Service icon */}
                  <View style={[styles.serviceIconBg, { backgroundColor: cfg.color + '18' }]}>
                    <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                  </View>

                  {/* Route */}
                  <View style={styles.routeCol}>
                    <View style={styles.typeBadge}>
                      <Text style={[styles.typeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <View style={styles.routeItem}>
                      <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.routeFrom, { color: subText }]} numberOfLines={1}>{item.pickupName}</Text>
                    </View>
                    <View style={styles.routeConnector} />
                    <View style={styles.routeItem}>
                      <View style={[styles.routeDot, { backgroundColor: colors.error, borderRadius: 2 }]} />
                      <Text style={[styles.routeTo, { color: textColor }]} numberOfLines={1}>{item.destinationName}</Text>
                    </View>
                  </View>

                  {/* Fare */}
                  <View style={styles.fareCol}>
                    <Text style={[styles.fareText, { color: textColor }]}>ZK {item.fare}</Text>
                    <View style={styles.doneBadge}>
                      <Text style={styles.doneText}>Done</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.cardMeta, { borderTopColor: borderColor }]}>
                  {[
                    { icon: 'person-outline',   val: item.driverName || 'Driver' },
                    { icon: 'calendar-outline', val: formatDate(item.completedAt) },
                    { icon: 'navigate-outline', val: item.distanceText || 'Nearby' },
                  ].map((m) => (
                    <View key={m.icon} style={styles.metaItem}>
                      <Ionicons name={m.icon} size={11} color={subText} />
                      <Text style={[styles.metaText, { color: subText }]} numberOfLines={1}>{m.val}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="receipt-outline" size={36} color={colors.textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: textColor }]}>No activity yet</Text>
              <Text style={[styles.emptySub, { color: subText }]}>
                Your completed rides, food orders and deliveries will appear here.
              </Text>
            </View>
          }
        />
      </Animated.View>

      {/* Detail modal */}
      <Modal visible={!!selectedRide} transparent animationType="slide" onRequestClose={() => setSelectedRide(null)}>
        {selectedRide && (() => {
          const cfg = SERVICE_CONFIG[selectedRide.serviceType] || SERVICE_CONFIG.ride;
          return (
            <View style={styles.modalOverlay}>
              <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
                <View style={styles.modalHandle} />

                <View style={styles.modalTitleRow}>
                  <View style={[styles.modalServiceIcon, { backgroundColor: cfg.color + '18' }]}>
                    <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                  </View>
                  <Text style={[styles.modalTitle, { color: textColor }]}>{cfg.label} Details</Text>
                </View>

                {/* Route */}
                <View style={styles.modalRoute}>
                  <View style={styles.routeIconCol}>
                    <View style={[styles.routeDot, { backgroundColor: colors.primary, width: 10, height: 10 }]} />
                    <View style={styles.routeConnLine} />
                    <View style={[styles.routeDot, { backgroundColor: colors.error, borderRadius: 2, width: 10, height: 10 }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalPickup, { color: subText }]}>{selectedRide.pickupName}</Text>
                    <Text style={[styles.modalDest,   { color: textColor }]}>{selectedRide.destinationName}</Text>
                  </View>
                </View>

                {/* Stats grid */}
                <View style={styles.detailGrid}>
                  {[
                    { label: 'Fare',      value: `ZK ${selectedRide.fare}`,          icon: 'cash-outline',     color: colors.primary },
                    { label: 'Driver',    value: selectedRide.driverName || 'Driver', icon: 'person-outline',   color: colors.info },
                    { label: 'Distance',  value: selectedRide.distanceText || '--',    icon: 'navigate-outline', color: '#F59E0B' },
                    { label: 'Duration',  value: `${selectedRide.durationMinutes || '--'} min`, icon: 'time-outline', color: '#8B5CF6' },
                    { label: 'Date',      value: formatDate(selectedRide.completedAt), icon: 'calendar-outline', color: '#EC4899' },
                    { label: 'Payment',   value: selectedRide.paymentMethod || 'Mobile', icon: 'card-outline',  color: '#10B981' },
                  ].map((d) => (
                    <View key={d.label} style={[styles.detailItem, { backgroundColor: darkMode ? '#21262D' : colors.offWhite }]}>
                      <View style={[styles.detailIconBg, { backgroundColor: d.color + '18' }]}>
                        <Ionicons name={d.icon} size={14} color={d.color} />
                      </View>
                      <Text style={[styles.detailLabel, { color: subText }]}>{d.label}</Text>
                      <Text style={[styles.detailValue, { color: textColor }]} numberOfLines={1}>{d.value}</Text>
                    </View>
                  ))}
                </View>

                {selectedRide.serviceType === 'food' && selectedRide.items?.length ? (
                  <View style={[styles.foodBox, { backgroundColor: darkMode ? '#21262D' : colors.offWhite }]}>
                    <Text style={[styles.foodBoxTitle, { color: subText }]}>ORDER ITEMS</Text>
                    {selectedRide.items.map((it) => (
                      <Text key={it.id} style={[styles.foodItem, { color: textColor }]}>{it.qty} × {it.name}</Text>
                    ))}
                  </View>
                ) : null}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, { borderColor }]}
                    onPress={() => { setSelectedRide(null); Alert.alert('Reported', 'Your issue has been recorded.'); }}
                  >
                    <Ionicons name="warning-outline" size={15} color={colors.warning} />
                    <Text style={[styles.modalActionText, { color: colors.warning }]}>Report</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setSelectedRide(null)}
                  >
                    <Text style={[styles.modalActionText, { color: colors.white }]}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })()}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },

  header: {
    backgroundColor: colors.primary,
    paddingTop: 54, paddingBottom: 22, paddingHorizontal: 20,
    overflow: 'hidden',
  },
  headerDecCircle: {
    position: 'absolute', top: -40, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle:   { fontSize: 26, fontWeight: '900', color: colors.white, marginBottom: 2 },
  headerSub:     { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 18 },

  summaryRow:    { flexDirection: 'row', gap: 10 },
  summaryCard:   {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.lg, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  summaryVal:    { fontSize: 15, fontWeight: '800', color: colors.white },
  summaryLbl:    { fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  listContent:   { padding: 16, paddingBottom: 32 },
  rideCard:      { borderRadius: radius.xl, marginBottom: 12, overflow: 'hidden', ...shadows.small },
  cardTop:       { flexDirection: 'row', padding: 16, gap: 12, alignItems: 'flex-start' },
  serviceIconBg: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  routeCol:      { flex: 1 },
  typeBadge:     { marginBottom: 8 },
  typeText:      { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  routeItem:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDot:      { width: 8, height: 8, borderRadius: 4 },
  routeConnector:{ width: 1, height: 10, backgroundColor: colors.border, marginLeft: 3.5, marginVertical: 2 },
  routeFrom:     { flex: 1, fontSize: 12 },
  routeTo:       { flex: 1, fontSize: 13, fontWeight: '700' },
  fareCol:       { alignItems: 'flex-end' },
  fareText:      { fontSize: 16, fontWeight: '800' },
  doneBadge:     { backgroundColor: colors.successLight, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 },
  doneText:      { fontSize: 9, fontWeight: '800', color: colors.success },
  cardMeta:      { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, paddingTop: 10, borderTopWidth: 1, gap: 14 },
  metaItem:      { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  metaText:      { fontSize: 11, fontWeight: '500', flex: 1 },

  empty:         { alignItems: 'center', paddingTop: 70, paddingHorizontal: 32 },
  emptyIconBg:   { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.offWhite, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:    { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptySub:      { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet:    { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHandle:   { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  modalServiceIcon:{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalTitle:    { fontSize: 20, fontWeight: '800' },

  modalRoute:    { flexDirection: 'row', gap: 12, marginBottom: 18, alignItems: 'center' },
  routeIconCol:  { width: 14, alignItems: 'center', gap: 0 },
  routeConnLine: { width: 1.5, height: 24, backgroundColor: colors.border },
  modalPickup:   { fontSize: 13, marginBottom: 14 },
  modalDest:     { fontSize: 15, fontWeight: '800' },

  detailGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  detailItem:    { width: '31%', borderRadius: radius.md, padding: 10, alignItems: 'center', gap: 5 },
  detailIconBg:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  detailLabel:   { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue:   { fontSize: 12, fontWeight: '800', textAlign: 'center' },

  foodBox:       { borderRadius: radius.md, padding: 12, marginBottom: 16 },
  foodBoxTitle:  { fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  foodItem:      { fontSize: 13, fontWeight: '700', marginBottom: 4 },

  modalActions:  { flexDirection: 'row', gap: 10 },
  modalActionBtn:{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: radius.lg, paddingVertical: 13 },
  modalActionText:{ fontSize: 14, fontWeight: '800' },
});
