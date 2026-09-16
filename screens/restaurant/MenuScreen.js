import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, StatusBar, Image, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../firebase';
import { colors, radius, shadows } from '../../theme';
import { useAppContext } from '../../context/AppContext';
import { watchMenuItems, deleteMenuItem, updateMenuItem } from '../../services/restaurantService';

function ItemImage({ item, size = 54 }) {
  if (item.imageBase64) {
    return <Image source={{ uri: item.imageBase64 }} style={{ width: size, height: size, borderRadius: 10, backgroundColor: colors.primaryGhost }} />;
  }
  return (
    <View style={[styles.imageFallback, { width: size, height: size, borderRadius: 10 }]}>
      <Ionicons name="fast-food-outline" size={22} color={colors.primary} />
    </View>
  );
}

const CUISINE_COLORS = {
  Burgers: '#FF6B35', Pizza: '#E91E63', Chicken: '#FF9800', Drinks: '#2196F3',
  'Hot Drinks': '#795548', 'Cold Drinks': '#00BCD4', Snacks: '#8BC34A',
  Mains: '#4CAF50', Sides: '#9C27B0', Desserts: '#F44336', Default: colors.primary,
};

export default function MenuScreen({ navigation }) {
  const { darkMode } = useAppContext();
  const [items, setItems] = useState([]);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    return watchMenuItems(uid, setItems, () => {});
  }, [uid]);

  const grouped = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      const cat = item.category || 'Other';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return Object.entries(map);
  }, [items]);

  const handleToggle = async (item) => {
    try {
      await updateMenuItem(uid, item.id, { available: !item.available });
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Item', `Remove "${item.name}" from your menu?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await deleteMenuItem(uid, item.id); }
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

  const renderItem = ({ item }) => (
    <View style={[styles.menuItem, { backgroundColor: cardBg, borderColor }]}>
      <ItemImage item={item} />
      <View style={{ flex: 1 }}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemName, { color: textColor }]} numberOfLines={1}>{item.name}</Text>
          {item.discountPercent > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{item.discountPercent}% OFF</Text>
            </View>
          )}
        </View>
        {item.description ? <Text style={[styles.itemDesc, { color: subText }]} numberOfLines={2}>{item.description}</Text> : null}
        <View style={styles.itemFooter}>
          <Text style={styles.itemPrice}>ZK {item.price}</Text>
          {item.discountPercent > 0 && (
            <Text style={styles.itemPriceDiscounted}>ZK {Math.round(item.price * (1 - item.discountPercent / 100))}</Text>
          )}
        </View>
      </View>
      <View style={styles.itemActions}>
        <Switch
          value={item.available !== false}
          onValueChange={() => handleToggle(item)}
          trackColor={{ true: colors.primary }}
          thumbColor={colors.white}
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
        <TouchableOpacity onPress={() => navigation.navigate('AddMenuItem', { item, restaurantId: uid })} style={styles.editBtn}>
          <Ionicons name="create-outline" size={16} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.charcoal} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Your Menu</Text>
          <Text style={styles.headerTitle}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddMenuItem', { restaurantId: uid })}
        >
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={styles.addBtnText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {grouped.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="restaurant-outline" size={52} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: textColor }]}>Your menu is empty</Text>
          <Text style={[styles.emptySub, { color: subText }]}>Add your first menu item so customers can start ordering.</Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={() => navigation.navigate('AddMenuItem', { restaurantId: uid })}>
            <Ionicons name="add-circle-outline" size={18} color={colors.white} />
            <Text style={styles.emptyAddBtnText}>Add First Item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={([cat]) => cat}
          contentContainerStyle={styles.list}
          renderItem={({ item: [category, catItems] }) => (
            <View style={{ marginBottom: 8 }}>
              <View style={[styles.categoryHeader, { borderLeftColor: CUISINE_COLORS[category] || CUISINE_COLORS.Default }]}>
                <Text style={[styles.categoryTitle, { color: textColor }]}>{category}</Text>
                <Text style={[styles.categoryCount, { color: subText }]}>{catItems.length} item{catItems.length !== 1 ? 's' : ''}</Text>
              </View>
              {catItems.map((item) => renderItem({ item }))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.charcoal, paddingTop: 54, paddingHorizontal: 20, paddingBottom: 20,
  },
  headerSub:   { fontSize: 12, color: '#8B949E', fontWeight: '700', marginBottom: 2 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: colors.white },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10,
    ...shadows.greenSoft,
  },
  addBtnText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  list: { padding: 16, paddingBottom: 40 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderLeftWidth: 3, paddingLeft: 10, marginBottom: 8, marginLeft: 4 },
  categoryTitle: { fontSize: 15, fontWeight: '900' },
  categoryCount: { fontSize: 11, fontWeight: '700' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, padding: 12, marginBottom: 8, borderWidth: 1, ...shadows.xs },
  imageFallback: { backgroundColor: colors.primaryGhost, alignItems: 'center', justifyContent: 'center' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  itemName: { flex: 1, fontSize: 14, fontWeight: '800' },
  discountBadge: { backgroundColor: colors.errorLight, borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  discountBadgeText: { fontSize: 9, fontWeight: '900', color: colors.error },
  itemDesc: { fontSize: 11, lineHeight: 15, marginBottom: 6 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemPrice: { fontSize: 14, fontWeight: '900', color: colors.primary },
  itemPriceDiscounted: { fontSize: 12, fontWeight: '900', color: colors.success },
  itemActions: { alignItems: 'center', gap: 6 },
  editBtn: { padding: 6, backgroundColor: colors.primaryGhost, borderRadius: radius.sm },
  deleteBtn: { padding: 6, backgroundColor: colors.errorLight, borderRadius: radius.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 16 },
  emptySub: { fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 19 },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20, ...shadows.green },
  emptyAddBtnText: { color: colors.white, fontSize: 15, fontWeight: '800' },
});
