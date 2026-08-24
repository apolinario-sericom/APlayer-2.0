import type { EqualizerPreset } from "@/lib/music-types";

/**
 * O módulo nativo disponível expõe o nível de saída, não filtros por banda.
 * Por isso estes perfis preservam o arquivo e ajustam uma intensidade segura.
 */
export const SOUND_PROFILES: Record<EqualizerPreset, { label: string; description: string; volume: number }> = {
  natural: { label: "Natural", description: "Mantém o volume original da faixa.", volume: 1 },
  focus: { label: "Foco", description: "Reduz levemente a intensidade para uma escuta mais confortável.", volume: 0.88 },
  night: { label: "Noite", description: "Diminui o nível de saída para ouvir com discrição.", volume: 0.64 },
};

export function soundProfileVolume(preset: EqualizerPreset) {
  return SOUND_PROFILES[preset].volume;
}
