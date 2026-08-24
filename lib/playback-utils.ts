export type ManagedAudioPlayer = {
  pause: () => void;
  remove: () => void;
};

/**
 * Encerra todos os players que possam permanecer ativos antes de iniciar outra faixa.
 * O `pause` explícito evita sobreposição durante a liberação nativa do recurso.
 */
export function releaseActivePlayers(players: Iterable<ManagedAudioPlayer>) {
  for (const player of players) {
    try {
      player.pause();
    } catch {
      // O player pode já ter sido descartado pelo sistema.
    }
    try {
      player.remove();
    } catch {
      // A liberação é intencionalmente idempotente.
    }
  }
}

export function sleepTimerRemainingSeconds(endsAt: number, now = Date.now()) {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

/** Retorna a faixa adjacente da fila, com repetição integral opcional. */
export function getAdjacentTrackId(
  trackIds: string[],
  currentTrackId: string,
  direction: 1 | -1,
  repeatAll = false,
) {
  const currentIndex = trackIds.indexOf(currentTrackId);
  if (currentIndex < 0 || trackIds.length === 0) return undefined;

  const candidate = currentIndex + direction;
  if (candidate >= 0 && candidate < trackIds.length) return trackIds[candidate];
  if (!repeatAll) return undefined;
  return direction === 1 ? trackIds[0] : trackIds[trackIds.length - 1];
}

/** Configuração da sessão nativa para exibir controles da fila, não atalhos por segundos. */
export const LOCK_SCREEN_QUEUE_CONTROLS = {
  showPrevious: true,
  showNext: true,
  showSeekForward: false,
  showSeekBackward: false,
} as const;
