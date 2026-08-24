import { createContext, useContext, useMemo, type ReactNode } from "react";
import { View } from "react-native";

import { useMusic } from "@/lib/music-provider";
import { APLAYER_THEMES, DEFAULT_APLAYER_THEME, type APlayerPalette, type APlayerThemeId } from "@/lib/aplayer-theme-data";

export { APLAYER_THEMES, DEFAULT_APLAYER_THEME, type APlayerPalette, type APlayerThemeId } from "@/lib/aplayer-theme-data";

type APlayerThemeContextValue = {
  palette: APlayerPalette;
  themeId: APlayerThemeId;
  setTheme: (themeId: APlayerThemeId) => void;
};

const APlayerThemeContext = createContext<APlayerThemeContextValue | null>(null);

export function APlayerThemeProvider({ children }: { children: ReactNode }) {
  const { settings, updateSettings } = useMusic();
  const themeId = settings.appTheme ?? DEFAULT_APLAYER_THEME;
  const palette = APLAYER_THEMES[themeId] ?? APLAYER_THEMES[DEFAULT_APLAYER_THEME];
  const value = useMemo(() => ({ palette, themeId, setTheme: (nextTheme: APlayerThemeId) => updateSettings({ appTheme: nextTheme }) }), [palette, themeId, updateSettings]);

  return <APlayerThemeContext.Provider value={value}><View style={{ flex: 1, backgroundColor: palette.background }}>{children}</View></APlayerThemeContext.Provider>;
}

export function useAPlayerTheme() {
  const context = useContext(APlayerThemeContext);
  if (!context) throw new Error("useAPlayerTheme deve ser usado dentro de APlayerThemeProvider");
  return context;
}
