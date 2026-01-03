# Surveillance Camera Web App

A modern, browser-based surveillance camera application built with Next.js 14, React, and TypeScript.

## Features

- 🎥 **Live Camera Streaming** - Real-time video from your webcam
- 🔍 **Motion Detection** - Intelligent motion detection with adjustable sensitivity
- 📹 **Video Recording** - Record and download video clips
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🌐 **Browser-Based** - No installation required, runs entirely in your browser
- ⚡ **Real-time Processing** - Motion detection runs at 20+ FPS
- 💾 **Local Storage** - Settings persist across sessions

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **Browser APIs** - MediaDevices, Canvas, MediaRecorder

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A webcam/camera device
- Modern browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

## Usage

1. **Grant Camera Permission** - When prompted, allow the app to access your camera
2. **Select Camera** - Choose your camera device from the dropdown
3. **Start Viewing** - Click "Start Viewing" to see the live feed
4. **Enable Motion Detection** - Toggle motion detection and adjust sensitivity
5. **Record Video** - Enable recording to capture video clips
6. **Download** - Download recordings when you stop recording

## Features In Detail

### Motion Detection

- Real-time motion detection using frame comparison
- Adjustable sensitivity (1-100)
- Visual indicators show detected motion areas
- Green bounding boxes highlight movement

### Video Recording

- High-quality WebM video format
- Continuous recording mode
- Download recordings with timestamps
- Automatic filename generation

### Settings Persistence

All settings are automatically saved:
- Motion detection sensitivity
- Motion detection enabled/disabled
- Selected camera device
- Recording preferences

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari 14+, Chrome Mobile)

**Note**: HTTPS is required for camera access (automatically provided by Vercel)

## Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push code to GitHub
2. Import project in Vercel
3. Deploy automatically

Or use Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Project Structure

```
camera-web/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── camera-view.tsx   # Video display
│   ├── camera-selector.tsx
│   ├── controls.tsx
│   └── ui/               # UI components
├── hooks/                # Custom React hooks
│   ├── use-camera.ts
│   ├── use-motion-detection.ts
│   └── use-video-recorder.ts
├── lib/                  # Utilities
│   ├── motion-detection.ts
│   └── utils.ts
├── store/                # State management
│   └── settings-store.ts
└── types/                # TypeScript types
    └── index.ts
```

## Development

```bash
# Run development server
npm run dev

# Type checking
npm run build

# Linting
npm run lint
```

## Troubleshooting

### Camera Not Found

- Ensure your camera is connected
- Grant camera permissions in browser settings
- Try refreshing the page
- Check if another app is using the camera

### Permission Denied

- Check browser camera permissions
- Ensure you're using HTTPS (required for camera access)
- Try a different browser

### Poor Performance

- Close other browser tabs
- Reduce motion detection sensitivity
- Lower camera resolution (in future update)
- Use a modern browser

## License

MIT License

## Credits

Built with:
- Next.js
- React
- TypeScript
- Tailwind CSS
- Zustand

---

**Made for surveillance and monitoring needs** 📹
