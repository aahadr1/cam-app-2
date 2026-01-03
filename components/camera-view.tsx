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

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => console.error('Error playing video:', err));
    }
    
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  // Draw motion boxes overlay
  useEffect(() => {
    if (!showMotionBoxes || !canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawMotionBoxes = () => {
      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw motion boxes
        if (motionAreas.length > 0) {
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 3;
          motionAreas.forEach((area) => {
            ctx.strokeRect(area.x, area.y, area.width, area.height);
          });
        }
      }

      if (onFrameUpdate) {
        onFrameUpdate();
      }

      requestAnimationFrame(drawMotionBoxes);
    };

    const animationId = requestAnimationFrame(drawMotionBoxes);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [showMotionBoxes, motionAreas, onFrameUpdate]);

  return (
    <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
      {/* Video Element - Always visible */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />
      
      {/* Motion Detection Overlay Canvas */}
      {showMotionBoxes && (
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />
      )}

      {/* No Stream Message */}
      {!stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900">
          <svg className="w-16 h-16 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium">No Camera Stream</p>
          <p className="text-sm text-gray-400 mt-2">Click "Start Camera" to begin</p>
        </div>
      )}
    </div>
  );
}
