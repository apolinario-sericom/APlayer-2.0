import { useEffect } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { AppIcon, COLORS, EmptyState, PrimaryButton } from "@/components/music-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useMusic } from "@/lib/music-provider";

export default function DiscoverySourcesScreen() {
  const router = useRouter();
  const { discoverySources, loadDiscoverySources, settings, updateSettings } = useMusic();
  const selectedIds = settings.selectedMediaAlbumIds;
  const hasCustomSelection = selectedIds.length > 0;

  useEffect(() => { void loadDiscoverySources(); }, [loadDiscoverySources]);

  const toggleSource = (id: string) => {
    updateSettings({ selectedMediaAlbumIds: selectedIds.includes(id) ? selectedIds.filter((sourceId) => sourceId !== id) : [...selectedIds, id] });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1" containerClassName="bg-background">
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><AppIcon name="arrow-back" size={24} color={COLORS.text} /></Pressable>
        <View style={styles.topCopy}><Text style={styles.eyebrow}>PESQUISA AUTOMÁTICA</Text><Text style={styles.title}>Locais de música</Text></View>
      </View>
      <View style={styles.notice}><AppIcon name="shield" size={20} color={COLORS.primary} /><Text style={styles.noticeText}>Pastas do WhatsApp e notas de voz são excluídas permanentemente desta lista.</Text></View>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: !hasCustomSelection }} onPress={() => updateSettings({ selectedMediaAlbumIds: [] })} style={({ pressed }) => [styles.allRow, !hasCustomSelection && styles.allRowActive, pressed && styles.pressed]}>
        <View style={styles.radio}>{!hasCustomSelection ? <View style={styles.radioDot} /> : null}</View><View style={styles.copy}><Text style={styles.rowTitle}>Todos os locais elegíveis</Text><Text style={styles.rowDescription}>Pesquisa toda a mídia de áudio, exceto fontes de mensageiros.</Text></View>
      </Pressable>
      <Text style={styles.sectionTitle}>SELECIONAR PASTAS / ÁLBUNS</Text>
      {Platform.OS === "web" ? <EmptyState title="Disponível no celular" description="No navegador, adicione músicas usando a importação manual." icon="phonelink" /> : (
        <FlatList
          data={discoverySources}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const selected = selectedIds.includes(item.id);
            return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => toggleSource(item.id)} style={({ pressed }) => [styles.sourceRow, selected && styles.sourceRowActive, pressed && styles.pressed]}><View style={styles.radio}>{selected ? <View style={styles.radioDot} /> : null}</View><View style={styles.copy}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.rowDescription}>{item.assetCount} {item.assetCount === 1 ? "item" : "itens"} no dispositivo</Text></View><AppIcon name="folder" size={20} color={selected ? COLORS.primary : COLORS.faint} /></Pressable>;
          }}
          ListEmptyComponent={<View style={styles.empty}><EmptyState title="Nenhum local encontrado" description="Atualize a lista depois de conceder a permissão para mídias." icon="folder-off" /><PrimaryButton label="Atualizar lista" icon="refresh" onPress={() => void loadDiscoverySources()} secondary /></View>}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 }, back: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 }, topCopy: { flex: 1, gap: 1 }, eyebrow: { color: COLORS.primary, fontSize: 9, lineHeight: 13, letterSpacing: 1.2, fontWeight: "900" }, title: { color: COLORS.text, fontSize: 23, lineHeight: 29, fontWeight: "900" },
  notice: { marginHorizontal: 18, padding: 13, flexDirection: "row", gap: 10, borderRadius: 17, backgroundColor: "rgba(167,139,250,0.10)", borderWidth: 1, borderColor: "rgba(167,139,250,0.18)" }, noticeText: { flex: 1, color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  allRow: { minHeight: 72, marginHorizontal: 18, marginTop: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line }, allRowActive: { borderColor: "rgba(167,139,250,0.75)", backgroundColor: "rgba(167,139,250,0.08)" },
  radio: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: COLORS.primary }, radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary }, copy: { flex: 1, minWidth: 0, gap: 3 }, rowTitle: { color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: "800" }, rowDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  sectionTitle: { color: COLORS.primary, fontSize: 10, lineHeight: 16, letterSpacing: 1.25, fontWeight: "900", paddingHorizontal: 20, marginTop: 23, marginBottom: 7 }, list: { paddingHorizontal: 18, paddingBottom: 18, gap: 8 }, sourceRow: { minHeight: 70, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 17, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line }, sourceRowActive: { borderColor: "rgba(167,139,250,0.65)" }, empty: { paddingTop: 4, alignItems: "center" }, pressed: { opacity: 0.7 },
});
