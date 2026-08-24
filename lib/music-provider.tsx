import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { addLockScreenActionListener, createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as MediaLibrary from "expo-media-library";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, Platform } from "react-native";

import type { DiscoverySource, ImportResult, MusicPlaylist, MusicSettings, MusicTrack, RepeatMode, StoredMusicData } from "@/lib/music-types";
import { isExcludedAudioSource, isMessengerAudioCandidate, parseLyrics, parseTrackName, shouldIncludeScannedAudio, updateTracksHidden } from "@/lib/music-utils";
import { getAdjacentTrackId, LOCK_SCREEN_QUEUE_CONTROLS, releaseActivePlayers, sleepTimerRemainingSeconds } from "./playback-utils";
import { soundProfileVolume } from "@/lib/sound-profile";
import { DEFAULT_APLAYER_THEME } from "@/lib/aplayer-theme-data";
import { excludeTrackIds, mergeUniqueTrackIds } from "@/lib/library-selection";

const STORAGE_KEY = "@aplayer/music-data-v2";
const DEFAULT_SETTINGS: MusicSettings = {
  autoScrollLyrics: true,
  keepScreenAwakeOnLyrics: false,
  equalizerPreset: "natural",
  selectedMediaAlbumIds: [],
  appTheme: DEFAULT_APLAYER_THEME,
};
const EMPTY_DATA: StoredMusicData = { tracks: [], playlists: [], settings: DEFAULT_SETTINGS };

type TrackPatch = Partial<Pick<MusicTrack, "title" | "artist" | "album" | "artworkUri" | "favorite" | "duration" | "lyrics" | "lyricLines">>;
type Player = ReturnType<typeof createAudioPlayer>;

type MusicContextValue = {
  isReady: boolean;
  tracks: MusicTrack[];
  allTracks: MusicTrack[];
  playlists: MusicPlaylist[];
  settings: MusicSettings;
  discoverySources: DiscoverySource[];
  currentTrack?: MusicTrack;
  currentTrackId?: string;
  queue: string[];
  isPlaying: boolean;
  position: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  sleepTimerRemaining?: number;
  recentTracks: MusicTrack[];
  importAudioFiles: () => Promise<ImportResult | undefined>;
  scanDeviceAudio: () => Promise<ImportResult | undefined>;
  previewDeviceAudio: () => Promise<MusicTrack[] | undefined>;
  importPreviewedTracks: (tracks: MusicTrack[]) => ImportResult;
  loadDiscoverySources: () => Promise<void>;
  playTrack: (trackId: string, queueIds?: string[]) => Promise<void>;
  togglePlayback: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  setShuffle: (value: boolean) => void;
  cycleRepeatMode: () => void;
  updateTrack: (trackId: string, patch: TrackPatch) => void;
  setTrackLyrics: (trackId: string, lyrics: string) => void;
  toggleFavorite: (trackId: string) => void;
  removeTrack: (trackId: string) => void;
  removeTracks: (trackIds: string[]) => void;
  setTrackHidden: (trackId: string, hidden: boolean) => void;
  setTracksHidden: (trackIds: string[], hidden: boolean) => void;
  cleanupMessengerAudio: () => number;
  createPlaylist: (title: string) => string;
  createPlaylistWithTracks: (title: string, trackIds: string[]) => string;
  updatePlaylist: (playlistId: string, patch: Partial<Pick<MusicPlaylist, "title" | "artworkUri">>) => void;
  deletePlaylist: (playlistId: string) => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  addTracksToPlaylist: (playlistId: string, trackIds: string[]) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  updateSettings: (patch: Partial<MusicSettings>) => void;
  startSleepTimer: (minutes: number) => void;
  cancelSleepTimer: () => void;
};

