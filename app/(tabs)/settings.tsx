import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { AppIcon, COLORS } from "@/components/music-ui";
import { MiniPlayer } from "@/components/mini-player";
import { ScreenContainer } from "@/components/screen-container";
import { useMusic } from "@/lib/music-provider";
import { SOUND_PROFILES } from "@/lib/sound-profile";
import type { EqualizerPreset } from "@/lib/music-types";
import { APLAYER_THEMES, useAPlayerTheme, type APlayerThemeId } from "@/lib/aplayer-theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { tracks, allTracks, playlists, settings, updateSettings, cleanupMessengerAudio } = useMusic();
  const { palette, themeId, setTheme } = useAPlayerTheme();
  const hiddenCount = allTracks.length - tracks.length;

  const cleanUpMessengers = () => {
    const hidden = cleanupMessengerAudio();
    Alert.alert("Limpeza concluída", hidden ? `${hidden} ${hidden === 1 ? "áudio de mensageiro foi ocultado" : "áudios de mensageiros foram ocultados"}. As playlists foram preservadas.` : "Nenhum áudio de mensageiro visível foi encontrado na biblioteca.");
  };

  const selectProfile = (preset: EqualizerPreset) => updateSettings({ equalizerPreset: preset });

  return (
    <ScreenContainer className="flex-1" containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Ajustes</Text>
        <Text style={styles.subtitle}>O APlayer guarda suas escolhas somente neste dispositivo.</Text>

        <Text style={styles.sectionTitle}>TEMA DE COR</Text>
        <View style={{ marginHorizontal: 18, borderWidth: 1, borderColor: palette.line, borderRadius: 20, padding: 10, flexDirection: "row", gap: 6, justifyContent: "space-between", backgroundColor: palette.surface }}>
          {(Object.keys(APLAYER_THEMES) as APlayerThemeId[]).map((id) => {
            const theme = APLAYER_THEMES[id];
            const active = themeId === id;
            return <Pressable key={id} accessibilityRole="radio" accessibilityLabel={`Usar tema ${theme.label}`} accessibilityState={{ selected: active }} onPress={() => setTheme(id)} style={({ pressed }) => [{ flex: 1, minHeight: 70, paddingVertical: 8, alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 14, borderWidth: 1, borderColor: active ? palette.primary : "transparent", backgroundColor: active ? palette.primarySoft : "transparent" }, pressed && styles.pressed]}><View style={{ width: 29, height: 29, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: theme.primary }}>{active ? <AppIcon name="check" size={16} color={COLORS.background} /> : null}</View><Text style={{ color: active ? palette.primary : palette.muted, fontSize: 9, lineHeight: 12, textAlign: "center", fontWeight: "800" }}>{theme.label}</Text></Pressable>;
          })}
        </View>
        <Text style={styles.helper}>Escolha uma das cinco paletas. A cor é aplicada a controles, destaques e superfícies do app.</Text>

        <Text style={styles.sectionTitle}>BIBLIOTECA LOCAL</Text>
        <View style={styles.group}>
          <Pressable accessibilityRole="button" onPress={() => router.push("/device-search" as never)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.rowIcon}><AppIcon name="storage" size={20} color={COLORS.primary} /></View>
            <View style={styles.rowCopy}><Text style={styles.rowTitle}>Pesquisar armazenamento</Text><Text style={styles.rowDescription}>{Platform.OS === "web" ? "No navegador, importe arquivos pela Biblioteca." : "Veja os resultados antes de escolher o que adicionar."}</Text></View>
            <AppIcon name="chevron-right" size={22} color={COLORS.faint} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable accessibilityRole="button" onPress={() => router.push("/discovery-sources" as never)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.rowIcon}><AppIcon name="folder" size={20} color={COLORS.primary} /></View>
            <View style={styles.rowCopy}><Text style={styles.rowTitle}>Locais de pesquisa</Text><Text style={styles.rowDescription}>{settings.selectedMediaAlbumIds.length ? `${settings.selectedMediaAlbumIds.length} locais selecionados` : "Todos os locais elegíveis"}</Text></View>
            <AppIcon name="chevron-right" size={22} color={COLORS.faint} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable accessibilityRole="button" onPress={() => router.push("/library-review" as never)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.rowIcon}><AppIcon name="visibility-off" size={20} color={COLORS.primary} /></View>
            <View style={styles.rowCopy}><Text style={styles.rowTitle}>Revisar faixas</Text><Text style={styles.rowDescription}>{hiddenCount ? `${hiddenCount} ${hiddenCount === 1 ? "faixa oculta" : "faixas ocultas"}` : "Ocultar músicas sem apagar arquivos"}</Text></View>
            <AppIcon name="chevron-right" size={22} color={COLORS.faint} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable accessibilityRole="button" onPress={cleanUpMessengers} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.rowIcon}><AppIcon name="cleaning-services" size={20} color={COLORS.primary} /></View>
            <View style={styles.rowCopy}><Text style={styles.rowTitle}>Limpar áudios de mensageiros</Text><Text style={styles.rowDescription}>Oculta itens já importados do WhatsApp e similares sem apagar arquivos ou playlists.</Text></View>
            <AppIcon name="chevron-right" size={22} color={COLORS.faint} />
          </Pressable>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowIcon}><AppIcon name="info-outline" size={20} color={COLORS.primary} /></View>
            <View style={styles.rowCopy}><Text style={styles.rowTitle}>Dados do APlayer</Text><Text style={styles.rowDescription}>{tracks.length} músicas · {playlists.length} playlists</Text></View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>PERFIL DE SOM</Text>
        <View style={styles.group}>
          {(Object.keys(SOUND_PROFILES) as EqualizerPreset[]).map((preset, index) => {
            const profile = SOUND_PROFILES[preset];
            const active = settings.equalizerPreset === preset;
            return <View key={preset}>{index > 0 ? <View style={styles.divider} /> : null}<Pressable accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => selectProfile(preset)} style={({ pressed }) => [styles.row, active && styles.profileActive, pressed && styles.pressed]}><View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View><View style={styles.rowCopy}><Text style={[styles.rowTitle, active && { color: COLORS.primary }]}>{profile.label}</Text><Text style={styles.rowDescription}>{profile.description}</Text></View></Pressable></View>;
          })}
        </View>
        <Text style={styles.helper}>Os perfis ajustam a intensidade de saída sem alterar seus arquivos originais.</Text>

        <Text style={styles.sectionTitle}>REPRODUÇÃO</Text>
        <View style={styles.group}><View style={styles.row}><View style={styles.rowIcon}><AppIcon name="lock" size={20} color={COLORS.primary} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>Segundo plano e tela bloqueada</Text><Text style={styles.rowDescription}>A reprodução permanece ativa com a tela desligada; título, artista e comandos de reprodução aparecem no sistema.</Text></View></View></View>

        <Text style={styles.sectionTitle}>LETRAS</Text>
        <View style={styles.group}>
          <View style={styles.row}><View style={styles.rowCopy}><Text style={styles.rowTitle}>Acompanhar a letra</Text><Text style={styles.rowDescription}>Desloca a letra quando houver marcações de tempo.</Text></View><Switch value={settings.autoScrollLyrics} onValueChange={(value) => updateSettings({ autoScrollLyrics: value })} trackColor={{ false: COLORS.line, true: "#7C5BD6" }} thumbColor={settings.autoScrollLyrics ? COLORS.primary : "#C6C3D5"} /></View>
          <View style={styles.divider} />
          <View style={styles.row}><View style={styles.rowCopy}><Text style={styles.rowTitle}>Manter a tela ativa</Text><Text style={styles.rowDescription}>Opção preparada para leitura de letras longas.</Text></View><Switch value={settings.keepScreenAwakeOnLyrics} onValueChange={(value) => updateSettings({ keepScreenAwakeOnLyrics: value })} trackColor={{ false: COLORS.line, true: "#7C5BD6" }} thumbColor={settings.keepScreenAwakeOnLyrics ? COLORS.primary : "#C6C3D5"} /></View>
        </View>

        <Text style={styles.sectionTitle}>SOBRE</Text>
        <View style={styles.group}><View style={styles.row}><View style={styles.rowCopy}><Text style={styles.rowTitle}>APlayer</Text><Text style={styles.rowDescription}>Tocador local, com capas, letras e playlists personalizadas.</Text></View><Text style={styles.version}>1.2</Text></View></View>
      </ScrollView>
      <MiniPlayer />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingTop: 18, paddingBottom: 104 }, title: { color: COLORS.text, fontSize: 29, lineHeight: 36, fontWeight: "900", paddingHorizontal: 20 }, subtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 19, paddingHorizontal: 20, marginTop: 3, maxWidth: 360 }, sectionTitle: { color: COLORS.primary, fontSize: 10, lineHeight: 16, letterSpacing: 1.35, fontWeight: "900", paddingHorizontal: 20, marginTop: 27, marginBottom: 8 }, group: { marginHorizontal: 18, borderRadius: 20, overflow: "hidden", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line }, row: { minHeight: 70, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 }, rowIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(167,139,250,0.09)" }, rowCopy: { flex: 1, minWidth: 0, gap: 3 }, rowTitle: { color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: "800" }, rowDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 17 }, divider: { height: 1, marginLeft: 14, backgroundColor: COLORS.line }, version: { color: COLORS.faint, fontSize: 13, fontWeight: "800" }, helper: { color: COLORS.faint, fontSize: 11, lineHeight: 16, paddingHorizontal: 22, paddingTop: 7 }, radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, borderColor: COLORS.faint, alignItems: "center", justifyContent: "center" }, radioActive: { borderColor: COLORS.primary }, radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.primary }, profileActive: { backgroundColor: "rgba(167,139,250,0.08)" }, pressed: { opacity: 0.7 },
});
