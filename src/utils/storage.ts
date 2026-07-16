// Storage utility for KnowledgeCapsule

export interface PDFDocumentInfo {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  totalPages: number;
  lastOpened: string;
  progress: number; // percentage
  pagesRead: number[];
  bookmarks: number[];
  toc: { title: string; page: number }[];
}

export type ProgressStatus = 'not-started' | 'learning' | 'partial' | 'understood' | 'mastered';

export interface VersionInfo {
  version: number;
  timestamp: string;
  notes: string;
  status: ProgressStatus;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  mastered: boolean;
}

export interface CapsuleReference {
  doi?: string;
  citation: string;
  url?: string;
}

export interface KnowledgeCapsuleItem {
  id: string;
  pdfId: string;
  pageNumber: number;
  label: string; // e.g. "Tau"
  number: number; // e.g. 1
  highlightText: string;
  highlightRects: { x: number; y: number; width: number; height: number }[];
  notes: string;
  personalUnderstanding: string;
  progressStatus: ProgressStatus;
  colorCategory: string; // 'yellow' | 'blue' | 'green' | 'purple' | 'red' | 'orange' | custom
  versionHistory: VersionInfo[];
  flashcards: Flashcard[];
  references: CapsuleReference[];
  latexEquations: string[];
  codeSnippets: { code: string; language: string }[];
  tags: string[];
}

export interface KnowledgeGraphConnection {
  id: string;
  sourceId: string; // capsuleId
  targetId: string; // capsuleId
  type: string; // e.g. "leads-to", "blocks", "relates"
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  minutes: number;
  capsulesCreated: number;
}

export interface UserSettings {
  darkMode: boolean;
  apiKey: string;
  apiProvider: 'gemini' | 'openai';
  readingMode: 'clean' | 'study' | 'research' | 'review';
  capsuleViewMode: 'sidebar' | 'popup' | 'modal' | 'workspace';
}

const DB_NAME = 'KnowledgeCapsuleDB';
const DB_VERSION = 1;
const STORE_PDFS = 'pdfs';

// IndexedDB Helper for PDFs
const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PDFS)) {
        db.createObjectStore(STORE_PDFS);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const savePDFFile = async (id: string, fileData: ArrayBuffer): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_PDFS, 'readwrite');
    const store = transaction.objectStore(STORE_PDFS);
    const request = store.put(fileData, id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getPDFFile = async (id: string): Promise<ArrayBuffer | null> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_PDFS, 'readonly');
    const store = transaction.objectStore(STORE_PDFS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

export const deletePDFFile = async (id: string): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_PDFS, 'readwrite');
    const store = transaction.objectStore(STORE_PDFS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// LocalStorage Helper for JSON Metadata
const KEY_PREFIX = 'knowledge_capsule_';

export const storage = {
  getPDFList: (): PDFDocumentInfo[] => {
    const listStr = localStorage.getItem(`${KEY_PREFIX}pdfs`);
    return listStr ? JSON.parse(listStr) : [];
  },
  
  savePDFList: (list: PDFDocumentInfo[]) => {
    localStorage.setItem(`${KEY_PREFIX}pdfs`, JSON.stringify(list));
  },

  getCapsules: (): KnowledgeCapsuleItem[] => {
    const capsStr = localStorage.getItem(`${KEY_PREFIX}capsules`);
    return capsStr ? JSON.parse(capsStr) : [];
  },

  saveCapsules: (capsules: KnowledgeCapsuleItem[]) => {
    localStorage.setItem(`${KEY_PREFIX}capsules`, JSON.stringify(capsules));
  },

  getConnections: (): KnowledgeGraphConnection[] => {
    const connStr = localStorage.getItem(`${KEY_PREFIX}connections`);
    return connStr ? JSON.parse(connStr) : [];
  },

  saveConnections: (connections: KnowledgeGraphConnection[]) => {
    localStorage.setItem(`${KEY_PREFIX}connections`, JSON.stringify(connections));
  },

  getActivity: (): DailyActivity[] => {
    const actStr = localStorage.getItem(`${KEY_PREFIX}activity`);
    return actStr ? JSON.parse(actStr) : [];
  },

  saveActivity: (activity: DailyActivity[]) => {
    localStorage.setItem(`${KEY_PREFIX}activity`, JSON.stringify(activity));
  },

  getSettings: (): UserSettings => {
    const setStr = localStorage.getItem(`${KEY_PREFIX}settings`);
    if (setStr) {
      return JSON.parse(setStr);
    }
    return {
      darkMode: true,
      apiKey: '',
      apiProvider: 'gemini',
      readingMode: 'study',
      capsuleViewMode: 'sidebar'
    };
  },

  saveSettings: (settings: UserSettings) => {
    localStorage.setItem(`${KEY_PREFIX}settings`, JSON.stringify(settings));
  }
};

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface DrawingStroke {
  id: string;
  tool: 'pen' | 'highlighter';
  color: string;
  width: number;
  points: DrawingPoint[];
}

export const getPageDrawings = (pdfId: string, pageNumber: number): DrawingStroke[] => {
  try {
    const key = `drawings-${pdfId}-${pageNumber}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to read drawings", err);
    return [];
  }
};

export const savePageDrawings = (pdfId: string, pageNumber: number, strokes: DrawingStroke[]): void => {
  try {
    const key = `drawings-${pdfId}-${pageNumber}`;
    localStorage.setItem(key, JSON.stringify(strokes));
  } catch (err) {
    console.error("Failed to save drawings", err);
  }
};

export const deletePDFDrawings = (pdfId: string, totalPages: number): void => {
  try {
    for (let p = 1; p <= totalPages + 10; p++) {
      localStorage.removeItem(`drawings-${pdfId}-${p}`);
    }
  } catch (err) {
    console.error("Failed to clear PDF drawings", err);
  }
};
