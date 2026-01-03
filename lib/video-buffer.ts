/**
 * Video buffer for pre-motion recording
 * Keeps last N seconds of video in memory
 */
export class VideoBuffer {
  private chunks: Blob[] = [];
  private maxDuration: number;
  private startTime: number = 0;

  constructor(maxDurationSeconds: number = 10) {
    this.maxDuration = maxDurationSeconds * 1000; // Convert to ms
  }

  add(chunk: Blob) {
    const now = Date.now();
    
    if (this.chunks.length === 0) {
      this.startTime = now;
    }

    this.chunks.push(chunk);

    // Remove old chunks
    const elapsedTime = now - this.startTime;
    if (elapsedTime > this.maxDuration) {
      // Remove oldest chunk
      this.chunks.shift();
      this.startTime = now - this.maxDuration;
    }
  }

  getAll(): Blob[] {
    return [...this.chunks];
  }

  clear() {
    this.chunks = [];
    this.startTime = 0;
  }

  getDuration(): number {
    if (this.chunks.length === 0) return 0;
    return Date.now() - this.startTime;
  }
}

