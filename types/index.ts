export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export interface MotionArea {
  x: number;
  y: number;
  width: number;
  height: number;
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
}

export interface RecordingState {
  isRecording: boolean;
  startTime: number | null;
  recordedChunks: Blob[];
}

