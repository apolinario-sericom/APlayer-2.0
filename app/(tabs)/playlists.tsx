import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { CoverArt, COLORS, EmptyState, PrimaryButton } from "@/components/music-ui";
import { MiniPlayer } from "@/components/mini-player";
import { ScreenContainer } from "@/components/screen-container";
import { useMusic } from "@/lib/music-provider";

export default function PlaylistsScreen() {
  const router = useRouter();
  const { playlists, createPlaylist } = useMusic();

  const createAndOpen = () => {
    const playlistId = createPlaylist("Nova playlist");
    router.push({ pathname: "/playlist/[id]", params: { id: playlistId } } as never);
  };

  return (
    <ScreenContainer className="flex-1" containerClassName="bg-background">
      <FlatList
        data={playlists}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={playlists.length > 1 ? styles.columns : undefined}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<View style={styles.header}><View><Text style={styles.title}>Playlists</Text><Text style={styles.subtitle}>Coleções sem limite, do seu jeito.</Text></View><View style={styles.addWrap}><PrimaryButton label="Nova" icon="add" onPress={createAndOpen} /></View></View>}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: "/playlist/[id]", params: { id: item.id } } as never)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.72 }]}>
            <CoverArt title={item.title} artworkUri={item.artworkUri} size={158} borderRadius={23} style={styles.cover} />
            <Text numberOfLines={1} style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardCount}>{item.trackIds.length} {item.trackIds.length === 1 ? "música" : "músicas"}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState title="Organize seus momentos" description="Crie uma playlist e dê a ela um nome e uma capa. Você poderá adicionar quantas quiser." icon="queue-music" />}
      />
      <MiniPlayer />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 18, gap: 18 },
  header: { paddingHorizontal: 2, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { color: COLORS.text, fontSize: 29, lineHeight: 36, fontWeight: "900" },
  subtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 18, marginTop: 2, maxWidth: 205 },
  addWrap: { minWidth: 92 },
  columns: { justifyContent: "space-between" },
  card: { width: "48%", marginBottom: 18, gap: 8 },
  cover: { width: "100%", aspectRatio: 1, height: undefined },
  cardTitle: { color: COLORS.text, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  cardCount: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
});
