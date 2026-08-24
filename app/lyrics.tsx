import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { activateKeepAwake, deactivateKeepAwake } from "expo-keep-awake";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS, EmptyState, IconButton, PrimaryButton } from "@/components/music-ui";
import { ScreenContainer } from "@/components/screen-container";
import type { LyricLine } from "@/lib/music-types";
import { useMusic } from "@/lib/music-provider";
import { getActiveLyricIndex } from "@/lib/music-utils";

export default function LyricsScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<LyricLine>>(null);
  const { currentTrack, position, settings } = useMusic();
  const lyricLines = currentTrack?.lyricLines ?? [];
  const activeIndex = getActiveLyricIndex(lyricLines, position);

  useEffect(() => {
    if (!settings.keepScreenAwakeOnLyrics) return;
    void activateKeepAwake("melodia-lyrics");
    return () => { void deactivateKeepAwake("melodia-lyrics"); };
  }, [settings.keepScreenAwakeOnLyrics]);

  useEffect(() => {
    if (!settings.autoScrollLyrics || activeIndex < 0) return;
    listRef.current?.scrollToIndex({ index: activeIndex, animated: true, viewPosition: 0.42 });
  }, [activeIndex, settings.autoScrollLyrics]);

  if (!currentTrack) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1"><View style={styles.emptyWrap}><IconButton icon="arrow-back" label="Voltar" onPress={() => router.back()} /><EmptyState title="Sem música em reprodução" description="Toque uma faixa para abrir suas letras." icon="lyrics" /></View></ScreenContainer>;
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1" containerClassName="bg-background">
      <View style={styles.header}><IconButton icon="arrow-back" label="Voltar ao player" onPress={() => router.back()} /><View style={styles.headerCopy}><Text style={styles.headerTitle} numberOfLines={1}>{currentTrack.title}</Text><Text style={styles.headerArtist} numberOfLines={1}>{currentTrack.artist}</Text></View><IconButton icon="edit" label="Editar letra" onPress={() => router.push({ pathname: "/track/[id]", params: { id: currentTrack.id } } as never)} /></View>
      {lyricLines.length > 0 ? (
        <FlatList
          ref={listRef}
          data={lyricLines}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lyricsList}
          onScrollToIndexFailed={() => undefined}
          renderItem={({ item, index }) => <Pressable onPress={() => item.time !== undefined && router.push("/player" as never)} style={styles.lineWrap}><Text style={[styles.line, index === activeIndex && styles.lineActive, index < activeIndex && styles.linePast]}>{item.text}</Text></Pressable>}
          ListHeaderComponent={<Text style={styles.sectionLabel}>{lyricLines.some((line) => line.time !== undefined) ? "ACOMPANHANDO A MÚSICA" : "LETRA SALVA NO MELodia"}</Text>}
          ListFooterComponent={<Text style={styles.footer}>As letras são salvas localmente e podem ser editadas nos detalhes da música.</Text>}
        />
      ) : (
        <View style={styles.emptyLyrics}><EmptyState title="Ainda não há letra" description="Cole a letra com marcações como [00:12.50] no editor. O APlayer destaca cada trecho enquanto a música toca." icon="lyrics" /><PrimaryButton label="Adicionar letra" icon="edit" onPress={() => router.push({ pathname: "/track/[id]", params: { id: currentTrack.id } } as never)} /></View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { flex: 1, padding: 8 },
  header: { minHeight: 62, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  headerCopy: { flex: 1, minWidth: 0, alignItems: "center" },
  headerTitle: { color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: "900" },
  headerArtist: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  lyricsList: { paddingTop: 14, paddingHorizontal: 32, paddingBottom: 46 },
  sectionLabel: { color: COLORS.primary, fontSize: 10, lineHeight: 16, letterSpacing: 1.35, fontWeight: "900", paddingBottom: 18 },
  lineWrap: { paddingVertical: 10 },
  line: { color: COLORS.muted, fontSize: 22, lineHeight: 31, fontWeight: "800" },
  lineActive: { color: COLORS.text, fontSize: 25, lineHeight: 35 },
  linePast: { color: "#757184" },
  footer: { color: COLORS.faint, fontSize: 12, lineHeight: 18, paddingTop: 26 },
  emptyLyrics: { flex: 1, paddingHorizontal: 24, justifyContent: "center", alignItems: "stretch" },
});
