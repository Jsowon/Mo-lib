import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useEffect } from "react";
import { Image, View } from "react-native";

import { useAuthStore } from "../store/authStore";
import OnboardingScreen from "../screens/OnboardingScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeStack from "./HomeStack";
import MapScreen from "../screens/MapScreen";
import ArchiveScreen from "../screens/ArchiveScreen";

import { RootTabParamList } from "./types";

const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator<RootTabParamList>();

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
          backgroundColor: "#1E293B",
          borderTopColor: "#1E293B",
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#D97BA0",
        tabBarInactiveTintColor: "#6B7280",
        tabBarLabelStyle: {
          marginTop: 6,
          fontSize: 12,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          title: "홈",
          tabBarIcon: ({ size, focused }) => (
            <View
              style={{
                width: size + 20,
                height: size + 20,
                borderRadius: (size + 20) / 2,
                backgroundColor: focused ? "#2A1F3D" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                source={
                  focused
                    ? require("../../assets/icon-home(choice).png")
                    : require("../../assets/icon-home.png")
                }
                style={{ width: size, height: size }}
                resizeMode="contain"
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: "여정",
          tabBarIcon: ({ size, focused }) => (
            <View
              style={{
                width: size + 20,
                height: size + 20,
                borderRadius: (size + 20) / 2,
                backgroundColor: focused ? "#2A1F3D" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                source={
                  focused
                    ? require("../../assets/icon-journey(choice).png")
                    : require("../../assets/icon-journey.png")
                }
                style={{ width: size, height: size }}
                resizeMode="contain"
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Archive"
        component={ArchiveScreen}
        options={{
          title: "아카이브",
          tabBarIcon: ({ size, focused }) => (
            <View
              style={{
                width: size + 20,
                height: size + 20,
                borderRadius: (size + 20) / 2,
                backgroundColor: focused ? "#2A1F3D" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                source={
                  focused
                    ? require("../../assets/icon-archive(choice).png")
                    : require("../../assets/icon-archive.png")
                }
                style={{ width: size, height: size }}
                resizeMode="contain"
              />
            </View>
          ),
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
      {true ? <MainTab /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
