import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, StatusBar, TextInput, Modal, Switch, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../firebase';
import { colors, radius, shadows } from '../../theme';
import { useAppContext } from '../../context/AppContext';
import { watchDiscounts, addDiscount, updateDiscount, deleteDiscount } from '../../services/restaurantService';

export default function DiscountsScreen() {
  const { darkMode } = useAppContext();
  const [discounts, setDiscounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [code, setCode]           = useState('');
  const [percent, setPercent]     = useState('');
  const [description, setDesc]    = useState('');
  const [minOrder, setMinOrder]   = useState('0');
  const [saving, setSaving]       = useState(false);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    return watchDiscounts(uid, setDiscounts, () => {});
  }, [uid]);

  const handleSave = async () => {
    if (!code.trim()) { Alert.alert('Discount code required'); return; }
    const pct = Number(percent);
    if (!pct || pct <= 0 || pct >= 100) { Alert.alert('Enter a valid discount percent (1–99)'); return; }
    setSaving(true);
    try {
      await addDiscount(uid, {
        code: code.trim().toUpperCase(),
        percent: pct,
        description: description.trim(),
        minOrderAmount: Number(minOrder) || 0,
      });
      setCode(''); setPercent(''); setDesc(''); setMinOrder('0');
      setShowModal(false);
    } catch (err) {
      Alert.alert('Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (d) => {
    try { await updateDiscount(uid, d.id, { active: !d.active }); }
    catch (err) { Alert.alert('Error', err.message); }
  };

  const handleDelete = (d) => {
    Alert.alert('Delete Discount', `Remove code "${d.code}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await deleteDiscount(uid, d.id); }
          catch (err) { Alert.alert('Error', err.message); }
        },
      },
    ]);
  };

  const bg        = darkMode ? '#0D1117' : colors.offWhite;
  const cardBg    = darkMode ? '#161B22' : colors.white;
  const textColor = darkMode ? colors.textOnDark : colors.textPrimary;
  const subText   = darkMode ? '#8B949E' : colors.textSecondary;
  const borderColor = darkMode ? '#30363D' : colors.border;
  const inputBg   = darkMode ? '#21262D' : colors.offWhite;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.charcoal} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Promotions</Text>
          <Text style={styles.headerTitle}>{discounts.length} code{discounts.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={styles.addBtnText}>New Code</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={discounts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.discountCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.cardTop}>
              <View style={[styles.codePill, { backgroundColor: item.active ? colors.primaryGhost : colors.borderLight }]}>
                <Ionicons name="ticket-outline" size={14} color={item.active ? colors.primary : colors.textTertiary} />
                <Text style={[styles.codeText, { color: item.active ? colors.primary : colors.textTertiary }]}>{item.code}</Text>
              </View>
              <View style={[styles.percentBadge, { backgroundColor: item.active ? colors.successLight : colors.borderLight }]}>
                <Text style={[styles.percentText, { color: item.active ? colors.success : colors.textTertiary }]}>
                  {item.percent}% off
                </Text>
              </View>
            </View>
            {item.description ? <Text style={[styles.discountDesc, { color: subText }]}>{item.description}</Text> : null}
            {item.minOrderAmount > 0 ? (
              <Text style={[styles.minOrder, { color: subText }]}>Min order: ZK {item.minOrderAmount}</Text>
            ) : null}
            <Text style={[styles.usageText, { color: subText }]}>Used {item.usageCount ?? 0} time{item.usageCount !== 1 ? 's' : ''}</Text>
            <View style={styles.cardActions}>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: subText }]}>{item.active ? 'Active' : 'Paused'}</Text>
                <Switch
                  value={item.active}
                  onValueChange={() => handleToggle(item)}
                  trackColor={{ true: colors.primary }}
                  thumbColor={colors.white}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={15} color={colors.error} />
                <Text style={styles.deleteBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="ticket-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: textColor }]}>No discount codes</Text>
            <Text style={[styles.emptySub, { color: subText }]}>Create codes to offer customers discounts on their orders. They can enter the code at checkout.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowModal(true)}>
              <Text style={styles.emptyBtnText}>Create First Code</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>New Discount Code</Text>

              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.fieldLabel}>DISCOUNT CODE *</Text>
                <TextInput
                  style={[styles.sheetInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\s/g, '').toUpperCase())}
                  placeholder="e.g. SAVE20"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="characters"
                />

                <Text style={styles.fieldLabel}>DISCOUNT PERCENT *</Text>
                <TextInput
                  style={[styles.sheetInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
                  value={percent}
                  onChangeText={setPercent}
                  placeholder="20"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                />

                <Text style={styles.fieldLabel}>DESCRIPTION</Text>
                <TextInput
                  style={[styles.sheetInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
                  value={description}
                  onChangeText={setDesc}
                  placeholder="e.g. Weekend special offer"
                  placeholderTextColor={colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>MINIMUM ORDER AMOUNT (ZK)</Text>
                <TextInput
                  style={[styles.sheetInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
                  value={minOrder}
                  onChangeText={setMinOrder}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                />

                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color={colors.white} /> : null}
                  <Text style={styles.saveBtnText}>{saving ? 'Creating…' : 'Create Code'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.charcoal, paddingTop: 54, paddingHorizontal: 20, paddingBottom: 20 },
  headerSub:   { fontSize: 12, color: '#8B949E', fontWeight: '700', marginBottom: 2 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: colors.white },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, ...shadows.greenSoft },
  addBtnText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  list: { padding: 16, paddingBottom: 40 },
  discountCard: { borderRadius: radius.xl, padding: 16, marginBottom: 12, borderWidth: 1, ...shadows.xs },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  codePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  codeText: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  percentBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  percentText: { fontSize: 13, fontWeight: '800' },
  discountDesc: { fontSize: 13, marginBottom: 4 },
  minOrder: { fontSize: 12, marginBottom: 4 },
  usageText: { fontSize: 11, marginBottom: 10 },
  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel: { fontSize: 13, fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deleteBtnText: { fontSize: 13, color: colors.error, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 50, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 16 },
  emptySub: { fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 19 },
  emptyBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20, ...shadows.green },
  emptyBtnText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 18 },
  fieldLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: colors.textTertiary, marginBottom: 7 },
  sheetInput: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontWeight: '500', marginBottom: 14 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 15, marginTop: 6, ...shadows.green },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '700' },
});
