import {
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { ContentItem, Domain } from "../../types";

interface ContentDetailSheetProps {
  visible: boolean;
  item: ContentItem | null;
  onStartObsession: (item: ContentItem) => void;
  onClose: () => void;
}

const DOMAIN_COLORS: Record<Domain, string> = {
  movie: "#E8547A",
  book: "#4DAACC",
  music: "#7B61FF",
};

const DOMAIN_LABELS: Record<Domain, string> = {
  movie: "영화",
  book: "도서",
  music: "음악",
};

export default function ContentDetailSheet({
  visible,
  item,
  onStartObsession,
  onClose,
}: ContentDetailSheetProps) {
  if (!item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalBox} onPress={() => {}}>
          {/* X 닫기 버튼 */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {/* 도메인 배지 */}
          <View
            style={[
              styles.domainTag,
              { backgroundColor: DOMAIN_COLORS[item.domain] },
            ]}
          >
            <Text style={styles.domainTagText}>
              {DOMAIN_LABELS[item.domain]}
            </Text>
          </View>

          {/* 제목 */}
          <Text style={styles.modalTitle}>{item.title}</Text>

          {/* 설명 박스 */}
          {item.description && (
            <View style={styles.descriptionBox}>
              <Text style={styles.modalDescription}>{item.description}</Text>
            </View>
          )}

          {/* 과몰입 시작 버튼 */}
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => onStartObsession(item)}
          >
            <Text style={styles.startBtnText}>과몰입 시작</Text>
          </TouchableOpacity>

          {/* 닫기 버튼 */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>닫기</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#1C1C26",
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 20,
    width: "90%",
    maxWidth: 500,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  closeBtnText: {
    fontSize: 20,
    color: "#8A8A9A",
  },
  domainTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  domainTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 8,
    marginBottom: 12,
  },
  descriptionBox: {
    backgroundColor: "#23232F",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  modalDescription: {
    fontSize: 13,
    color: "#FFFFFF",
    lineHeight: 20,
  },
  startBtn: {
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: "#E8547A",
    borderRadius: 12,
    marginBottom: 8,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: "#23232F",
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8A8A9A",
  },
});
