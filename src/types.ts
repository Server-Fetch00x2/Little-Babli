export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  journalPassword?: string;
  accessPassword?: string; // New field for security gate
  preferences: {
    theme: 'light' | 'dark';
    reminders: boolean;
    privacy: boolean;
  };
  createdAt: any;
}

export interface JournalEntry {
  id?: string;
  userId: string;
  title: string;
  content: string;
  mood: string;
  tags: string[];
  isLocked: boolean;
  isPinned?: boolean;
  pinHash?: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MoodLog {
  id?: string;
  userId: string;
  date: string;
  mood: string;
}

export interface Affirmation {
  id?: string;
  text: string;
  category: string;
}

export interface VisionGoal {
  id?: string;
  userId: string;
  title: string;
  description: string;
  imageUrl?: string;
  category: 'Personal' | 'Career' | 'Health' | 'Travel' | 'Creative';
  targetDate?: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface Habit {
  id?: string;
  userId: string;
  name: string;
  icon: string;
  frequency: 'daily' | 'weekly';
  completedDates: string[]; // Array of ISO date strings (YYYY-MM-DD)
  createdAt: string;
}

export const MOODS = [
  { emoji: '🌸', label: 'Peaceful', color: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  { emoji: '☀️', label: 'Happy', color: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  { emoji: '☁️', label: 'Neutral', color: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  { emoji: '🌧️', label: 'Sad', color: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
  { emoji: '🌙', label: 'Tired', color: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  { emoji: '✨', label: 'Inspired', color: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
];
