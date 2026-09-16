import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen         from '../screens/passenger/HomeScreen';
import RidesHistoryScreen from '../screens/passenger/RidesHistoryScreen';
import WalletScreen       from '../screens/passenger/WalletScreen';
import SafetyScreen       from '../screens/passenger/SafetyScreen';
import ProfileScreen      from '../screens/passenger/ProfileScreen';
import SettingsScreen     from '../screens/passenger/SettingsScreen';
import CargoScreen        from '../screens/passenger/CargoScreen';
import DeliveryScreen     from '../screens/passenger/DeliveryScreen';
import FoodScreen         from '../screens/passenger/FoodScreen';
import ChatScreen            from '../screens/shared/ChatScreen';
import DataCallScreen        from '../screens/shared/DataCallScreen';
import RestaurantChatScreen  from '../screens/shared/RestaurantChatScreen';
import { colors, shadows } from '../theme';
import { useAppContext }   from '../context/AppContext';

const Tab         = createBottomTabNavigator();
const HomeStack   = createStackNavigator();
const ProfileStack= createStackNavigator();

function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain"  component={HomeScreen} />
      <HomeStack.Screen name="Cargo"     component={CargoScreen} />
      <HomeStack.Screen name="Delivery"  component={DeliveryScreen} />
      <HomeStack.Screen name="Food"      component={FoodScreen} />
      <HomeStack.Screen name="TripChat"       component={ChatScreen} />
      <HomeStack.Screen name="DataCall"       component={DataCallScreen} />
      <HomeStack.Screen name="RestaurantChat" component={RestaurantChatScreen} />
    </HomeStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="Settings"    component={SettingsScreen} />
    </ProfileStack.Navigator>
  );
}

const TAB_ITEMS = [
  { name: 'Home',    icon: 'home',             iconOut: 'home-outline',          label: 'Home' },
  { name: 'Rides',   icon: 'car-sport',         iconOut: 'car-sport-outline',     label: 'Rides' },
  { name: 'Wallet',  icon: 'wallet',            iconOut: 'wallet-outline',        label: 'Wallet' },
  { name: 'Safety',  icon: 'shield-checkmark',  iconOut: 'shield-outline',        label: 'Safety' },
  { name: 'Profile', icon: 'person-circle',     iconOut: 'person-circle-outline', label: 'Profile' },
];

function CustomTabBar({ state, descriptors, navigation }) {
  const { darkMode } = useAppContext();
  const bg     = darkMode ? colors.darkCard   : colors.white;
  const border = darkMode ? colors.darkBorder : colors.borderLight;

  return (
    <View style={[styles.tabBar, { backgroundColor: bg, borderTopColor: border }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const item = TAB_ITEMS.find(t => t.name === route.name) || TAB_ITEMS[0];
        const color = focused ? colors.primary : (darkMode ? colors.textTertiary : '#9CA3AF');

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={styles.tabItem}
            activeOpacity={0.7}
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

export default function MainNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"    component={HomeStackNav} />
      <Tab.Screen name="Rides"   component={RidesHistoryScreen} />
      <Tab.Screen name="Wallet"  component={WalletScreen} />
      <Tab.Screen name="Safety"  component={SafetyScreen} />
      <Tab.Screen name="Profile" component={ProfileStackNav} />
    </Tab.Navigator>
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
    width: 42,
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
