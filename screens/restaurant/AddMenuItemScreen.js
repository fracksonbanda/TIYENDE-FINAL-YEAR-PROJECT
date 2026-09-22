import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, StatusBar, Image, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius, shadows } from '../../theme';
import useRestaurantProfile from '../../hooks/useRestaurantProfile';
import { addMenuItem, updateMenuItem } from '../../services/restaurantService';

const FOOD_CATEGORIES  = ['Burgers', 'Pizza', 'Chicken', 'Mains', 'Sides', 'Snacks', 'Drinks', 'Hot Drinks', 'Cold Drinks', 'Desserts', 'Salads', 'Other'];
const STORE_CATEGORIES = ['Groceries', 'Electronics', 'Clothing', 'Home & Hardware', 'Health & Beauty', 'Stationery', 'Toys & Baby', 'Other'];

export default function AddMenuItemScreen({ navigation, route }) {
  const { restaurantId, item: editItem } = route.params || {};
  const isEdit = Boolean(editItem);
  const { isStore } = useRestaurantProfile();
  const CATEGORIES = isStore ? STORE_CATEGORIES : FOOD_CATEGORIES;

  const [name, setName]             = useState(editItem?.name || '');
  const [category, setCategory]     = useState(editItem?.category || '');
  const [price, setPrice]           = useState(editItem?.price?.toString() || '');
  const [description, setDesc]      = useState(editItem?.description || '');
  const [discountPct, setDiscount]  = useState(editItem?.discountPercent?.toString() || '0');
  const [stockQty, setStockQty]     = useState(editItem?.stockQty != null ? String(editItem.stockQty) : '');
  const [imageBase64, setImage]     = useState(editItem?.imageBase64 || '');
  const [saving, setSaving]         = useState(false);

  const discountedPrice = price && Number(discountPct) > 0
    ? Math.round(Number(price) * (1 - Number(discountPct) / 100))
    : null;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.35,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const save = async () => {
    if (!name.trim()) { Alert.alert('Item name required'); return; }
    if (!category) { Alert.alert('Select a category'); return; }
    const parsedPrice = Number(price);
    if (!parsedPrice || parsedPrice <= 0) { Alert.alert('Enter a valid price'); return; }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category,
        price: parsedPrice,
        description: description.trim(),
        discountPercent: Math.max(0, Math.min(99, Number(discountPct) || 0)),
        stockQty: stockQty.trim() ? Math.max(0, Math.round(Number(stockQty))) : null,
        imageBase64: imageBase64 || null,
      };
      if (isEdit) {
        await updateMenuItem(restaurantId, editItem.id, payload);
      } else {
        await addMenuItem(restaurantId, payload);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Save failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.charcoal} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerSub}>{isEdit ? 'Edit Item' : 'New Item'}</Text>
            <Text style={styles.headerTitle}>{isEdit ? editItem.name : (isStore ? 'Add to your catalog' : 'Add to your menu')}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Image picker */}
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageBase64 ? (
              <Image source={{ uri: imageBase64 }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={36} color={colors.primary} />
                <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                <Text style={styles.imagePlaceholderSub}>Optional — makes your item stand out</Text>
              </View>
            )}
            {imageBase64 && (
              <View style={styles.imageEditOverlay}>
                <Ionicons name="camera-outline" size={20} color={colors.white} />
                <Text style={styles.imageEditText}>Change</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Name */}
          <Label text="ITEM NAME *" />
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Classic Beef Burger"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
          />

          {/* Category */}
          <Label text="CATEGORY *" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.catChip, category === c && styles.catChipOn]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.catChipText, category === c && styles.catChipTextOn]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Price */}
          <Label text="PRICE (ZK) *" />
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="65"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
          />

          {/* Discount */}
          <Label text="ITEM DISCOUNT %" />
          <View style={styles.discountRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={discountPct}
              onChangeText={(v) => setDiscount(v.replace(/[^0-9]/g, ''))}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              maxLength={2}
            />
            {discountedPrice ? (
              <View style={styles.discountPreview}>
                <Text style={styles.discountPreviewLabel}>Customers pay</Text>
                <Text style={styles.discountPreviewPrice}>ZK {discountedPrice}</Text>
              </View>
            ) : null}
          </View>

          {/* Stock quantity */}
          <Label text="STOCK QUANTITY (OPTIONAL)" />
          <TextInput
            style={styles.input}
            value={stockQty}
            onChangeText={(v) => setStockQty(v.replace(/[^0-9]/g, ''))}
            placeholder={isStore ? 'e.g. 12' : 'Leave blank if not tracked'}
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
          />

          {/* Description */}
          <Label text="DESCRIPTION" />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDesc}
            placeholder="Describe what's in this item..."
            placeholderTextColor={colors.textTertiary}
            multiline
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={save}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={colors.white} />
              : <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />}
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : (isStore ? 'Add to Catalog' : 'Add to Menu')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function Label({ text }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.charcoal, paddingTop: 54, paddingHorizontal: 20, paddingBottom: 20,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerSub: { fontSize: 11, color: '#8B949E', fontWeight: '700', marginBottom: 2 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: colors.white },
  content: { padding: 20, paddingBottom: 48 },
  imagePicker: { width: '100%', height: 180, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.primaryGhost, borderWidth: 2, borderColor: colors.primaryMuted, borderStyle: 'dashed', marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  imagePreview: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', gap: 6 },
  imagePlaceholderText: { fontSize: 15, fontWeight: '800', color: colors.primary },
  imagePlaceholderSub: { fontSize: 11, color: colors.textTertiary },
  imageEditOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  imageEditText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: colors.textTertiary, marginBottom: 7, marginTop: 4 },
  input: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontWeight: '500', color: colors.textPrimary, marginBottom: 14, ...shadows.xs },
  textArea: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
  catRow: { gap: 8, paddingBottom: 14 },
  catChip: { borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.primaryGhost, borderWidth: 1.5, borderColor: colors.primaryMuted },
  catChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  catChipTextOn: { color: colors.white },
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  discountPreview: { backgroundColor: colors.successLight, borderRadius: radius.md, padding: 12, alignItems: 'center', minWidth: 100 },
  discountPreviewLabel: { fontSize: 10, color: colors.success, fontWeight: '700', marginBottom: 2 },
  discountPreviewPrice: { fontSize: 16, fontWeight: '900', color: colors.success },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 16, marginTop: 8, ...shadows.green },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
