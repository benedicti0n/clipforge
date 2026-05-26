# ClipForge v3 Implementation Tasks

## Phase 1: Project Setup

### 1.1 Initialize Project Structure
- [ ] Create v3 folder structure
- [ ] Set up base directories:
  - `src/electron/` - Electron main process
  - `src/react/` - React frontend
  - `bin/` - Whisper binaries
  - `public/` - Static assets

### 1.2 Configuration Files
- [ ] Copy and update `package.json` from v2
  - Update version to 3.0.0
  - Update app name to ClipForge v3
  - Ensure all dependencies are current versions
- [ ] Set up `vite.config.ts`
- [ ] Set up `tailwind.config.ts`
- [ ] Set up TypeScript configs:
  - `tsconfig.json`
  - `tsconfig.app.json`
  - `tsconfig.node.json`
  - `src/electron/tsconfig.json`
- [ ] Set up `electron-builder.json`
- [ ] Set up `components.json` for Shadcn UI
- [ ] Set up `eslint.config.js`

### 1.3 Dependencies Installation
- [ ] Install React 19
- [ ] Install Electron 37
- [ ] Install Vite and plugins
- [ ] Install TailwindCSS 4
- [ ] Install Zustand 5
- [ ] Install Radix UI primitives
- [ ] Install Shadcn UI components
- [ ] Install Framer Motion
- [ ] Install Lucide React icons
- [ ] Install Sonner for toasts
- [ ] Install FFmpeg static
- [ ] Install @google/generative-ai
- [ ] Install utility packages (clsx, tailwind-merge)

## Phase 2: Electron Main Process

### 2.1 Core Electron Setup
- [ ] Create `src/electron/main.ts` - entry point
- [ ] Create `src/electron/window.ts` - window creation
- [ ] Create `src/electron/preload.cts` - context bridge
- [ ] Create `src/electron/pathResolver.ts`
- [ ] Create `src/electron/util.ts`

### 2.2 IPC Handlers (from v2)
- [ ] Copy `src/electron/ipcHandlers/transcribe.ts` - Whisper transcription
- [ ] Copy `src/electron/ipcHandlers/gemini.ts` - Gemini AI integration
- [ ] Copy `src/electron/ipcHandlers/downloadFile.ts` - Model downloads
- [ ] Copy `src/electron/ipcHandlers/listModels.ts` - List Whisper models
- [ ] Copy `src/electron/ipcHandlers/saveFile.ts` - File saving
- [ ] Copy `src/electron/ipcHandlers/deleteFile.ts` - File deletion
- [ ] Copy `src/electron/ipcHandlers/openFolder.ts` - Open folder dialogs
- [ ] Create `src/electron/ipcHandlers/index.ts` - Handler registration

### 2.3 NEW: Clip Generation Handler
- [ ] Create `src/electron/ipcHandlers/generateClips.ts`
  - FFmpeg clip cutting logic
  - Support for individual clip generation
  - Support for batch clip generation
  - Progress reporting via IPC events
  - Cancellation support
- [ ] Add new IPC channels:
  - `generate-clips` - Start clip generation
  - `cancel-clips-generation` - Cancel ongoing generation
  - `clips-generation-progress` - Progress updates
  - `clips-generation-result` - Completion result
  - `clips-generation-error` - Error handling

## Phase 3: React Frontend Setup

### 3.1 Core React Files
- [ ] Create `src/react/main.tsx` - entry point
- [ ] Create `src/react/App.tsx` - main app component
- [ ] Create `src/react/vite-env.d.ts`
- [ ] Create `src/react/index.css` - global styles

### 3.2 Shadcn UI Components
- [ ] Set up `components.json`
- [ ] Copy `src/react/components/ui/button.tsx`
- [ ] Copy `src/react/components/ui/card.tsx`
- [ ] Copy `src/react/components/ui/dialog.tsx`
- [ ] Copy `src/react/components/ui/dropdown-menu.tsx`
- [ ] Copy `src/react/components/ui/input.tsx`
- [ ] Copy `src/react/components/ui/label.tsx`
- [ ] Copy `src/react/components/ui/scroll-area.tsx`
- [ ] Copy `src/react/components/ui/select.tsx`
- [ ] Copy `src/react/components/ui/separator.tsx`
- [ ] Copy `src/react/components/ui/sonner.tsx`
- [ ] Copy `src/react/components/ui/tabs.tsx`
- [ ] Copy `src/react/components/ui/textarea.tsx`
- [ ] Copy `src/react/components/ui/AppTabs.tsx`
- [ ] Copy `src/react/components/ui/ThemeSelector.tsx`

