import {
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { ContentItem, Domain } from "../../types";
import { Colors } from "../../constants/colors";

interface ContentDetailSheetProps {
  visible: boolean;
  item: ContentItem | null;
  onStartObsession: (item: ContentItem) => void;
  onClose: () => void;
}

const DOMAIN_COLORS: Record<Domain, string> = {
  movie: Colors.domain.movie,
  book: Colors.domain.book,
  music: Colors.domain.music,
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

  // 크리에이터 + 연도 메타 정보 구성 (도메인별 분기)
  const metaParts: string[] = [];
  if (item.domain === "movie") {
    if (item.metadata?.director) metaParts.push(item.metadata.director);
    if (item.year) metaParts.push(String(item.year));
  } else if (item.domain === "music") {
    if (item.metadata?.artist) metaParts.push(item.metadata.artist);
  } else if (item.domain === "book") {
    if (item.metadata?.author) metaParts.push(item.metadata.author);
    if (item.year) metaParts.push(String(item.year));
  }
  const metaText = metaParts.join(" · ");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalBox} onPress={() => {}}>
          {/* 이미지 */}
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : null}

          {/* X 닫기 버튼 */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {/* 도메인 배지 */}
          <View
            style={[
              styles.domainBadge,
              { backgroundColor: DOMAIN_COLORS[item.domain] },
            ]}
          >
            <Text style={styles.domainBadgeText}>
              {DOMAIN_LABELS[item.domain]}
            </Text>
          </View>

          {/* 제목 */}
          <Text style={styles.title}>{item.title}</Text>

          {/* 크리에이터 + 연도 */}
          {metaText ? (
            <Text style={styles.creatorText}>{metaText}</Text>
          ) : null}

          <View style={styles.divider} />

          {/* 설명 */}
          {item.description && (
            <View style={styles.descBox}>
              <Text style={styles.descText}>{item.description}</Text>
            </View>
          )}

          {/* 영화 장르 태그 */}
          {item.domain === "movie" &&
            item.metadata?.genres &&
            item.metadata.genres.length > 0 && (
              <View style={styles.tagRow}>
                {item.metadata.genres.map((g, i) => (
                  <View key={i} style={styles.genreTag}>
                    <Text style={styles.genreTagText}>{g}</Text>
                  </View>
                ))}
              </View>
            )}

          <View style={styles.divider} />

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
    backgroundColor: Colors.background.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: Colors.background.nebulaBase,
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 20,
    width: "90%",
    maxWidth: 500,
  },
  thumbnail: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: Colors.text.dusk,
  },
  domainBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  domainBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text.starlight,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text.starlight,
    marginBottom: 6,
  },
  creatorText: {
    fontSize: 13,
    color: Colors.text.moonmist,
    marginTop: 4,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.background.comet,
    marginBottom: 12,
  },
  descBox: {
    backgroundColor: Colors.background.dust,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  descText: {
    fontSize: 14,
    color: Colors.text.moonmist,
    lineHeight: 22,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  genreTag: {
    backgroundColor: Colors.background.dust,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  genreTagText: {
    fontSize: 12,
    color: Colors.text.moonmist,
  },
  startBtn: {
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: Colors.accent.primaryButton,
    borderRadius: 12,
    marginBottom: 8,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: Colors.background.dust,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.moonmist,
  },
});
