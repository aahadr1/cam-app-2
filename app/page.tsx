'use client';

import { useEffect, useState, useRef } from 'react';
import { useCamera } from '@/hooks/use-camera';
import { useSettingsStore } from '@/store/settings-store';
import { eventStorage } from '@/lib/event-storage';
import { MotionZoneDetector, generateZoneColor } from '@/lib/motion-zones';
import { VideoBuffer } from '@/lib/video-buffer';
import { MotionEvent, MotionZone } from '@/types';
import { Video, Calendar, Grid3x3, Settings, Plus, Play, Pause, Download, AlertCircle, Camera, Activity, Circle } from 'lucide-react';

export default function CCTVManager() {
  const {
    devices,
    selectedDeviceId,
    stream,
    isStreaming,
    error,
    fps,
    startCamera,
    stopCamera,
    changeCamera,
    enumerateDevices,
  } = useCamera();

  const {
    zones,
    addZone,
    deleteZone,
    toggleZone,
    viewMode,
    setViewMode,
    motionDetectionEnabled,
    setMotionDetectionEnabled,
    motionSensitivity,
    setMotionSensitivity,
    alertsEnabled,
    setAlertsEnabled,
  } = useSettingsStore();

  const [events, setEvents] = useState<MotionEvent[]>([]);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [activeZones, setActiveZones] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<MotionZoneDetector | null>(null);
  const videoBufferRef = useRef<VideoBuffer>(new VideoBuffer(10));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Initialize
  useEffect(() => {
    enumerateDevices();
    eventStorage.init();
    loadEvents();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [enumerateDevices]);

  // Setup detector
  useEffect(() => {
    if (!detectorRef.current) {
      detectorRef.current = new MotionZoneDetector(zones);
    } else {
      detectorRef.current.setZones(zones);
    }
  }, [zones]);

  // Attach stream to video
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      
      // Start buffer recording
      if (stream && !mediaRecorderRef.current) {
        startBufferRecording();
      }
    }
  }, [stream]);

  // Motion detection loop
  useEffect(() => {
    if (!motionDetectionEnabled || !stream || !videoRef.current || !canvasRef.current) return;

    let animationId: number;
    const detect = () => {
      if (videoRef.current && canvasRef.current && detectorRef.current) {
        const result = detectorRef.current.detectMotion(videoRef.current, canvasRef.current);
        
        if (result.detected) {
          setActiveZones(result.triggeredZones);
          handleMotionDetected(result.triggeredZones);
        } else {
          setActiveZones([]);
        }
      }
      animationId = requestAnimationFrame(detect);
    };

    animationId = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(animationId);
  }, [motionDetectionEnabled, stream, zones]);

  const loadEvents = async () => {
    const loadedEvents = await eventStorage.getEvents(50);
    setEvents(loadedEvents);
  };

  const startBufferRecording = () => {
    if (!stream) return;
    
    try {
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoBufferRef.current.add(e.data);
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.error('Failed to start buffer recording:', err);
    }
  };

  const handleMotionDetected = async (triggeredZones: string[]) => {
    if (!isRecording) {
      // Start recording event
      setIsRecording(true);
      
      // Capture thumbnail
      const thumbnail = captureFrame();
      
      // Send alert if enabled
      if (alertsEnabled && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Motion Detected!', {
          body: `Motion in zones: ${triggeredZones.map(id => zones.find(z => z.id === id)?.name || id).join(', ')}`,
          icon: thumbnail,
        });
      }

      // Wait for motion to stop, then save event
      setTimeout(async () => {
        const event: MotionEvent = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          duration: 0,
          zones: triggeredZones,
          thumbnail,
          motionLevel: 75,
          alertSent: alertsEnabled,
          cameraId: selectedDeviceId,
        };
        
        await eventStorage.saveEvent(event);
        await loadEvents();
        setIsRecording(false);
      }, 5000);
    }
  };

  const captureFrame = (): string => {
    if (!videoRef.current) return '';
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.7);
    }
    return '';
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingZone || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvasRef.current.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvasRef.current.height;

    if (!drawStart) {
      setDrawStart({ x, y });
    } else {
      const zone: MotionZone = {
        id: crypto.randomUUID(),
        name: `Zone ${zones.length + 1}`,
        rect: {
          x: Math.min(drawStart.x, x),
          y: Math.min(drawStart.y, y),
          width: Math.abs(x - drawStart.x),
          height: Math.abs(y - drawStart.y),
        },
        sensitivity: 50,
        enabled: true,
        color: generateZoneColor(),
        alertLevel: 'medium',
      };
      addZone(zone);
      setDrawStart(null);
      setIsDrawingZone(false);
    }
  };

  const deleteEvent = async (id: string) => {
    await eventStorage.deleteEvent(id);
    await loadEvents();
  };

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Video className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold">CCTV Manager</h1>
          {isStreaming && (
            <span className="flex items-center gap-2 text-sm text-green-400">
              <Circle className="w-2 h-2 fill-green-400" />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Activity className="w-4 h-4" />
          <span>{fps} FPS</span>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden bg-gray-900 border-t border-gray-800 flex justify-around p-2 order-last">
        {[
          { mode: 'live' as const, icon: Video, label: 'Live' },
          { mode: 'events' as const, icon: Calendar, label: 'Events' },
          { mode: 'zones' as const, icon: Grid3x3, label: 'Zones' },
          { mode: 'settings' as const, icon: Settings, label: 'Settings' },
        ].map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded ${
              viewMode === mode ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex w-64 bg-gray-900 border-r border-gray-800 flex-col">
          <div className="p-4 space-y-2">
            {[
              { mode: 'live' as const, icon: Video, label: 'Live View' },
              { mode: 'events' as const, icon: Calendar, label: 'Events' },
              { mode: 'zones' as const, icon: Grid3x3, label: 'Motion Zones' },
              { mode: 'settings' as const, icon: Settings, label: 'Settings' },
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Camera Selector */}
          <div className="p-4 border-t border-gray-800">
            <label className="block text-xs text-gray-400 mb-2">Camera</label>
            <select
              value={selectedDeviceId}
              onChange={(e) => changeCamera(e.target.value)}
              disabled={isStreaming}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
              ))}
            </select>
            <button
              onClick={() => isStreaming ? stopCamera() : startCamera(selectedDeviceId)}
              className={`w-full mt-2 py-2 rounded font-medium ${
                isStreaming
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isStreaming ? 'Stop Camera' : 'Start Camera'}
            </button>
          </div>

          {/* Quick Controls */}
          <div className="p-4 border-t border-gray-800 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={motionDetectionEnabled}
                onChange={(e) => setMotionDetectionEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Motion Detection</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={alertsEnabled}
                onChange={(e) => setAlertsEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Alerts</span>
            </label>
          </div>

          {/* Zones List */}
          {zones.length > 0 && (
            <div className="flex-1 overflow-y-auto p-4 border-t border-gray-800">
              <h3 className="text-xs font-semibold text-gray-400 mb-2">Active Zones</h3>
              <div className="space-y-2">
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className={`p-2 rounded border ${
                      activeZones.includes(zone.id)
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: zone.color }}
                        />
                        <span className="text-sm">{zone.name}</span>
                      </div>
                      <button
                        onClick={() => deleteZone(zone.id)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Area */}
        <main className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-300 px-4 py-3 rounded flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Live View */}
          {viewMode === 'live' && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="absolute inset-0 w-full h-full cursor-crosshair"
                  style={{ pointerEvents: isDrawingZone ? 'auto' : 'none' }}
                />
                
                {/* Zone Overlays */}
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="absolute border-2 pointer-events-none"
                    style={{
                      left: `${(zone.rect.x / (canvasRef.current?.width || 1)) * 100}%`,
                      top: `${(zone.rect.y / (canvasRef.current?.height || 1)) * 100}%`,
                      width: `${(zone.rect.width / (canvasRef.current?.width || 1)) * 100}%`,
                      height: `${(zone.rect.height / (canvasRef.current?.height || 1)) * 100}%`,
                      borderColor: zone.color,
                      backgroundColor: activeZones.includes(zone.id) ? `${zone.color}33` : 'transparent',
                    }}
                  >
                    <div className="absolute -top-6 left-0 bg-black/75 px-2 py-1 text-xs rounded">
                      {zone.name}
                    </div>
                  </div>
                ))}

                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center">
                      <Camera className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                      <p className="text-gray-400">Camera Offline</p>
                      <p className="text-sm text-gray-500 mt-2">Click "Start Camera" to begin</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsDrawingZone(!isDrawingZone)}
                  className={`flex items-center gap-2 px-4 py-2 rounded ${
                    isDrawingZone ? 'bg-blue-600' : 'bg-gray-800'
                  }`}
                  disabled={!isStreaming}
                >
                  <Plus className="w-4 h-4" />
                  {isDrawingZone ? 'Click to Draw Zone' : 'Add Zone'}
                </button>
              </div>
            </div>
          )}

          {/* Events Timeline */}
          {viewMode === 'events' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Recent Events</h2>
                <span className="text-sm text-gray-400">{events.length} events</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((event) => (
                  <div key={event.id} className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
                    {event.thumbnail && (
                      <img src={event.thumbnail} alt="Event" className="w-full aspect-video object-cover" />
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                        <button
                          onClick={() => deleteEvent(event.id)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {event.zones.map((zoneId) => {
                          const zone = zones.find(z => z.id === zoneId);
                          return zone ? (
                            <span
                              key={zoneId}
                              className="text-xs px-2 py-1 rounded"
                              style={{ backgroundColor: `${zone.color}33`, color: zone.color }}
                            >
                              {zone.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Zones Management */}
          {viewMode === 'zones' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Motion Zones</h2>
                <button
                  onClick={() => setViewMode('live')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded"
                >
                  <Plus className="w-4 h-4" />
                  Add Zone
                </button>
              </div>
              {zones.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Grid3x3 className="w-16 h-16 mx-auto mb-4" />
                  <p>No zones defined</p>
                  <p className="text-sm mt-2">Switch to Live View to draw zones</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {zones.map((zone) => (
                    <div key={zone.id} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded"
                            style={{ backgroundColor: zone.color }}
                          />
                          <h3 className="font-semibold">{zone.name}</h3>
                        </div>
                        <button
                          onClick={() => toggleZone(zone.id)}
                          className={`px-3 py-1 rounded text-sm ${
                            zone.enabled ? 'bg-green-600' : 'bg-gray-700'
                          }`}
                        >
                          {zone.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                      <div className="space-y-2 text-sm text-gray-400">
                        <p>Sensitivity: {zone.sensitivity}</p>
                        <p>Alert Level: {zone.alertLevel}</p>
                      </div>
                      <button
                        onClick={() => deleteZone(zone.id)}
                        className="mt-4 w-full py-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30"
                      >
                        Delete Zone
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          {viewMode === 'settings' && (
            <div className="space-y-6 max-w-2xl">
              <h2 className="text-2xl font-bold">Settings</h2>
              
              <div className="bg-gray-900 rounded-lg p-6 space-y-4">
                <h3 className="font-semibold mb-4">Motion Detection</h3>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Sensitivity: {motionSensitivity}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={motionSensitivity}
                    onChange={(e) => setMotionSensitivity(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="font-semibold mb-4">Notifications</h3>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={alertsEnabled}
                    onChange={(e) => setAlertsEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Enable browser notifications</span>
                </label>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
