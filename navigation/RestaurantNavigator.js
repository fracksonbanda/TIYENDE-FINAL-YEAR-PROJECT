import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { Ionicons }                 from '@expo/vector-icons';
import RestaurantDashboard    from '../screens/restaurant/RestaurantDashboard';
import MenuScreen             from '../screens/restaurant/MenuScreen';
import AddMenuItemScreen      from '../screens/restaurant/AddMenuItemScreen';
import DiscountsScreen        from '../screens/restaurant/DiscountsScreen';
import RestaurantProfileScreen from '../screens/restaurant/RestaurantProfileScreen';
import RestaurantChatScreen   from '../screens/shared/RestaurantChatScreen';
import { colors, shadows } from '../theme';
import { useAppContext } from '../context/AppContext';
import useRestaurantProfile from '../hooks/useRestaurantProfile';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

const RESTAURANT_TABS = [
  { name: 'Orders',    icon: 'bag-handle',        iconOut: 'bag-handle-outline',        label: 'Orders' },
  { name: 'Menu',      icon: 'restaurant',         iconOut: 'restaurant-outline',        label: 'Menu' },
  { name: 'Discounts', icon: 'ticket',             iconOut: 'ticket-outline',            label: 'Discounts' },
  { name: 'Profile',   icon: 'person-circle',      iconOut: 'person-circle-outline',     label: 'Profile' },
];

const STORE_TAB_OVERRIDE = { icon: 'storefront', iconOut: 'storefront-outline', label: 'Catalog' };

function RestaurantTabBar({ state, descriptors, navigation }) {
  const { darkMode } = useAppContext();
  const { isStore } = useRestaurantProfile();
  const bg     = darkMode ? colors.darkCard   : colors.white;
  const border = darkMode ? colors.darkBorder : colors.borderLight;

  return (
    <View style={[styles.tabBar, { backgroundColor: bg, borderTopColor: border }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const baseItem = RESTAURANT_TABS.find((t) => t.name === route.name) || RESTAURANT_TABS[0];
        const item = (isStore && baseItem.name === 'Menu') ? { ...baseItem, ...STORE_TAB_OVERRIDE } : baseItem;
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

function RestaurantTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <RestaurantTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Orders"    component={RestaurantDashboard} />
      <Tab.Screen name="Menu"      component={MenuScreen} />
      <Tab.Screen name="Discounts" component={DiscountsScreen} />
      <Tab.Screen name="Profile"   component={RestaurantProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RestaurantNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RestaurantTabs"    component={RestaurantTabs} />
      <Stack.Screen name="AddMenuItem"       component={AddMenuItemScreen} />
      <Stack.Screen name="RestaurantChat"    component={RestaurantChatScreen} />
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
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 4,
  },
  activeIndicator: {
    position: 'absolute', top: 0, width: 28, height: 3,
    borderRadius: 2, backgroundColor: colors.primary,
  },
  iconWrap: {
    width: 44, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.primaryGhost },
  tabLabel: { fontSize: 10, fontWeight: '700', marginTop: 2, letterSpacing: 0.2 },
});
