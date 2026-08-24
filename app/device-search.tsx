import { useMemo, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { AppIcon, COLORS, CoverArt, EmptyState, PrimaryButton } from "@/components/music-ui";
import { MiniPlayer } from "@/components/mini-player";
import { ScreenContainer } from "@/components/screen-container";
import { useMusic } from "@/lib/music-provider";
import type { MusicTrack } from "@/lib/music-types";

export default function DeviceSearchScreen() {
  const router = useRouter();
  const { settings, previewDeviceAudio, importPreviewedTracks } = useMusic();
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const allSelected = results.length > 0 && selectedIds.length === results.length;
  const selectedTracks = useMemo(() => results.filter((track) => selectedIds.includes(track.id)), [results, selectedIds]);
  const sourceCopy = settings.selectedMediaAlbumIds.length
    ? `${settings.selectedMediaAlbumIds.length} ${settings.selectedMediaAlbumIds.length === 1 ? "local selecionado" : "locais selecionados"}`
    : "todos os locais elegíveis";

  const search = async () => {
    setIsSearching(true);
    const found = await previewDeviceAudio();
    setIsSearching(false);
    if (found) {
      setResults(found);
      setSelectedIds([]);
      setHasSearched(true);
    }
  };

  const toggleTrack = (trackId: string) => {
    setSelectedIds((current) => current.includes(trackId) ? current.filter((id) => id !== trackId) : [...current, trackId]);
  };

  const toggleAll = () => setSelectedIds(allSelected ? [] : results.map((track) => track.id));

  const importSelected = () => {
    const result = importPreviewedTracks(selectedTracks);
    Alert.alert(
      "Músicas adicionadas",
      `${result.imported} ${result.imported === 1 ? "música foi adicionada" : "músicas foram adicionadas"}${result.skipped ? ` · ${result.skipped} já estavam na biblioteca` : ""}.`,
      [{ text: "Ver biblioteca", onPress: () => router.back() }],
    );
    setResults((current) => current.filter((track) => !selectedIds.includes(track.id)));
    setSelectedIds([]);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1" containerClassName="bg-background">
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><AppIcon name="arrow-back" size={24} color={COLORS.text} /></Pressable>
        <View style={styles.topCopy}><Text style={styles.eyebrow}>ARMAZENAMENTO</Text><Text style={styles.title}>Pesquisar músicas</Text></View>
      </View>
      <View style={styles.notice}><AppIcon name="shield" size={20} color={COLORS.primary} /><Text style={styles.noticeText}>A pesquisa exclui áudios do WhatsApp, Telegram, notas de voz e outros mensageiros. Nada é adicionado até você confirmar.</Text></View>
      <Pressable accessibilityRole="button" onPress={() => router.push("/discovery-sources" as never)} style={({ pressed }) => [styles.sourceRow, pressed && styles.pressed]}>
        <View style={styles.sourceIcon}><AppIcon name="folder" size={20} color={COLORS.primary} /></View>
        <View style={styles.sourceCopy}><Text style={styles.sourceTitle}>Locais da pesquisa</Text><Text style={styles.sourceDescription}>Buscando em {sourceCopy}.</Text></View>
        <AppIcon name="chevron-right" size={22} color={COLORS.faint} />
      </Pressable>
      {Platform.OS === "web" ? <EmptyState title="Disponível no celular" description="No navegador, use a importação manual pela Biblioteca." icon="phonelink" /> : (
        <FlatList
          style={styles.list}
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<View style={styles.listHeader}><PrimaryButton label={isSearching ? "Pesquisando..." : hasSearched ? "Pesquisar novamente" : "Pesquisar agora"} icon={isSearching ? "hourglass-empty" : "search"} onPress={() => { if (!isSearching) void search(); }} />{hasSearched && results.length ? <View style={styles.resultsHeader}><Text style={styles.resultsCount}>{results.length} {results.length === 1 ? "música encontrada" : "músicas encontradas"}</Text><Pressable accessibilityRole="button" onPress={toggleAll} style={({ pressed }) => [styles.selectAll, pressed && styles.pressed]}><Text style={styles.selectAllText}>{allSelected ? "Desmarcar todas" : "Selecionar todas"}</Text></Pressable></View> : null}</View>}
          renderItem={({ item }) => {
            const selected = selectedIds.includes(item.id);
            return <Pressable accessibilityRole="checkbox" accessibilityLabel={`Selecionar ${item.title}`} accessibilityState={{ checked: selected }} onPress={() => toggleTrack(item.id)} style={({ pressed }) => [styles.trackRow, selected && styles.trackRowSelected, pressed && styles.pressed]}><View style={[styles.checkbox, selected && styles.checkboxActive]}>{selected ? <AppIcon name="check" size={16} color={COLORS.background} /> : null}</View><CoverArt track={item} size={48} borderRadius={13} /><View style={styles.trackCopy}><Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.trackMeta} numberOfLines={1}>{item.artist} · {item.album}</Text></View></Pressable>;
          }}
          ListEmptyComponent={hasSearched ? <EmptyState title="Nenhuma música nova encontrada" description="Verifique os locais escolhidos ou pesquise outra pasta do aparelho." icon="search-off" /> : <EmptyState title="Pesquise antes de adicionar" description="Você verá as músicas encontradas e poderá selecionar somente as que deseja manter na biblioteca." icon="search" />}
        />
      )}
      {selectedIds.length > 0 ? <View style={styles.actionBar}><Text style={styles.actionCount}>{selectedIds.length} {selectedIds.length === 1 ? "selecionada" : "selecionadas"}</Text><PrimaryButton label="Adicionar à biblioteca" icon="library-add" onPress={importSelected} /></View> : null}
      <MiniPlayer />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 }, back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, topCopy: { flex: 1, gap: 1 }, eyebrow: { color: COLORS.primary, fontSize: 9, lineHeight: 13, letterSpacing: 1.2, fontWeight: "900" }, title: { color: COLORS.text, fontSize: 23, lineHeight: 29, fontWeight: "900" },
  notice: { marginHorizontal: 18, padding: 13, flexDirection: "row", gap: 10, borderRadius: 17, backgroundColor: "rgba(167,139,250,0.10)", borderWidth: 1, borderColor: "rgba(167,139,250,0.18)" }, noticeText: { flex: 1, color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  sourceRow: { minHeight: 70, marginHorizontal: 18, marginTop: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line }, sourceIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(167,139,250,0.09)" }, sourceCopy: { flex: 1, minWidth: 0, gap: 2 }, sourceTitle: { color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: "800" }, sourceDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  list: { flex: 1 }, listContent: { paddingVertical: 14, paddingBottom: 108 }, listHeader: { paddingHorizontal: 18, paddingBottom: 8 }, resultsHeader: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 13 }, resultsCount: { color: COLORS.muted, fontSize: 12, lineHeight: 17, fontWeight: "700" }, selectAll: { minHeight: 36, justifyContent: "center", paddingHorizontal: 4 }, selectAllText: { color: COLORS.primary, fontSize: 12, fontWeight: "900" },
  trackRow: { minHeight: 68, marginHorizontal: 18, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 17 }, trackRowSelected: { backgroundColor: "rgba(167,139,250,0.10)" }, checkbox: { width: 23, height: 23, borderRadius: 7, borderWidth: 1.5, borderColor: COLORS.faint, alignItems: "center", justifyContent: "center" }, checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary }, trackCopy: { flex: 1, minWidth: 0, gap: 2 }, trackTitle: { color: COLORS.text, fontSize: 15, lineHeight: 20, fontWeight: "800" }, trackMeta: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  actionBar: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.background }, actionCount: { color: COLORS.muted, fontSize: 12, lineHeight: 17, fontWeight: "700", textAlign: "center" }, pressed: { opacity: 0.7 },
});
