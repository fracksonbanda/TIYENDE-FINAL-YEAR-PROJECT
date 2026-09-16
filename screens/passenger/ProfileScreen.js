import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Animated, StatusBar, ScrollView, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { colors, shadows, radius } from '../../theme';
import useUserProfile from '../../hooks/useUserProfile';
import ProfilePhotoButton from '../../components/ProfilePhotoButton';
import { pickAndUploadProfileImage, saveUserProfile } from '../../services/profileService';

const MENU_SECTIONS = [
  {
    title: 'ACCOUNT',
    items: [
      { icon: 'settings-outline',       label: 'Settings',          color: '#6C63FF', screen: 'Settings' },
      { icon: 'location-outline',       label: 'Saved Addresses',   color: '#FF6B6B', action: 'saved' },
      { icon: 'card-outline',           label: 'Payment Methods',   color: '#20C997', action: 'payment' },
    ],
  },
  {
    title: 'ACTIVITY',
    items: [
      { icon: 'star-outline',           label: 'My Ratings',        color: colors.accent,   action: 'ratings' },
      { icon: 'car-sport-outline',      label: 'Trip History',      color: colors.primary,  action: 'trips' },
      { icon: 'wallet-outline',         label: 'Transaction History',color: '#0EA5E9',      action: 'transactions' },
    ],
  },
  {
    title: 'SUPPORT',
    items: [
      { icon: 'help-circle-outline',    label: 'Help & Support',    color: '#F59E0B', action: 'support' },
      { icon: 'document-text-outline',  label: 'Terms & Privacy',   color: '#8B5CF6', action: 'terms' },
      { icon: 'information-circle-outline', label: 'About Tiyende', color: colors.info, action: 'about' },
    ],
  },
];

