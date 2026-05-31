import React, { useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Text,
  SafeAreaView,
} from "react-native";
import { useAuthStore } from "../../store/authStore";
import { authAPI } from "../../api/endpoints";

export default function Header() {
  const { clearAuth, nickname, email } = useAuthStore();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {}
    await clearAuth();
    setDropdownVisible(false);
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setDropdownVisible(true)}
          >
            <Image
              source={require("../../../assets/user-icon.png")}
              style={styles.icon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 드롭다운 */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.dropdown}>
            {/* 닉네임 + 이메일 */}
            <View style={styles.profileSection}>
              <Text style={styles.nicknameText}>{nickname ?? "사용자"}</Text>
              <Text style={styles.emailText}>{email ?? ""}</Text>
            </View>

            <View style={styles.divider} />

            {/* 의견 보내기 */}
            <TouchableOpacity style={styles.dropdownItem}>
              <Image
                source={require("../../../assets/dropdown-opinion.png")}
                style={styles.dropdownIcon}
                resizeMode="contain"
              />
              <Text style={styles.dropdownText}>의견 보내기</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* 로그아웃 */}
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={handleLogout}
            >
              <Image
                source={require("../../../assets/dropdown-logout.png")}
                style={styles.dropdownIcon}
                resizeMode="contain"
              />
              <Text style={[styles.dropdownText, styles.logoutText]}>
                로그아웃
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#0D0B1E",
    borderBottomWidth: 1,
    borderBottomColor: "#1E1C35",
  },
  container: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
  },
  iconButton: {
    width: 70,
    height: 70,
  },
  icon: {
    width: 90,
    height: 65,
    borderRadius: 26,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 16,
  },
  dropdown: {
    backgroundColor: "#1A1830",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2845",
    minWidth: 220,
    overflow: "hidden",
  },

  // 프로필 섹션
  profileSection: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 4,
  },
  nicknameText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  emailText: {
    color: "#8888AA",
    fontSize: 13,
  },

  // 메뉴 아이템
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 20,
    gap: 10,
  },
  dropdownIcon: {
    width: 40,
    height: 40,
    marginLeft: -10,
  },
  dropdownText: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  logoutText: {
    color: "#E05555",
  },
  divider: {
    height: 1,
    backgroundColor: "#2A2845",
  },
});
