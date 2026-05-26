# ClipForge v3 Features

## Core Features

### 1. Video Upload & Management
- Drag & drop video files into the app
- Click to browse and select video files
- Supported formats: MP4, MOV, MKV, WebM, AVI
- Maximum file size: 2GB
- Video preview with playback controls
- Display file metadata (name, size, duration)
- Remove/clear uploaded video

### 2. Whisper Transcription System
- **Model Selection**: 6 Whisper models available
  - tiny (75MB) - Fastest, lower accuracy
  - base (142MB) - Fast, good accuracy
  - small (466MB) - Balanced speed/accuracy
  - medium (1.5GB) - Slower, higher accuracy
  - large-v2 (2.9GB) - Very slow, high accuracy
  - large-v3 (2.9GB) - Latest, highest accuracy
- **Model Management**:
  - Download models from HuggingFace
  - Download progress with percentage
  - Cancel ongoing downloads
  - Delete cached models
  - Open models folder
- **Transcription Process**:
  - FFmpeg extracts audio from video (WAV, 16kHz, mono, 16-bit PCM)
  - whisper.cpp performs speech recognition
  - Real-time log streaming to UI
  - Cancel transcription support
- **Transcription Output**:
  - Segmented transcription with timestamps
  - Download as TXT file
  - Download as SRT (subtitles) file
  - Upload external SRT file
  - Clear/remove transcription
  - Navigate to Clips JSON tab

### 3. Gemini AI Clip Analysis
- **API Key Management**:
  - Add multiple Gemini API keys
  - Select active API key
  - Delete API keys
  - Keys stored securely in app data
- **Model Selection**:
  - Gemini 2.0 Flash
  - Gemini 2.5 Flash
  - Gemini 2.5 Flash Lite
  - Gemini 2.0 Pro
  - Display price and speed info per model
- **Prompt System**:
  - Genre-based prompt templates:
    - General (viral clips extraction)
    - Motivational
    - Educational
    - Storytelling
  - Preview prompt before sending
  - Add custom prompts
  - Save custom prompts
  - Select saved prompts
- **Cost Estimation**:
  - Display input/output token count
  - Calculate cost based on selected model
- **Processing**:
  - Send transcription to Gemini for analysis
  - Gemini identifies best viral-worthy clips
  - Returns clip suggestions with timestamps, virality scores, captions

### 4. Clip Generation (NEW)
- Generate actual video clips from source video
- Use FFmpeg for video cutting
- Process clips based on timestamps from Gemini analysis
- Configurable clip settings:
  - Padding before/after clip (add buffer time)
  - Output format (MP4)
  - Quality settings
- Progress tracking for each clip
- Cancel clip generation
- Batch generation of all clips
- Individual clip download

### 5. Export Options
- **JSON Export**:
  - Download full clips analysis as JSON
  - Includes timestamps, virality scores, captions, segments
  - Upload existing JSON file
- **TXT Export**:
  - Download plain text transcription
- **SRT Export**:
  - Download full transcription as SRT subtitles
  - **NEW**: Download SRT file with timestamps for each individual clip
- **Video Export**:
  - Download generated clips as MP4 files
  - Open output folder with generated clips

### 6. Theme System
- 18 built-in themes:
  - Default, Light, Dark, System
  - Amethyst Haze, Caffeine, Catppuccin, Claude
  - Claymorphism, Cosmic Night, Darkmatter, Graphite
  - Midnight Bloom, Northern Lights, T3 Chat
  - Twitter, Vintage Paper
- Real-time theme switching
- System theme detection
- Persisted theme preference

## Technical Features

### 7. State Management
- Zustand-based state management
- Persistent storage (localStorage)
- Separate stores for:
  - Video state
  - Whisper models state
  - Transcription state
  - Gemini API state
  - Clips response state
  - Theme state
  - Custom prompts state

### 8. Notifications & Feedback
- Toast notifications via Sonner
- Success, warning, error notifications
- Download progress updates
- Download retry attempts
- Download canceled/blocked notifications
- Transcription log streaming
- Clip generation progress

### 9. Desktop Integration
- Electron-based desktop application
- Native file dialogs
- Open containing folders
- macOS support (ARM64)
- Window management

## Feature Roadmap

### Completed in v3
- [ ] (none yet - v3 is starting fresh)

### Future Considerations
- [ ] Full video clip generation with FFmpeg
- [ ] SRT export per clip with timestamps
- [ ] Clip batch generation
- [ ] Individual clip download
- [ ] Windows/Linux support
- [ ] More output formats (WebM, MOV)
- [ ] Video preview of generated clips in-app
- [ ] Clip merging (combine multiple clips)
- [ ] Subtitle burn-in to clips
- [ ] Custom start/end time adjustment per clip
- [ ] Batch processing multiple videos
