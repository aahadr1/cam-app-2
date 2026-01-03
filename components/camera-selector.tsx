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
    <div className="flex items-center gap-2">
      <Camera className="w-5 h-5 text-muted-foreground" />
      <select
        value={selectedDeviceId}
        onChange={(e) => onDeviceChange(e.target.value)}
        disabled={disabled || devices.length === 0}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
  );
}

