import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image, Pressable, StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";

import { useAPlayerTheme } from "@/lib/aplayer-theme";
import type { MusicTrack } from "@/lib/music-types";
import { makeArtworkColors } from "@/lib/music-utils";

export const COLORS = {
  background: "#0B0B12",
  surface: "#171724",
  surfaceElevated: "#202031",
  line: "#2A2A3C",
  primary: "#A78BFA",
  pink: "#FB7185",
  text: "#F7F5FF",
  muted: "#A4A0B8",
  faint: "#6B6880",
  white: "#FFFFFF",
};

export function AppIcon({ name, size = 24, color = COLORS.text }: { name: React.ComponentProps<typeof MaterialIcons>["name"]; size?: number; color?: string }) {
  const { palette } = useAPlayerTheme();
  const dynamicColor = color === COLORS.text ? palette.text : color === COLORS.primary ? palette.primary : color === COLORS.background ? palette.background : color === COLORS.muted ? palette.muted : color;
  return <MaterialIcons name={name} size={size} color={dynamicColor} />;
}

export function CoverArt({ track, title, artworkUri, size = 56, borderRadius = 12, style }: { track?: MusicTrack; title?: string; artworkUri?: string; size?: number; borderRadius?: number; style?: StyleProp<ViewStyle> }) {
  const visualTitle = title ?? track?.title ?? "APlayer";
  const uri = artworkUri ?? track?.artworkUri;
  const [start, end] = makeArtworkColors(visualTitle);
  if (uri) return <Image source={{ uri }} style={[{ width: size, height: size, borderRadius }, style as StyleProp<ImageStyle>]} />;
  return <View style={[styles.coverFallback, { width: size, height: size, borderRadius, backgroundColor: start }, style]}><View style={[styles.coverOrb, { width: size * 0.68, height: size * 0.68, borderRadius: size, backgroundColor: end }]} /><AppIcon name="music-note" size={size * 0.36} color={COLORS.white} /></View>;
}

export function IconButton({ icon, label, onPress, size = 22, color = COLORS.text, active = false, disabled = false, containerStyle }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; label: string; onPress: () => void; size?: number; color?: string; active?: boolean; disabled?: boolean; containerStyle?: StyleProp<ViewStyle> }) {
  const { palette } = useAPlayerTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.iconButton, active && { backgroundColor: palette.primarySoft }, pressed && !disabled && styles.pressed, disabled && styles.disabled, containerStyle]}><AppIcon name={icon} size={size} color={active ? palette.primary : color} /></Pressable>;
}

export function PrimaryButton({ label, icon, onPress, secondary = false }: { label: string; icon?: React.ComponentProps<typeof MaterialIcons>["name"]; onPress: () => void; secondary?: boolean }) {
  const { palette } = useAPlayerTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.primaryButton, secondary && styles.secondaryButton, { backgroundColor: secondary ? palette.surfaceElevated : palette.primary, borderColor: secondary ? palette.line : "transparent" }, pressed && styles.pressed]}>{icon ? <AppIcon name={icon} size={20} color={secondary ? palette.text : palette.background} /> : null}<Text style={[styles.primaryButtonText, { color: secondary ? palette.text : palette.background }]}>{label}</Text></Pressable>;
}

export function TrackRow({ track, index, isActive = false, onPress, onMore, onToggleFavorite, isSelectable = false, isSelected = false, onToggleSelected }: { track: MusicTrack; index?: number; isActive?: boolean; onPress: () => void; onMore?: () => void; onToggleFavorite?: () => void; isSelectable?: boolean; isSelected?: boolean; onToggleSelected?: () => void }) {
  const { palette } = useAPlayerTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={isSelectable ? `${isSelected ? "Desmarcar" : "Selecionar"} ${track.title}` : `Tocar ${track.title}`} onPress={isSelectable ? onToggleSelected : onPress} style={({ pressed }) => [styles.trackRow, isSelectable && isSelected && { backgroundColor: palette.primarySoft }, pressed && styles.rowPressed]}>
      {isSelectable ? <View accessibilityElementsHidden style={[styles.selectMark, { borderColor: isSelected ? palette.primary : palette.line, backgroundColor: isSelected ? palette.primary : "transparent" }]}>{isSelected ? <AppIcon name="check" size={16} color={palette.background} /> : null}</View> : typeof index === "number" ? <View style={styles.trackIndexWrap}><Text style={[styles.trackIndex, isActive && { color: palette.primary }]}>{isActive ? "♪" : index + 1}</Text></View> : null}
      <CoverArt track={track} size={52} borderRadius={12} />
      <View style={styles.trackDetails}><Text numberOfLines={1} style={[styles.trackTitle, { color: palette.text }, isActive && { color: palette.primary }]}>{track.title}</Text><Text numberOfLines={1} style={[styles.trackSubtitle, { color: palette.muted }]}>{track.artist} · {track.album}</Text></View>
      {!isSelectable && onToggleFavorite ? <Pressable accessibilityRole="button" accessibilityLabel={track.favorite ? `Remover ${track.title} das favoritas` : `Favoritar ${track.title}`} onPress={(event) => { event.stopPropagation(); onToggleFavorite(); }} hitSlop={10} style={({ pressed }) => [styles.favoriteButton, pressed && styles.pressed]}><AppIcon name={track.favorite ? "favorite" : "favorite-border"} size={21} color={track.favorite ? palette.primary : palette.muted} /></Pressable> : null}
      {!isSelectable && onMore ? <Pressable accessibilityRole="button" accessibilityLabel={`Mais opções para ${track.title}`} onPress={(event) => { event.stopPropagation(); onMore(); }} hitSlop={10} style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}><AppIcon name="more-vert" size={24} color={palette.muted} /></Pressable> : null}
    </Pressable>
  );
}

export function EmptyState({ title, description, icon = "music-note" }: { title: string; description: string; icon?: React.ComponentProps<typeof MaterialIcons>["name"] }) {
  const { palette } = useAPlayerTheme();
  return <View style={styles.emptyState}><View style={[styles.emptyIcon, { backgroundColor: palette.primarySoft }]}><AppIcon name={icon} size={30} color={palette.primary} /></View><Text style={[styles.emptyTitle, { color: palette.text }]}>{title}</Text><Text style={[styles.emptyDescription, { color: palette.muted }]}>{description}</Text></View>;
}

const styles = StyleSheet.create({
  coverFallback: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  coverOrb: { position: "absolute", right: -8, bottom: -8, opacity: 0.85 },
  iconButton: { alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 22 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.35 },
  primaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1 },
  secondaryButton: { borderWidth: 1 },
  primaryButtonText: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  trackRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 8, minHeight: 68 },
  rowPressed: { opacity: 0.68 },
  trackIndexWrap: { width: 18, alignItems: "center" },
  trackIndex: { color: COLORS.faint, fontSize: 13, fontWeight: "700" },
  selectMark: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  trackDetails: { flex: 1, minWidth: 0, gap: 3 },
  trackTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  trackSubtitle: { fontSize: 13, lineHeight: 18 },
  favoriteButton: { padding: 8, marginRight: -4 },
  moreButton: { padding: 8, marginRight: -8 },
  emptyState: { alignItems: "center", paddingHorizontal: 34, paddingVertical: 34, gap: 10 },
  emptyIcon: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  emptyTitle: { textAlign: "center", fontSize: 17, lineHeight: 23, fontWeight: "800" },
  emptyDescription: { textAlign: "center", fontSize: 14, lineHeight: 20 },
});
