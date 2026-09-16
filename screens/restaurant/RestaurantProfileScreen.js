import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, StatusBar, Image, ActivityIndicator,
  KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { colors, radius, shadows } from '../../theme';
import { useAppContext } from '../../context/AppContext';
import { watchRestaurantProfile, updateRestaurantProfile } from '../../services/restaurantService';

const CUISINE_OPTIONS = [
  { id: 'burger', label: 'Burgers / Fast Food' },
  { id: 'pizza', label: 'Pizza / Italian' },
  { id: 'chicken', label: 'Chicken / Grills' },
  { id: 'coffee', label: 'Coffee / Bakery' },
  { id: 'local', label: 'Local / Zambian' },
  { id: 'seafood', label: 'Seafood' },
  { id: 'other', label: 'Other' },
];

export default function RestaurantProfileScreen() {
  const { darkMode, toggleDarkMode } = useAppContext();
  const [restaurant, setRestaurant] = useState(null);
  const [name, setName]             = useState('');
  const [address, setAddress]       = useState('');
  const [phone, setPhone]           = useState('');
  const [description, setDesc]      = useState('');
  const [openHours, setOpenHours]   = useState('');
  const [cuisineType, setCuisine]   = useState('');
  const [logoBase64, setLogo]       = useState('');
  const [saving, setSaving]         = useState(false);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    return watchRestaurantProfile(uid, (r) => {
      if (!r) return;
      setRestaurant(r);
      setName(r.name || '');
      setAddress(r.address || '');
      setPhone(r.phone || '');
      setDesc(r.description || '');
      setOpenHours(r.openHours || '');
      setCuisine(r.cuisineType || '');
      setLogo(r.logoBase64 || '');
    }, () => {});
  }, [uid]);

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setLogo(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const save = async () => {
    if (!name.trim()) { Alert.alert('Restaurant name required'); return; }
    setSaving(true);
    try {
      await updateRestaurantProfile(uid, {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        description: description.trim(),
        openHours: openHours.trim(),
        cuisineType,
        logoBase64: logoBase64 || null,
      });
      Alert.alert('Saved', 'Your restaurant profile has been updated.');
    } catch (err) {
      Alert.alert('Save failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleOpen = async () => {
    if (!restaurant) return;
    try { await updateRestaurantProfile(uid, { isOpen: !restaurant.isOpen }); }
    catch (err) { Alert.alert('Error', err.message); }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  const bg        = darkMode ? '#0D1117' : colors.offWhite;
  const cardBg    = darkMode ? '#161B22' : colors.white;
  const textColor = darkMode ? colors.textOnDark : colors.textPrimary;
  const subText   = darkMode ? '#8B949E' : colors.textSecondary;
  const borderColor = darkMode ? '#30363D' : colors.border;
  const inputBg   = darkMode ? '#21262D' : colors.offWhite;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.charcoal} />
        <View style={styles.header}>
          <Text style={styles.headerSub}>Account</Text>
          <Text style={styles.headerTitle}>Restaurant Profile</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <TouchableOpacity style={styles.logoPicker} onPress={pickLogo}>
            {logoBase64 ? (
              <Image source={{ uri: logoBase64 }} style={styles.logoImg} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="restaurant-outline" size={28} color={colors.primary} />
              </View>
            )}
            <View style={styles.logoEdit}>
              <Ionicons name="camera" size={14} color={colors.white} />
            </View>
          </TouchableOpacity>

          {/* Open toggle */}
          <View style={[styles.settingRow, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.settingLeft}>
              <Ionicons name={restaurant?.isOpen ? 'storefront' : 'storefront-outline'} size={20} color={restaurant?.isOpen ? colors.success : colors.error} />
              <View>
                <Text style={[styles.settingTitle, { color: textColor }]}>Restaurant Status</Text>
                <Text style={[styles.settingDesc, { color: subText }]}>{restaurant?.isOpen ? 'You are accepting orders' : 'Not accepting orders right now'}</Text>
              </View>
            </View>
            <Switch value={restaurant?.isOpen ?? false} onValueChange={toggleOpen} trackColor={{ true: colors.success }} thumbColor={colors.white} />
          </View>

          {/* Fields */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={styles.cardTitle}>Basic Info</Text>

            <FieldRow label="RESTAURANT NAME" icon="restaurant-outline">
              <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg, borderColor }]} value={name} onChangeText={setName} placeholder="Restaurant name" placeholderTextColor={colors.textTertiary} />
            </FieldRow>

            <FieldRow label="ADDRESS" icon="location-outline">
              <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg, borderColor }]} value={address} onChangeText={setAddress} placeholder="e.g. Manda Hill, Lusaka" placeholderTextColor={colors.textTertiary} />
            </FieldRow>

            <FieldRow label="PHONE" icon="call-outline">
              <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg, borderColor }]} value={phone} onChangeText={setPhone} placeholder="+260 97..." placeholderTextColor={colors.textTertiary} keyboardType="phone-pad" />
            </FieldRow>

            <FieldRow label="OPENING HOURS" icon="time-outline">
              <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg, borderColor }]} value={openHours} onChangeText={setOpenHours} placeholder="08:00 – 21:00" placeholderTextColor={colors.textTertiary} />
            </FieldRow>

            <FieldRow label="ABOUT" icon="information-circle-outline">
              <TextInput style={[styles.input, styles.textArea, { color: textColor, backgroundColor: inputBg, borderColor }]} value={description} onChangeText={setDesc} placeholder="Describe your restaurant..." placeholderTextColor={colors.textTertiary} multiline />
            </FieldRow>
          </View>

          {/* Cuisine */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={styles.cardTitle}>Cuisine Type</Text>
            <View style={styles.cuisineWrap}>
              {CUISINE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.cuisineChip, cuisineType === opt.id && styles.cuisineChipOn]}
                  onPress={() => setCuisine(opt.id)}
                >
                  <Text style={[styles.cuisineText, cuisineType === opt.id && { color: colors.white }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Appearance */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={styles.cardTitle}>Appearance</Text>
            <View style={[styles.settingRow, { borderColor: 'transparent', backgroundColor: 'transparent', paddingHorizontal: 0 }]}>
              <View style={styles.settingLeft}>
                <Ionicons name={darkMode ? 'moon' : 'sunny-outline'} size={20} color={colors.primary} />
                <Text style={[styles.settingTitle, { color: textColor }]}>Dark Mode</Text>
              </View>
              <Switch value={darkMode} onValueChange={toggleDarkMode} trackColor={{ true: colors.primary }} thumbColor={colors.white} />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={save}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color={colors.white} /> : <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} />}
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function FieldRow({ label, icon, children }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: colors.charcoal, paddingTop: 54, paddingHorizontal: 20, paddingBottom: 20 },
  headerSub:   { fontSize: 12, color: '#8B949E', fontWeight: '700', marginBottom: 2 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: colors.white },
  content: { padding: 20, paddingBottom: 48 },
  logoPicker: { alignSelf: 'center', marginBottom: 20, position: 'relative' },
  logoImg: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: colors.primary },
  logoPlaceholder: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primaryGhost, borderWidth: 2.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoEdit: { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.lg, padding: 14, marginBottom: 12, borderWidth: 1 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingTitle: { fontSize: 14, fontWeight: '700' },
  settingDesc: { fontSize: 12, marginTop: 1 },
  card: { borderRadius: radius.xl, padding: 16, marginBottom: 14, ...shadows.xs },
  cardTitle: { fontSize: 13, fontWeight: '900', color: colors.textPrimary, marginBottom: 14 },
  fieldRow: { marginBottom: 12 },
  fieldLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3, color: colors.textTertiary, marginBottom: 6 },
  input: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontWeight: '500' },
  textArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 },
  cuisineWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cuisineChip: { borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.primaryGhost, borderWidth: 1.5, borderColor: colors.primaryMuted },
  cuisineChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  cuisineText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 15, marginTop: 6, ...shadows.green },
  saveBtnText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 14 },
  signOutText: { color: colors.error, fontSize: 15, fontWeight: '700' },
});
