import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Settings } from '@/types';

interface SettingsStore extends Settings {
  setMotionSensitivity: (value: number) => void;
  setMotionDetectionEnabled: (enabled: boolean) => void;
  setRecordingMode: (mode: 'continuous' | 'motion-triggered') => void;
  setMotionTriggerDuration: (duration: number) => void;
  setResolution: (width: number, height: number) => void;
  resetToDefaults: () => void;
}

const defaultSettings: Settings = {
  motionSensitivity: 50,
  motionDetectionEnabled: false,
  recordingMode: 'continuous',
  motionTriggerDuration: 10,
  resolution: {
    width: 1280,
    height: 720,
  },
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setMotionSensitivity: (value) => set({ motionSensitivity: value }),
      setMotionDetectionEnabled: (enabled) => set({ motionDetectionEnabled: enabled }),
      setRecordingMode: (mode) => set({ recordingMode: mode }),
      setMotionTriggerDuration: (duration) => set({ motionTriggerDuration: duration }),
      setResolution: (width, height) => set({ resolution: { width, height } }),
      resetToDefaults: () => set(defaultSettings),
    }),
    {
      name: 'surveillance-settings',
    }
  )
);

