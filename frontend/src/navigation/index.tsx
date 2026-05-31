import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';

import { useAuthStore } from '../store/authStore';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeStack from './HomeStack';
import MapCanvas from '../screens/MapCanvas';
import ArchiveScreen from '../screens/ArchiveScreen';

const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainTab() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeStack} options={{ title: '홈' }} />
      <Tab.Screen name="Map" component={MapCanvas} options={{ title: '지도' }} />
      <Tab.Screen name="Archive" component={ArchiveScreen} options={{ title: '아카이브' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { isLoggedIn, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  return (
    <NavigationContainer>
      {isLoggedIn ? <MainTab /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
