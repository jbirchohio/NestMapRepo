export interface TravelerPreference {
  userId: string;
  preferences: string[];
}

export interface ReconciledPreferences {
  priorityList: string[];
  conflicts: Array<{ preference: string; supporters: number }>;
}

export function reconcilePreferences(preferences: TravelerPreference[]): ReconciledPreferences {
  const counts = new Map<string, number>();
  for (const pref of preferences) {
    for (const p of pref.preferences) {
      counts.set(p, (counts.get(p) || 0) + 1);
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const priorityList = sorted.map(([p]) => p);
  const conflicts = sorted.filter(([_, count]) => count < preferences.length).map(([p, count]) => ({ preference: p, supporters: count }));

  return { priorityList, conflicts };
}

