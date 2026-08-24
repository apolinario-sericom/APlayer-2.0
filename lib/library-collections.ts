import type { MusicTrack } from "@/lib/music-types";

/** Retorna apenas faixas visíveis marcadas pelo usuário como favoritas. */
export function getFavoriteTracks(tracks: MusicTrack[]) {
  return tracks.filter((track) => track.favorite && !track.hidden);
}
