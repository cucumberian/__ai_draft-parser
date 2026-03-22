# BluePrint Insight

Advanced Engineering Intelligence Tool - AI-powered drawing extraction and analysis application built with React, TypeScript, and Electron.

## Features

- AI-powered data extraction from engineering drawings
- Multi-language support (Russian/English)
- Customizable extraction templates
- Multiple AI provider support (OpenAI, etc.)
- Batch processing of multiple files
- Drag & drop file upload
- Export results to various formats

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS
- **Desktop:** Electron
- **Build:** Vite
- **AI:** OpenAI API integration

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd blueprint-insight
```

2. Install dependencies:
```bash
npm install
```

## Development

### Web Development
Run the application as a web app:
```bash
npm run dev
```
The app will be available at `http://localhost:5173`

### Electron Development
Run the application as a desktop app:
```bash
npm run electron:dev
```
This will start both the Vite dev server and Electron window.

## Building for Production

### Web Build
```bash
npm run build
```
Output will be in the `dist/` directory.

### Electron Build
Build for current platform:
```bash
npm run electron:build
```

Platform-specific builds:
```bash
# Windows
npm run electron:build:win

# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux
```
Output will be in the `release/` directory.

## Project Structure

```
blueprint-insight/
├── electron/              # Electron main process
│   ├── main.ts           # Main process entry point
│   └── preload.ts        # Preload script for renderer
├── components/            # React components
├── services/              # Business logic services
├── resources/             # App icons and assets
├── dist/                  # Web build output
├── dist-electron/         # Electron build output
├── release/               # Packaged app installers
├── App.tsx                # Main React component
├── index.tsx              # React entry point
├── index.html             # HTML template
├── vite.config.ts         # Vite configuration
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## Configuration

### AI Provider Setup
1. Open the application
2. Navigate to Settings (Настройки)
3. Configure your AI provider API key
4. Customize system prompt and parameters as needed

### Templates
- Access Template Manager from the navigation
- Create custom extraction templates
- Import/export templates as JSON files

## Electron-Specific Features

- Custom title bar with drag regions
- Native window controls
- Platform-optimized builds (DMG for macOS, NSIS for Windows, AppImage for Linux)
- Content Security Policy for enhanced security

## Adding App Icons

Place your app icons in the `resources/` directory:
- `icon.icns` - macOS icon (512x512 or larger)
- `icon.ico` - Windows icon (256x256 or larger)
- `icon.png` - Linux icon (512x512 or larger)

You can generate these from a single PNG using tools like:
- [ICOConvert](https://icoconvert.com/) for .ico
- [iConvert Icons](https://iconverticons.com/) for .icns

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start web development server |
| `npm run build` | Build for web production |
| `npm run preview` | Preview web production build |
| `npm run electron:dev` | Start Electron development |
| `npm run electron:build` | Build Electron app (current platform) |
| `npm run electron:build:win` | Build Electron app for Windows |
| `npm run electron:build:mac` | Build Electron app for macOS |
| `npm run electron:build:linux` | Build Electron app for Linux |

## License

© 2026 BluePrint Insight. All rights reserved.