export default function ProfileScreen({ navigation }) {
  const { profile } = useUserProfile();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [fullName, setFullName]  = useState('');
  const [phone, setPhone]        = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile]   = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 70, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    setFullName(profile?.fullName || profile?.displayName || '');
    setPhone(profile?.phone || profile?.phoneNumber || '');
  }, [profile?.fullName, profile?.displayName, profile?.phone, profile?.phoneNumber]);

  const profileName = profile?.fullName || profile?.displayName || profile?.email || profile?.phoneNumber || 'Tiyende Rider';
  const profileSub  = profile?.phone || profile?.phoneNumber || profile?.email || profile?.identifier || 'Passenger';

  const handlePhotoUpload = async () => {
    setUploadingPhoto(true);
    try { await pickAndUploadProfileImage(); }
    catch (error) { Alert.alert('Profile Photo', error.message); }
    finally { setUploadingPhoto(false); }
  };

  const saveProfile = async () => {
    if (!fullName.trim()) { Alert.alert('Required', 'Please enter your full name.'); return; }
    setSavingProfile(true);
    try {
      await saveUserProfile({ fullName: fullName.trim(), phone: phone.trim() });
      setShowEditProfile(false);
    } catch (error) { Alert.alert('Save Failed', error.message); }
    finally { setSavingProfile(false); }
  };

  const handleMenuPress = (item) => {
    if (item.screen) { navigation.navigate(item.screen); return; }
    const messages = {
      saved:        'Manage your saved pickup and drop-off locations.',
      payment:      'Use the Wallet tab to top up, send money, and track payments.',
      ratings:      `Your current rating is ${profile?.rating || 5} ⭐ — great job!`,
      trips:        'View your full trip history in the Rides tab.',
      transactions: 'See all transactions in your Wallet tab.',
      support:      'Contact us: support@tiyende.com\nPhone: +260 211 123 456',
      terms:        'Read our full terms at tiyende.com/terms',
      about:        'Tiyende v1.0.0\nYour Journey, Your Price\n\nBuilt for Zambia 🇿🇲',
    };
    Alert.alert(item.label, messages[item.action] || '');
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerDecCircle1} />
        <View style={styles.headerDecCircle2} />

        <Animated.View style={{ opacity: scaleAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
          <ProfilePhotoButton
            name={profileName}
            photoURL={profile?.photoURL}
            size={88}
            light
            onPress={handlePhotoUpload}
            loading={uploadingPhoto}
          />
          <Text style={styles.name}>{profileName}</Text>
          <Text style={styles.sub}>{profileSub}</Text>

          <TouchableOpacity style={styles.editBtn} onPress={() => setShowEditProfile(true)}>
            <Ionicons name="create-outline" size={14} color={colors.white} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statCell}>
            <View style={styles.statIconBg}>
              <Ionicons name="star" size={14} color={colors.accent} />
            </View>
            <Text style={styles.statVal}>{profile?.rating || '5.0'}</Text>
            <Text style={styles.statLbl}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <View style={styles.statIconBg}>
              <Ionicons name="car-sport" size={14} color={colors.white} />
            </View>
            <Text style={styles.statVal}>0</Text>
            <Text style={styles.statLbl}>Rides</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <View style={styles.statIconBg}>
              <Ionicons name="wallet" size={14} color={colors.white} />
            </View>
            <Text style={styles.statVal}>ZK 0</Text>
            <Text style={styles.statLbl}>Wallet</Text>
          </View>
        </View>
      </View>

      {/* Menu */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.menuContent}>

          {MENU_SECTIONS.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionCard}>
                {section.items.map((item, idx) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.menuRow, idx < section.items.length - 1 && styles.menuRowBorder]}
                    onPress={() => handleMenuPress(item)}
                    activeOpacity={0.65}
                  >
                    <View style={[styles.menuIconBg, { backgroundColor: item.color + '18' }]}>
                      <Ionicons name={item.icon} size={18} color={item.color} />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <View style={styles.logoutIconBg}>
              <Ionicons name="log-out-outline" size={18} color={colors.error} />
            </View>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Tiyende v1.0.0  •  Developed by Frackson Banda</Text>
        </ScrollView>
      </Animated.View>

      {/* Edit Profile Modal */}
      <Modal visible={showEditProfile} transparent animationType="slide" onRequestClose={() => setShowEditProfile(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.photoCenter}>
              <ProfilePhotoButton
                name={fullName || profileName}
                photoURL={profile?.photoURL}
                size={80}
                onPress={handlePhotoUpload}
                loading={uploadingPhoto}
              />
              <Text style={styles.changePhotoText}>Tap to change photo</Text>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={16} color={colors.textTertiary} style={{ marginLeft: 12 }} />
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your full name"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="call-outline" size={16} color={colors.textTertiary} style={{ marginLeft: 12 }} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="+260 97..."
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>
            <TouchableOpacity style={[styles.saveBtn, savingProfile && { opacity: 0.65 }]} onPress={saveProfile} disabled={savingProfile}>
              <Text style={styles.saveBtnText}>{savingProfile ? 'Saving…' : 'Save Changes'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setShowEditProfile(false)}>
              <Text style={styles.cancelModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },

  header: {
    backgroundColor: colors.primary,
    paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20,
    alignItems: 'center', overflow: 'hidden',
  },
  headerDecCircle1: {
    position: 'absolute', top: -50, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerDecCircle2: {
    position: 'absolute', bottom: -30, left: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  name:        { fontSize: 20, fontWeight: '800', color: colors.white, marginTop: 10, marginBottom: 2 },
  sub:         { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  editBtn:     {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 6,
    marginBottom: 20,
  },
  editBtnText: { color: colors.white, fontSize: 12, fontWeight: '700' },

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden', width: '100%',
  },
  statCell:   { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statIconBg: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  statVal:    { fontSize: 14, fontWeight: '800', color: colors.white },
  statLbl:    { fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 1, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider:{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 10 },

  menuContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 36 },
  section:     { marginBottom: 20 },
  sectionTitle:{ fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: colors.textTertiary, marginBottom: 8, marginLeft: 4 },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.small,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15, gap: 12,
  },
  menuRowBorder: {
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  menuIconBg: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel:  { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: radius.xl,
    padding: 14, gap: 12, marginBottom: 24, ...shadows.small,
    borderWidth: 1, borderColor: colors.errorLight,
  },
  logoutIconBg: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.errorLight,
    alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.error },
  version:    { fontSize: 11, color: colors.textTertiary, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  modalTitle:  { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  modalClose:  {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.offWhite,
    alignItems: 'center', justifyContent: 'center',
  },
  photoCenter: { alignItems: 'center', marginBottom: 20 },
  changePhotoText: { fontSize: 12, color: colors.textTertiary, marginTop: 6 },
  fieldGroup:  { marginBottom: 14 },
  fieldLabel:  { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: colors.textTertiary, marginBottom: 7 },
  inputWrap:   {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg, backgroundColor: colors.offWhite,
  },
  input:       { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: colors.textPrimary },
  saveBtn:     {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 15, alignItems: 'center', ...shadows.green, marginTop: 4,
  },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  cancelModalBtn: { alignItems: 'center', marginTop: 14 },
  cancelModalText:{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
