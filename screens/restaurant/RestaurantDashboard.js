import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, StatusBar, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../firebase';
import { colors, radius, shadows } from '../../theme';
import { useAppContext } from '../../context/AppContext';
import { watchRestaurantProfile, watchRestaurantOrders } from '../../services/restaurantService';
import { updateRequestStatus } from '../../services/requestService';

const STAGE_FLOW = ['pending_restaurant', 'restaurant_confirmed', 'preparing', 'ready_for_pickup'];

const FOOD_STATUS_INFO = {
  pending_restaurant:   { label: 'New Order',       color: '#E65100', bg: '#FFF3E0', icon: 'notifications' },
  restaurant_confirmed: { label: 'Confirmed',       color: colors.info, bg: colors.infoLight, icon: 'checkmark-circle' },
  preparing:            { label: 'Preparing',       color: colors.warning, bg: colors.warningLight, icon: 'flame' },
  ready_for_pickup:     { label: 'Ready',           color: colors.success, bg: colors.successLight, icon: 'bag-check' },
  accepted:             { label: 'Driver Assigned', color: colors.primary, bg: colors.primaryGhost, icon: 'bicycle' },
  at_restaurant:        { label: 'Driver Here',     color: colors.primary, bg: colors.primaryGhost, icon: 'location' },
  in_progress:          { label: 'In Transit',      color: colors.primary, bg: colors.primaryGhost, icon: 'navigate' },
  completed:            { label: 'Delivered',       color: colors.success, bg: colors.successLight, icon: 'checkmark-done-circle' },
  cancelled:            { label: 'Cancelled',       color: colors.error, bg: colors.errorLight, icon: 'close-circle' },
};

function StatusBadge({ status }) {
  const info = FOOD_STATUS_INFO[status] || { label: status, color: colors.textTertiary, bg: colors.offWhite, icon: 'ellipse' };
  return (
    <View style={[styles.statusBadge, { backgroundColor: info.bg }]}>
      <Ionicons name={info.icon} size={12} color={info.color} />
      <Text style={[styles.statusBadgeText, { color: info.color }]}>{info.label}</Text>
    </View>
  );
}

function timeAgo(ms) {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function OrderCard({ order, onAction, actionLoading }) {
  const status = order.status;
  const isNew  = status === 'pending_restaurant';
  const isActive = ['restaurant_confirmed', 'preparing'].includes(status);
  const isReadyOrBeyond = ['ready_for_pickup', 'accepted', 'at_restaurant', 'in_progress'].includes(status);
  const isDone = ['completed', 'cancelled'].includes(status);

  const actionBtnLabel = isNew ? null
    : isActive && status === 'restaurant_confirmed' ? 'Start Preparing'
    : isActive && status === 'preparing'            ? 'Mark Ready for Pickup'
    : null;

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderCustomer}>{order.passengerName || 'Customer'}</Text>
          <Text style={styles.orderTime}>{timeAgo(order.createdAtMs)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={styles.orderFare}>ZK {order.fare}</Text>
          <StatusBadge status={status} />
        </View>
      </View>

      {/* Items */}
      <View style={styles.orderItems}>
        {(order.items || []).map((item, i) => (
          <Text key={i} style={styles.orderItemText}>
            {item.qty}× {item.name}
            {item.price ? <Text style={styles.orderItemPrice}>  ZK {item.price * item.qty}</Text> : null}
          </Text>
        ))}
      </View>

      {/* Delivery address */}
      <View style={styles.orderRoute}>
        <Ionicons name="location-outline" size={13} color={colors.error} />
        <Text style={styles.orderRouteText} numberOfLines={1}>{order.destinationName}</Text>
      </View>

      {/* Notes */}
      {order.notes ? (
        <View style={styles.notesRow}>
          <Ionicons name="document-text-outline" size={12} color={colors.textTertiary} />
          <Text style={styles.notesText} numberOfLines={2}>{order.notes}</Text>
        </View>
      ) : null}

      {/* Driver info (once assigned) */}
      {order.driverName && isReadyOrBeyond ? (
        <View style={styles.driverRow}>
          <Ionicons name="bicycle-outline" size={13} color={colors.primary} />
          <Text style={styles.driverName}>{order.driverName}</Text>
          {order.vehicleModel ? <Text style={styles.driverVehicle}>· {order.vehicleModel}</Text> : null}
        </View>
      ) : null}

      {/* Actions */}
      {isNew && (
        <View style={styles.orderActions}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => onAction(order.id, 'cancelled', { cancelledBy: 'restaurant' })}
            disabled={actionLoading === order.id}
          >
            <Text style={styles.rejectBtnText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptOrderBtn}
            onPress={() => onAction(order.id, 'restaurant_confirmed')}
            disabled={actionLoading === order.id}
          >
            {actionLoading === order.id
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Ionicons name="checkmark" size={16} color={colors.white} />}
            <Text style={styles.acceptOrderBtnText}>Accept Order</Text>
          </TouchableOpacity>
        </View>
      )}

      {actionBtnLabel ? (
        <TouchableOpacity
          style={[styles.advanceBtn, actionLoading === order.id && { opacity: 0.6 }]}
          onPress={() => {
            const next = status === 'restaurant_confirmed' ? 'preparing' : 'ready_for_pickup';
            onAction(order.id, next);
          }}
          disabled={actionLoading === order.id}
        >
          {actionLoading === order.id
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Ionicons name="arrow-forward-circle" size={16} color={colors.white} />}
          <Text style={styles.advanceBtnText}>{actionBtnLabel}</Text>
        </TouchableOpacity>
      ) : null}

      {status === 'ready_for_pickup' && (
        <View style={styles.waitingDriverRow}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.waitingDriverText}>Looking for a courier to pick up…</Text>
        </View>
      )}
    </View>
  );
}

