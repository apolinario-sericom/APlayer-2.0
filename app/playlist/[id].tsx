import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { CoverArt, COLORS, EmptyState, IconButton, PrimaryButton, TrackRow } from "@/components/music-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useMusic } from "@/lib/music-provider";

export default function PlaylistDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { playlists, tracks, updatePlaylist, deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist, playTrack, toggleFavorite } = useMusic();
  const playlist = playlists.find((item) => item.id === id);
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => { if (playlist) setTitle(playlist.title); }, [playlist]);

  const playlistTracks = useMemo(() => playlist ? playlist.trackIds.map((trackId) => tracks.find((track) => track.id === trackId)).filter(Boolean) : [], [playlist, tracks]);

  if (!playlist) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1"><View style={styles.notFound}><EmptyState title="Playlist não encontrada" description="Ela pode ter sido excluída." /><PrimaryButton label="Voltar" onPress={() => router.back()} /></View></ScreenContainer>;
  }

  const saveTitle = () => { updatePlaylist(playlist.id, { title: title.trim() || "Nova playlist" }); setEditing(false); };
  const chooseCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (!result.canceled) updatePlaylist(playlist.id, { artworkUri: result.assets[0].uri });
  };
  const erasePlaylist = () => Alert.alert("Excluir playlist?", "As músicas continuarão na sua biblioteca.", [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: () => { deletePlaylist(playlist.id); router.back(); } }]);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1" containerClassName="bg-background">
      <FlatList
        data={adding ? tracks : playlistTracks}
        keyExtractor={(item) => item!.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<>
          <View style={styles.header}><IconButton icon="arrow-back" label="Voltar" onPress={() => router.back()} /><Text style={styles.headerTitle}>{adding ? "Adicionar músicas" : "Playlist"}</Text><IconButton icon={adding ? "check" : "more-horiz"} label={adding ? "Concluir" : "Mais opções"} onPress={() => adding ? setAdding(false) : setEditing(!editing)} color={adding ? COLORS.primary : COLORS.text} /></View>
          {!adding ? <>
            <View style={styles.coverWrap}><Pressable onPress={() => void chooseCover()} style={({ pressed }) => [pressed && { opacity: 0.75 }]}><CoverArt title={playlist.title} artworkUri={playlist.artworkUri} size={164} borderRadius={30} /><View style={styles.coverEdit}><IconButton icon="edit" label="Trocar capa" onPress={() => void chooseCover()} size={17} containerStyle={styles.coverEditButton} /></View></Pressable></View>
            {editing ? <View style={styles.editTitleRow}><TextInput value={title} onChangeText={setTitle} style={styles.titleInput} placeholderTextColor={COLORS.faint} returnKeyType="done" onSubmitEditing={saveTitle} /><IconButton icon="check" label="Salvar título" onPress={saveTitle} color={COLORS.primary} /></View> : <Pressable onPress={() => setEditing(true)}><Text style={styles.title}>{playlist.title}</Text></Pressable>}
            <Text style={styles.meta}>{playlistTracks.length} {playlistTracks.length === 1 ? "música" : "músicas"}</Text>
            <View style={styles.actions}><PrimaryButton label="Tocar" icon="play-arrow" onPress={() => { const first = playlistTracks[0]; if (first) void playTrack(first.id, playlistTracks.map((track) => track!.id)); }} /><PrimaryButton label="Adicionar" icon="add" onPress={() => setAdding(true)} secondary /></View>
            <Text style={styles.listTitle}>MÚSICAS</Text>
          </> : <Text style={styles.addDescription}>Toque uma música para {playlist.trackIds.includes("__none__") ? "selecionar" : "adicionar ou remover"}. As mudanças são salvas imediatamente.</Text>}
        </>}
        renderItem={({ item, index }) => {
          const track = item!;
          if (adding) {
            const added = playlist.trackIds.includes(track.id);
            return <Pressable onPress={() => added ? removeTrackFromPlaylist(playlist.id, track.id) : addTrackToPlaylist(playlist.id, track.id)} style={({ pressed }) => [styles.addTrackRow, pressed && { opacity: 0.68 }]}><CoverArt track={track} size={48} borderRadius={12} /><View style={styles.addCopy}><Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text><Text style={styles.trackMeta} numberOfLines={1}>{track.artist}</Text></View><View style={[styles.selectMark, added && styles.selectMarkActive]}>{added ? <IconButton icon="check" label={`Remover ${track.title}`} onPress={() => removeTrackFromPlaylist(playlist.id, track.id)} size={16} color={COLORS.background} containerStyle={styles.selectButton} /> : null}</View></Pressable>;
          }
          return <TrackRow track={track} index={index} onPress={() => void playTrack(track.id, playlistTracks.map((entry) => entry!.id))} onToggleFavorite={() => toggleFavorite(track.id)} onMore={() => Alert.alert(track.title, "Remover esta música da playlist?", [{ text: "Cancelar", style: "cancel" }, { text: "Remover", style: "destructive", onPress: () => removeTrackFromPlaylist(playlist.id, track.id) }])} />;
        }}
        ListEmptyComponent={adding ? <EmptyState title="Biblioteca vazia" description="Adicione músicas primeiro na aba Biblioteca." icon="library-music" /> : <EmptyState title="Sua playlist está pronta" description="Adicione músicas para criar a trilha sonora deste momento." icon="queue-music" />}
        ListFooterComponent={!adding ? <Pressable onPress={erasePlaylist} style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.65 }]}><Text style={styles.deleteText}>Excluir playlist</Text></Pressable> : null}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: 18, paddingBottom: 30 },
  notFound: { flex: 1, padding: 24, justifyContent: "center", alignItems: "stretch" },
  header: { minHeight: 48, marginHorizontal: -8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: COLORS.text, fontSize: 16, lineHeight: 22, fontWeight: "900" },
  coverWrap: { alignItems: "center", paddingTop: 9, paddingBottom: 15 },
  coverEdit: { position: "absolute", right: -6, bottom: -6, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.line },
  coverEditButton: { width: 34, height: 34 },
  title: { color: COLORS.text, fontSize: 25, lineHeight: 31, textAlign: "center", fontWeight: "900" },
  meta: { color: COLORS.muted, fontSize: 13, lineHeight: 18, textAlign: "center", marginTop: 3 },
  editTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  titleInput: { flex: 1, height: 48, color: COLORS.text, paddingHorizontal: 14, borderRadius: 15, fontSize: 16, fontWeight: "800", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  listTitle: { color: COLORS.primary, fontSize: 10, lineHeight: 16, letterSpacing: 1.35, fontWeight: "900", marginTop: 23, marginBottom: 5 },
  addDescription: { color: COLORS.muted, fontSize: 13, lineHeight: 19, paddingTop: 10, paddingBottom: 12 },
  addTrackRow: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  addCopy: { flex: 1, minWidth: 0, gap: 3 },
  trackTitle: { color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: "800" },
  trackMeta: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  selectMark: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.faint },
  selectMarkActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  selectButton: { width: 22, height: 22, borderRadius: 7 },
  deleteButton: { minHeight: 54, alignItems: "center", justifyContent: "center", marginTop: 20 },
  deleteText: { color: "#FDA4AF", fontSize: 13, lineHeight: 18, fontWeight: "800" },
});
