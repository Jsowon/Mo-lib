import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { Image, View } from 'react-native';

import { useAuthStore } from '../store/authStore';
import { Colors } from '../constants/colors';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeStack from './HomeStack';
import MapCanvas from '../screens/MapCanvas';
import ArchiveScreen from '../screens/ArchiveScreen';

const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: {
    default: require('../../assets/icon-home.png'),
    active: require('../../assets/icon-home(choice).png'),
  },
  Map: {
    default: require('../../assets/icon-journey.png'),
    active: require('../../assets/icon-journey(choice).png'),
  },
  Archive: {
    default: require('../../assets/icon-archive.png'),
    active: require('../../assets/icon-archive(choice).png'),
  },
};

function TabIcon({ name, focused }: { name: keyof typeof TAB_ICONS; focused: boolean }) {
  const icons = TAB_ICONS[name];
  return (
    <View style={{
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: focused ? Colors.accent.subtle : Colors.ui.transparent,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Image
        source={focused ? icons.active : icons.default}
        style={{ width: 24, height: 24 }}
        resizeMode="contain"
      />
    </View>
  );
}

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
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.background.input,
          borderTopWidth: 0,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.accent.primary,
        tabBarInactiveTintColor: Colors.text.tertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          title: '홈',
          tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapCanvas}
        options={{
          title: '지도',
          tabBarIcon: ({ focused }) => <TabIcon name="Map" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Archive"
        component={ArchiveScreen}
        options={{
          title: '아카이브',
          tabBarIcon: ({ focused }) => <TabIcon name="Archive" focused={focused} />,
        }}
      />
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
