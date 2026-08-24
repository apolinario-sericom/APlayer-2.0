import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { CoverArt, COLORS, EmptyState, IconButton, PrimaryButton, TrackRow } from "@/components/music-ui";
import { MiniPlayer } from "@/components/mini-player";
import { ScreenContainer } from "@/components/screen-container";
import { useMusic } from "@/lib/music-provider";

export default function HomeScreen() {
  const router = useRouter();
  const { currentTrack, isPlaying, playlists, recentTracks, tracks, playTrack, togglePlayback, toggleFavorite } = useMusic();
  const visibleTracks = tracks.filter((track) => !track.hidden);
  const favoriteCount = visibleTracks.filter((track) => track.favorite).length;
  const resumeTracks = recentTracks.slice(0, 6);

  return (
    <ScreenContainer className="flex-1" containerClassName="bg-background">
      <FlatList
        data={resumeTracks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.brand}>APlayer</Text>
                <Text style={styles.subtitle}>Seu som, sem distrações.</Text>
              </View>
              <IconButton icon="search" label="Pesquisar biblioteca" onPress={() => router.push("/(tabs)/library" as never)} containerStyle={styles.headerAction} />
            </View>

            {currentTrack ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Abrir música tocando" onPress={() => router.push("/player" as never)} style={({ pressed }) => [styles.nowPlaying, pressed && { opacity: 0.84 }]}>
                <CoverArt track={currentTrack} size={62} borderRadius={16} />
                <View style={styles.nowDetails}>
                  <Text style={styles.nowBadge}>EM REPRODUÇÃO</Text>
                  <Text numberOfLines={1} style={styles.nowTitle}>{currentTrack.title}</Text>
                  <Text numberOfLines={1} style={styles.nowArtist}>{currentTrack.artist}</Text>
                </View>
                <IconButton icon={isPlaying ? "pause" : "play-arrow"} label={isPlaying ? "Pausar" : "Reproduzir"} onPress={() => void togglePlayback()} size={27} containerStyle={styles.nowAction} />
              </Pressable>
            ) : (
              <View style={styles.welcomeCard}>
                <View style={styles.welcomeCopy}>
                  <Text style={styles.welcomeTitle}>Tudo pronto para ouvir</Text>
                  <Text style={styles.welcomeDescription}>Adicione músicas para começar sua biblioteca.</Text>
                </View>
                <PrimaryButton label="Adicionar" icon="add" onPress={() => router.push("/(tabs)/library" as never)} />
              </View>
            )}

            <View style={styles.libraryLine}>
              <Text style={styles.librarySummary}>{visibleTracks.length} {visibleTracks.length === 1 ? "música" : "músicas"} <Text style={styles.dot}>·</Text> {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Abrir músicas favoritas" onPress={() => router.push("/favorites" as never)}>
                <Text style={styles.favoriteLink}>{favoriteCount} favoritas</Text>
              </Pressable>
            </View>

            <View style={styles.quickActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Abrir biblioteca" onPress={() => router.push("/(tabs)/library" as never)} style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}>
                <Text style={styles.quickTitle}>Biblioteca</Text>
                <Text style={styles.quickMeta}>Todas as faixas</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Abrir playlists" onPress={() => router.push("/(tabs)/playlists" as never)} style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}>
                <Text style={styles.quickTitle}>Playlists</Text>
                <Text style={styles.quickMeta}>Suas coleções</Text>
              </Pressable>
            </View>

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Retomar</Text>
              {recentTracks.length > 0 ? <Text style={styles.sectionMeta}>Recentes</Text> : null}
            </View>
          </>
        }
        renderItem={({ item, index }) => <TrackRow track={item} index={index} onPress={() => void playTrack(item.id, resumeTracks.map((track) => track.id))} onToggleFavorite={() => toggleFavorite(item.id)} onMore={() => router.push({ pathname: "/track/[id]", params: { id: item.id } } as never)} />}
        ListEmptyComponent={<EmptyState title="Nenhuma música recente" description="Quando você ouvir uma faixa, ela ficará disponível aqui para retomar rapidamente." icon="history" />}
      />
      <MiniPlayer />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 14 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { color: COLORS.text, fontSize: 25, lineHeight: 31, fontWeight: "900", letterSpacing: -0.6 },
  subtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 18, marginTop: 1 },
  headerAction: { backgroundColor: COLORS.surface },
  nowPlaying: { marginHorizontal: 18, minHeight: 86, padding: 12, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line },
  nowDetails: { flex: 1, minWidth: 0, gap: 1 },
  nowBadge: { color: COLORS.primary, fontSize: 9, letterSpacing: 1.1, fontWeight: "900", lineHeight: 14 },
  nowTitle: { color: COLORS.text, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  nowArtist: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  nowAction: { backgroundColor: "rgba(167,139,250,0.14)" },
  welcomeCard: { marginHorizontal: 18, minHeight: 92, padding: 16, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, flexDirection: "row", alignItems: "center", gap: 12 },
  welcomeCopy: { flex: 1, gap: 3 },
  welcomeTitle: { color: COLORS.text, fontSize: 16, lineHeight: 21, fontWeight: "900" },
  welcomeDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  libraryLine: { marginHorizontal: 20, marginTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  librarySummary: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  dot: { color: COLORS.faint },
  favoriteLink: { color: COLORS.primary, fontSize: 12, lineHeight: 18, fontWeight: "800" },
  quickActions: { paddingHorizontal: 18, marginTop: 16, flexDirection: "row", gap: 10 },
  quickAction: { flex: 1, minHeight: 68, paddingHorizontal: 14, paddingVertical: 12, justifyContent: "center", borderRadius: 16, backgroundColor: "rgba(167,139,250,0.08)", borderWidth: 1, borderColor: "rgba(167,139,250,0.22)" },
  quickActionPressed: { opacity: 0.72 },
  quickTitle: { color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: "800" },
  quickMeta: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  sectionHeading: { marginTop: 24, paddingHorizontal: 20, paddingBottom: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: COLORS.text, fontSize: 18, lineHeight: 24, fontWeight: "900" },
  sectionMeta: { color: COLORS.faint, fontSize: 11, lineHeight: 16, fontWeight: "700" },
});
