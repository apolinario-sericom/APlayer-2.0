import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { CoverArt, COLORS, EmptyState, IconButton, PrimaryButton } from "@/components/music-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useMusic } from "@/lib/music-provider";

export default function TrackDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tracks, playlists, updateTrack, setTrackLyrics, removeTrack, addTrackToPlaylist, removeTrackFromPlaylist } = useMusic();
  const track = tracks.find((item) => item.id === id);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [lyrics, setLyrics] = useState("");

  useEffect(() => {
    if (!track) return;
    setTitle(track.title);
    setArtist(track.artist);
    setAlbum(track.album);
    setLyrics(track.lyrics ?? "");
  }, [track]);

  if (!track) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1"><View style={styles.notFound}><EmptyState title="Música não encontrada" description="Esta faixa talvez tenha sido removida da biblioteca." /><PrimaryButton label="Voltar" onPress={() => router.back()} /></View></ScreenContainer>;
  }

  const save = () => {
    updateTrack(track.id, { title: title.trim() || track.originalTitle, artist: artist.trim() || "Artista desconhecido", album: album.trim() || "Sem álbum" });
    setTrackLyrics(track.id, lyrics);
    Alert.alert("Alterações salvas", "Os novos dados aparecem somente dentro do Melodia; o arquivo original não foi modificado.");
  };

  const chooseCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (!result.canceled) updateTrack(track.id, { artworkUri: result.assets[0].uri });
  };

  const discardTrack = () => {
    Alert.alert("Remover da biblioteca?", "A música será removida do Melodia e de suas playlists. O arquivo original continuará no aparelho.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => { removeTrack(track.id); router.back(); } },
    ]);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1" containerClassName="bg-background">
      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<>
          <View style={styles.header}><IconButton icon="close" label="Fechar" onPress={() => router.back()} /><Text style={styles.headerTitle}>Editar música</Text><IconButton icon="check" label="Salvar" onPress={save} color={COLORS.primary} /></View>
          <View style={styles.coverSection}><CoverArt track={track} size={146} borderRadius={30} /><PrimaryButton label="Trocar capa" icon="image" onPress={() => void chooseCover()} secondary /></View>
          <Text style={styles.helper}>Essas informações são apelidos e ajustes locais. O arquivo original não é alterado.</Text>
          <Text style={styles.label}>TÍTULO</Text><TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Título" placeholderTextColor={COLORS.faint} returnKeyType="next" />
          <Text style={styles.label}>ARTISTA</Text><TextInput value={artist} onChangeText={setArtist} style={styles.input} placeholder="Artista" placeholderTextColor={COLORS.faint} returnKeyType="next" />
          <Text style={styles.label}>ÁLBUM</Text><TextInput value={album} onChangeText={setAlbum} style={styles.input} placeholder="Álbum" placeholderTextColor={COLORS.faint} returnKeyType="done" />
          <Text style={[styles.label, styles.lyricsLabel]}>LETRA</Text><Text style={styles.helper}>Cole a letra normalmente ou use marcadores de tempo, como [00:12.50], para acompanhar a reprodução.</Text><TextInput value={lyrics} onChangeText={setLyrics} style={[styles.input, styles.lyricsInput]} placeholder="Digite ou cole a letra aqui" placeholderTextColor={COLORS.faint} multiline textAlignVertical="top" />
          <Text style={[styles.label, styles.playlistLabel]}>ADICIONAR À PLAYLIST</Text>
        </>}
        renderItem={({ item }) => {
          const added = item.trackIds.includes(track.id);
          return <Pressable onPress={() => added ? removeTrackFromPlaylist(item.id, track.id) : addTrackToPlaylist(item.id, track.id)} style={({ pressed }) => [styles.playlistRow, pressed && { opacity: 0.7 }]}><CoverArt title={item.title} artworkUri={item.artworkUri} size={42} borderRadius={11} /><Text style={styles.playlistTitle} numberOfLines={1}>{item.title}</Text><View style={[styles.checkbox, added && styles.checkboxActive]}>{added ? <IconButton icon="check" label={`Remover de ${item.title}`} onPress={() => removeTrackFromPlaylist(item.id, track.id)} size={16} color={COLORS.background} containerStyle={styles.checkboxButton} /> : null}</View></Pressable>;
        }}
        ListEmptyComponent={<Text style={styles.noPlaylist}>Crie uma playlist na aba Playlists para adicionar esta música.</Text>}
        ListFooterComponent={<><PrimaryButton label="Salvar alterações" icon="check" onPress={save} /><Pressable onPress={discardTrack} style={({ pressed }) => [styles.removeButton, pressed && { opacity: 0.65 }]}><Text style={styles.removeText}>Remover da biblioteca</Text></Pressable></>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: 18, paddingBottom: 32 },
  notFound: { flex: 1, padding: 24, justifyContent: "center", alignItems: "stretch" },
  header: { minHeight: 48, marginHorizontal: -8, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: COLORS.text, fontSize: 16, lineHeight: 22, fontWeight: "900" },
  coverSection: { alignItems: "center", gap: 14, paddingBottom: 15 },
  helper: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  label: { color: COLORS.primary, fontSize: 10, lineHeight: 16, letterSpacing: 1.25, fontWeight: "900", marginBottom: 6 },
  input: { minHeight: 50, color: COLORS.text, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 15, fontSize: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, marginBottom: 14 },
  lyricsLabel: { marginTop: 6 },
  lyricsInput: { height: 170, lineHeight: 20 },
  playlistLabel: { marginTop: 6, marginBottom: 8 },
  playlistRow: { minHeight: 60, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 11 },
  playlistTitle: { flex: 1, minWidth: 0, color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: "800" },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.faint },
  checkboxActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  checkboxButton: { width: 22, height: 22, borderRadius: 7 },
  noPlaylist: { color: COLORS.muted, fontSize: 13, lineHeight: 19, paddingVertical: 10, marginBottom: 8 },
  removeButton: { minHeight: 46, alignItems: "center", justifyContent: "center", marginTop: 8 },
  removeText: { color: "#FDA4AF", fontSize: 13, lineHeight: 18, fontWeight: "800" },
});
