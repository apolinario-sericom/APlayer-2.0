import { describe, expect, it } from "vitest";

import { vi } from "vitest";

import { formatDuration, getActiveLyricIndex, isExcludedAudioSource, isMessengerAudioCandidate, parseLyrics, parseTrackName, shouldIncludeScannedAudio, updateTracksHidden } from "../lib/music-utils";
import { getAdjacentTrackId, LOCK_SCREEN_QUEUE_CONTROLS, releaseActivePlayers, sleepTimerRemainingSeconds } from "../lib/playback-utils";
import { APLAYER_THEMES } from "../lib/aplayer-theme-data";
import { getFavoriteTracks } from "../lib/library-collections";
import { excludeTrackIds, mergeUniqueTrackIds } from "../lib/library-selection";

describe("utilitários do APlayer", () => {
  it("separa artista e título ao importar arquivos com hífen", () => {
    expect(parseTrackName("Luna Vale - Horizonte Azul.mp3")).toEqual({
      artist: "Luna Vale",
      title: "Horizonte Azul",
    });
  });

  it("mantém um nome utilizável quando o arquivo não possui artista", () => {
    expect(parseTrackName("faixa-sem-metadata.m4a")).toEqual({
      artist: "Artista desconhecido",
      title: "faixa-sem-metadata",
    });
  });

  it("transforma marcações LRC em linhas ordenadas", () => {
    const lines = parseLyrics("[00:11.50] Primeiro verso\n[00:03.25] Introdução\nRefrão sem tempo");
    expect(lines.map((line) => line.text)).toEqual(["Introdução", "Primeiro verso", "Refrão sem tempo"]);
    expect(lines[0].time).toBe(3.25);
    expect(lines[1].time).toBe(11.5);
  });

  it("encontra a linha sincronizada para o momento de reprodução", () => {
    const lines = parseLyrics("[00:02.00] Começo\n[00:09.00] Meio\n[00:16.00] Final");
    expect(getActiveLyricIndex(lines, 9.2)).toBe(1);
    expect(getActiveLyricIndex(lines, 0.4)).toBe(0);
  });

  it("formata a duração no formato minuto e segundo", () => {
    expect(formatDuration(125.8)).toBe("2:05");
    expect(formatDuration()).toBe("0:00");
  });

  it("ignora áudios de mensageiros durante a descoberta automática", () => {
    expect(shouldIncludeScannedAudio({
      filename: "000123.mp3",
      uri: "file:///storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Audio/000123.mp3",
      duration: 180,
    })).toBe(false);
  });

  it("mantém músicas comuns e descarta notas de voz curtas", () => {
    expect(shouldIncludeScannedAudio({ filename: "Artista - Música.mp3", uri: "file:///Music/Artista - Música.mp3", duration: 205 })).toBe(true);
    expect(shouldIncludeScannedAudio({ filename: "PTT-20260815-WA0001.opus", albumTitle: "WhatsApp Audio", duration: 12 })).toBe(false);
  });

  it("bloqueia fontes do WhatsApp inclusive quando a faixa parece uma música", () => {
    expect(isExcludedAudioSource("WhatsApp Audio")).toBe(true);
    expect(shouldIncludeScannedAudio({ filename: "Artista - Canção.mp3", albumTitle: "WhatsApp Business", duration: 220 })).toBe(false);
    expect(isExcludedAudioSource("Músicas favoritas")).toBe(false);
  });

  it("identifica e prepara para ocultação itens de mensageiros já existentes na biblioteca", () => {
    expect(isMessengerAudioCandidate({ filename: "Minha música.mp3", uri: "file:///Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Audio/Minha música.mp3" })).toBe(true);
    expect(isMessengerAudioCandidate({ filename: "Banda - Canção.flac", uri: "file:///Music/Banda - Canção.flac" })).toBe(false);
  });

  it("oculta várias faixas sem tocar nas demais referências de coleção", () => {
    const tracks = [
      { id: "a", hidden: false, title: "A" },
      { id: "b", hidden: false, title: "B" },
      { id: "c", hidden: false, title: "C" },
    ];
    expect(updateTracksHidden(tracks, ["a", "c"], true)).toEqual([
      { id: "a", hidden: true, title: "A" },
      { id: "b", hidden: false, title: "B" },
      { id: "c", hidden: true, title: "C" },
    ]);
  });

  it("pausa e libera cada player ativo antes de uma troca de faixa", () => {
    const first = { pause: vi.fn(), remove: vi.fn() };
    const second = { pause: vi.fn(), remove: vi.fn() };

    releaseActivePlayers([first, second]);

    expect(first.pause).toHaveBeenCalledOnce();
    expect(first.remove).toHaveBeenCalledOnce();
    expect(second.pause).toHaveBeenCalledOnce();
    expect(second.remove).toHaveBeenCalledOnce();
  });

  it("calcula a contagem regressiva do temporizador sem valores negativos", () => {
    expect(sleepTimerRemainingSeconds(20_100, 20_000)).toBe(1);
    expect(sleepTimerRemainingSeconds(20_100, 20_101)).toBe(0);
  });

  it("seleciona a próxima faixa ao fim da música e respeita o modo de repetição da fila", () => {
    expect(getAdjacentTrackId(["a", "b", "c"], "b", 1)).toBe("c");
    expect(getAdjacentTrackId(["a", "b", "c"], "c", 1)).toBeUndefined();
    expect(getAdjacentTrackId(["a", "b", "c"], "c", 1, true)).toBe("a");
    expect(getAdjacentTrackId(["a", "b", "c"], "a", -1, true)).toBe("c");
  });

  it("configura a tela bloqueada com controles de faixa anterior e próxima", () => {
    expect(LOCK_SCREEN_QUEUE_CONTROLS).toEqual({ showPrevious: true, showNext: true, showSeekForward: false, showSeekBackward: false });
  });

  it("remove as faixas marcadas de uma coleção sem apagar os demais itens", () => {
    expect(excludeTrackIds(["a", "b", "c"], ["a", "c"])).toEqual(["b"]);
  });

  it("adiciona uma seleção à playlist sem duplicar músicas existentes", () => {
    expect(mergeUniqueTrackIds(["a", "b"], ["b", "c", "c", "d"])).toEqual(["a", "b", "c", "d"]);
  });

  it("oferece cinco temas de cor identificáveis", () => {
    expect(Object.keys(APLAYER_THEMES)).toEqual(["violet", "ocean", "emerald", "sunset", "rose"]);
    expect(new Set(Object.values(APLAYER_THEMES).map((theme) => theme.primary)).size).toBe(5);
  });

  it("mantém na coleção somente favoritas visíveis", () => {
    const tracks = [
      { id: "a", favorite: true, hidden: false },
      { id: "b", favorite: false, hidden: false },
      { id: "c", favorite: true, hidden: true },
    ] as never;
    expect(getFavoriteTracks(tracks).map((track) => track.id)).toEqual(["a"]);
  });
});
