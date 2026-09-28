const STORAGE_KEY = 'solamigo_lead_notes_overrides';
export const LEAD_NOTES_CHANGED_EVENT = 'solamigo:lead-notes-changed';

function getNotesMap(): Record<string, string> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveNotesMap(map: Record<string, string>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignora potenciais restrições de cota no localStorage
  }
}

export function getStoredLeadNotes(leadId: string): string | undefined {
  const map = getNotesMap();
  return map[leadId];
}

export function setStoredLeadNotes(leadId: string, notes: string): void {
  const map = getNotesMap();
  map[leadId] = notes;
  saveNotesMap(map);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(LEAD_NOTES_CHANGED_EVENT, {
        detail: { leadId, notes },
      })
    );
  }
}

export function removeStoredLeadNotes(leadId: string): void {
  const map = getNotesMap();
  if (leadId in map) {
    delete map[leadId];
    saveNotesMap(map);
  }
}
