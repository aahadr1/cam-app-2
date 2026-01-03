'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { CameraDevice } from '@/types';

export function useCamera() {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  
  const fpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef(0);

  // Enumerate camera devices
  const enumerateDevices = useCallback(async () => {
    try {
      // Request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => stream.getTracks().forEach(track => track.stop()));

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices
        .filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
          kind: device.kind,
        }));
      
      setDevices(videoDevices);
      
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err: any) {
      console.error('Error enumerating devices:', err);
      setError('Failed to access cameras. Please grant camera permissions.');
    }
  }, [selectedDeviceId]);

  // Start camera stream
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      setError(null);
      
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const targetDeviceId = deviceId || selectedDeviceId;

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: targetDeviceId ? { exact: targetDeviceId } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setIsStreaming(true);

      // Start FPS counter
      frameCountRef.current = 0;
      if (fpsIntervalRef.current) {
        clearInterval(fpsIntervalRef.current);
      }
      fpsIntervalRef.current = setInterval(() => {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
      }, 1000);

      return newStream;
    } catch (err: any) {
      let errorMessage = 'Failed to access camera';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      }
      
      setError(errorMessage);
      setIsStreaming(false);
      console.error('Camera error:', err);
      return null;
    }
  }, [stream, selectedDeviceId]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsStreaming(false);
    }

    if (fpsIntervalRef.current) {
      clearInterval(fpsIntervalRef.current);
      fpsIntervalRef.current = null;
    }

    setFps(0);
    frameCountRef.current = 0;
  }, [stream]);

  // Change camera device
  const changeCamera = useCallback(async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (isStreaming) {
      await stopCamera();
      await startCamera(deviceId);
    }
  }, [isStreaming, startCamera, stopCamera]);

  // Increment frame count for FPS calculation
  const incrementFrameCount = useCallback(() => {
    frameCountRef.current++;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (fpsIntervalRef.current) {
        clearInterval(fpsIntervalRef.current);
      }
    };
  }, [stream]);

  return {
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
  };
}
