'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CameraDevice } from '@/types';

export function useCamera() {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef(0);

  // Enumerate camera devices
  const enumerateDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices
        .filter((device) => device.kind === 'videoinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.substring(0, 5)}`,
          kind: device.kind,
        }));
      
      setDevices(videoDevices);
      
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      setError('Failed to enumerate camera devices');
      console.error(err);
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

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setIsStreaming(true);

      // Start FPS counter
      frameCountRef.current = 0;
      fpsIntervalRef.current = setInterval(() => {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
      }, 1000);

      return newStream;
    } catch (err: any) {
      const errorMessage = err.name === 'NotAllowedError'
        ? 'Camera permission denied'
        : err.name === 'NotFoundError'
        ? 'No camera found'
        : 'Failed to access camera';
      
      setError(errorMessage);
      setIsStreaming(false);
      console.error(err);
      return null;
    }
  }, [stream]);

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
      await startCamera(deviceId);
    }
  }, [isStreaming, startCamera]);

  // Increment frame count for FPS calculation
  const incrementFrameCount = useCallback(() => {
    frameCountRef.current++;
  }, []);

  // Initial device enumeration
  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    devices,
    selectedDeviceId,
    stream,
    isStreaming,
    error,
    fps,
    videoRef,
    startCamera,
    stopCamera,
    changeCamera,
    enumerateDevices,
    incrementFrameCount,
  };
}

