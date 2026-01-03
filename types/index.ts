export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export interface MotionZone {
  id: string;
  name: string;
  rect: { x: number; y: number; width: number; height: number };
  sensitivity: number;
  enabled: boolean;
  color: string;
  alertLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface MotionArea {
  x: number;
  y: number;
  width: number;
  height: number;
  zone?: string; // Which zone detected this
}

export interface MotionEvent {
  id: string;
  timestamp: number;
  duration: number;
  zones: string[]; // Which zones triggered
  thumbnail: string; // Base64 image
  videoClip?: Blob; // Video blob
  motionLevel: number; // 0-100
  alertSent: boolean;
  cameraId: string;
}

export interface Settings {
  motionSensitivity: number;
  motionDetectionEnabled: boolean;
  recordingMode: 'continuous' | 'motion-triggered';
  motionTriggerDuration: number;
  resolution: {
    width: number;
    height: number;
  };
  alertsEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  eventRetentionDays: number;
}

export interface RecordingState {
  isRecording: boolean;
  startTime: number | null;
  recordedChunks: Blob[];
}

export type ViewMode = 'live' | 'events' | 'zones' | 'settings';
