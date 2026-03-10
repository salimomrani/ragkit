# Voice Input Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add voice input capability to the chat — users can click a microphone button to speak their question instead of typing.

**Architecture:** Web Speech API (SpeechRecognition) integrated into the existing chat input bar. No backend changes required.

**Tech Stack:** Angular 21 signals, Web Speech API (SpeechRecognition)

---

## Phase 1: VoiceService

### Task 1: Create VoiceService

**Files:**
- Create: `frontend/src/app/services/voice.service.ts`

**Step 1: Create the service file**

```typescript
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private recognition: SpeechRecognition | null = null;
  readonly isRecording = signal(false);
  readonly transcript = signal('');
  readonly error = signal<string | null>(null);
  readonly isSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  constructor() {
    if (this.isSupported) {
      const SpeechRecognition = window['SpeechRecognition'] || window['webkitSpeechRecognition'];
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'fr-FR';

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        this.transcript.set(transcript);
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        this.error.set(this.getErrorMessage(event.error));
        this.isRecording.set(false);
      };

      this.recognition.onend = () => {
        this.isRecording.set(false);
      };
    }
  }

  private getErrorMessage(error: string): string {
    switch (error) {
      case 'not-allowed':
        return 'Microphone refusé. Veuillez autoriser l\'accès dans les paramètres.';
      case 'no-speech':
        return 'Aucune parole détectée.';
      default:
        return 'Erreur de reconnaissance vocale.';
    }
  }

  start(): void {
    if (!this.recognition || this.isRecording()) return;
    this.error.set(null);
    this.transcript.set('');
    this.recognition.start();
    this.isRecording.set(true);
  }

  stop(): void {
    if (!this.recognition || !this.isRecording()) return;
    this.recognition.stop();
    this.isRecording.set(false);
  }

  toggle(): void {
    if (this.isRecording()) {
      this.stop();
    } else {
      this.start();
    }
  }

  clear(): void {
    this.transcript.set('');
    this.error.set(null);
  }
}
```

**Step 2: Commit**

```bash
git add frontend/src/app/services/voice.service.ts
git commit -m "feat: add VoiceService with Web Speech API"
```

---

## Phase 2: Chat Integration

### Task 2: Add voice button to chat template

**Files:**
- Modify: `frontend/src/app/components/chat/chat.html`
- Modify: `frontend/src/app/components/chat/chat.scss`

**Step 1: Modify chat.html**

Add microphone button after the send button (before `</div>` of input area):

```html
@if (voiceService.isSupported()) {
  <button 
    type="button" 
    class="voice-btn" 
    [class.recording]="voiceService.isRecording()"
    (click)="toggleVoice()"
    [disabled]="isLoading()"
    [title]="voiceService.isRecording() ? 'Arrêter' : 'Dictée vocale'">
    @if (voiceService.isRecording()) {
      <span class="recording-dot"></span>
    } @else {
      🎤
    }
  </button>
}
```

Add recording status message after input:

```html
@if (voiceService.isRecording()) {
  <div class="recording-status">
    <span class="pulse"></span> Écoute en cours...
    <button type="button" class="stop-btn" (click)="toggleVoice()">Arrêter</button>
  </div>
}
@if (voiceService.error()) {
  <div class="voice-error">{{ voiceService.error() }}</div>
}
```

**Step 2: Modify chat.scss**

Add these styles:

```scss
.voice-btn {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background 0.2s;
  
  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.05);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &.recording {
    background: #ffebee;
    animation: pulse 1.5s infinite;
  }
}

.recording-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #f44336;
  border-radius: 50%;
  animation: blink 1s infinite;
}

.recording-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #f44336;
  padding: 0.5rem;
  
  .pulse {
    width: 8px;
    height: 8px;
    background: #f44336;
    border-radius: 50%;
    animation: pulse 1s infinite;
  }
  
  .stop-btn {
    background: #f44336;
    color: white;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
  }
}

.voice-error {
  color: #f44336;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

**Step 3: Commit**

```bash
git add frontend/src/app/components/chat/chat.html frontend/src/app/components/chat/chat.scss
git commit -m "feat: add voice button and recording styles to chat"
```

### Task 3: Wire VoiceService in Chat component

**Files:**
- Modify: `frontend/src/app/components/chat/chat.ts`

**Step 1: Modify chat.ts**

Add import:

```typescript
import { VoiceService } from '../../services/voice.service';
```

Add to class:

```typescript
readonly voiceService = inject(VoiceService);
```

Add method:

```typescript
toggleVoice(): void {
  if (!this.voiceService.isSupported()) return;
  this.voiceService.toggle();
}
```

Modify `sendMessage()` to append voice transcript:

```typescript
// At the start of sendMessage(), after question = ...
const voiceInput = this.voiceService.transcript();
if (voiceInput.trim()) {
  // If user used voice, use that instead of typed input
  // But keep typed input as fallback
}
```

Actually, simpler approach — bind input to voice transcript:

```typescript
// In the template, change [(ngModel)] to [ngModel] and handle separately
// Or better: after recording stops, copy transcript to prompt

