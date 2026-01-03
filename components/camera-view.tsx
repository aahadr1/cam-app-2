'use client';

import { useEffect, useRef } from 'react';
import { MotionArea } from '@/types';

interface CameraViewProps {
  stream: MediaStream | null;
  motionAreas: MotionArea[];
  showMotionBoxes: boolean;
  onFrameUpdate?: () => void;
}

export function CameraView({ stream, motionAreas, showMotionBoxes, onFrameUpdate }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    const drawFrame = () => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
          // Set canvas size to match video
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          // Draw video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Draw motion boxes if enabled
          if (showMotionBoxes && motionAreas.length > 0) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            motionAreas.forEach((area) => {
              ctx.strokeRect(area.x, area.y, area.width, area.height);
            });
          }

          if (onFrameUpdate) {
            onFrameUpdate();
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(drawFrame);
    };

    if (stream) {
      animationFrameRef.current = requestAnimationFrame(drawFrame);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [stream, motionAreas, showMotionBoxes, onFrameUpdate]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
      />
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50">
          <p>No camera stream</p>
        </div>
      )}
    </div>
  );
}

