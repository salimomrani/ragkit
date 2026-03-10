# Voice Input Design

## Overview

Add voice input capability to the chat to allow users to ask questions by speaking instead of typing.

## Functionality

- Microphone button next to "Send" button in chat input bar
- Click to start recording, click again to stop
- Real-time transcription displayed in the input field
- Visual feedback during recording (pulsing indicator)
- Disabled during RAG query in progress

## Technical Implementation

### Frontend Changes

**New file: `frontend/src/app/services/voice.service.ts`**
- `isSupported`: boolean — check if Web Speech API is available
- `isRecording`: Signal<boolean> — recording state
- `transcript`: Signal<string> — current transcription
- `startRecording()`: void — start speech recognition
- `stopRecording()`: void — stop and return transcript

**Changes to `chat.ts`**
- Inject VoiceService
- Add `isRecording` computed/derived state
- Add toggleRecording() method
- Add microphone button to template

**Changes to `chat.html`**
- Add mic button with conditional icon (mic/mic-off)
- Show "Écoute en cours..." when recording
- Disable input during recording

**Changes to `chat.scss`**
- `.voice-btn` styles
- `.recording` animation (pulsing red)

### Browser Support

- Chrome, Safari, Edge: Full support
- Firefox: Button disabled with tooltip "Non supporté"

### Language

- Recognition language: `fr-FR`

## Edge Cases

- User denies microphone permission: Show error message
- Recognition fails: Show "Reconnaissance vocale échouée"
- Empty transcription: Ignore, don't send
- Browser doesn't support Web Speech API: Hide/disable button

## Testing

- Manual: Chrome, Safari (if available)
- Unit tests for VoiceService
- Integration tests in chat.spec.ts
