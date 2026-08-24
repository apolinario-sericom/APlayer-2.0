import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon, CoverArt, COLORS, EmptyState, IconButton } from "@/components/music-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useMusic } from "@/lib/music-provider";
import { formatDuration } from "@/lib/music-utils";

export default function PlayerScreen() {
  const router = useRouter();
  const { currentTrack, isPlaying, position, duration, isShuffle, repeatMode, sleepTimerRemaining, togglePlayback, playNext, playPrevious, seekTo, setShuffle, cycleRepeatMode, toggleFavorite, startSleepTimer, cancelSleepTimer } = useMusic();
  const [barWidth, setBarWidth] = useState(1);

  if (!currentTrack) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1"><View style={styles.emptyWrap}><IconButton icon="close" label="Fechar player" onPress={() => router.back()} containerStyle={styles.closeButton} /><EmptyState title="Nada tocando" description="Escolha uma faixa na Biblioteca para iniciar sua música." icon="music-off" /></View></ScreenContainer>;
  }

  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;
  const handleSeek = (event: { nativeEvent: { locationX: number } }) => {
    if (duration > 0) void seekTo((event.nativeEvent.locationX / barWidth) * duration);
  };
  const handleLayout = (event: LayoutChangeEvent) => setBarWidth(event.nativeEvent.layout.width || 1);
  const repeatIcon = repeatMode === "one" ? "repeat-one" : "repeat";
  const repeatLabel = repeatMode === "off" ? "Ativar repetição" : repeatMode === "all" ? "Repetir fila" : "Repetir música";
  const timerLabel = sleepTimerRemaining ? `Desliga em ${Math.ceil(sleepTimerRemaining / 60)} min` : "Temporizador";
  const showSleepTimer = () => {
    Alert.alert("Temporizador", sleepTimerRemaining ? `${timerLabel}. Escolha outro tempo ou cancele.` : "Pausa a reprodução automaticamente quando o tempo acabar.", [
      ...(sleepTimerRemaining ? [{ text: "Cancelar", style: "destructive" as const, onPress: cancelSleepTimer }] : []),
      { text: "10 min", onPress: () => startSleepTimer(10) }, { text: "30 min", onPress: () => startSleepTimer(30) }, { text: "60 min", onPress: () => startSleepTimer(60) }, { text: "Fechar", style: "cancel" },
    ]);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1" containerClassName="bg-background">
      <View style={styles.page}>
        <View style={styles.topBar}>
          <IconButton icon="keyboard-arrow-down" label="Fechar player" onPress={() => router.back()} size={30} />
          <View style={styles.topCopy}><Text style={styles.topLabel}>TOCANDO DA BIBLIOTECA</Text><Text style={styles.topAlbum} numberOfLines={1}>{currentTrack.album}</Text></View>
          <IconButton icon="more-horiz" label="Editar informações" onPress={() => router.push({ pathname: "/track/[id]", params: { id: currentTrack.id } } as never)} />
        </View>

        <View style={styles.artworkWrap}><CoverArt track={currentTrack} size={296} borderRadius={34} style={styles.artwork} /></View>
        <View style={styles.trackInfo}><View style={styles.copy}><Text style={styles.title} numberOfLines={2}>{currentTrack.title}</Text><Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text></View><IconButton icon={currentTrack.favorite ? "favorite" : "favorite-border"} label={currentTrack.favorite ? "Remover de favoritas" : "Adicionar às favoritas"} onPress={() => toggleFavorite(currentTrack.id)} size={27} color={currentTrack.favorite ? COLORS.pink : COLORS.muted} /></View>

        <Pressable accessibilityRole="adjustable" accessibilityLabel="Posição da música" onLayout={handleLayout} onPress={handleSeek} style={styles.progressHitbox}>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /><View style={[styles.progressThumb, { left: `${progress * 100}%` }]} /></View>
        </Pressable>
        <View style={styles.timeRow}><Text style={styles.time}>{formatDuration(position)}</Text><Text style={styles.time}>{formatDuration(duration)}</Text></View>

        <View style={styles.controls}><IconButton icon="skip-previous" label="Anterior" onPress={() => void playPrevious()} size={33} /><Pressable accessibilityRole="button" accessibilityLabel={isPlaying ? "Pausar" : "Reproduzir"} onPress={() => void togglePlayback()} style={({ pressed }) => [styles.mainPlay, pressed && { transform: [{ scale: 0.96 }], opacity: 0.85 }]}><AppIcon name={isPlaying ? "pause" : "play-arrow"} size={38} color={COLORS.background} /></Pressable><IconButton icon="skip-next" label="Próxima" onPress={() => void playNext()} size={33} /></View>

        <View style={styles.bottomActions}>
          <IconButton icon="shuffle" label="Modo aleatório" onPress={() => setShuffle(!isShuffle)} active={isShuffle} />
          <Pressable accessibilityRole="button" accessibilityLabel="Abrir letras" onPress={() => router.push("/lyrics" as never)} style={({ pressed }) => [styles.lyricsButton, pressed && { opacity: 0.72 }]}><AppIcon name="lyrics" size={19} color={COLORS.primary} /><Text style={styles.lyricsText}>Letras</Text></Pressable>
          <IconButton icon="timer" label={timerLabel} onPress={showSleepTimer} active={Boolean(sleepTimerRemaining)} />
          <IconButton icon={repeatIcon} label={repeatLabel} onPress={cycleRepeatMode} active={repeatMode !== "off"} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 20, justifyContent: "space-between", paddingBottom: 4 },
  emptyWrap: { flex: 1 },
  closeButton: { marginLeft: 10, marginTop: 6 },
  topBar: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: -6 },
  topCopy: { flex: 1, minWidth: 0, alignItems: "center", gap: 1 },
  topLabel: { color: COLORS.primary, fontSize: 9, lineHeight: 14, letterSpacing: 1.15, fontWeight: "900" },
  topAlbum: { maxWidth: 210, color: COLORS.text, fontSize: 13, lineHeight: 18, fontWeight: "800" },
  artworkWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  artwork: { maxWidth: "100%", maxHeight: 296 },
  trackInfo: { paddingTop: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  copy: { flex: 1, minWidth: 0 },
  title: { color: COLORS.text, fontSize: 25, lineHeight: 31, fontWeight: "900" },
  artist: { color: COLORS.muted, fontSize: 15, lineHeight: 21, marginTop: 3 },
  progressHitbox: { paddingVertical: 14, marginTop: 4 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: COLORS.line, overflow: "visible" },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: COLORS.primary },
  progressThumb: { position: "absolute", top: -4, marginLeft: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: -8 },
  time: { color: COLORS.muted, fontSize: 11, lineHeight: 16, fontVariant: ["tabular-nums"] },
  controls: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 23, marginTop: 8 },
  mainPlay: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary },
  bottomActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  lyricsButton: { minHeight: 42, paddingHorizontal: 15, borderRadius: 21, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(167,139,250,0.12)" },
  lyricsText: { color: COLORS.primary, fontSize: 13, lineHeight: 18, fontWeight: "900" },
});
