'use client';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Square, Circle, Download, Settings } from 'lucide-react';

interface ControlsProps {
  isStreaming: boolean;
  isRecording: boolean;
  motionEnabled: boolean;
  motionSensitivity: number;
  hasRecording: boolean;
  onStartStop: () => void;
  onRecordToggle: () => void;
  onMotionToggle: () => void;
  onSensitivityChange: (value: number) => void;
  onDownload: () => void;
  onSettings: () => void;
}

export function Controls({
  isStreaming,
  isRecording,
  motionEnabled,
  motionSensitivity,
  hasRecording,
  onStartStop,
  onRecordToggle,
  onMotionToggle,
  onSensitivityChange,
  onDownload,
  onSettings,
}: ControlsProps) {
  return (
    <div className="space-y-4">
      {/* Main Controls */}
      <div className="flex gap-2">
        <Button
          onClick={onStartStop}
          size="lg"
          className="flex-1"
        >
          {isStreaming ? (
            <>
              <Square className="w-4 h-4 mr-2" />
              Stop Viewing
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start Viewing
            </>
          )}
        </Button>
        <Button
          onClick={onSettings}
          size="lg"
          variant="outline"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Motion Detection */}
      <div className="space-y-2 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Motion Detection</label>
          <input
            type="checkbox"
            checked={motionEnabled}
            onChange={(e) => onMotionToggle()}
            disabled={!isStreaming}
            className="w-4 h-4"
          />
        </div>
        {motionEnabled && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sensitivity:</span>
              <span className="font-medium">{motionSensitivity}</span>
            </div>
            <Slider
              value={[motionSensitivity]}
              onValueChange={([value]) => onSensitivityChange(value)}
              min={1}
              max={100}
              step={1}
              disabled={!isStreaming}
            />
          </div>
        )}
      </div>

      {/* Recording */}
      <div className="space-y-2 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Recording</label>
          <div className="flex items-center gap-2">
            {isRecording && (
              <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
            )}
            <input
              type="checkbox"
              checked={isRecording}
              onChange={(e) => onRecordToggle()}
              disabled={!isStreaming}
              className="w-4 h-4"
            />
          </div>
        </div>
        {hasRecording && !isRecording && (
          <Button
            onClick={onDownload}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Recording
          </Button>
        )}
      </div>
    </div>
  );
}

