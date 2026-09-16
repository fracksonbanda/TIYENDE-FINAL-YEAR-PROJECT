import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import OnboardingSelector from '../screens/auth/OnboardingSelector';
import DriverOnboarding from '../screens/auth/DriverOnboarding';
import RestaurantOnboarding from '../screens/auth/RestaurantOnboarding';

const Stack = createStackNavigator();

const fadeTransition = {
  gestureEnabled: false,
  cardStyleInterpolator: ({ current }) => ({
    cardStyle: { opacity: current.progress },
  }),
  transitionSpec: {
    open:  { animation: 'timing', config: { duration: 320 } },
    close: { animation: 'timing', config: { duration: 260 } },
  },
};

export default function AuthNavigator({ initialRouteName = 'Login' }) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false, ...fadeTransition }}
    >
      <Stack.Screen name="Login"                component={LoginScreen} />
      <Stack.Screen name="OnboardingSelector"  component={OnboardingSelector} />
      <Stack.Screen name="DriverOnboarding"    component={DriverOnboarding} />
      <Stack.Screen name="RestaurantOnboarding" component={RestaurantOnboarding} />
    </Stack.Navigator>
  );
}
