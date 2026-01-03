'use client';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Video, VideoOff, Circle, Download, Activity } from 'lucide-react';

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
}: ControlsProps) {
  return (
    <div className="space-y-6">
      {/* Main Control Button */}
      <Button
        onClick={onStartStop}
        size="lg"
        className={`w-full h-14 text-lg font-semibold ${
          isStreaming
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isStreaming ? (
          <>
            <VideoOff className="w-5 h-5 mr-2" />
            Stop Camera
          </>
        ) : (
          <>
            <Video className="w-5 h-5 mr-2" />
            Start Camera
          </>
        )}
      </Button>

      <div className="h-px bg-slate-700"></div>

      {/* Motion Detection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-400" />
            <label className="text-sm font-medium text-slate-200">Motion Detection</label>
          </div>
          <button
            onClick={onMotionToggle}
            disabled={!isStreaming}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              motionEnabled ? 'bg-blue-600' : 'bg-slate-700'
            } ${!isStreaming && 'opacity-50 cursor-not-allowed'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                motionEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {motionEnabled && (
          <div className="space-y-3 pl-7">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Sensitivity</span>
              <span className="font-medium text-blue-400">{motionSensitivity}</span>
            </div>
            <Slider
              value={[motionSensitivity]}
              onValueChange={([value]) => onSensitivityChange(value)}
              min={1}
              max={100}
              step={1}
              disabled={!isStreaming}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>Less Sensitive</span>
              <span>More Sensitive</span>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-slate-700"></div>

      {/* Recording */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Circle className={`w-5 h-5 ${isRecording ? 'text-red-500 fill-red-500' : 'text-slate-400'}`} />
            <label className="text-sm font-medium text-slate-200">Recording</label>
          </div>
          <button
            onClick={onRecordToggle}
            disabled={!isStreaming}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isRecording ? 'bg-red-600' : 'bg-slate-700'
            } ${!isStreaming && 'opacity-50 cursor-not-allowed'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isRecording ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {hasRecording && !isRecording && (
          <Button
            onClick={onDownload}
            size="sm"
            variant="outline"
            className="w-full border-slate-600 hover:bg-slate-700 text-slate-200"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Recording
          </Button>
        )}
      </div>
    </div>
  );
}
