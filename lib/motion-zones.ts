import { MotionZone, MotionArea } from '@/types';

export class MotionZoneDetector {
  private zones: MotionZone[] = [];
  private previousFrame: ImageData | null = null;

  constructor(zones: MotionZone[] = []) {
    this.zones = zones;
  }

  setZones(zones: MotionZone[]) {
    this.zones = zones;
  }

  /**
   * Detect motion only within defined zones
   */
  detectMotion(
    videoElement: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ): { detected: boolean; areas: MotionArea[]; triggeredZones: string[] } {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return { detected: false, areas: [], triggeredZones: [] };
    }

    // Set canvas size
    if (canvas.width !== videoElement.videoWidth || canvas.height !== videoElement.videoHeight) {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
    }

    // Draw current frame
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (!this.previousFrame) {
      this.previousFrame = currentFrame;
      return { detected: false, areas: [], triggeredZones: [] };
    }

    const areas: MotionArea[] = [];
    const triggeredZones: string[] = [];
    const enabledZones = this.zones.filter(z => z.enabled);

    // If no zones, detect in entire frame
    if (enabledZones.length === 0) {
      const fullFrameDetection = this.detectInRegion(
        currentFrame,
        this.previousFrame,
        { x: 0, y: 0, width: canvas.width, height: canvas.height },
        50 // Default sensitivity
      );

      if (fullFrameDetection.detected) {
        areas.push(...fullFrameDetection.areas);
      }
    } else {
      // Detect motion in each zone
      for (const zone of enabledZones) {
        const detection = this.detectInRegion(
          currentFrame,
          this.previousFrame,
          zone.rect,
          zone.sensitivity
        );

        if (detection.detected) {
          triggeredZones.push(zone.id);
          areas.push(...detection.areas.map(area => ({ ...area, zone: zone.id })));
        }
      }
    }

    this.previousFrame = currentFrame;

    return {
      detected: areas.length > 0,
      areas,
      triggeredZones
    };
  }

  /**
   * Detect motion in a specific region
   */
  private detectInRegion(
    currentFrame: ImageData,
    previousFrame: ImageData,
    rect: { x: number; y: number; width: number; height: number },
    sensitivity: number
  ): { detected: boolean; areas: MotionArea[] } {
    const threshold = 25 + (100 - sensitivity) * 0.5;
    const minArea = 200 / (sensitivity / 50);
    
    let motionPixels = 0;
    const width = currentFrame.width;
    
    // Only check pixels within the zone
    for (let y = rect.y; y < Math.min(rect.y + rect.height, currentFrame.height); y++) {
      for (let x = rect.x; x < Math.min(rect.x + rect.width, currentFrame.width); x++) {
        const index = (y * width + x) * 4;
        
        const rDiff = Math.abs(currentFrame.data[index] - previousFrame.data[index]);
        const gDiff = Math.abs(currentFrame.data[index + 1] - previousFrame.data[index + 1]);
        const bDiff = Math.abs(currentFrame.data[index + 2] - previousFrame.data[index + 2]);
        
        const avgDiff = (rDiff + gDiff + bDiff) / 3;
        
        if (avgDiff > threshold) {
          motionPixels++;
        }
      }
    }

    const detected = motionPixels > minArea;

    // Return the zone itself as the motion area if detected
    return {
      detected,
      areas: detected ? [{ x: rect.x, y: rect.y, width: rect.width, height: rect.height }] : []
    };
  }

  reset() {
    this.previousFrame = null;
  }
}

/**
 * Generate a random color for a zone
 */
export function generateZoneColor(): string {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Check if a point is inside a zone
 */
export function isPointInZone(point: { x: number; y: number }, zone: MotionZone): boolean {
  return (
    point.x >= zone.rect.x &&
    point.x <= zone.rect.x + zone.rect.width &&
    point.y >= zone.rect.y &&
    point.y <= zone.rect.y + zone.rect.height
  );
}

