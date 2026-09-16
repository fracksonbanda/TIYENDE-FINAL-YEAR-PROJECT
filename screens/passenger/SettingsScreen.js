import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  Alert, Animated, StatusBar, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { colors, shadows, radius } from '../../theme';
import { auth } from '../../firebase';

export default function SettingsScreen({ navigation }) {
  const { darkMode, setDarkMode, notifications, setNotifications, trafficLayer, setTrafficLayer } = useAppContext();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const bg = darkMode ? '#0D1117' : colors.offWhite;
  const cardBg = darkMode ? '#161B22' : colors.white;
  const textColor = darkMode ? colors.textOnDark : colors.textPrimary;
  const subText = darkMode ? '#8B949E' : colors.textSecondary;
  const headerBg = darkMode ? '#161B22' : colors.white;
  const borderColor = darkMode ? '#30363D' : colors.borderLight;

  const sections = [
    {
      title: 'PREFERENCES',
      items: [
        {
          icon: 'notifications-outline', label: 'Push Notifications',
          sub: 'Ride updates, promotions',
          type: 'switch', value: notifications, onChange: setNotifications,
        },
        {
          icon: 'layers-outline', label: 'Show Traffic Layer',
          sub: 'View real-time traffic on map',
          type: 'switch', value: trafficLayer, onChange: setTrafficLayer,
        },
        {
          icon: 'moon-outline', label: 'Dark Mode',
          sub: 'Switch to dark theme',
          type: 'switch', value: darkMode, onChange: setDarkMode,
        },
      ],
    },
    {
      title: 'MAP & DATA',
      items: [
        {
          icon: 'trash-outline', label: 'Clear Map Cache',
          sub: 'Free up offline map storage',
          type: 'action', color: colors.warning,
          onPress: () => Alert.alert('Cache Cleared', 'Map data has been cleared successfully.'),
        },
        {
          icon: 'map-outline', label: 'Improve Maps',
          sub: 'Add or correct a place',
          type: 'action',
          onPress: () => Linking.openURL('https://www.openstreetmap.org/edit'),
        },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        {
          icon: 'person-circle-outline', label: 'Account ID',
          sub: `UID: ${auth.currentUser?.uid?.slice(0, 12) || 'unknown'}…`,
          type: 'value', value: '',
        },
        {
          icon: 'language-outline', label: 'Language',
          sub: 'English (Default)',
          type: 'value', value: 'English',
        },
      ],
    },
    {
      title: 'ABOUT',
      items: [
        {
          icon: 'information-circle-outline', label: 'App Version',
          type: 'value', value: '1.0.0',
        },
        {
          icon: 'document-text-outline', label: 'Terms of Service',
          type: 'action',
          onPress: () => Alert.alert('Terms of Service', 'Full terms available at tiyende.com/terms'),
        },
        {
          icon: 'shield-checkmark-outline', label: 'Privacy Policy',
          type: 'action',
          onPress: () => Alert.alert('Privacy Policy', 'Full policy available at tiyende.com/privacy'),
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={headerBg} />
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Settings</Text>
      </View>

      <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={styles.content}>
        {sections.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: subText }]}>{section.title}</Text>
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              {section.items.map((item, ii) => (
                <View key={ii}>
                  <TouchableOpacity
                    style={styles.row}
                    onPress={item.type === 'action' ? item.onPress : undefined}
                    activeOpacity={item.type === 'action' ? 0.7 : 1}
                  >
                    <View style={[styles.iconBg, { backgroundColor: (item.color || colors.primary) + '18' }]}>
                      <Ionicons name={item.icon} size={16} color={item.color || colors.primary} />
                    </View>
                    <View style={styles.rowContent}>
                      <Text style={[styles.rowLabel, { color: textColor }]}>{item.label}</Text>
                      {item.sub && <Text style={[styles.rowSub, { color: subText }]}>{item.sub}</Text>}
                    </View>
                    {item.type === 'switch' && (
                      <Switch
                        value={item.value}
                        onValueChange={item.onChange}
                        trackColor={{ false: darkMode ? '#30363D' : colors.border, true: colors.primary }}
                        thumbColor={colors.white}
                      />
                    )}
                    {item.type === 'action' && (
                      <Ionicons name="chevron-forward" size={16} color={subText} />
                    )}
                    {item.type === 'value' && (
                      <Text style={[styles.valueText, { color: subText }]}>{item.value}</Text>
                    )}
                  </TouchableOpacity>
                  {ii < section.items.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: borderColor, marginLeft: 58 }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16,
    borderBottomWidth: 1, gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 48 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: radius.lg, overflow: 'hidden', ...shadows.xs },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  iconBg: { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '500' },
  rowSub: { fontSize: 11, marginTop: 1 },
  valueText: { fontSize: 13, fontWeight: '500' },
  divider: { height: 1 },
});
