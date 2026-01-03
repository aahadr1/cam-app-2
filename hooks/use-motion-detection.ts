'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MotionArea } from '@/types';
import { MotionDetector } from '@/lib/motion-detection';

export function useMotionDetection(
  stream: MediaStream | null,
  enabled: boolean,
  sensitivity: number
) {
  const [motionDetected, setMotionDetected] = useState(false);
  const [motionAreas, setMotionAreas] = useState<MotionArea[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<MotionDetector | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Create hidden video element for motion detection
  useEffect(() => {
    if (stream && enabled) {
      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.autoplay = true;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
      }
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream, enabled]);

  // Initialize detector
  useEffect(() => {
    if (!detectorRef.current) {
      detectorRef.current = new MotionDetector(sensitivity);
    }
  }, [sensitivity]);

  // Update sensitivity
  useEffect(() => {
    if (detectorRef.current) {
      detectorRef.current.setSensitivity(sensitivity);
    }
  }, [sensitivity]);

  // Detection loop
  const detectMotion = useCallback(() => {
    if (!enabled || !videoRef.current || !detectorRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const result = detectorRef.current.detectMotion(videoRef.current, canvasRef.current);
      setMotionDetected(result.detected);
      setMotionAreas(result.areas);
    }

    animationFrameRef.current = requestAnimationFrame(detectMotion);
  }, [enabled]);

  // Start/stop detection loop
  useEffect(() => {
    if (enabled && stream) {
      animationFrameRef.current = requestAnimationFrame(detectMotion);
    } else {
      setMotionDetected(false);
      setMotionAreas([]);
      if (detectorRef.current) {
        detectorRef.current.reset();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, stream, detectMotion]);

  return {
    motionDetected,
    motionAreas,
  };
}
