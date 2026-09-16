import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { initialsFromName } from '../utils/geo';

export default function ProfilePhotoButton({ name, photoURL, size = 84, onPress, loading = false, light = false }) {
  const initials = initialsFromName(name);
  const borderColor = light ? 'rgba(255,255,255,0.45)' : colors.white;
  const fallbackBg = light ? 'rgba(255,255,255,0.16)' : colors.primary;

  return (
    <TouchableOpacity style={[styles.wrap, { width: size, height: size }]} onPress={onPress} activeOpacity={0.85}>
      {photoURL ? (
        <Image source={{ uri: photoURL }} style={[styles.image, { width: size, height: size, borderRadius: size / 2, borderColor }]} />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, borderColor, backgroundColor: fallbackBg }]}>
          <Text style={[styles.initials, { fontSize: Math.round(size * 0.32) }]}>{initials}</Text>
        </View>
      )}
      <View style={[styles.badge, { right: 0, bottom: 2 }]}>
        {loading ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="camera" size={14} color={colors.white} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  image: { borderWidth: 3, backgroundColor: colors.primaryGhost },
  fallback: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontWeight: '800', color: colors.white },
  badge: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
});
