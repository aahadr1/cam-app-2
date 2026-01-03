'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useCamera } from '@/hooks/use-camera';
import { useSettingsStore } from '@/store/settings-store';
import { eventStorage } from '@/lib/event-storage';
import { MotionZoneDetector, generateZoneColor } from '@/lib/motion-zones';
import { MotionEvent, MotionZone, ViewMode } from '@/types';
import { 
  Video, Calendar, Grid3x3, Settings, Plus, Trash2, AlertCircle, 
  Camera, Activity, Circle, Eye, EyeOff, Minus, RefreshCw,
  ChevronLeft, ChevronRight
} from 'lucide-react';

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
    updateZone,
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
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [activeZones, setActiveZones] = useState<string[]>([]);
  const [lastMotionTime, setLastMotionTime] = useState(0);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<MotionZoneDetector | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    enumerateDevices();
    eventStorage.init();
    loadEvents();
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [enumerateDevices]);

  // Setup detector with zones
  useEffect(() => {
    if (!detectorRef.current) {
      detectorRef.current = new MotionZoneDetector(zones);
    } else {
      detectorRef.current.setZones(zones);
    }
  }, [zones]);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  // Motion detection loop
  useEffect(() => {
    if (!motionDetectionEnabled || !stream || !videoRef.current || !canvasRef.current) {
      setActiveZones([]);
      return;
    }

    let animationId: number;
    
    const detect = () => {
      if (videoRef.current && canvasRef.current && detectorRef.current) {
        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          const result = detectorRef.current.detectMotion(videoRef.current, canvasRef.current);
          
          if (result.detected && result.triggeredZones.length > 0) {
            setActiveZones(result.triggeredZones);
            
            // Capture screenshot on motion (throttle to once per 3 seconds)
            const now = Date.now();
            if (now - lastMotionTime > 3000) {
              setLastMotionTime(now);
              captureMotionEvent(result.triggeredZones);
            }
          } else {
            setActiveZones([]);
          }
        }
      }
      animationId = requestAnimationFrame(detect);
    };

    animationId = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(animationId);
  }, [motionDetectionEnabled, stream, zones, lastMotionTime]);

  const loadEvents = async () => {
    try {
      const loadedEvents = await eventStorage.getEvents(100);
      setEvents(loadedEvents);
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  // Capture screenshot and save event
  const captureMotionEvent = async (triggeredZones: string[]) => {
    if (!videoRef.current) return;

    const thumbnail = captureFrame();
    if (!thumbnail) return;

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

    // Send notification
    if (alertsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      const zoneNames = triggeredZones
        .map(id => zones.find(z => z.id === id)?.name || 'Unknown')
        .join(', ');
      
      new Notification('🚨 Motion Detected!', {
        body: `Motion in: ${zoneNames}`,
        icon: thumbnail,
        tag: 'motion-alert',
      });
    }
  };

  const captureFrame = (): string => {
    if (!videoRef.current) return '';
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.8);
    }
    return '';
  };

  // Get relative coordinates
  const getRelativeCoords = (e: React.MouseEvent): { x: number; y: number } | null => {
    if (!containerRef.current || !videoRef.current) return null;
    
    const rect = containerRef.current.getBoundingClientRect();
    const videoWidth = videoRef.current.videoWidth || 640;
    const videoHeight = videoRef.current.videoHeight || 480;
    
    // Calculate the actual video display area (accounting for object-contain)
    const containerAspect = rect.width / rect.height;
    const videoAspect = videoWidth / videoHeight;
    
    let displayWidth, displayHeight, offsetX, offsetY;
    
    if (containerAspect > videoAspect) {
      displayHeight = rect.height;
      displayWidth = rect.height * videoAspect;
      offsetX = (rect.width - displayWidth) / 2;
      offsetY = 0;
    } else {
      displayWidth = rect.width;
      displayHeight = rect.width / videoAspect;
      offsetX = 0;
      offsetY = (rect.height - displayHeight) / 2;
    }
    
    const x = ((e.clientX - rect.left - offsetX) / displayWidth) * videoWidth;
    const y = ((e.clientY - rect.top - offsetY) / displayHeight) * videoHeight;
    
    // Clamp values
    return {
      x: Math.max(0, Math.min(videoWidth, x)),
      y: Math.max(0, Math.min(videoHeight, y)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDrawingZone || !isStreaming) return;
    const coords = getRelativeCoords(e);
    if (coords) {
      setDrawStart(coords);
      setDrawCurrent(coords);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingZone || !drawStart) return;
    const coords = getRelativeCoords(e);
    if (coords) {
      setDrawCurrent(coords);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawingZone || !drawStart || !drawCurrent) return;
    
    const width = Math.abs(drawCurrent.x - drawStart.x);
    const height = Math.abs(drawCurrent.y - drawStart.y);
    
    // Minimum zone size
    if (width > 30 && height > 30) {
      const zone: MotionZone = {
        id: crypto.randomUUID(),
        name: `Zone ${zones.length + 1}`,
        rect: {
          x: Math.min(drawStart.x, drawCurrent.x),
          y: Math.min(drawStart.y, drawCurrent.y),
          width,
          height,
        },
        sensitivity: motionSensitivity,
        enabled: true,
        color: generateZoneColor(),
        alertLevel: 'medium',
      };
      addZone(zone);
    }
    
    setDrawStart(null);
    setDrawCurrent(null);
    setIsDrawingZone(false);
  };

  const deleteEvent = async (id: string) => {
    await eventStorage.deleteEvent(id);
    await loadEvents();
  };

  const handleStartCamera = async () => {
    await startCamera(selectedDeviceId);
  };

  // Calculate zone display position
  const getZoneStyle = (zone: MotionZone) => {
    const videoWidth = videoRef.current?.videoWidth || 640;
    const videoHeight = videoRef.current?.videoHeight || 480;
    
    return {
      left: `${(zone.rect.x / videoWidth) * 100}%`,
      top: `${(zone.rect.y / videoHeight) * 100}%`,
      width: `${(zone.rect.width / videoWidth) * 100}%`,
      height: `${(zone.rect.height / videoHeight) * 100}%`,
    };
  };

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Video className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold hidden sm:block">CCTV Manager</h1>
          {isStreaming && (
            <span className="flex items-center gap-2 text-sm text-green-400">
              <Circle className="w-2 h-2 fill-green-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {motionDetectionEnabled && (
            <span className={`text-sm ${activeZones.length > 0 ? 'text-red-400 animate-pulse font-bold' : 'text-gray-400'}`}>
              {activeZones.length > 0 ? '🚨 MOTION!' : 'Monitoring...'}
            </span>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Activity className="w-4 h-4" />
            <span>{fps} FPS</span>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden bg-gray-900 border-t border-gray-800 flex justify-around py-2 order-last shrink-0">
        {[
          { mode: 'live' as ViewMode, icon: Video, label: 'Live' },
          { mode: 'events' as ViewMode, icon: Calendar, label: 'Events' },
          { mode: 'zones' as ViewMode, icon: Grid3x3, label: 'Zones' },
          { mode: 'settings' as ViewMode, icon: Settings, label: 'Settings' },
        ].map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition ${
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
        <aside className="hidden md:flex w-72 bg-gray-900 border-r border-gray-800 flex-col shrink-0">
          {/* Navigation */}
          <div className="p-4 space-y-1">
            {[
              { mode: 'live' as ViewMode, icon: Video, label: 'Live View' },
              { mode: 'events' as ViewMode, icon: Calendar, label: 'Events', count: events.length },
              { mode: 'zones' as ViewMode, icon: Grid3x3, label: 'Motion Zones', count: zones.length },
              { mode: 'settings' as ViewMode, icon: Settings, label: 'Settings' },
            ].map(({ mode, icon: Icon, label, count }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </span>
                {count !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    viewMode === mode ? 'bg-blue-500' : 'bg-gray-700'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Camera Controls */}
          <div className="p-4 border-t border-gray-800">
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Camera</label>
            <select
              value={selectedDeviceId}
              onChange={(e) => changeCamera(e.target.value)}
              disabled={isStreaming}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm disabled:opacity-50"
            >
              {devices.length === 0 ? (
                <option>No cameras found</option>
              ) : (
                devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                ))
              )}
            </select>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => isStreaming ? stopCamera() : handleStartCamera()}
                className={`flex-1 py-2.5 rounded-lg font-medium transition ${
                  isStreaming
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isStreaming ? 'Stop' : 'Start'}
              </button>
              <button
                onClick={enumerateDevices}
                className="px-3 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg"
                title="Refresh cameras"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Detection Controls */}
          <div className="p-4 border-t border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Motion Detection</span>
              <button
                onClick={() => setMotionDetectionEnabled(!motionDetectionEnabled)}
                disabled={!isStreaming}
                className={`w-12 h-6 rounded-full transition relative ${
                  motionDetectionEnabled ? 'bg-blue-600' : 'bg-gray-700'
                } ${!isStreaming && 'opacity-50'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  motionDetectionEnabled ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Sensitivity Slider */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Sensitivity</span>
                <span className="text-blue-400 font-mono">{motionSensitivity}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMotionSensitivity(Math.max(1, motionSensitivity - 10))}
                  className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={motionSensitivity}
                  onChange={(e) => setMotionSensitivity(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                    [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <button
                  onClick={() => setMotionSensitivity(Math.min(100, motionSensitivity + 10))}
                  className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Less</span>
                <span>More</span>
              </div>
            </div>

            {/* Alerts Toggle */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm">Alerts</span>
              <button
                onClick={() => setAlertsEnabled(!alertsEnabled)}
                className={`w-12 h-6 rounded-full transition relative ${
                  alertsEnabled ? 'bg-green-600' : 'bg-gray-700'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  alertsEnabled ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Active Zones */}
          {zones.length > 0 && (
            <div className="flex-1 overflow-y-auto p-4 border-t border-gray-800">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Detection Zones
              </h3>
              <div className="space-y-2">
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    onClick={() => setSelectedZone(zone.id === selectedZone ? null : zone.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      activeZones.includes(zone.id)
                        ? 'border-red-500 bg-red-500/10 animate-pulse'
                        : selectedZone === zone.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: zone.color }}
                        />
                        <span className="text-sm font-medium">{zone.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleZone(zone.id); }}
                          className={`p-1 rounded ${zone.enabled ? 'text-green-400' : 'text-gray-500'}`}
                        >
                          {zone.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteZone(zone.id); }}
                          className="p-1 text-gray-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Area */}
        <main className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-4 bg-red-500/10 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* LIVE VIEW */}
          {viewMode === 'live' && (
            <div className="h-full flex flex-col p-4">
              {/* Video Container */}
              <div 
                ref={containerRef}
                className="relative flex-1 bg-black rounded-xl overflow-hidden cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { if (isDrawingZone) { setDrawStart(null); setDrawCurrent(null); } }}
              >
                {/* Video Element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
                
                {/* Hidden canvas for detection */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Zone Overlays */}
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className={`absolute border-2 pointer-events-none transition-all ${
                      !zone.enabled ? 'opacity-30' : ''
                    }`}
                    style={{
                      ...getZoneStyle(zone),
                      borderColor: zone.color,
                      backgroundColor: activeZones.includes(zone.id) 
                        ? `${zone.color}40` 
                        : selectedZone === zone.id 
                        ? `${zone.color}20`
                        : 'transparent',
                      boxShadow: activeZones.includes(zone.id) 
                        ? `0 0 20px ${zone.color}, inset 0 0 20px ${zone.color}40`
                        : 'none',
                    }}
                  >
                    <div 
                      className="absolute -top-7 left-0 px-2 py-1 text-xs font-medium rounded"
                      style={{ backgroundColor: zone.color }}
                    >
                      {zone.name}
                    </div>
                  </div>
                ))}

                {/* Drawing Preview */}
                {isDrawingZone && drawStart && drawCurrent && (
                  <div
                    className="absolute border-2 border-dashed border-blue-400 bg-blue-400/20 pointer-events-none"
                    style={{
                      left: `${(Math.min(drawStart.x, drawCurrent.x) / (videoRef.current?.videoWidth || 640)) * 100}%`,
                      top: `${(Math.min(drawStart.y, drawCurrent.y) / (videoRef.current?.videoHeight || 480)) * 100}%`,
                      width: `${(Math.abs(drawCurrent.x - drawStart.x) / (videoRef.current?.videoWidth || 640)) * 100}%`,
                      height: `${(Math.abs(drawCurrent.y - drawStart.y) / (videoRef.current?.videoHeight || 480)) * 100}%`,
                    }}
                  />
                )}

                {/* No Stream Overlay */}
                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/95">
                    <div className="text-center">
                      <Camera className="w-20 h-20 mx-auto mb-4 text-gray-600" />
                      <p className="text-xl font-medium text-gray-300">Camera Offline</p>
                      <p className="text-gray-500 mt-2">Select a camera and click Start</p>
                      <button
                        onClick={handleStartCamera}
                        className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
                      >
                        Start Camera
                      </button>
                    </div>
                  </div>
                )}

                {/* Drawing Mode Indicator */}
                {isDrawingZone && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 px-4 py-2 rounded-full text-sm font-medium animate-pulse">
                    Click and drag to draw a zone
                  </div>
                )}
              </div>

              {/* Controls Bar */}
              <div className="flex items-center justify-between mt-4 gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsDrawingZone(!isDrawingZone)}
                    disabled={!isStreaming}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition ${
                      isDrawingZone 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    } disabled:opacity-50`}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">{isDrawingZone ? 'Drawing...' : 'Add Zone'}</span>
                  </button>
                  
                  {zones.length > 0 && (
                    <button
                      onClick={() => zones.forEach(z => deleteZone(z.id))}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-red-600/20 text-gray-300 hover:text-red-400 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Clear All</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{zones.length} zones</span>
                  <span>{events.length} events</span>
                </div>
              </div>
            </div>
          )}

          {/* EVENTS VIEW */}
          {viewMode === 'events' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Motion Events</h2>
                <button
                  onClick={loadEvents}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>

              {events.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400 text-lg">No events recorded</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Events will appear here when motion is detected
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {events.map((event) => (
                    <div 
                      key={event.id} 
                      className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-gray-700 transition group"
                    >
                      {event.thumbnail && (
                        <div className="relative aspect-video">
                          <img 
                            src={event.thumbnail} 
                            alt="Motion event" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2 text-xs text-white/80">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      )}
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">
                            {new Date(event.timestamp).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {event.zones.map((zoneId) => {
                            const zone = zones.find(z => z.id === zoneId);
                            return (
                              <span
                                key={zoneId}
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{ 
                                  backgroundColor: zone ? `${zone.color}30` : '#374151',
                                  color: zone?.color || '#9CA3AF'
                                }}
                              >
                                {zone?.name || 'Unknown'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ZONES VIEW */}
          {viewMode === 'zones' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Motion Zones</h2>
                <button
                  onClick={() => { setViewMode('live'); setIsDrawingZone(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  Add Zone
                </button>
              </div>

              {zones.length === 0 ? (
                <div className="text-center py-16">
                  <Grid3x3 className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400 text-lg">No detection zones</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Create zones to focus motion detection on specific areas
                  </p>
                  <button
                    onClick={() => { setViewMode('live'); setIsDrawingZone(true); }}
                    className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Draw Your First Zone
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {zones.map((zone) => (
                    <div 
                      key={zone.id} 
                      className="bg-gray-900 rounded-xl p-5 border border-gray-800"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg"
                            style={{ backgroundColor: zone.color }}
                          />
                          <div>
                            <h3 className="font-semibold">{zone.name}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {zone.enabled ? 'Active' : 'Disabled'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleZone(zone.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                            zone.enabled 
                              ? 'bg-green-600/20 text-green-400' 
                              : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          {zone.enabled ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div>
                          <label className="block text-gray-500 mb-1">Sensitivity</label>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={zone.sensitivity}
                            onChange={(e) => updateZone(zone.id, { sensitivity: parseInt(e.target.value) })}
                            className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer
                              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                              [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 
                              [&::-webkit-slider-thumb]:rounded-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Low</span>
                            <span>{zone.sensitivity}</span>
                            <span>High</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteZone(zone.id)}
                        className="w-full mt-4 py-2 bg-red-600/10 text-red-400 hover:bg-red-600/20 rounded-lg transition"
                      >
                        Delete Zone
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SETTINGS VIEW */}
          {viewMode === 'settings' && (
            <div className="p-4 max-w-2xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold">Settings</h2>
              
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold mb-4">Motion Detection</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Default Sensitivity: {motionSensitivity}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={motionSensitivity}
                      onChange={(e) => setMotionSensitivity(parseInt(e.target.value))}
                      className="w-full h-3 bg-gray-700 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 
                        [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-blue-500 
                        [&::-webkit-slider-thumb]:rounded-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>Less sensitive (fewer alerts)</span>
                      <span>More sensitive (more alerts)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold mb-4">Notifications</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Browser Alerts</p>
                    <p className="text-sm text-gray-500">Get notified when motion is detected</p>
                  </div>
                  <button
                    onClick={() => setAlertsEnabled(!alertsEnabled)}
                    className={`w-14 h-7 rounded-full transition relative ${
                      alertsEnabled ? 'bg-green-600' : 'bg-gray-700'
                    }`}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                      alertsEnabled ? 'translate-x-8' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold mb-4">Data Management</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Stored Events</p>
                      <p className="text-sm text-gray-500">{events.length} events in database</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (confirm('Delete all events?')) {
                          for (const event of events) {
                            await eventStorage.deleteEvent(event.id);
                          }
                          await loadEvents();
                        }
                      }}
                      className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
