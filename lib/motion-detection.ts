import { MotionArea } from '@/types';

export class MotionDetector {
  private previousFrame: ImageData | null = null;
  private sensitivity: number = 50;

  constructor(sensitivity: number = 50) {
    this.sensitivity = sensitivity;
  }

  setSensitivity(value: number) {
    this.sensitivity = Math.max(1, Math.min(100, value));
  }

  detectMotion(
    videoElement: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ): { detected: boolean; areas: MotionArea[] } {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return { detected: false, areas: [] };
    }

    // Set canvas dimensions to match video
    if (canvas.width !== videoElement.videoWidth || canvas.height !== videoElement.videoHeight) {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
    }

    // Draw current frame
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Need at least one previous frame to compare
    if (!this.previousFrame) {
      this.previousFrame = currentFrame;
      return { detected: false, areas: [] };
    }

    // Calculate threshold based on sensitivity
    const threshold = 25 + (100 - this.sensitivity) * 0.5;
    
    // Compare frames and create difference map
    const diffData = new Uint8Array(canvas.width * canvas.height);
    let motionPixels = 0;

    for (let i = 0; i < currentFrame.data.length; i += 4) {
      const rDiff = Math.abs(currentFrame.data[i] - this.previousFrame.data[i]);
      const gDiff = Math.abs(currentFrame.data[i + 1] - this.previousFrame.data[i + 1]);
      const bDiff = Math.abs(currentFrame.data[i + 2] - this.previousFrame.data[i + 2]);
      
      const avgDiff = (rDiff + gDiff + bDiff) / 3;
      
      const pixelIndex = i / 4;
      if (avgDiff > threshold) {
        diffData[pixelIndex] = 255;
        motionPixels++;
      } else {
        diffData[pixelIndex] = 0;
      }
    }

    // Update previous frame
    this.previousFrame = currentFrame;

    // Determine if motion detected based on minimum pixel threshold
    const minArea = 500 / (this.sensitivity / 50);
    const motionDetected = motionPixels > minArea;

    // Find motion areas (simple bounding box detection)
    const areas: MotionArea[] = [];
    
    if (motionDetected) {
      // Simple grid-based area detection
      const gridSize = 50;
      const cols = Math.ceil(canvas.width / gridSize);
      const rows = Math.ceil(canvas.height / gridSize);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let motionInGrid = 0;
          
          for (let y = row * gridSize; y < Math.min((row + 1) * gridSize, canvas.height); y++) {
            for (let x = col * gridSize; x < Math.min((col + 1) * gridSize, canvas.width); x++) {
              const index = y * canvas.width + x;
              if (diffData[index] === 255) {
                motionInGrid++;
              }
            }
          }

          // If grid has significant motion, add as area
          if (motionInGrid > gridSize * gridSize * 0.2) {
            areas.push({
              x: col * gridSize,
              y: row * gridSize,
              width: Math.min(gridSize, canvas.width - col * gridSize),
              height: Math.min(gridSize, canvas.height - row * gridSize),
            });
          }
        }
      }
    }

    return { detected: motionDetected, areas };
  }

  reset() {
    this.previousFrame = null;
  }
}

