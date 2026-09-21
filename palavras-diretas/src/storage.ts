import { Progress, Settings } from './types';
import { blankProgress } from './engine';

const progressKey = (id: string) => `diretas:progress:${id}`;
const settingsKey = 'diretas:settings';
export const defaultSettings: Settings = { theme: 'light', showMistakes: false, sound: false, vibration: true, autoAdvance: true };
export function loadProgress(id: string): Progress { try { return { ...blankProgress(), ...JSON.parse(localStorage.getItem(progressKey(id)) || '{}') }; } catch { return blankProgress(); } }
export function saveProgress(id: string, progress: Progress) { localStorage.setItem(progressKey(id), JSON.stringify(progress)); }
export function loadSettings(): Settings { try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem(settingsKey) || '{}') }; } catch { return defaultSettings; } }
export function saveSettings(settings: Settings) { localStorage.setItem(settingsKey, JSON.stringify(settings)); }
