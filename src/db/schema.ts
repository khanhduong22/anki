import Dexie, { type Table } from "dexie";

export interface Card {
  id?: number;
  question: string;
  answer: string;
  codeSnippet?: string;
  category: string;
  difficulty: "Junior" | "Mid" | "Senior" | "Tech Lead";
  repetitions: number;
  interval: number;
  easeFactor: number;
  nextReview: Date;
  bookmarked: number; // 0 or 1 for indexing
  isCustom: number; // 0 or 1 for indexing
}

export interface UserStats {
  streak: number;
  xp: number;
  level: number;
  lastReviewDate: string | null;
}

export interface AppSetting {
  key: string;
  value: UserStats;
}

class DevSwipeDatabase extends Dexie {
  cards!: Table<Card>;
  settings!: Table<AppSetting>;

  constructor() {
    super("DevSwipeDatabase");
    this.version(1).stores({
      cards: "++id, category, difficulty, nextReview, bookmarked, isCustom",
      settings: "key",
    });
  }
}

export const db = new DevSwipeDatabase();

// Helper to initialize settings defaults if not present
export async function getSettings(): Promise<UserStats> {
  const stats = await db.settings.get("user_stats");
  if (!stats) {
    const defaultStats: AppSetting = {
      key: "user_stats",
      value: {
        streak: 0,
        xp: 0,
        level: 1,
        lastReviewDate: null,
      },
    };
    await db.settings.put(defaultStats);
    return defaultStats.value;
  }
  return stats.value;
}

export async function updateSettings(newValue: UserStats): Promise<void> {
  await db.settings.put({
    key: "user_stats",
    value: newValue,
  });
}