const MusicContext = createContext<MusicContextValue | null>(null);

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildTrack(input: { uri: string; filename: string; mimeType?: string; duration?: number }): MusicTrack {
  const details = parseTrackName(input.filename);
  return {
    id: makeId("track"), uri: input.uri, filename: input.filename, originalTitle: details.title,
    title: details.title, artist: details.artist, album: "Sem álbum", favorite: false,
    addedAt: Date.now(), mimeType: input.mimeType, duration: input.duration, lyricLines: [],
  };
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoredMusicData>(EMPTY_DATA);
  const [isReady, setIsReady] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string>();
  const [queue, setQueue] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [discoverySources, setDiscoverySources] = useState<DiscoverySource[]>([]);
  const [sleepTimerEndsAt, setSleepTimerEndsAt] = useState<number>();
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number>();
  const playerRef = useRef<Player | null>(null);
  const activePlayersRef = useRef(new Set<Player>());
  const playbackRequestRef = useRef(0);
  const playNextRef = useRef<() => Promise<void>>(async () => undefined);
  const finishedPlayersRef = useRef(new WeakSet<Player>());
  const dataRef = useRef(data);
  const currentTrackRef = useRef<string | undefined>(undefined);
  const queueRef = useRef<string[]>([]);
  const shuffleRef = useRef(false);
  const repeatRef = useRef<RepeatMode>("off");

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { currentTrackRef.current = currentTrackId; }, [currentTrackId]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { shuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { repeatRef.current = repeatMode; }, [repeatMode]);

  useEffect(() => {
    async function hydrate() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<StoredMusicData>;
          const savedTracks = Array.isArray(parsed.tracks) ? parsed.tracks : [];
          const cleanedTracks = savedTracks.map((track) =>
            isMessengerAudioCandidate({
              filename: track.filename,
              uri: track.uri,
              albumTitle: track.album,
              mimeType: track.mimeType,
              duration: track.duration,
            })
              ? { ...track, hidden: true }
              : track,
          );
          setData({
            tracks: cleanedTracks,
            playlists: Array.isArray(parsed.playlists) ? parsed.playlists : [],
            settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
          });
        }
      } catch {
        Alert.alert("Não foi possível abrir a biblioteca", "O APlayer iniciará com uma biblioteca vazia.");
      } finally {
        setIsReady(true);
      }
    }
    void hydrate();
  }, []);

  useEffect(() => {
    if (isReady) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, isReady]);

  const disposeActivePlayers = useCallback(() => {
    activePlayersRef.current.forEach((player) => player.clearLockScreenControls());
    releaseActivePlayers(activePlayersRef.current);
    activePlayersRef.current.clear();
    playerRef.current = null;
  }, []);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "duckOthers",
      interruptionModeAndroid: "duckOthers",
    });
    return () => {
      playbackRequestRef.current += 1;
      disposeActivePlayers();
    };
  }, [disposeActivePlayers]);

  useEffect(() => {
    if (!sleepTimerEndsAt) return;
    const tick = () => {
      const remaining = sleepTimerRemainingSeconds(sleepTimerEndsAt);
      setSleepTimerRemaining(remaining || undefined);
      if (remaining !== 0) return;
      playerRef.current?.pause();
      setIsPlaying(false);
      setSleepTimerEndsAt(undefined);
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [sleepTimerEndsAt]);

  const applySoundProfile = useCallback(async (player?: Player, preset = dataRef.current.settings.equalizerPreset) => {
    const volume = soundProfileVolume(preset);
    if (player) player.volume = volume;
  }, []);

  const getNextId = useCallback((direction: 1 | -1) => {
    const visibleIds = dataRef.current.tracks.filter((track) => !track.hidden).map((track) => track.id);
    const activeQueue = queueRef.current.length > 0 ? queueRef.current.filter((id) => visibleIds.includes(id)) : visibleIds;
    const currentId = currentTrackRef.current;
    if (!currentId || activeQueue.length === 0) return undefined;
    if (shuffleRef.current && direction === 1 && activeQueue.length > 1) {
      const alternatives = activeQueue.filter((id) => id !== currentId);
      return alternatives[Math.floor(Math.random() * alternatives.length)];
    }
    return getAdjacentTrackId(activeQueue, currentId, direction, repeatRef.current === "all");
  }, []);

  const playTrack = useCallback(async (trackId: string, providedQueue?: string[]) => {
    const track = dataRef.current.tracks.find((entry) => entry.id === trackId);
    if (!track || track.hidden) return;
    try {
      const requestId = ++playbackRequestRef.current;
      const resolvedQueue = (providedQueue?.length ? providedQueue : dataRef.current.tracks.filter((entry) => !entry.hidden).map((entry) => entry.id))
        .map((id) => dataRef.current.tracks.find((entry) => entry.id === id))
        .filter((entry): entry is MusicTrack => Boolean(entry && !entry.hidden));
      disposeActivePlayers();
      const player = createAudioPlayer({ uri: track.uri });
      if (requestId !== playbackRequestRef.current) {
        releaseActivePlayers([player]);
        return;
      }
      activePlayersRef.current.add(player);
      playerRef.current = player;
      currentTrackRef.current = trackId;
      queueRef.current = resolvedQueue.map((entry) => entry.id);
      await applySoundProfile(player);
      if (Platform.OS !== "web") {
        player.setActiveForLockScreen(true, {
          title: track.title,
          artist: track.artist,
          albumTitle: track.album,
          artworkUrl: track.artworkUri,
        }, LOCK_SCREEN_QUEUE_CONTROLS);
        player.addListener("playbackStatusUpdate", (status) => {
          if (!status.didJustFinish || playerRef.current !== player || finishedPlayersRef.current.has(player)) return;
          finishedPlayersRef.current.add(player);
          void playNextRef.current();
        });
      }
      player.play();
      setCurrentTrackId(trackId);
      setQueue(resolvedQueue.map((entry) => entry.id));
      setPosition(0);
      setDuration(0);
      setIsPlaying(true);
      setData((previous) => ({ ...previous, tracks: previous.tracks.map((entry) => entry.id === trackId ? { ...entry, lastPlayedAt: Date.now() } : entry) }));
    } catch {
      Alert.alert("Não foi possível reproduzir", "Verifique se o arquivo ainda está disponível no dispositivo.");
      setIsPlaying(false);
    }
  }, [applySoundProfile, disposeActivePlayers]);

  const playNext = useCallback(async () => {
    if (repeatRef.current === "one" && currentTrackRef.current) {
      await playerRef.current?.seekTo(0);
      playerRef.current?.play();
      return;
    }
    const next = getNextId(1);
    if (next) await playTrack(next, queueRef.current);
  }, [getNextId, playTrack]);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  const playPrevious = useCallback(async () => {
    if (position > 4) {
      await playerRef.current?.seekTo(0);
      setPosition(0);
      return;
    }
    const previous = getNextId(-1);
    if (previous) await playTrack(previous, queueRef.current);
  }, [getNextId, playTrack, position]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const subscription = addLockScreenActionListener(({ action }) => {
      if (action === "next") void playNext();
      if (action === "previous") void playPrevious();
    });
    return () => subscription.remove();
  }, [playNext, playPrevious]);

  useEffect(() => {
    const identifier = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const nextPosition = Number(player.currentTime ?? 0);
      const nextDuration = Number(player.duration ?? 0);
      setPosition(nextPosition);
      if (nextDuration > 0) setDuration(nextDuration);
      setIsPlaying(Boolean(player.playing));

      // Alguns dispositivos não propagam o evento de fim no mesmo instante em que
      // o ExoPlayer muda para STATE_ENDED. Este segundo caminho garante a próxima
      // faixa sem criar dois players simultâneos.
      if (nextDuration > 0 && nextPosition >= nextDuration - 0.35 && !player.playing && !finishedPlayersRef.current.has(player)) {
        finishedPlayersRef.current.add(player);
        void playNextRef.current();
      }
    }, 400);
    return () => clearInterval(identifier);
  }, []);

  const togglePlayback = useCallback(async () => {
    if (!currentTrackRef.current) {
      const first = dataRef.current.tracks.find((track) => !track.hidden);
      if (first) await playTrack(first.id);
      return;
    }
    const player = playerRef.current;
    if (!player) {
      await playTrack(currentTrackRef.current);
    } else if (player.playing) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }, [playTrack]);

  const seekTo = useCallback(async (seconds: number) => {
    const safePosition = Math.max(0, Math.min(seconds, duration || seconds));
    await playerRef.current?.seekTo(safePosition);
    setPosition(safePosition);
  }, [duration]);

  const importAudioFiles = useCallback(async (): Promise<ImportResult | undefined> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "audio/*", multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return undefined;
      const existingUris = new Set(dataRef.current.tracks.map((track) => track.uri));
      const uniqueAssets = result.assets.filter((asset) =>
        !existingUris.has(asset.uri) &&
        shouldIncludeScannedAudio({ filename: asset.name, uri: asset.uri, mimeType: asset.mimeType }),
      );
      const importedTracks = uniqueAssets.map((asset) => buildTrack({ uri: asset.uri, filename: asset.name, mimeType: asset.mimeType }));
      if (importedTracks.length) setData((previous) => ({ ...previous, tracks: [...importedTracks, ...previous.tracks] }));
      return { imported: importedTracks.length, skipped: result.assets.length - importedTracks.length };
    } catch {
      Alert.alert("Importação indisponível", "Não foi possível acessar os arquivos escolhidos.");
      return undefined;
    }
  }, []);

  const previewDeviceAudio = useCallback(async (): Promise<MusicTrack[] | undefined> => {
    if (Platform.OS === "web") {
      Alert.alert("Use a importação de arquivos", "No navegador, escolha as músicas manualmente para adicioná-las à biblioteca.");
      return undefined;
    }
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permissão necessária", "Autorize o acesso às músicas para pesquisar o armazenamento do dispositivo.");
        return undefined;
      }
      const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true }).catch(() => []);
      const selectedIds = dataRef.current.settings.selectedMediaAlbumIds;
      const pages = selectedIds.length
        ? await Promise.all(selectedIds.map((album) => MediaLibrary.getAssetsAsync({ first: 1000, album, mediaType: MediaLibrary.MediaType.audio, sortBy: [MediaLibrary.SortBy.modificationTime] })))
        : [await MediaLibrary.getAssetsAsync({ first: 1000, mediaType: MediaLibrary.MediaType.audio, sortBy: [MediaLibrary.SortBy.modificationTime] })];
      const albumTitles = new Map(albums.map((album) => [album.id, album.title]));
      const assets = [...new Map(pages.flatMap((page) => page.assets).map((asset) => [asset.id, asset])).values()];
      const existingUris = new Set(dataRef.current.tracks.map((track) => track.uri));
      const previewTracks: MusicTrack[] = [];
      const seenUris = new Set<string>();
      for (const asset of assets) {
        const albumTitle = asset.albumId ? albumTitles.get(asset.albumId) : undefined;
        if (!shouldIncludeScannedAudio({ filename: asset.filename, uri: asset.uri, albumTitle, duration: asset.duration })) continue;
        const info = await MediaLibrary.getAssetInfoAsync(asset);
        const uri = info.localUri ?? asset.uri;
        if (!uri || existingUris.has(uri) || seenUris.has(uri) || !shouldIncludeScannedAudio({ filename: asset.filename, uri, albumTitle, mimeType: "audio/*", duration: asset.duration })) continue;
        seenUris.add(uri);
        previewTracks.push(buildTrack({ uri, filename: asset.filename, mimeType: "audio/*", duration: asset.duration }));
      }
      return previewTracks;
    } catch {
      Alert.alert("Busca indisponível", "Não foi possível pesquisar músicas no armazenamento. Tente importar os arquivos manualmente.");
      return undefined;
    }
  }, []);

  const importPreviewedTracks = useCallback((previewTracks: MusicTrack[]): ImportResult => {
    const existingUris = new Set(dataRef.current.tracks.map((track) => track.uri));
    const uniqueTracks = previewTracks.filter((track) => {
      if (existingUris.has(track.uri)) return false;
      existingUris.add(track.uri);
      return true;
    });
    if (uniqueTracks.length) setData((previous) => ({ ...previous, tracks: [...uniqueTracks, ...previous.tracks] }));
    return { imported: uniqueTracks.length, skipped: previewTracks.length - uniqueTracks.length };
  }, []);

  /** Mantém compatibilidade com a ação antiga, agora composta por pesquisar e importar. */
  const scanDeviceAudio = useCallback(async (): Promise<ImportResult | undefined> => {
    const previewTracks = await previewDeviceAudio();
    return previewTracks ? importPreviewedTracks(previewTracks) : undefined;
  }, [importPreviewedTracks, previewDeviceAudio]);

  const loadDiscoverySources = useCallback(async () => {
    if (Platform.OS === "web") {
      setDiscoverySources([]);
      return;
    }
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permissão necessária", "Autorize o acesso às músicas para escolher os locais de pesquisa.");
        return;
      }
      const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
      setDiscoverySources(albums
        .filter((album) => (album.assetCount ?? 0) > 0 && !isExcludedAudioSource(album.title))
        .map((album) => ({ id: album.id, title: album.title, assetCount: album.assetCount ?? 0 }))
        .sort((left, right) => left.title.localeCompare(right.title)));
    } catch {
      Alert.alert("Locais indisponíveis", "Não foi possível listar as pastas de áudio deste dispositivo.");
    }
  }, []);

  const updateTrack = useCallback((trackId: string, patch: TrackPatch) => {
    setData((previous) => ({ ...previous, tracks: previous.tracks.map((track) => track.id === trackId ? { ...track, ...patch } : track) }));
  }, []);
  const setTrackLyrics = useCallback((trackId: string, lyrics: string) => updateTrack(trackId, { lyrics, lyricLines: parseLyrics(lyrics) }), [updateTrack]);
  const toggleFavorite = useCallback((trackId: string) => {
    setData((previous) => ({ ...previous, tracks: previous.tracks.map((track) => track.id === trackId ? { ...track, favorite: !track.favorite } : track) }));
  }, []);

  const stopCurrentTrack = useCallback(() => {
    playbackRequestRef.current += 1;
    disposeActivePlayers();
    setCurrentTrackId(undefined);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
  }, [disposeActivePlayers]);

  const removeTracks = useCallback((trackIds: string[]) => {
    const ids = new Set(trackIds);
    if (currentTrackRef.current && ids.has(currentTrackRef.current)) stopCurrentTrack();
    setData((previous) => ({
      ...previous,
      tracks: previous.tracks.filter((track) => !ids.has(track.id)),
      playlists: previous.playlists.map((playlist) => ({ ...playlist, trackIds: excludeTrackIds(playlist.trackIds, trackIds) })),
    }));
  }, [stopCurrentTrack]);
  const removeTrack = useCallback((trackId: string) => removeTracks([trackId]), [removeTracks]);

  const setTracksHidden = useCallback((trackIds: string[], hidden: boolean) => {
    if (hidden && currentTrackRef.current && trackIds.includes(currentTrackRef.current)) stopCurrentTrack();
    setData((previous) => ({ ...previous, tracks: updateTracksHidden(previous.tracks, trackIds, hidden) }));
  }, [stopCurrentTrack]);
  const setTrackHidden = useCallback((trackId: string, hidden: boolean) => setTracksHidden([trackId], hidden), [setTracksHidden]);
  const cleanupMessengerAudio = useCallback(() => {
    const matchingIds = dataRef.current.tracks
      .filter((track) => !track.hidden && isMessengerAudioCandidate({ filename: track.filename, uri: track.uri, mimeType: track.mimeType, duration: track.duration }))
      .map((track) => track.id);
    if (matchingIds.length) setTracksHidden(matchingIds, true);
    return matchingIds.length;
  }, [setTracksHidden]);

  const createPlaylist = useCallback((title: string) => {
    const playlist: MusicPlaylist = { id: makeId("playlist"), title: title.trim() || "Nova playlist", trackIds: [], createdAt: Date.now(), updatedAt: Date.now() };
    setData((previous) => ({ ...previous, playlists: [playlist, ...previous.playlists] }));
    return playlist.id;
  }, []);
  const createPlaylistWithTracks = useCallback((title: string, trackIds: string[]) => {
    const uniqueTrackIds = [...new Set(trackIds)].filter((id) => dataRef.current.tracks.some((track) => track.id === id));
    const playlist: MusicPlaylist = { id: makeId("playlist"), title: title.trim() || "Nova playlist", trackIds: uniqueTrackIds, createdAt: Date.now(), updatedAt: Date.now() };
    setData((previous) => ({ ...previous, playlists: [playlist, ...previous.playlists] }));
    return playlist.id;
  }, []);
  const updatePlaylist = useCallback((playlistId: string, patch: Partial<Pick<MusicPlaylist, "title" | "artworkUri">>) => {
    setData((previous) => ({ ...previous, playlists: previous.playlists.map((playlist) => playlist.id === playlistId ? { ...playlist, ...patch, updatedAt: Date.now() } : playlist) }));
  }, []);
  const deletePlaylist = useCallback((playlistId: string) => setData((previous) => ({ ...previous, playlists: previous.playlists.filter((playlist) => playlist.id !== playlistId) })), []);
  const addTrackToPlaylist = useCallback((playlistId: string, trackId: string) => {
    setData((previous) => ({ ...previous, playlists: previous.playlists.map((playlist) => playlist.id !== playlistId || playlist.trackIds.includes(trackId) ? playlist : { ...playlist, trackIds: [...playlist.trackIds, trackId], updatedAt: Date.now() }) }));
  }, []);
  const addTracksToPlaylist = useCallback((playlistId: string, trackIds: string[]) => {
    const uniqueTrackIds = [...new Set(trackIds)];
    setData((previous) => ({
      ...previous,
      playlists: previous.playlists.map((playlist) => {
        if (playlist.id !== playlistId) return playlist;
        const mergedTrackIds = mergeUniqueTrackIds(playlist.trackIds, uniqueTrackIds);
        return mergedTrackIds.length !== playlist.trackIds.length ? { ...playlist, trackIds: mergedTrackIds, updatedAt: Date.now() } : playlist;
      }),
    }));
  }, []);
  const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setData((previous) => ({ ...previous, playlists: previous.playlists.map((playlist) => playlist.id === playlistId ? { ...playlist, trackIds: playlist.trackIds.filter((id) => id !== trackId), updatedAt: Date.now() } : playlist) }));
  }, []);
  const updateSettings = useCallback((patch: Partial<MusicSettings>) => {
    setData((previous) => ({ ...previous, settings: { ...previous.settings, ...patch } }));
    if (patch.equalizerPreset) void applySoundProfile(playerRef.current ?? undefined, patch.equalizerPreset);
  }, [applySoundProfile]);
  const cycleRepeatMode = useCallback(() => setRepeatMode((current) => {
    const next = current === "off" ? "all" : current === "all" ? "one" : "off";
    return next;
  }), []);
  const startSleepTimer = useCallback((minutes: number) => {
    const safeMinutes = Math.max(1, Math.round(minutes));
    setSleepTimerEndsAt(Date.now() + safeMinutes * 60 * 1000);
    setSleepTimerRemaining(safeMinutes * 60);
  }, []);
  const cancelSleepTimer = useCallback(() => {
    setSleepTimerEndsAt(undefined);
    setSleepTimerRemaining(undefined);
  }, []);

  const visibleTracks = useMemo(() => data.tracks.filter((track) => !track.hidden), [data.tracks]);
  const currentTrack = useMemo(() => data.tracks.find((track) => track.id === currentTrackId), [currentTrackId, data.tracks]);
  const recentTracks = useMemo(() => [...visibleTracks].filter((track) => track.lastPlayedAt).sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0)).slice(0, 8), [visibleTracks]);

  const value = useMemo<MusicContextValue>(() => ({
    isReady, tracks: visibleTracks, allTracks: data.tracks, playlists: data.playlists, settings: data.settings,
    discoverySources, currentTrack, currentTrackId, queue, isPlaying, position, duration, isShuffle, repeatMode,
    sleepTimerRemaining, recentTracks, importAudioFiles, scanDeviceAudio, previewDeviceAudio, importPreviewedTracks, loadDiscoverySources, playTrack,
    togglePlayback, seekTo, playNext, playPrevious, setShuffle: setIsShuffle, cycleRepeatMode, updateTrack,
    setTrackLyrics, toggleFavorite, removeTrack, removeTracks, setTrackHidden, setTracksHidden, cleanupMessengerAudio, createPlaylist, createPlaylistWithTracks, updatePlaylist, deletePlaylist,
    addTrackToPlaylist, addTracksToPlaylist, removeTrackFromPlaylist, updateSettings, startSleepTimer, cancelSleepTimer,
  }), [addTracksToPlaylist, addTrackToPlaylist, cancelSleepTimer, cleanupMessengerAudio, createPlaylist, createPlaylistWithTracks, currentTrack, currentTrackId, cycleRepeatMode, data.playlists, data.settings, data.tracks, deletePlaylist, discoverySources, duration, importAudioFiles, importPreviewedTracks, isPlaying, isReady, isShuffle, loadDiscoverySources, playNext, playPrevious, playTrack, position, previewDeviceAudio, queue, recentTracks, removeTrack, removeTracks, removeTrackFromPlaylist, repeatMode, scanDeviceAudio, seekTo, setTrackHidden, setTrackLyrics, setTracksHidden, sleepTimerRemaining, startSleepTimer, toggleFavorite, togglePlayback, updatePlaylist, updateSettings, updateTrack, visibleTracks]);

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) throw new Error("useMusic deve ser usado dentro de MusicProvider");
  return context;
}
