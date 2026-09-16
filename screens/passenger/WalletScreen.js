import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Animated, StatusBar, Alert, TextInput, Modal, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows, radius } from '../../theme';
import { useAppContext } from '../../context/AppContext';

const INITIAL_TXS = [
  { id: '1', type: 'Top-up',              amount:  200, date: '3 May 2026',   icon: 'arrow-down-circle', positive: true  },
  { id: '2', type: 'Ride to East Park',   amount:  -56, date: '2 May 2026',   icon: 'car-sport',         positive: false },
  { id: '3', type: 'Top-up',              amount:  100, date: '29 Apr 2026',  icon: 'arrow-down-circle', positive: true  },
  { id: '4', type: 'Ride to Manda Hill',  amount:  -35, date: '27 Apr 2026',  icon: 'car-sport',         positive: false },
  { id: '5', type: 'Delivery — Cairo Rd', amount:  -25, date: '25 Apr 2026',  icon: 'bicycle',           positive: false },
];
const INIT_BALANCE   = 184;
const TOP_UP_AMOUNTS = ['50', '100', '200', '500'];

export default function WalletScreen() {
  const { darkMode } = useAppContext();
  const [balance,      setBalance]      = useState(INIT_BALANCE);
  const [transactions, setTransactions] = useState(INITIAL_TXS);
  const [showTopUp,    setShowTopUp]    = useState(false);
  const [topUpAmount,  setTopUpAmount]  = useState('100');
  const [showSend,     setShowSend]     = useState(false);
  const [sendPhone,    setSendPhone]    = useState('');
  const [sendAmount,   setSendAmount]   = useState('');
  const [showAddCard,  setShowAddCard]  = useState(false);
  const [linkedCards,  setLinkedCards]  = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const balAnim  = useRef(new Animated.Value(1)).current;

  const bg      = darkMode ? '#0D1117' : colors.offWhite;
  const cardBg  = darkMode ? '#161B22' : colors.white;
  const inputBg = darkMode ? '#21262D' : colors.offWhite;
  const textColor= darkMode ? colors.textOnDark : colors.textPrimary;
  const subText  = darkMode ? '#8B949E' : colors.textSecondary;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, []);

  const animateBalance = () => {
    Animated.sequence([
      Animated.spring(balAnim, { toValue: 1.1, tension: 120, friction: 6, useNativeDriver: true }),
      Animated.spring(balAnim, { toValue: 1,   tension: 100, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  const doTopUp = () => {
    const amt = parseInt(topUpAmount, 10);
    if (!amt || amt <= 0) { Alert.alert('Invalid amount'); return; }
    Keyboard.dismiss();
    setBalance((b) => b + amt);
    setTransactions((t) => [{ id: Date.now().toString(), type: 'Top-up', amount: amt, date: 'Today', icon: 'arrow-down-circle', positive: true }, ...t]);
    animateBalance();
    setShowTopUp(false);
    Alert.alert('Top Up Successful', `ZK ${amt} has been added to your wallet.`);
  };

  const doSend = () => {
    const amt = parseInt(sendAmount, 10);
    if (!sendPhone)      { Alert.alert('Enter phone number'); return; }
    if (!amt || amt <= 0){ Alert.alert('Enter a valid amount'); return; }
    if (amt > balance)   { Alert.alert('Insufficient Balance', `Your balance is ZK ${balance}`); return; }
    Keyboard.dismiss();
    setBalance((b) => b - amt);
    setTransactions((t) => [{ id: Date.now().toString(), type: `Sent to ${sendPhone}`, amount: -amt, date: 'Today', icon: 'send', positive: false }, ...t]);
    animateBalance();
    setShowSend(false);
    setSendPhone('');
    setSendAmount('');
    Alert.alert('Sent!', `ZK ${amt} has been sent to ${sendPhone}`);
  };

  const ACTIONS = [
    { icon: 'add-circle',      label: 'Top Up',    color: colors.primary,  onPress: () => setShowTopUp(true) },
    { icon: 'paper-plane',     label: 'Send',      color: '#0EA5E9',       onPress: () => setShowSend(true) },
    { icon: 'document-text',   label: 'Statement', color: '#8B5CF6',       onPress: () => Alert.alert('Statement', 'Your statement will be emailed.') },
    { icon: 'card',            label: 'Add Card',  color: '#F59E0B',       onPress: () => setShowAddCard(true) },
  ];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />

        <Text style={styles.headerLabel}>TIYENDE WALLET</Text>

        <Animated.View style={[styles.balanceCard, { transform: [{ scale: balAnim }] }]}>
          <View style={styles.balanceTop}>
            <Ionicons name="wallet" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.balanceLabel}>Available Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>ZK {balance.toLocaleString()}.00</Text>
          <Text style={styles.balanceSub}>Tiyende Wallet  ·  Active</Text>
        </Animated.View>

        <View style={styles.actionRow}>
          {ACTIONS.map((a) => (
            <TouchableOpacity key={a.label} style={styles.actionBtn} onPress={a.onPress} activeOpacity={0.75}>
              <View style={[styles.actionIcon, { backgroundColor: a.color }]}>
                <Ionicons name={a.icon} size={20} color={colors.white} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Transactions */}
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        <View style={styles.txHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Transactions</Text>
          <View style={[styles.txBadge, { backgroundColor: colors.primaryGhost }]}>
            <Text style={styles.txBadgeText}>{transactions.length}</Text>
          </View>
        </View>

        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={[styles.txItem, { backgroundColor: cardBg }]}>
              <View style={[styles.txIconBg, { backgroundColor: (item.positive ? colors.primary : '#64748B') + '18' }]}>
                <Ionicons name={item.icon} size={18} color={item.positive ? colors.primary : '#64748B'} />
              </View>
              <View style={styles.txInfo}>
                <Text style={[styles.txType, { color: textColor }]} numberOfLines={1}>{item.type}</Text>
                <Text style={[styles.txDate, { color: subText }]}>{item.date}</Text>
              </View>
              <Text style={[styles.txAmount, { color: item.positive ? colors.success : textColor }]}>
                {item.positive ? '+' : ''}ZK {Math.abs(item.amount)}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={40} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No transactions yet</Text>
              <Text style={[styles.emptySub, { color: subText }]}>Top up your wallet to get started.</Text>
            </View>
          }
        />
      </Animated.View>

      {/* Top Up Modal */}
      <Modal visible={showTopUp} transparent animationType="slide" onRequestClose={() => setShowTopUp(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setShowTopUp(false); }}>
          <TouchableOpacity style={[styles.sheet, { backgroundColor: cardBg }]} activeOpacity={1}>
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, { color: textColor }]}>Top Up Wallet</Text>
            <Text style={[styles.sheetSub, { color: subText }]}>Select or enter an amount in ZMW</Text>
            <View style={styles.amountGrid}>
              {TOP_UP_AMOUNTS.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.amountChip, topUpAmount === amt && styles.amountChipOn]}
                  onPress={() => setTopUpAmount(amt)}
                >
                  <Text style={[styles.amountChipText, topUpAmount === amt && { color: colors.white }]}>ZK {amt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.customInput, { backgroundColor: inputBg, borderColor: colors.primary }]}>
              <Text style={styles.inputCurrency}>ZK</Text>
              <TextInput
                style={[styles.inputField, { color: textColor }]}
                value={topUpAmount}
                onChangeText={setTopUpAmount}
                keyboardType="numeric"
                placeholder="Custom amount"
                placeholderTextColor={subText}
                returnKeyType="done"
                onSubmitEditing={doTopUp}
              />
            </View>
            <TouchableOpacity style={styles.sheetBtn} onPress={doTopUp}>
              <Text style={styles.sheetBtnText}>Add ZK {topUpAmount || '0'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setShowTopUp(false)}>
              <Text style={[styles.sheetCancelText, { color: subText }]}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Send Modal */}
      <Modal visible={showSend} transparent animationType="slide" onRequestClose={() => setShowSend(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setShowSend(false); }}>
          <TouchableOpacity style={[styles.sheet, { backgroundColor: cardBg }]} activeOpacity={1}>
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, { color: textColor }]}>Send Money</Text>
            <Text style={[styles.sheetSub, { color: subText }]}>Transfer to another Tiyende user</Text>
            <View style={[styles.customInput, { backgroundColor: inputBg, borderColor: colors.border, marginBottom: 10 }]}>
              <Ionicons name="call-outline" size={16} color={subText} style={{ marginLeft: 12 }} />
              <TextInput
                style={[styles.inputField, { color: textColor }]}
                value={sendPhone}
                onChangeText={setSendPhone}
                placeholder="+260 97..."
                placeholderTextColor={subText}
                keyboardType="phone-pad"
              />
            </View>
            <View style={[styles.customInput, { backgroundColor: inputBg, borderColor: colors.primary }]}>
              <Text style={styles.inputCurrency}>ZK</Text>
              <TextInput
                style={[styles.inputField, { color: textColor }]}
                value={sendAmount}
                onChangeText={setSendAmount}
                placeholder="Amount"
                placeholderTextColor={subText}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={doSend}
              />
            </View>
            <Text style={[styles.balanceHint, { color: subText }]}>Available: ZK {balance}</Text>
            <TouchableOpacity style={styles.sheetBtn} onPress={doSend}>
              <Text style={styles.sheetBtnText}>Send ZK {sendAmount || '0'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setShowSend(false)}>
              <Text style={[styles.sheetCancelText, { color: subText }]}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Add Card Modal */}
      <Modal visible={showAddCard} transparent animationType="slide" onRequestClose={() => setShowAddCard(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowAddCard(false)}>
          <TouchableOpacity style={[styles.sheet, { backgroundColor: cardBg }]} activeOpacity={1}>
            <View style={styles.handle} />
            <View style={styles.cardIllustration}>
              <View style={styles.cardIllustrationBg}>
                <Ionicons name="card" size={34} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.sheetTitle, { color: textColor }]}>Link a Card</Text>
            <Text style={[styles.sheetSub, { color: subText, textAlign: 'center' }]}>Visa, Mastercard and Zambian bank cards accepted</Text>
            {['Visa / Mastercard', 'Zanaco', 'Stanbic Bank', 'FNB Zambia', 'Atlas Mara'].map((card) => (
              <TouchableOpacity
                key={card}
                style={[styles.cardOption, { backgroundColor: inputBg }]}
                onPress={() => {
                  if (!linkedCards.includes(card)) setLinkedCards((c) => [...c, card]);
                  setShowAddCard(false);
                  Alert.alert('Card Linked', `${card} has been added to your wallet.`);
                }}
              >
                <View style={styles.cardOptionIcon}>
                  <Ionicons name="card-outline" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.cardOptionText, { color: textColor }]}>{card}</Text>
                <Ionicons
                  name={linkedCards.includes(card) ? 'checkmark-circle' : 'chevron-forward'}
                  size={16}
                  color={linkedCards.includes(card) ? colors.success : subText}
                />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setShowAddCard(false)}>
              <Text style={[styles.sheetCancelText, { color: subText }]}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },

  header: {
    backgroundColor: colors.primary,
    paddingTop: 54, paddingBottom: 22, paddingHorizontal: 18,
    overflow: 'hidden',
  },
  decCircle1: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  decCircle2: {
    position: 'absolute', bottom: -40, left: -70,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 2,
    color: 'rgba(255,255,255,0.55)', marginBottom: 18, textAlign: 'center',
  },

  balanceCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.xxl, padding: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    marginBottom: 22, alignItems: 'center',
  },
  balanceTop:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  balanceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  balanceAmount:{ fontSize: 40, fontWeight: '900', color: colors.white, letterSpacing: -1 },
  balanceSub:   { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 6 },

  actionRow:    { flexDirection: 'row', justifyContent: 'space-around' },
  actionBtn:    { alignItems: 'center', gap: 7 },
  actionIcon:   { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', ...shadows.small },
  actionLabel:  { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },

  txHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  txBadge:      { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  txBadgeText:  { fontSize: 12, fontWeight: '800', color: colors.primary },

  listContent:  { paddingHorizontal: 16, paddingBottom: 24 },
  txItem:       { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: 14, marginBottom: 10, ...shadows.xs },
  txIconBg:     { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  txInfo:       { flex: 1 },
  txType:       { fontSize: 14, fontWeight: '600' },
  txDate:       { fontSize: 11, marginTop: 2 },
  txAmount:     { fontSize: 15, fontWeight: '800' },

  empty:        { alignItems: 'center', paddingTop: 60 },
  emptyTitle:   { fontSize: 16, fontWeight: '800', marginTop: 14 },
  emptySub:     { fontSize: 13, marginTop: 4 },

  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:        { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  handle:       { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 22 },
  sheetTitle:   { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  sheetSub:     { fontSize: 13, marginBottom: 20 },
  amountGrid:   { flexDirection: 'row', gap: 10, marginBottom: 16 },
  amountChip:   { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  amountChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  amountChipText:{ fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  customInput:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radius.lg, marginBottom: 18 },
  inputCurrency:{ fontSize: 16, fontWeight: '800', color: colors.primary, marginLeft: 14 },
  inputField:   { flex: 1, paddingHorizontal: 10, paddingVertical: 14, fontSize: 18, fontWeight: '700' },
  balanceHint:  { fontSize: 12, marginTop: -10, marginBottom: 16 },
  sheetBtn:     { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 15, alignItems: 'center', ...shadows.green },
  sheetBtnText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  sheetCancelBtn:{ alignItems: 'center', marginTop: 16 },
  sheetCancelText:{ fontSize: 14, fontWeight: '500' },

  cardIllustration: { alignItems: 'center', marginBottom: 14 },
  cardIllustrationBg:{ width: 70, height: 70, borderRadius: 35, backgroundColor: colors.primaryGhost, alignItems: 'center', justifyContent: 'center' },
  cardOption:   { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, padding: 14, marginBottom: 10 },
  cardOptionIcon:{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryGhost, alignItems: 'center', justifyContent: 'center' },
  cardOptionText:{ flex: 1, fontSize: 14, fontWeight: '600' },
});
