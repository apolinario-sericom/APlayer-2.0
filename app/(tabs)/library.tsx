import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Alert, FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppIcon, COLORS, EmptyState, IconButton, PrimaryButton, TrackRow } from "@/components/music-ui";
import { MiniPlayer } from "@/components/mini-player";
import { ScreenContainer } from "@/components/screen-container";
import { useMusic } from "@/lib/music-provider";

export default function LibraryScreen() {
  const router = useRouter();
  const { tracks, playlists, currentTrackId, importAudioFiles, playTrack, toggleFavorite, removeTracks, addTracksToPlaylist, createPlaylistWithTracks } = useMusic();
  const [query, setQuery] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [playlistSheet, setPlaylistSheet] = useState<"choose" | "create" | null>(null);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");

  const filteredTracks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return tracks;
    return tracks.filter((track) => `${track.title} ${track.artist} ${track.album}`.toLocaleLowerCase().includes(normalized));
  }, [query, tracks]);

  const handleImport = async () => {
    setIsImporting(true);
    const result = await importAudioFiles();
    setIsImporting(false);
    if (result && (result.imported > 0 || result.skipped > 0)) {
      Alert.alert("Biblioteca atualizada", `${result.imported} ${result.imported === 1 ? "música adicionada" : "músicas adicionadas"}${result.skipped ? ` · ${result.skipped} já estavam na biblioteca` : ""}.`);
    }
  };

  const selectedCount = selectedTrackIds.length;
  const selectedSet = useMemo(() => new Set(selectedTrackIds), [selectedTrackIds]);
  const allFilteredSelected = filteredTracks.length > 0 && filteredTracks.every((track) => selectedSet.has(track.id));

  const toggleSelectMode = () => {
    setIsSelecting((current) => !current);
    setSelectedTrackIds([]);
  };
  const toggleTrackSelection = (trackId: string) => {
    setSelectedTrackIds((current) => current.includes(trackId) ? current.filter((id) => id !== trackId) : [...current, trackId]);
  };
  const toggleSelectAll = () => {
    setSelectedTrackIds(allFilteredSelected ? [] : filteredTracks.map((track) => track.id));
  };
  const finishSelection = () => {
    setSelectedTrackIds([]);
    setIsSelecting(false);
    setPlaylistSheet(null);
  };
  const handleRemoveSelected = () => {
    if (!selectedCount) return;
    Alert.alert(
      "Remover da biblioteca?",
      `${selectedCount} ${selectedCount === 1 ? "faixa será removida" : "faixas serão removidas"} da biblioteca e das playlists. Os arquivos continuam guardados no dispositivo.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Remover", style: "destructive", onPress: () => { removeTracks(selectedTrackIds); finishSelection(); } },
      ],
    );
  };
  const handleAddToPlaylist = (playlistId: string) => {
    addTracksToPlaylist(playlistId, selectedTrackIds);
    const playlist = playlists.find((item) => item.id === playlistId);
    Alert.alert("Playlist atualizada", `${selectedCount} ${selectedCount === 1 ? "faixa adicionada" : "faixas adicionadas"}${playlist ? ` a ${playlist.title}` : ""}.`);
    finishSelection();
  };
  const handleCreatePlaylist = () => {
    const title = newPlaylistTitle.trim() || "Nova playlist";
    createPlaylistWithTracks(title, selectedTrackIds);
    setNewPlaylistTitle("");
    Alert.alert("Playlist criada", `${selectedCount} ${selectedCount === 1 ? "faixa foi adicionada" : "faixas foram adicionadas"} a ${title}.`);
    finishSelection();
  };

  return (
    <ScreenContainer className="flex-1" containerClassName="bg-background">
      <View style={styles.header}>
        <View style={styles.headerTop}><View><Text style={styles.title}>Biblioteca</Text><Text style={styles.subtitle}>{tracks.length} {tracks.length === 1 ? "música local" : "músicas locais"}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={isSelecting ? "Cancelar seleção" : "Selecionar músicas"} onPress={toggleSelectMode} style={({ pressed }) => [styles.selectModeButton, isSelecting && styles.selectModeButtonActive, pressed && { opacity: 0.7 }]}><Text style={[styles.selectModeText, isSelecting && styles.selectModeTextActive]}>{isSelecting ? "Cancelar" : "Selecionar"}</Text></Pressable></View>
      </View>
      <View style={styles.searchWrap}>
        <IconButton icon="search" label="Buscar" onPress={() => undefined} size={20} containerStyle={styles.searchIcon} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Buscar por música, artista ou álbum" placeholderTextColor={COLORS.faint} style={styles.searchInput} returnKeyType="done" />
        {query ? <IconButton icon="close" label="Limpar busca" onPress={() => setQuery("")} size={18} containerStyle={styles.clearButton} /> : null}
      </View>
      {!isSelecting ? <View style={styles.actionRow}>
        <PrimaryButton label={isImporting ? "Adicionando..." : "Importar arquivos"} icon="folder-open" onPress={() => void handleImport()} />
        {Platform.OS !== "web" ? <Pressable onPress={() => router.push("/device-search" as never)} style={({ pressed }) => [styles.scanButton, pressed && { opacity: 0.7 }]}><Text style={styles.scanText}>Pesquisar dispositivo</Text></Pressable> : null}
      </View> : <View style={styles.selectionTools}><Text style={styles.selectionHint}>{selectedCount ? `${selectedCount} ${selectedCount === 1 ? "selecionada" : "selecionadas"}` : "Toque nas músicas para selecionar"}</Text><Pressable accessibilityRole="button" onPress={toggleSelectAll} style={({ pressed }) => [styles.selectAllButton, pressed && { opacity: 0.7 }]}><Text style={styles.selectAllText}>{allFilteredSelected ? "Desmarcar todas" : "Selecionar todas"}</Text></Pressable></View>}
      <FlatList
        data={filteredTracks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, isSelecting && styles.listSelecting]}
        renderItem={({ item, index }) => <TrackRow track={item} index={index} isActive={item.id === currentTrackId} isSelectable={isSelecting} isSelected={selectedSet.has(item.id)} onToggleSelected={() => toggleTrackSelection(item.id)} onPress={() => void playTrack(item.id, filteredTracks.map((track) => track.id))} onToggleFavorite={() => toggleFavorite(item.id)} onMore={() => router.push({ pathname: "/track/[id]", params: { id: item.id } } as never)} />}
        ListEmptyComponent={
          query ? <EmptyState title="Nada encontrado" description="Tente outro título, artista ou álbum." icon="search-off" /> : <EmptyState title="Sua biblioteca está vazia" description="Pesquise o dispositivo para escolher músicas antes de adicioná-las ou importe arquivos manualmente." icon="library-music" />
        }
      />
      {isSelecting ? <View style={styles.selectionBar}><Text style={styles.selectionBarCount}>{selectedCount || "Nenhuma"} {selectedCount === 1 ? "música selecionada" : "músicas selecionadas"}</Text><View style={styles.selectionActions}><Pressable accessibilityRole="button" disabled={!selectedCount} onPress={handleRemoveSelected} style={({ pressed }) => [styles.bulkButton, styles.removeButton, !selectedCount && styles.disabledButton, pressed && selectedCount > 0 && { opacity: 0.72 }]}><AppIcon name="delete-outline" size={20} color={COLORS.white} /><Text style={styles.removeButtonText}>Remover</Text></Pressable><Pressable accessibilityRole="button" disabled={!selectedCount} onPress={() => setPlaylistSheet("choose")} style={({ pressed }) => [styles.bulkButton, styles.playlistButton, !selectedCount && styles.disabledButton, pressed && selectedCount > 0 && { opacity: 0.72 }]}><AppIcon name="playlist-add" size={20} color={COLORS.text} /><Text style={styles.playlistButtonText}>Adicionar</Text></Pressable><Pressable accessibilityRole="button" disabled={!selectedCount} onPress={() => setPlaylistSheet("create")} style={({ pressed }) => [styles.iconBulkButton, !selectedCount && styles.disabledButton, pressed && selectedCount > 0 && { opacity: 0.72 }]}><AppIcon name="add" size={22} color={COLORS.text} /></Pressable></View></View> : <MiniPlayer />}
      <Modal visible={playlistSheet !== null} transparent animationType="slide" onRequestClose={() => setPlaylistSheet(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalOverlay} onPress={() => setPlaylistSheet(null)} />
          <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          {playlistSheet === "choose" ? <><Text style={styles.sheetTitle}>Adicionar à playlist</Text><Text style={styles.sheetSubtitle}>Escolha onde incluir as {selectedCount} músicas selecionadas.</Text><ScrollView contentContainerStyle={styles.playlistList}>{playlists.length ? playlists.map((playlist) => <Pressable key={playlist.id} accessibilityRole="button" onPress={() => handleAddToPlaylist(playlist.id)} style={({ pressed }) => [styles.playlistItem, pressed && { opacity: 0.7 }]}><View style={styles.playlistItemIcon}><AppIcon name="queue-music" size={21} color={COLORS.primary} /></View><View style={styles.playlistItemText}><Text style={styles.playlistTitle} numberOfLines={1}>{playlist.title}</Text><Text style={styles.playlistMeta}>{playlist.trackIds.length} {playlist.trackIds.length === 1 ? "música" : "músicas"}</Text></View><AppIcon name="add" size={22} color={COLORS.muted} /></Pressable>) : <EmptyState title="Nenhuma playlist" description="Crie uma playlist com as músicas selecionadas." icon="queue-music" />}</ScrollView><PrimaryButton label="Criar nova playlist" icon="add" onPress={() => setPlaylistSheet("create")} secondary /></> : <><Text style={styles.sheetTitle}>Criar playlist</Text><Text style={styles.sheetSubtitle}>As {selectedCount} músicas selecionadas entrarão nela automaticamente.</Text><TextInput autoFocus value={newPlaylistTitle} onChangeText={setNewPlaylistTitle} placeholder="Nome da playlist" placeholderTextColor={COLORS.faint} style={styles.playlistInput} returnKeyType="done" onSubmitEditing={handleCreatePlaylist} /><PrimaryButton label="Criar com músicas selecionadas" icon="playlist-add" onPress={handleCreatePlaylist} /></>}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { color: COLORS.text, fontSize: 29, lineHeight: 36, fontWeight: "900" },
  subtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  selectModeButton: { minHeight: 36, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  selectModeButtonActive: { backgroundColor: "rgba(167,139,250,0.15)", borderColor: COLORS.primary },
  selectModeText: { color: COLORS.muted, fontSize: 13, lineHeight: 18, fontWeight: "800" },
  selectModeTextActive: { color: COLORS.primary },
  searchWrap: { height: 48, marginHorizontal: 18, borderRadius: 16, alignItems: "center", flexDirection: "row", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line },
  searchIcon: { width: 42, height: 42 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14, height: "100%", padding: 0 },
  clearButton: { width: 38, height: 38 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8 },
  scanButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  scanText: { color: COLORS.primary, fontSize: 13, lineHeight: 18, fontWeight: "800" },
  selectionTools: { minHeight: 56, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4, alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 10 },
  selectionHint: { flex: 1, color: COLORS.muted, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  selectAllButton: { minHeight: 38, borderRadius: 12, paddingHorizontal: 12, justifyContent: "center", backgroundColor: "rgba(167,139,250,0.12)" },
  selectAllText: { color: COLORS.primary, fontSize: 13, lineHeight: 18, fontWeight: "800" },
  list: { paddingVertical: 8, paddingBottom: 16 },
  listSelecting: { paddingBottom: 8 },
  selectionBar: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surface },
  selectionBarCount: { color: COLORS.muted, fontSize: 12, lineHeight: 17, fontWeight: "700", marginBottom: 8 },
  selectionActions: { flexDirection: "row", gap: 8 },
  bulkButton: { minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, paddingHorizontal: 12 },
  removeButton: { flex: 1, backgroundColor: COLORS.pink },
  removeButtonText: { color: COLORS.white, fontSize: 13, lineHeight: 18, fontWeight: "900" },
  playlistButton: { flex: 1.2, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.line },
  playlistButtonText: { color: COLORS.text, fontSize: 13, lineHeight: 18, fontWeight: "900" },
  iconBulkButton: { width: 46, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.line },
  disabledButton: { opacity: 0.4 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.58)" },
  sheet: { maxHeight: "76%", minHeight: 260, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 26, backgroundColor: COLORS.surfaceElevated, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  sheetHandle: { width: 40, height: 4, alignSelf: "center", borderRadius: 4, marginBottom: 16, backgroundColor: COLORS.faint },
  sheetTitle: { color: COLORS.text, fontSize: 20, lineHeight: 27, fontWeight: "900" },
  sheetSubtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 20, marginTop: 4, marginBottom: 14 },
  playlistList: { paddingBottom: 12, gap: 6 },
  playlistItem: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, paddingHorizontal: 12, backgroundColor: COLORS.surface },
  playlistItemIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(167,139,250,0.12)" },
  playlistItemText: { flex: 1, minWidth: 0 },
  playlistTitle: { color: COLORS.text, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  playlistMeta: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  playlistInput: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, color: COLORS.text, paddingHorizontal: 14, fontSize: 15, marginBottom: 12, backgroundColor: COLORS.surface },
});
