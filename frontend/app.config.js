module.exports = {
  expo: {
    name: "molib",
    slug: "molib",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.taennny.molib",
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true
        }
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png"
      },
      predictiveBackGestureEnabled: false,
      package: "com.taennny.molib"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-secure-store"
    ],
    extra: {
      eas: {
        projectId: "971922f5-efd0-45ff-804e-25bda1218787"
      },
      // 환경변수를 extra에 추가 (Constants.expoConfig.extra로 접근 가능)
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "http://43.200.172.193:8000"
    }
  }
};
