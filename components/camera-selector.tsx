'use client';

import { CameraDevice } from '@/types';
import { Camera } from 'lucide-react';

interface CameraSelectorProps {
  devices: CameraDevice[];
  selectedDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
  disabled?: boolean;
}

export function CameraSelector({ devices, selectedDeviceId, onDeviceChange, disabled }: CameraSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <Camera className="w-5 h-5 text-slate-400 flex-shrink-0" />
      <div className="flex-1">
        <label className="block text-xs text-slate-400 mb-1.5">Camera Device</label>
        <select
          value={selectedDeviceId}
          onChange={(e) => onDeviceChange(e.target.value)}
          disabled={disabled || devices.length === 0}
          className="w-full h-10 rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {devices.length === 0 ? (
            <option>No cameras found</option>
          ) : (
            devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
}
