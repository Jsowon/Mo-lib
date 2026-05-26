import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { authAPI } from "../api/endpoints";
import { useAuthStore } from "../store/authStore";

type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Login">;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("알림", "이메일과 비밀번호를 입력해주세요.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("알림", "올바른 이메일 형식을 입력해주세요.");
      return;
    }

    try {
      setLoading(true);
      const res = await authAPI.login({ email, password });
      await setAuth(res.data.access_token, res.data.nickname);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        Alert.alert("로그인 실패", "이메일 또는 비밀번호가 올바르지 않습니다.");
      } else {
        Alert.alert("오류", "로그인 중 오류가 발생했습니다.");
      }
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/auth-bg.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>로그인</Text>
            <Text style={styles.subtitle}>
              Mo:lib에 다시 오신 것을 환영합니다
            </Text>
          </View>

          {/* 입력 폼 */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor="#555577"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.inputLine} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>비밀번호</Text>
              <TextInput
                style={styles.input}
                placeholder="비밀번호를 입력하세요"
                placeholderTextColor="#555577"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <View style={styles.inputLine} />
            </View>
          </View>

          {/* 로그인 버튼 */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "로그인 중..." : "로그인 →"}
            </Text>
          </TouchableOpacity>

          {/* 회원가입 링크 */}
          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>계정이 없으신가요? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.link}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080714",
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#AAAACC",
  },
  form: {
    gap: 28,
    marginBottom: 40,
  },
  inputGroup: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    color: "#AAAACC",
  },
  input: {
    fontSize: 16,
    color: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  inputLine: {
    height: 1,
    backgroundColor: "#333355",
  },
  button: {
    backgroundColor: "#7B6FD4",
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  linkText: {
    color: "#AAAACC",
    fontSize: 14,
  },
  link: {
    color: "#9B8FFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
