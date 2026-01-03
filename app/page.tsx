'use client';

import { useEffect } from 'react';
import { CameraView } from '@/components/camera-view';
import { CameraSelector } from '@/components/camera-selector';
import { Controls } from '@/components/controls';
import { useCamera } from '@/hooks/use-camera';
import { useMotionDetection } from '@/hooks/use-motion-detection';
import { useVideoRecorder } from '@/hooks/use-video-recorder';
import { useSettingsStore } from '@/store/settings-store';
import { Video, Activity, Radio } from 'lucide-react';

export default function Home() {
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

  const { motionDetected, motionAreas } = useMotionDetection(
    stream,
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

  // Enumerate devices on mount
  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);

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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Video className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Surveillance Camera
            </h1>
          </div>
          <p className="text-slate-400 text-lg">
            Live camera monitoring with motion detection
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-200 px-6 py-4 rounded-lg backdrop-blur-sm">
            <p className="font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Camera Selector */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-4">
              <CameraSelector
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                onDeviceChange={changeCamera}
                disabled={isStreaming}
              />
            </div>

            {/* Video Display */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-4">
              <CameraView
                stream={stream}
                motionAreas={motionAreas}
                showMotionBoxes={motionDetectionEnabled}
                onFrameUpdate={incrementFrameCount}
              />

              {/* Status Bar */}
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <Activity className="w-4 h-4" />
                  <span>FPS: <span className="font-semibold text-blue-400">{fps}</span></span>
                </div>
                
                <div className="flex items-center gap-2 justify-center">
                  {motionDetectionEnabled ? (
                    <span className={`flex items-center gap-2 ${motionDetected ? 'text-red-400 font-semibold animate-pulse' : 'text-slate-400'}`}>
                      <Radio className="w-4 h-4" />
                      {motionDetected ? `Motion (${motionAreas.length})` : 'No Motion'}
                    </span>
                  ) : (
                    <span className="text-slate-500">Motion: Off</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 justify-end">
                  {isRecording ? (
                    <span className="flex items-center gap-2 text-red-400 font-semibold">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                      Recording
                    </span>
                  ) : (
                    <span className="text-slate-500">Not Recording</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="space-y-4">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-4">
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
                onSettings={() => {}}
              />
            </div>

            {/* Info Card */}
            <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-blue-300 font-semibold mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Quick Guide
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="text-blue-400">1.</span>
                  <span>Allow camera permissions when prompted</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">2.</span>
                  <span>Select your camera from dropdown</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">3.</span>
                  <span>Click "Start Camera" to begin</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">4.</span>
                  <span>Enable features as needed</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>Built with Next.js 14 • Browser-based surveillance</p>
        </div>
      </div>
    </main>
  );
}
