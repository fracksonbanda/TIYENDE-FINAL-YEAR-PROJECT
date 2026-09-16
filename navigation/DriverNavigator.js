import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { Ionicons }                 from '@expo/vector-icons';
import DriverDashboard      from '../screens/driver/DriverDashboard';
import EarningsScreen       from '../screens/driver/EarningsScreen';
import DriverSettings       from '../screens/driver/DriverSettings';
import ChatScreen           from '../screens/shared/ChatScreen';
import DataCallScreen       from '../screens/shared/DataCallScreen';
import RestaurantChatScreen from '../screens/shared/RestaurantChatScreen';
import { colors, shadows } from '../theme';
import { useAppContext } from '../context/AppContext';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

const DRIVER_TABS = [
  { name: 'Dashboard', icon: 'speedometer',    iconOut: 'speedometer-outline', label: 'Dashboard' },
  { name: 'Earnings',  icon: 'cash',           iconOut: 'cash-outline',        label: 'Earnings' },
  { name: 'Settings',  icon: 'settings',       iconOut: 'settings-outline',    label: 'Settings' },
];

function DriverTabBar({ state, descriptors, navigation }) {
  const { darkMode } = useAppContext();
  const bg     = darkMode ? colors.darkCard   : colors.white;
  const border = darkMode ? colors.darkBorder : colors.borderLight;

  return (
    <View style={[styles.tabBar, { backgroundColor: bg, borderTopColor: border }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const item    = DRIVER_TABS.find(t => t.name === route.name) || DRIVER_TABS[0];
        const color   = focused ? colors.primary : (darkMode ? colors.textTertiary : '#9CA3AF');

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            activeOpacity={0.7}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
          >
            {focused && <View style={styles.activeIndicator} />}
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons name={focused ? item.icon : item.iconOut} size={22} color={color} />
            </View>
            <Text style={[styles.tabLabel, { color }]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function DriverTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <DriverTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DriverDashboard} />
      <Tab.Screen name="Earnings"  component={EarningsScreen} />
      <Tab.Screen name="Settings"  component={DriverSettings} />
    </Tab.Navigator>
  );
}

export default function DriverNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverTabs" component={DriverTabs} />
      <Stack.Screen name="TripChat"       component={ChatScreen} />
      <Stack.Screen name="DataCall"       component={DataCallScreen} />
      <Stack.Screen name="RestaurantChat" component={RestaurantChatScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    height: 78,
    paddingBottom: 10,
    paddingTop: 6,
    ...shadows.medium,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  iconWrap: {
    width: 44,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primaryGhost,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.2,
  },
});
