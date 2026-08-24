import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { AppIcon, COLORS, CoverArt, EmptyState } from "@/components/music-ui";
import { MiniPlayer } from "@/components/mini-player";
import { ScreenContainer } from "@/components/screen-container";
import { useMusic } from "@/lib/music-provider";

export default function LibraryReviewScreen() {
  const router = useRouter();
  const { allTracks, setTrackHidden, setTracksHidden } = useMusic();
  const [showHidden, setShowHidden] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const tracks = useMemo(() => allTracks.filter((track) => Boolean(track.hidden) === showHidden), [allTracks, showHidden]);
  const visibleCount = allTracks.filter((track) => !track.hidden).length;
  const hiddenCount = allTracks.length - visibleCount;
  const allSelected = tracks.length > 0 && selectedIds.length === tracks.length;

  const changeSegment = (hidden: boolean) => {
    setShowHidden(hidden);
    setSelectedIds([]);
  };
  const toggleSelection = () => {
    setIsSelecting((current) => !current);
    setSelectedIds([]);
  };
  const toggleTrack = (trackId: string) => setSelectedIds((current) => current.includes(trackId) ? current.filter((id) => id !== trackId) : [...current, trackId]);
  const applyBulkVisibility = () => {
    setTracksHidden(selectedIds, !showHidden);
    setSelectedIds([]);
    setIsSelecting(false);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1" containerClassName="bg-background">
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><AppIcon name="arrow-back" size={24} color={COLORS.text} /></Pressable>
        <View style={styles.topCopy}><Text style={styles.eyebrow}>BIBLIOTECA</Text><Text style={styles.title}>Revisar faixas</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={isSelecting ? "Cancelar seleção" : "Selecionar faixas"} onPress={toggleSelection} style={({ pressed }) => [styles.selectButton, isSelecting && styles.selectButtonActive, pressed && styles.pressed]}><Text style={[styles.selectButtonText, isSelecting && styles.selectButtonTextActive]}>{isSelecting ? "Cancelar" : "Selecionar"}</Text></Pressable>
      </View>
      <Text style={styles.description}>Ocultar remove a faixa das listas e da reprodução sem apagar o arquivo original ou alterar playlists.</Text>
      <View style={styles.segmented}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: !showHidden }} onPress={() => changeSegment(false)} style={({ pressed }) => [styles.segment, !showHidden && styles.segmentActive, pressed && styles.pressed]}><Text style={[styles.segmentText, !showHidden && styles.segmentTextActive]}>Visíveis · {visibleCount}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: showHidden }} onPress={() => changeSegment(true)} style={({ pressed }) => [styles.segment, showHidden && styles.segmentActive, pressed && styles.pressed]}><Text style={[styles.segmentText, showHidden && styles.segmentTextActive]}>Ocultas · {hiddenCount}</Text></Pressable>
      </View>
      {isSelecting ? <View style={styles.selectionTools}><Text style={styles.selectionHint}>Toque nas faixas para marcá-las.</Text><Pressable accessibilityRole="button" onPress={() => setSelectedIds(allSelected ? [] : tracks.map((track) => track.id))} style={({ pressed }) => [styles.selectAll, pressed && styles.pressed]}><Text style={styles.selectAllText}>{allSelected ? "Desmarcar todas" : "Selecionar todas"}</Text></Pressable></View> : null}
      <FlatList
        style={styles.flatList}
        data={tracks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const selected = selectedIds.includes(item.id);
          return <View style={[styles.row, isSelecting && selected && styles.rowSelected]}>
            {isSelecting ? <Pressable accessibilityRole="checkbox" accessibilityLabel={`Selecionar ${item.title}`} accessibilityState={{ checked: selected }} onPress={() => toggleTrack(item.id)} style={({ pressed }) => [styles.checkboxButton, pressed && styles.pressed]}><View style={[styles.checkbox, selected && styles.checkboxActive]}>{selected ? <AppIcon name="check" size={16} color={COLORS.background} /> : null}</View></Pressable> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={isSelecting ? `Selecionar ${item.title}` : `Editar ${item.title}`} onPress={() => isSelecting ? toggleTrack(item.id) : router.push({ pathname: "/track/[id]", params: { id: item.id } } as never)} style={({ pressed }) => [styles.trackPress, pressed && styles.pressed]}>
              <CoverArt track={item} size={48} borderRadius={13} />
              <View style={styles.copy}><Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.trackMeta} numberOfLines={1}>{item.artist} · {item.album}</Text></View>
            </Pressable>
            {!isSelecting ? <Pressable accessibilityRole="button" accessibilityLabel={showHidden ? `Restaurar ${item.title}` : `Ocultar ${item.title}`} onPress={() => setTrackHidden(item.id, !showHidden)} style={({ pressed }) => [styles.visibilityButton, pressed && styles.pressed]}>
              <AppIcon name={showHidden ? "visibility" : "visibility-off"} size={20} color={showHidden ? COLORS.primary : COLORS.muted} />
              <Text style={[styles.visibilityLabel, showHidden && styles.restoreLabel]}>{showHidden ? "Restaurar" : "Ocultar"}</Text>
            </Pressable> : null}
          </View>;
        }}
        ListEmptyComponent={<EmptyState title={showHidden ? "Nenhuma faixa oculta" : "Nada para revisar"} description={showHidden ? "As músicas ocultadas ficam aqui e podem ser restauradas a qualquer momento." : "Importe músicas ou faça uma pesquisa no armazenamento para organizar a biblioteca."} icon={showHidden ? "visibility" : "library-music"} />}
      />
      {isSelecting && selectedIds.length ? <View style={styles.bulkBar}><Text style={styles.bulkCount}>{selectedIds.length} {selectedIds.length === 1 ? "faixa selecionada" : "faixas selecionadas"}</Text><Pressable accessibilityRole="button" onPress={applyBulkVisibility} style={({ pressed }) => [styles.bulkAction, pressed && styles.pressed]}><AppIcon name={showHidden ? "visibility" : "visibility-off"} size={19} color={COLORS.background} /><Text style={styles.bulkActionText}>{showHidden ? "Restaurar selecionadas" : "Ocultar selecionadas"}</Text></Pressable></View> : null}
      <MiniPlayer />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 }, back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, topCopy: { flex: 1, gap: 1 }, eyebrow: { color: COLORS.primary, fontSize: 9, lineHeight: 13, letterSpacing: 1.2, fontWeight: "900" }, title: { color: COLORS.text, fontSize: 23, lineHeight: 29, fontWeight: "900" }, selectButton: { minHeight: 38, paddingHorizontal: 7, justifyContent: "center", borderRadius: 11 }, selectButtonActive: { backgroundColor: "rgba(167,139,250,0.10)" }, selectButtonText: { color: COLORS.primary, fontSize: 12, fontWeight: "900" }, selectButtonTextActive: { color: COLORS.muted },
  description: { color: COLORS.muted, fontSize: 13, lineHeight: 19, paddingHorizontal: 20, paddingBottom: 16 }, segmented: { flexDirection: "row", marginHorizontal: 18, padding: 3, borderRadius: 15, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line }, segment: { flex: 1, minHeight: 38, justifyContent: "center", alignItems: "center", borderRadius: 12 }, segmentActive: { backgroundColor: COLORS.surfaceElevated }, segmentText: { color: COLORS.muted, fontSize: 12, lineHeight: 17, fontWeight: "800" }, segmentTextActive: { color: COLORS.primary },
  selectionTools: { minHeight: 43, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 }, selectionHint: { color: COLORS.muted, fontSize: 12, lineHeight: 17 }, selectAll: { minHeight: 35, justifyContent: "center", paddingHorizontal: 4 }, selectAllText: { color: COLORS.primary, fontSize: 12, fontWeight: "900" },
  flatList: { flex: 1 }, list: { paddingTop: 12, paddingBottom: 92 }, row: { minHeight: 68, flexDirection: "row", alignItems: "center", paddingLeft: 18, paddingRight: 12, gap: 8 }, rowSelected: { backgroundColor: "rgba(167,139,250,0.10)" }, checkboxButton: { minHeight: 48, minWidth: 30, justifyContent: "center", alignItems: "center" }, checkbox: { width: 23, height: 23, borderRadius: 7, borderWidth: 1.5, borderColor: COLORS.faint, justifyContent: "center", alignItems: "center" }, checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary }, trackPress: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0 }, copy: { flex: 1, minWidth: 0, gap: 2 }, trackTitle: { color: COLORS.text, fontSize: 15, lineHeight: 20, fontWeight: "800" }, trackMeta: { color: COLORS.muted, fontSize: 12, lineHeight: 17 }, visibilityButton: { minHeight: 42, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 12 }, visibilityLabel: { color: COLORS.muted, fontSize: 11, fontWeight: "800" }, restoreLabel: { color: COLORS.primary },
  bulkBar: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.background }, bulkCount: { color: COLORS.muted, fontSize: 12, lineHeight: 17, fontWeight: "700", textAlign: "center" }, bulkAction: { minHeight: 45, borderRadius: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, backgroundColor: COLORS.primary }, bulkActionText: { color: COLORS.background, fontSize: 13, fontWeight: "900" }, pressed: { opacity: 0.68 },
});
