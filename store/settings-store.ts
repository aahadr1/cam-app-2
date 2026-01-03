import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Settings, MotionZone, ViewMode } from '@/types';

interface SettingsStore extends Settings {
  // Motion zones
  zones: MotionZone[];
  addZone: (zone: MotionZone) => void;
  updateZone: (id: string, updates: Partial<MotionZone>) => void;
  deleteZone: (id: string) => void;
  toggleZone: (id: string) => void;
  
  // Settings
  setMotionSensitivity: (value: number) => void;
  setMotionDetectionEnabled: (enabled: boolean) => void;
  setRecordingMode: (mode: 'continuous' | 'motion-triggered') => void;
  setMotionTriggerDuration: (duration: number) => void;
  setResolution: (width: number, height: number) => void;
  setAlertsEnabled: (enabled: boolean) => void;
  setQuietHours: (start: string, end: string) => void;
  setEventRetentionDays: (days: number) => void;
  
  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  resetToDefaults: () => void;
}

const defaultSettings: Settings = {
  motionSensitivity: 50,
  motionDetectionEnabled: false,
  recordingMode: 'motion-triggered',
  motionTriggerDuration: 30,
  resolution: {
    width: 1920,
    height: 1080,
  },
  alertsEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  eventRetentionDays: 7,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      zones: [],
      viewMode: 'live' as ViewMode,
      
      // Zone management
      addZone: (zone) => set((state) => ({ zones: [...state.zones, zone] })),
      updateZone: (id, updates) => set((state) => ({
        zones: state.zones.map(z => z.id === id ? { ...z, ...updates } : z)
      })),
      deleteZone: (id) => set((state) => ({
        zones: state.zones.filter(z => z.id !== id)
      })),
      toggleZone: (id) => set((state) => ({
        zones: state.zones.map(z => z.id === id ? { ...z, enabled: !z.enabled } : z)
      })),
      
      // Settings
      setMotionSensitivity: (value) => set({ motionSensitivity: value }),
      setMotionDetectionEnabled: (enabled) => set({ motionDetectionEnabled: enabled }),
      setRecordingMode: (mode) => set({ recordingMode: mode }),
      setMotionTriggerDuration: (duration) => set({ motionTriggerDuration: duration }),
      setResolution: (width, height) => set({ resolution: { width, height } }),
      setAlertsEnabled: (enabled) => set({ alertsEnabled: enabled }),
      setQuietHours: (start, end) => set({ quietHoursStart: start, quietHoursEnd: end }),
      setEventRetentionDays: (days) => set({ eventRetentionDays: days }),
      
      // View mode
      setViewMode: (mode) => set({ viewMode: mode }),
      
      resetToDefaults: () => set({ ...defaultSettings, zones: [] }),
    }),
    {
      name: 'cctv-settings',
    }
  )
);