## Phase 4: Video Upload Feature

### 4.1 Video Store
- [ ] Create `src/react/store/videoStore.ts`
  - Current video file state
  - Video metadata (name, size, duration, path)
  - Video preview URL

### 4.2 Upload Component
- [ ] Create `src/react/components/Tabs/Upload.tsx`
- [ ] Drag & drop functionality
- [ ] Click to browse
- [ ] File type validation (MP4, MOV, MKV, WebM, AVI)
- [ ] File size validation (2GB max)
- [ ] Display video preview
- [ ] Show file metadata
- [ ] Remove/clear video button

## Phase 5: Transcription Feature

### 5.1 Transcription Store
- [ ] Create `src/react/store/transcriptionStore.ts`
  - Transcription segments
  - Log messages
  - SRT content

### 5.2 Whisper Store
- [ ] Create `src/react/store/whisperStore.ts`
  - Selected model
  - Cached models list
  - Download progress
  - Download status

### 5.3 Components
- [ ] Create `src/react/components/Transcription/WhisperModelSelect.tsx`
  - Model list display (6 models with icons)
  - Download button per model
  - Progress indicator
  - Cancel download button
  - Delete model button
  - Open models folder button
- [ ] Create `src/react/components/Transcription/TranscriptionOutput.tsx`
  - Segmented transcription display
  - Download TXT button
  - Download SRT button
  - Upload SRT button
  - Clear transcription button
  - Navigate to Clips JSON button
- [ ] Update `src/react/components/Tabs/Transcription.tsx`
  - Combine model select and output

## Phase 6: Gemini Integration Feature

### 6.1 Gemini Store
- [ ] Create `src/react/store/geminiStore.ts`
  - API keys array
  - Selected API key
  - Selected model

### 6.2 Clips Response Store
- [ ] Create `src/react/store/clipsResponseStore.ts`
  - Generated clips array
  - Token usage data
  - Loading state

### 6.3 Prompt Store
- [ ] Create `src/react/store/promptStore.ts`
  - Custom prompts array
  - Selected genre
  - Selected prompt ID

### 6.4 Components
- [ ] Create `src/react/components/ClipsJson/GeminiConfigSection.tsx`
  - Add API key dialog
  - Delete API key dialog
  - API key list with selection
  - Model selection dropdown
  - Model info (price, speed)
- [ ] Create `src/react/components/ClipsJson/PromptSelectorSection.tsx`
  - Genre selection (General, Motivational, Educational, Storytelling)
  - Prompt preview display
  - Add custom prompt dialog
  - Custom prompt list
  - Select prompt button
- [ ] Create `src/react/components/ClipsJson/CostEstimateSection.tsx`
  - Input/output token count display
  - Cost calculation
- [ ] Create `src/react/components/ClipsJson/ClipsJsonLeft.tsx`
  - Configuration panel
  - Gemini settings
  - Prompt settings
  - Cost estimation
  - Send to Gemini button
- [ ] Create `src/react/components/ClipsJson/ClipsJsonRight.tsx`
  - JSON preview display
  - Download JSON button
  - Upload JSON button
  - Clear JSON button
- [ ] Create `src/react/components/ClipsJson/TranscriptPreviewModal.tsx`
  - View full transcription
  - Search within transcription
- [ ] Create `src/react/components/Tabs/ClipsJson.tsx`
  - Combine left/right panels

### 6.5 Hooks
- [ ] Create `src/react/hooks/useGeminiApi.ts`
  - API call logic
  - Error handling
  - Response parsing

## Phase 7: Clip Generation Feature (NEW)

### 7.1 Clip Generation Store
- [ ] Create `src/react/store/clipGenerationStore.ts`
  - Generated clips array
  - Generation progress per clip
  - Overall progress
  - Generation status (idle, generating, completed, error)
  - Output settings (padding, quality)

### 7.2 Components
- [ ] Create `src/react/components/Tabs/ClipGeneration.tsx`
  - Main clip generation tab UI
- [ ] Create `src/react/components/ClipGeneration/ClipList.tsx`
  - List all identified clips from Gemini
  - Show clip info (index, timestamp, virality score, caption)
  - Individual clip download button
  - Individual clip preview button
  - Select/deselect clips for batch generation
