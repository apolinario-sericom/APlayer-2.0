import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CoverArt, COLORS, IconButton } from "@/components/music-ui";
import { useMusic } from "@/lib/music-provider";

export function MiniPlayer() {
  const router = useRouter();
  const { currentTrack, isPlaying, togglePlayback } = useMusic();

  if (!currentTrack) return null;

  return (
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir player" onPress={() => router.push("/player" as never)} style={({ pressed }) => [styles.player, pressed && { opacity: 0.84 }]}>
        <CoverArt track={currentTrack} size={42} borderRadius={11} />
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
        </View>
      </Pressable>
      <IconButton icon={isPlaying ? "pause" : "play-arrow"} label={isPlaying ? "Pausar" : "Reproduzir"} onPress={() => void togglePlayback()} size={28} containerStyle={styles.playButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 64, marginHorizontal: 12, marginBottom: 8, borderRadius: 18, overflow: "hidden", flexDirection: "row", alignItems: "center", backgroundColor: "rgba(32, 32, 49, 0.98)", borderWidth: 1, borderColor: "#302F44" },
  player: { flex: 1, minWidth: 0, height: "100%", alignItems: "center", flexDirection: "row", gap: 11, paddingLeft: 10 },
  meta: { flex: 1, minWidth: 0, gap: 1 },
  title: { color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: "800" },
  artist: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  playButton: { marginHorizontal: 8, backgroundColor: "rgba(167,139,250,0.12)" },
});
