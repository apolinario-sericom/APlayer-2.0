import type { LyricLine } from "@/lib/music-types";

const TIME_MARKER = /\[(\d{1,2}):(\d{2}(?:\.\d{1,3})?)\]/g;
const MUSIC_EXTENSIONS = new Set(["aac", "aiff", "alac", "flac", "m4a", "mp3", "oga", "ogg", "opus", "wav"]);
const MESSENGER_MARKERS = [
  "whatsapp",
  "com.whatsapp",
  "com.whatsapp.w4b",
  "whatsapp audio",
  "whatsapp voice",
  "whatsapp business",
  "wa audio",
  "wa voice",
  "telegram",
  "org.telegram",
  "messenger",
  "facebook.orca",
  "signal",
  "org.thoughtcrime",
  "discord",
];
const VOICE_NOTE_NAME = /(?:^|[/_. -])(ptt|voice[-_ ]?note|audio[-_ ]?message|mensagem[-_ ]?de[-_ ]?voz)(?:$|[/_. -])/i;

export type ScannedAudioCandidate = {
  filename: string;
  uri?: string;
  albumTitle?: string;
  mimeType?: string;
  duration?: number;
};

export function isExcludedAudioSource(title?: string) {
  const normalizedTitle = title?.toLowerCase() ?? "";
  return MESSENGER_MARKERS.some((marker) => normalizedTitle.includes(marker)) || VOICE_NOTE_NAME.test(normalizedTitle);
}

/** Identifica áudio de mensageiro mesmo quando ele já foi importado para a biblioteca local. */
export function isMessengerAudioCandidate(candidate: ScannedAudioCandidate) {
  const provenance = [candidate.filename, candidate.uri ?? "", candidate.albumTitle ?? ""]
    .join(" ")
    .replace(/\\/g, "/")
    .toLowerCase();
  return isExcludedAudioSource(provenance);
}

/** Atualiza a visibilidade de várias faixas sem alterar referências usadas por playlists. */
export function updateTracksHidden<T extends { id: string; hidden?: boolean }>(tracks: T[], trackIds: Iterable<string>, hidden: boolean) {
  const ids = new Set(trackIds);
  return tracks.map((track) => ids.has(track.id) ? { ...track, hidden } : track);
}

/**
 * A busca automática prioriza arquivos que se comportam como faixas de música.
 * Importações manuais continuam permitindo que a pessoa escolha qualquer áudio suportado.
 */
export function shouldIncludeScannedAudio(candidate: ScannedAudioCandidate) {
  const filename = candidate.filename.trim();
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";

  if (isMessengerAudioCandidate(candidate)) return false;
  if (extension && !MUSIC_EXTENSIONS.has(extension)) return false;
  if (!extension && !candidate.mimeType?.startsWith("audio/")) return false;

  // Áudios muito curtos na descoberta automática geralmente são mensagens ou notificações.
  if (typeof candidate.duration === "number" && candidate.duration > 0 && candidate.duration < 30) return false;
  return true;
}

export function parseTrackName(filename: string) {
  const withoutExtension = filename.replace(/\.[^/.]+$/, "");
  const pieces = withoutExtension.split(/\s[-–—]\s/);

  if (pieces.length > 1) {
    return {
      artist: pieces[0].trim() || "Artista desconhecido",
      title: pieces.slice(1).join(" – ").trim() || withoutExtension,
    };
  }

  return { artist: "Artista desconhecido", title: withoutExtension || "Sem título" };
}

export function parseLyrics(rawLyrics: string): LyricLine[] {
  const lines = rawLyrics.split(/\r?\n/);
  const output: LyricLine[] = [];

  lines.forEach((sourceLine, sourceIndex) => {
    const markers = Array.from(sourceLine.matchAll(TIME_MARKER));
    const text = sourceLine.replace(TIME_MARKER, "").trim();

    if (markers.length === 0) {
      if (text) output.push({ id: `plain-${sourceIndex}`, text });
      return;
    }

    markers.forEach((marker, markerIndex) => {
      const minutes = Number(marker[1]);
      const seconds = Number(marker[2]);
      output.push({
        id: `timed-${sourceIndex}-${markerIndex}`,
        text: text || "♪",
        time: minutes * 60 + seconds,
      });
    });
  });

  return output.sort((a, b) => (a.time ?? Number.POSITIVE_INFINITY) - (b.time ?? Number.POSITIVE_INFINITY));
}

export function getActiveLyricIndex(lines: LyricLine[], position: number) {
  const timedLines = lines.filter((line) => typeof line.time === "number");
  if (timedLines.length === 0) return -1;

  let selectedId = timedLines[0].id;
  for (const line of timedLines) {
    if ((line.time ?? 0) <= position + 0.15) selectedId = line.id;
    else break;
  }

  return lines.findIndex((line) => line.id === selectedId);
}

export function formatDuration(value?: number) {
  const safeValue = Number.isFinite(value) && value && value > 0 ? Math.floor(value) : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function makeArtworkColors(seed: string) {
  const palettes = [
    ["#5B21B6", "#C084FC"],
    ["#9F1239", "#FB7185"],
    ["#0F766E", "#2DD4BF"],
    ["#1D4ED8", "#60A5FA"],
    ["#92400E", "#FBBF24"],
    ["#4338CA", "#A5B4FC"],
  ];
  const sum = [...seed].reduce((total, character) => total + character.charCodeAt(0), 0);
  return palettes[sum % palettes.length];
}
