'use client';

import { useState, useEffect } from 'react';
import { CameraView } from '@/components/camera-view';
import { CameraSelector } from '@/components/camera-selector';
import { Controls } from '@/components/controls';
import { useCamera } from '@/hooks/use-camera';
import { useMotionDetection } from '@/hooks/use-motion-detection';
import { useVideoRecorder } from '@/hooks/use-video-recorder';
import { useSettingsStore } from '@/store/settings-store';

export default function Home() {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const {
    devices,
    selectedDeviceId,
    stream,
    isStreaming,
    error,
    fps,
    startCamera,
    stopCamera,
    changeCamera,
    enumerateDevices,
    incrementFrameCount,
  } = useCamera();

  const {
    motionSensitivity,
    motionDetectionEnabled,
    setMotionSensitivity,
    setMotionDetectionEnabled,
  } = useSettingsStore();

  const { motionDetected, motionAreas, canvasRef } = useMotionDetection(
    videoElement,
    motionDetectionEnabled && isStreaming,
    motionSensitivity
  );

  const {
    isRecording,
    startRecording,
    stopRecording,
    downloadRecording,
    hasRecording,
  } = useVideoRecorder(stream);

  // Get video element reference
  useEffect(() => {
    if (stream) {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      setVideoElement(video);

      return () => {
        video.srcObject = null;
        setVideoElement(null);
      };
    }
  }, [stream]);

  const handleStartStop = async () => {
    if (isStreaming) {
      if (isRecording) {
        stopRecording();
      }
      stopCamera();
    } else {
      await startCamera(selectedDeviceId);
    }
  };

  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleMotionToggle = () => {
    setMotionDetectionEnabled(!motionDetectionEnabled);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Surveillance Camera</h1>
          <p className="text-muted-foreground">
            Browser-based camera monitoring with motion detection
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Display */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-4">
              <CameraSelector
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                onDeviceChange={changeCamera}
                disabled={isStreaming}
              />
              
              <CameraView
                stream={stream}
                motionAreas={motionAreas}
                showMotionBoxes={motionDetectionEnabled}
                onFrameUpdate={incrementFrameCount}
              />

              {/* Status Bar */}
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>FPS: {fps}</span>
                <span className={motionDetected ? 'text-red-500 font-semibold' : ''}>
                  {motionDetectionEnabled ? (
                    motionDetected ? `Motion: Detected (${motionAreas.length} areas)` : 'Motion: None'
                  ) : (
                    'Motion: Disabled'
                  )}
                </span>
                <span className={isRecording ? 'text-red-500 font-semibold' : ''}>
                  {isRecording ? 'Recording: Active' : 'Recording: Off'}
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
              <Controls
                isStreaming={isStreaming}
                isRecording={isRecording}
                motionEnabled={motionDetectionEnabled}
                motionSensitivity={motionSensitivity}
                hasRecording={hasRecording}
                onStartStop={handleStartStop}
                onRecordToggle={handleRecordToggle}
                onMotionToggle={handleMotionToggle}
                onSensitivityChange={setMotionSensitivity}
                onDownload={downloadRecording}
                onSettings={() => setShowSettings(true)}
              />
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
              <h3 className="font-semibold mb-2">Quick Tips</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Grant camera permissions when prompted</li>
                <li>• Motion detection works best in stable lighting</li>
                <li>• Recordings download as WebM files</li>
                <li>• Works on mobile devices too!</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Built with Next.js 14 • Deployed on Vercel</p>
        </div>
      </div>
    </main>
  );
}