// Modify the template binding:
[ngModel]="voiceService.transcript() || prompt()"
(ngModelChange)="prompt.set($event)"
```

Better yet, update `sendMessage()` to check voice transcript:

```typescript
sendMessage(): void {
  const voiceText = this.voiceService.transcript();
  const text = voiceText.trim() || this.prompt().trim();
  if (!text) return; // Don't send empty
  
  const question = text;
  // ... rest of sendMessage
}
```

After send completes, clear voice:

```typescript
// After messages update or in the 'done' handler:
this.voiceService.clear();
```

**Step 2: Commit**

```bash
git add frontend/src/app/components/chat/chat.ts
git commit -m "feat: integrate VoiceService in Chat component"
```

---

## Phase 3: Tests

### Task 4: Add VoiceService tests

**Files:**
- Create: `frontend/src/app/services/voice.service.spec.ts`

**Step 1: Write tests**

```typescript
import { TestBed } from '@angular/core/testing';
import { VoiceService } from './voice.service';

describe('VoiceService', () => {
  let service: VoiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VoiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should report isSupported based on Web Speech API', () => {
    const hasSpeech = typeof window !== 'undefined' && 
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    expect(service.isSupported()).toBe(hasSpeech);
  });

  it('should start and stop recording', () => {
    if (!service.isSupported()) return;
    
    service.start();
    expect(service.isRecording()).toBe(true);
    
    service.stop();
    expect(service.isRecording()).toBe(false);
  });

  it('should clear transcript and error', () => {
    service.clear();
    expect(service.transcript()).toBe('');
    expect(service.error()).toBeNull();
  });
});
```

**Step 2: Run tests**

```bash
cd frontend && npm test -- --watch=false
```

**Step 3: Commit**

```bash
git add frontend/src/app/services/voice.service.spec.ts
git commit -m "test: add VoiceService tests"
```

### Task 5: Add Chat voice integration test

**Files:**
- Modify: `frontend/src/app/components/chat/chat.spec.ts`

**Step 1: Add test**

```typescript
it('should toggle voice recording', () => {
  if (!voiceService.isSupported()) return;
  
  const startSpy = spyOn(voiceService, 'start').and.callThrough();
  const stopSpy = spyOn(voiceService, 'stop').and.callThrough();
  
  component.toggleVoice();
  expect(startSpy).toHaveBeenCalled();
  
  component.toggleVoice();
  expect(stopSpy).toHaveBeenCalled();
});
```

**Step 2: Run tests**

```bash
cd frontend && npm test -- --watch=false
```

**Step 3: Commit**

```bash
git add frontend/src/app/components/chat/chat.spec.ts
git commit -m "test: add voice toggle test to Chat"
```

---

## Phase 4: Polish

### Task 6: Run full validation

**Step 1: Backend tests**

```bash
cd backend && .venv/bin/pytest tests/ -v
cd backend && .venv/bin/ruff check .
```

**Step 2: Frontend tests**

```bash
cd frontend && npm test -- --watch=false
cd frontend && npm run lint
```

**Step 3: Manual test**

- Open http://localhost:4200
- Click microphone button
- Speak a question
- Verify transcript appears
- Click send
- Verify question is sent

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete voice input feature"
```

---

## Summary

| Phase | Task | Description |
|-------|------|-------------|
| 1 | 1 | VoiceService |
| 2 | 2 | Chat template + styles |
| 2 | 3 | Chat component wiring |
| 3 | 4 | VoiceService tests |
| 3 | 5 | Chat voice tests |
| 4 | 6 | Full validation |
