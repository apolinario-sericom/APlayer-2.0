export function excludeTrackIds(trackIds: string[], idsToRemove: string[]): string[] {
  const removals = new Set(idsToRemove);
  return trackIds.filter((id) => !removals.has(id));
}

export function mergeUniqueTrackIds(currentIds: string[], idsToAdd: string[]): string[] {
  return idsToAdd.reduce<string[]>((merged, id) => merged.includes(id) ? merged : [...merged, id], [...currentIds]);
}
