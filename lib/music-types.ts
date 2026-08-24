export type RepeatMode = "off" | "all" | "one";

export type LyricLine = {
  id: string;
  text: string;
  time?: number;
};

export type MusicTrack = {
  id: string;
  uri: string;
  filename: string;
  originalTitle: string;
  title: string;
  artist: string;
  album: string;
  artworkUri?: string;
  favorite: boolean;
  addedAt: number;
  lastPlayedAt?: number;
  duration?: number;
  mimeType?: string;
  lyrics?: string;
  lyricLines: LyricLine[];
  hidden?: boolean;
};

export type MusicPlaylist = {
  id: string;
  title: string;
  artworkUri?: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type MusicSettings = {
  autoScrollLyrics: boolean;
  keepScreenAwakeOnLyrics: boolean;
  equalizerPreset: EqualizerPreset;
  selectedMediaAlbumIds: string[];
  appTheme: APlayerThemeId;
};

export type EqualizerPreset = "natural" | "focus" | "night";

export type DiscoverySource = {
  id: string;
  title: string;
  assetCount: number;
};

export type StoredMusicData = {
  tracks: MusicTrack[];
  playlists: MusicPlaylist[];
  settings: MusicSettings;
};

export type ImportResult = {
  imported: number;
  skipped: number;
  message?: string;
};
import type { APlayerThemeId } from "@/lib/aplayer-theme";
