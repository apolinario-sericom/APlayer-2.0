import { useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { EmptyState, IconButton, TrackRow } from "@/components/music-ui";
import { MiniPlayer } from "@/components/mini-player";
import { ScreenContainer } from "@/components/screen-container";
import { useAPlayerTheme } from "@/lib/aplayer-theme";
import { getFavoriteTracks } from "@/lib/library-collections";
import { useMusic } from "@/lib/music-provider";

export default function FavoritesScreen() {
  const router = useRouter();
  const { palette } = useAPlayerTheme();
  const { tracks, currentTrackId, playTrack, toggleFavorite } = useMusic();
  const favorites = getFavoriteTracks(tracks);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1">
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<View style={styles.header}><IconButton icon="arrow-back" label="Voltar" onPress={() => router.back()} /><View style={styles.headerCopy}><Text style={[styles.title, { color: palette.text }]}>Favoritas</Text><Text style={[styles.subtitle, { color: palette.muted }]}>{favorites.length} {favorites.length === 1 ? "música salva" : "músicas salvas"}</Text></View></View>}
        renderItem={({ item, index }) => <TrackRow track={item} index={index} isActive={item.id === currentTrackId} onPress={() => void playTrack(item.id, favorites.map((track) => track.id))} onToggleFavorite={() => toggleFavorite(item.id)} onMore={() => router.push({ pathname: "/track/[id]", params: { id: item.id } } as never)} />}
        ListEmptyComponent={<EmptyState title="Nenhuma favorita ainda" description="Toque no coração ao lado de qualquer música para salvá-la aqui." icon="favorite-border" />}
      />
      <MiniPlayer />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 8, paddingBottom: 18 },
  header: { minHeight: 60, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  headerCopy: { flex: 1 },
  title: { fontSize: 25, lineHeight: 32, fontWeight: "900" },
  subtitle: { fontSize: 13, lineHeight: 18 },
});