const TABS = ['New', 'Active', 'Done'];

export default function RestaurantDashboard({ navigation }) {
  const { darkMode } = useAppContext();
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders]         = useState([]);
  const [tab, setTab]               = useState('New');
  const [actionLoading, setActionLoading] = useState('');

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const off1 = watchRestaurantProfile(uid, setRestaurant, (error) => Alert.alert('Restaurant Profile', error.message));
    const off2 = watchRestaurantOrders(uid, setOrders, (error) => Alert.alert('Orders', error.message));
    return () => { off1(); off2(); };
  }, [uid]);

  const newOrders    = useMemo(() => orders.filter((o) => o.status === 'pending_restaurant'), [orders]);
  const activeOrders = useMemo(() => orders.filter((o) => ['restaurant_confirmed', 'preparing', 'ready_for_pickup', 'accepted', 'at_restaurant', 'in_progress'].includes(o.status)), [orders]);
  const doneOrders   = useMemo(() => orders.filter((o) => ['completed', 'cancelled'].includes(o.status)), [orders]);

  const todayOrders = useMemo(() => {
    const today = new Date().toDateString();
    return orders.filter((o) => {
      const d = o.completedAt?.toDate?.();
      return d ? d.toDateString() === today : false;
    });
  }, [orders]);
  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.fare || 0), 0);

  const visibleOrders = tab === 'New' ? newOrders : tab === 'Active' ? activeOrders : doneOrders;

  const handleAction = async (orderId, newStatus, extra = {}) => {
    setActionLoading(orderId);
    try {
      await updateRequestStatus(orderId, newStatus, extra);
    } catch (err) {
      Alert.alert('Update failed', err.message);
    } finally {
      setActionLoading('');
    }
  };

  const bg        = darkMode ? '#0D1117' : colors.offWhite;
  const cardBg    = darkMode ? '#161B22' : colors.white;
  const textColor = darkMode ? colors.textOnDark : colors.textPrimary;
  const subText   = darkMode ? '#8B949E' : colors.textSecondary;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.charcoal} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Restaurant Dashboard</Text>
            <Text style={styles.restaurantName} numberOfLines={1}>{restaurant?.name || 'Loading…'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.openBadge, { backgroundColor: restaurant?.isOpen ? '#1A7F37' : colors.error }]}
            onPress={async () => {
              if (!uid || !restaurant) return;
              const { updateRestaurantProfile } = require('../../services/restaurantService');
              await updateRestaurantProfile(uid, { isOpen: !restaurant.isOpen });
            }}
          >
            <View style={styles.openDot} />
            <Text style={styles.openText}>{restaurant?.isOpen ? 'Open' : 'Closed'}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatPill icon="bag-handle" val={newOrders.length} label="New" color="#FF6B35" />
          <StatPill icon="flame"      val={activeOrders.length} label="Active" color={colors.accent} />
          <StatPill icon="cash"       val={`ZK ${todayRevenue}`} label="Today" color={colors.success} />
          <StatPill icon="checkmark-done" val={todayOrders.length} label="Completed" color={colors.info} />
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: cardBg }]}>
        {TABS.map((t) => {
          const count = t === 'New' ? newOrders.length : t === 'Active' ? activeOrders.length : doneOrders.length;
          return (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnOn]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{t}</Text>
              {count > 0 && <View style={[styles.tabBadge, tab === t && styles.tabBadgeOn]}>
                <Text style={[styles.tabBadgeText, tab === t && { color: colors.white }]}>{count}</Text>
              </View>}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={visibleOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onAction={handleAction}
            actionLoading={actionLoading}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name={tab === 'New' ? 'notifications-outline' : tab === 'Active' ? 'flame-outline' : 'checkmark-done-outline'} size={44} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: textColor }]}>
              {tab === 'New' ? 'No new orders' : tab === 'Active' ? 'Nothing in progress' : 'No completed orders yet'}
            </Text>
            <Text style={[styles.emptySub, { color: subText }]}>
              {tab === 'New' ? 'New orders from customers will appear here.' : tab === 'Active' ? 'Accepted orders will show here.' : 'Completed and cancelled orders appear here.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function StatPill({ icon, val, label, color }) {
  return (
    <View style={styles.statPill}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.statVal, { color }]}>{val}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: colors.charcoal, paddingTop: 54, paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { fontSize: 12, color: '#8B949E', fontWeight: '700', marginBottom: 2 },
  restaurantName: { fontSize: 20, fontWeight: '900', color: colors.white },
  openBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  openDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.8)' },
  openText: { fontSize: 12, fontWeight: '800', color: colors.white },
  statsRow: { flexDirection: 'row', backgroundColor: '#2D333B', borderRadius: radius.xl, padding: 12, gap: 4 },
  statPill: { flex: 1, alignItems: 'center', gap: 2 },
  statVal:  { fontSize: 15, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#8B949E', textTransform: 'uppercase', letterSpacing: 0.5 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, gap: 6 },
  tabBtnOn: { borderBottomWidth: 2.5, borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  tabTextOn: { color: colors.primary, fontWeight: '900' },
  tabBadge: { backgroundColor: colors.borderLight, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  tabBadgeOn: { backgroundColor: colors.primary },
  tabBadgeText: { fontSize: 10, fontWeight: '900', color: colors.textSecondary },
  list: { padding: 16, paddingBottom: 40 },
  orderCard: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 16, marginBottom: 12, ...shadows.small },
  orderCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  orderCustomer: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  orderTime: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
  orderFare: { fontSize: 16, fontWeight: '900', color: colors.primary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  orderItems: { backgroundColor: colors.offWhite, borderRadius: radius.md, padding: 10, marginBottom: 10 },
  orderItemText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
  orderItemPrice: { color: colors.primary, fontWeight: '800' },
  orderRoute: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  orderRouteText: { flex: 1, fontSize: 12, color: colors.textSecondary },
  notesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: colors.warningLight, borderRadius: radius.sm, padding: 8, marginBottom: 8 },
  notesText: { flex: 1, fontSize: 12, color: colors.warning, lineHeight: 17 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryGhost, borderRadius: radius.sm, padding: 8, marginBottom: 8 },
  driverName: { fontSize: 13, fontWeight: '700', color: colors.primary },
  driverVehicle: { fontSize: 12, color: colors.textSecondary },
  orderActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  rejectBtn: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.error },
  rejectBtnText: { fontSize: 14, fontWeight: '800', color: colors.error },
  acceptOrderBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 11, ...shadows.green },
  acceptOrderBtnText: { fontSize: 14, fontWeight: '800', color: colors.white },
  advanceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, marginTop: 10, ...shadows.green },
  advanceBtnText: { fontSize: 14, fontWeight: '800', color: colors.white },
  waitingDriverRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryGhost, borderRadius: radius.md, padding: 10, marginTop: 10 },
  waitingDriverText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  empty: { alignItems: 'center', paddingTop: 50 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 14 },
  emptySub: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 24, lineHeight: 19 },
});