- [ ] Create `src/react/components/ClipGeneration/GenerationSettings.tsx`
  - Padding before/after clip input
  - Output format selection
  - Quality settings
- [ ] Create `src/react/components/ClipGeneration/GenerationProgress.tsx`
  - Progress bar per clip
  - Overall progress
  - Cancel button
  - Time elapsed/remaining

## Phase 8: Export Features

### 8.1 SRT Export Per Clip (NEW)
- [ ] Create `src/react/components/ClipGeneration/ExportSrtPerClip.tsx`
  - Generate SRT file with timestamps for each clip
  - Include clip caption as subtitle text
  - Download individual clip SRT

### 8.2 Video Export
- [ ] Create `src/react/components/ClipGeneration/VideoExport.tsx`
  - Download generated MP4 clips
  - Open output folder button

## Phase 9: Theme System

### 9.1 Theme Store
- [ ] Create `src/react/store/themeStore.ts`
  - Current theme
  - Persist to localStorage

### 9.2 Theme Files
- [ ] Copy all 18 theme CSS files to `src/react/themes/`
  - default.css, amethyst-haze.css, caffeine.css
  - catppuccin.css, claude.css, claymorphism.css
  - cosmic-night.css, darkmatter.css, graphite.css
  - midnight-bloom.css, northern-lights.css, t3-chat.css
  - twitter.css, vintage-paper.css
  - Plus light/dark variants

### 9.3 Theme Components
- [ ] Update `src/react/components/ui/ThemeSelector.tsx`
  - Theme preview thumbnails
  - Theme selection grid
  - System theme toggle

### 9.4 Theme Application
- [ ] Update `src/react/index.css`
  - Import theme CSS
  - CSS variable definitions
- [ ] Update `src/react/App.tsx`
  - Apply theme class to root

## Phase 10: Constants & Utilities

### 10.1 Constants
- [ ] Copy `src/constants/whisper.ts` - Whisper model configs
- [ ] Copy `src/constants/geminiModels.ts` - Gemini model configs
- [ ] Copy `src/constants/prompt.ts` - AI prompt templates

### 10.2 Utilities
- [ ] Copy `src/react/lib/utils.ts` - Utility functions
- [ ] Copy `src/react/lib/themeList.ts` - Theme definitions

### 10.3 Types
- [ ] Copy `src/types/electron.d.ts` - TypeScript definitions

## Phase 11: Final Assembly

### 11.1 Main App Structure
- [ ] Update `src/react/App.tsx`
  - Tab navigation (Upload, Transcription, ClipsJson, ClipGeneration)
  - Theme provider wrapper
  - Toast provider
  - Layout structure

### 11.2 Entry HTML
- [ ] Update `index.html`
  - App title
  - Meta tags
  - Vite client injection

## Phase 12: Testing & Polish

### 12.1 Build Verification
- [ ] Run `npm run build` successfully
- [ ] Electron app launches without errors
- [ ] All tabs are accessible

### 12.2 Feature Testing
- [ ] Video upload works (drag & drop, browse)
- [ ] Whisper model download works
- [ ] Transcription works end-to-end
- [ ] Gemini API integration works
- [ ] Clip generation works (FFmpeg cutting)
- [ ] All exports work (JSON, TXT, SRT, MP4)
- [ ] Theme switching works

### 12.3 UI Polish
- [ ] Consistent styling across all components
- [ ] Loading states for all async operations
- [ ] Error states with helpful messages
- [ ] Empty states for lists
- [ ] Responsive layout (within desktop window)

### 12.4 Production Build
- [ ] Run `npm run build` for production
- [ ] Verify `dist-electron/` contents
- [ ] Verify `dist-react/` contents
- [ ] Electron Builder packages successfully
- [ ] Packaged app runs standalone

## Task Priority Order

### Must Have (MVP)
1. Project setup (Phase 1)
2. Electron main process (Phase 2)
3. React frontend setup (Phase 3)
4. Video Upload (Phase 4)
5. Transcription feature (Phase 5)
6. Gemini integration (Phase 6)
7. Clip generation handler (Phase 2.3)
8. Clip generation UI (Phase 7)
9. SRT export per clip (Phase 8.1)
10. Video export (Phase 8.2)
11. Theme system (Phase 9)
12. Build and test (Phase 12)

### Nice to Have
- Additional theme variants
- Keyboard shortcuts
- Recent videos list
- Clip preview in-app
