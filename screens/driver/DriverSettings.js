import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity, Animated,
  StatusBar, ScrollView, Alert, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { auth, db } from '../../firebase';
import { colors, shadows, radius } from '../../theme';
import { useAppContext } from '../../context/AppContext';
import useUserProfile from '../../hooks/useUserProfile';
import ProfilePhotoButton from '../../components/ProfilePhotoButton';
import { pickAndUploadProfileImage, saveUserProfile } from '../../services/profileService';
import { watchDriverCompletedRequests } from '../../services/requestService';

export default function DriverSettings() {
  const { profile } = useUserProfile();
  const { notifications, setNotifications } = useAppContext();
  const [completedCount, setCompletedCount] = useState(0);
  const [autoAccept, setAutoAccept] = useState(false);
  const [showEarnings, setShowEarnings] = useState(true);
  const [destinationFilter, setDestinationFilter] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [minFare, setMinFare] = useState('30');
  const [maxFare, setMaxFare] = useState('200');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return undefined;
    return watchDriverCompletedRequests(user.uid, (items) => setCompletedCount(items.length), () => {});
  }, []);

  const handleNotificationsToggle = async (value) => {
    setNotifications(value);
    if (value) await Notifications.requestPermissionsAsync().catch(() => {});
  };

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName || profile.displayName || fullName);
    setPhone(profile.phone || profile.phoneNumber || phone);
    setVehicleModel(profile.vehicleModel || vehicleModel);
    setLicensePlate(profile.licensePlate || licensePlate);
  }, [profile?.fullName, profile?.displayName, profile?.phone, profile?.phoneNumber, profile?.vehicleModel, profile?.licensePlate]);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  const handlePhotoUpload = async () => {
    setUploadingPhoto(true);
    try {
      await pickAndUploadProfileImage();
    } catch (error) {
      Alert.alert('Profile Photo', error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveProfile = async () => {
    if (!fullName.trim() || !vehicleModel.trim() || !licensePlate.trim()) {
      Alert.alert('Required', 'Please complete your name and vehicle details.');
      return;
    }
    const user = auth.currentUser;
    if (!user) return;
    setSavingProfile(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        fullName: fullName.trim(),
        phone: phone.trim(),
        vehicleModel: vehicleModel.trim(),
        licensePlate: licensePlate.trim().toUpperCase(),
      }, { merge: true });
      await saveUserProfile({ fullName: fullName.trim(), phone: phone.trim() });
      setShowEditProfile(false);
    } catch (error) {
      Alert.alert('Save Failed', error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePricing = () => {
    setShowPricing(false);
    Alert.alert('Pricing Updated', `Min: ZK ${minFare} · Max: ZK ${maxFare}`);
  };

  const sections = [
    {
      title: 'DRIVER PROFILE',
      items: [
        { icon: 'person-outline', label: fullName || 'Driver profile', sub: 'Driver account', type: 'action', onPress: () => setShowEditProfile(true) },
        { icon: 'car-outline', label: vehicleModel || 'Vehicle details', sub: licensePlate || 'Add license plate', type: 'action', onPress: () => setShowEditProfile(true) },
        { icon: 'star-outline', label: `Rating: ${profile?.rating || 5}`, sub: `${completedCount} trip${completedCount === 1 ? '' : 's'} completed`, type: 'info' },
      ],
    },
    {
      title: 'RIDE SETTINGS',
      items: [
        { icon: 'flash-outline', label: 'Auto-accept recommended fare', sub: 'Skip manual acceptance', type: 'switch', value: autoAccept, onChange: setAutoAccept },
        { icon: 'location-outline', label: 'Destination filter', sub: destinationFilter ? 'Active — filtering by zone' : 'Off — showing all rides', type: 'switch', value: destinationFilter, onChange: setDestinationFilter },
        { icon: 'pricetag-outline', label: 'Set fare range', sub: `ZK ${minFare} – ZK ${maxFare}`, type: 'action', onPress: () => setShowPricing(true) },
      ],
    },
    {
      title: 'NOTIFICATIONS',
      items: [
        { icon: 'notifications-outline', label: 'Ride request alerts', sub: 'Sound & vibration', type: 'switch', value: notifications, onChange: handleNotificationsToggle },
        { icon: 'cash-outline', label: 'Show earnings on dashboard', type: 'switch', value: showEarnings, onChange: setShowEarnings },
      ],
    },
    {
      title: 'SUPPORT',
      items: [
        { icon: 'help-circle-outline', label: 'Driver help centre', sub: 'FAQs, guides, tips', type: 'action', onPress: () => setShowSupport(true) },
        { icon: 'chatbubble-outline', label: 'Contact support', sub: 'Chat with our team', type: 'action', onPress: () => Alert.alert('Support Chat', 'Connecting you to a support agent…\n\nAvailable: Mon–Fri 8am–6pm\nPhone: +260 211 123 456') },
        { icon: 'document-text-outline', label: 'Driver agreement', type: 'action', onPress: () => Alert.alert('Driver Agreement', 'By using Tiyende as a driver you agree to:\n• Maintain a rating above 4.0\n• Keep your vehicle roadworthy\n• Treat all passengers respectfully\n• Report incidents within 24 hours') },
        { icon: 'information-circle-outline', label: 'App Version', type: 'value', value: '1.0.0' },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.charcoal} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Settings</Text>
        <Text style={styles.headerSub}>Manage your account and preferences</Text>
      </View>

      <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={styles.content}>
        {sections.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, ii) => (
                <View key={ii}>
                  <TouchableOpacity
                    style={styles.row}
                    onPress={item.type === 'action' ? item.onPress : undefined}
                    activeOpacity={item.type === 'action' ? 0.7 : 1}
                  >
                    <View style={styles.iconBg}>
                      <Ionicons name={item.icon} size={16} color={colors.primary} />
                    </View>
                    <View style={styles.rowContent}>
                      <Text style={styles.rowLabel}>{item.label}</Text>
                      {item.sub && <Text style={styles.rowSub}>{item.sub}</Text>}
                    </View>
                    {item.type === 'switch' && <Switch value={item.value} onValueChange={item.onChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.white} />}
                    {item.type === 'action' && <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
                    {item.type === 'value' && <Text style={styles.valueText}>{item.value}</Text>}
                  </TouchableOpacity>
                  {ii < section.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </Animated.ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditProfile} transparent animationType="slide" onRequestClose={() => setShowEditProfile(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Edit Driver Profile</Text>

            {/* Avatar */}
            <View style={styles.avatarSection}>
              <ProfilePhotoButton
                name={fullName}
                photoURL={profile?.photoURL}
                size={84}
                onPress={handlePhotoUpload}
                loading={uploadingPhoto}
              />
              <Text style={styles.avatarHint}>Tap to change photo</Text>
            </View>

            {[
              { label: 'FULL NAME', value: fullName, onChange: setFullName, icon: 'person-outline' },
              { label: 'PHONE NUMBER', value: phone, onChange: setPhone, icon: 'call-outline', keyboard: 'phone-pad' },
              { label: 'VEHICLE MODEL', value: vehicleModel, onChange: setVehicleModel, icon: 'car-outline' },
              { label: 'LICENSE PLATE', value: licensePlate, onChange: setLicensePlate, icon: 'id-card-outline' },
            ].map((f, i) => (
              <View key={i} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <View style={styles.fieldRow}>
                  <Ionicons name={f.icon} size={16} color={colors.textTertiary} style={{ marginLeft: 12 }} />
                  <TextInput
                    style={styles.fieldInput}
                    value={f.value}
                    onChangeText={f.onChange}
                    keyboardType={f.keyboard || 'default'}
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                </View>
              </View>
            ))}
            <TouchableOpacity style={[styles.saveBtn, savingProfile && { opacity: 0.65 }]} onPress={saveProfile} disabled={savingProfile}>
              <Text style={styles.saveBtnText}>{savingProfile ? 'Saving...' : 'Save Profile'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEditProfile(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pricing Modal */}
      <Modal visible={showPricing} transparent animationType="slide" onRequestClose={() => setShowPricing(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Set Your Fare Range</Text>
            <Text style={styles.modalSub}>Only accept rides within this price range</Text>
            {[
              { label: 'MINIMUM FARE (ZK)', value: minFare, onChange: setMinFare },
              { label: 'MAXIMUM FARE (ZK)', value: maxFare, onChange: setMaxFare },
            ].map((f, i) => (
              <View key={i} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <View style={styles.fieldRow}>
                  <Text style={styles.currencyBadge}>ZK</Text>
                  <TextInput style={styles.fieldInput} value={f.value} onChangeText={f.onChange} keyboardType="numeric" returnKeyType="done" />
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={savePricing}>
              <Text style={styles.saveBtnText}>Save Pricing</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPricing(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Support Modal */}
      <Modal visible={showSupport} transparent animationType="slide" onRequestClose={() => setShowSupport(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Driver Help Centre</Text>
            {[
              { q: 'How do I increase my rating?', a: 'Be punctual, keep your vehicle clean, and be polite to passengers.' },
              { q: 'What if a passenger cancels?', a: 'Cancellations within 2 minutes are free. After that you earn a ZK 5 cancellation fee.' },
              { q: 'How do I get paid?', a: 'Payments are processed daily to your linked mobile money or bank account.' },
              { q: 'Can I reject a ride?', a: 'Yes, but frequent rejections may lower your priority in ride matching.' },
              { q: 'How do I report an incident?', a: 'Use the Report Issue button on the ride card or contact support directly.' },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={styles.faqItem} onPress={() => Alert.alert(item.q, item.a)}>
                <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.faqText}>{item.q}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowSupport(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  header: { backgroundColor: colors.charcoal, paddingTop: 52, paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.white, marginBottom: 4 },
  headerSub: { fontSize: 13, color: '#8B949E' },
  content: { padding: 16, paddingBottom: 48 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.textTertiary, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', ...shadows.xs },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  iconBg: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  rowSub: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
  valueText: { fontSize: 13, color: colors.textTertiary },
  divider: { height: 1, backgroundColor: colors.borderLight, marginLeft: 58 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderRadius: radius.md, padding: 15, borderWidth: 1.5, borderColor: colors.error, gap: 8 },
  logoutText: { fontSize: 15, fontWeight: '600', color: colors.error },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  modalSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 28, fontWeight: '800', color: colors.white },
  avatarEditBadge: { position: 'absolute', bottom: 24, right: '35%', backgroundColor: colors.primaryLight, borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.white },
  avatarHint: { fontSize: 11, color: colors.textTertiary, marginTop: 8 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.textTertiary, marginBottom: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.offWhite },
  fieldInput: { flex: 1, paddingHorizontal: 10, paddingVertical: 13, fontSize: 15, color: colors.textPrimary },
  currencyBadge: { fontSize: 15, fontWeight: '700', color: colors.primary, marginLeft: 12 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', ...shadows.green },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', marginTop: 14 },
  cancelText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  faqItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  faqText: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
});
