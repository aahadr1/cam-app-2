'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MotionArea } from '@/types';
import { MotionDetector } from '@/lib/motion-detection';

export function useMotionDetection(
  videoElement: HTMLVideoElement | null,
  enabled: boolean,
  sensitivity: number
) {
  const [motionDetected, setMotionDetected] = useState(false);
  const [motionAreas, setMotionAreas] = useState<MotionArea[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<MotionDetector | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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
    if (!enabled || !videoElement || !canvasRef.current || !detectorRef.current) {
      animationFrameRef.current = requestAnimationFrame(detectMotion);
      return;
    }

    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
      const result = detectorRef.current.detectMotion(videoElement, canvasRef.current);
      setMotionDetected(result.detected);
      setMotionAreas(result.areas);
    }

    animationFrameRef.current = requestAnimationFrame(detectMotion);
  }, [enabled, videoElement]);

  // Start/stop detection loop
  useEffect(() => {
    if (enabled && videoElement) {
      animationFrameRef.current = requestAnimationFrame(detectMotion);
    } else {
      setMotionDetected(false);
      setMotionAreas([]);
      if (detectorRef.current) {
        detectorRef.current.reset();
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, videoElement, detectMotion]);

  // Create canvas element
  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
  }, []);

  return {
    motionDetected,
    motionAreas,
    canvasRef,
  };
}

