export type APlayerThemeId = "violet" | "ocean" | "emerald" | "sunset" | "rose";

export type APlayerPalette = {
  id: APlayerThemeId;
  label: string;
  primary: string;
  primarySoft: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  line: string;
  text: string;
  muted: string;
  faint: string;
  white: string;
};

export const APLAYER_THEMES: Record<APlayerThemeId, APlayerPalette> = {
  violet: { id: "violet", label: "Violeta", primary: "#A78BFA", primarySoft: "rgba(167,139,250,0.14)", background: "#0B0B12", surface: "#171724", surfaceElevated: "#202031", line: "#2A2A3C", text: "#F7F5FF", muted: "#A4A0B8", faint: "#6B6880", white: "#FFFFFF" },
  ocean: { id: "ocean", label: "Oceano", primary: "#38BDF8", primarySoft: "rgba(56,189,248,0.14)", background: "#07121A", surface: "#10222D", surfaceElevated: "#16313F", line: "#244657", text: "#F0FAFF", muted: "#9CB8C8", faint: "#5E7C8C", white: "#FFFFFF" },
  emerald: { id: "emerald", label: "Esmeralda", primary: "#34D399", primarySoft: "rgba(52,211,153,0.14)", background: "#081410", surface: "#10231C", surfaceElevated: "#163127", line: "#285341", text: "#F0FFF8", muted: "#9CBFAE", faint: "#5C806D", white: "#FFFFFF" },
  sunset: { id: "sunset", label: "Pôr do sol", primary: "#FB923C", primarySoft: "rgba(251,146,60,0.14)", background: "#17100B", surface: "#291A11", surfaceElevated: "#382317", line: "#5A3A25", text: "#FFF7ED", muted: "#CFB5A1", faint: "#8E6D57", white: "#FFFFFF" },
  rose: { id: "rose", label: "Rosa", primary: "#FB7185", primarySoft: "rgba(251,113,133,0.14)", background: "#160B10", surface: "#28121B", surfaceElevated: "#351824", line: "#59303E", text: "#FFF4F6", muted: "#D2AEB8", faint: "#916675", white: "#FFFFFF" },
};

export const DEFAULT_APLAYER_THEME: APlayerThemeId = "violet";
