import {
  Component,
  signal,
  computed,
  inject,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { MarkdownComponent } from 'ngx-markdown';
import { HistoryEntry, RagApiService } from '../../services/rag-api.service';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { source: string; excerpt: string; score: number }[];
  confidence?: number;
  lowConfidence?: boolean;
  streaming?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, DecimalPipe, MarkdownComponent],
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chat {
  @ViewChild('messagesEl') private messagesEl!: ElementRef<HTMLElement>;
  private readonly api = inject(RagApiService);

  prompt = signal('');
  messages = signal<Message[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  canSend = computed(() => this.prompt().trim().length > 0 && !this.isLoading());

  readonly suggestions = [
    'Comment contacter le support technique ?',
    "Quelles sont les étapes d'onboarding pour un nouveau client ?",
    "Quels sont les endpoints disponibles dans l'API v1 ?",
    'Comment configurer un webhook pour recevoir des événements ?',
    'Quelles données personnelles sont collectées et comment sont-elles protégées ?',
    'Quelles sont les mesures de sécurité mises en place pour protéger les accès ?',
  ];

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messagesEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  clearConversation(): void {
    this.messages.set([]);
  }

  sendMessage(): void {
    if (!this.canSend()) return;

    const question = this.prompt().trim();
    const msgId = crypto.randomUUID();

    const history: HistoryEntry[] = this.messages()
      .filter((m) => !m.streaming)
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    this.messages.update((msgs) => [
      ...msgs,
      { id: crypto.randomUUID(), role: 'user', content: question },
      { id: msgId, role: 'assistant', content: '', streaming: true },
    ]);
    this.prompt.set('');
    this.isLoading.set(true);
    this.error.set(null);
    this.scrollToBottom();

    this.api.streamQuery(question, history).subscribe({
      next: (event) => {
        if (event.type === 'meta') {
          const seen = new Map<string, { source: string; excerpt: string; score: number }>();
          for (const s of event.sources) {
            const existing = seen.get(s.source);
            if (!existing || s.score > existing.score) seen.set(s.source, s);
          }
          this.messages.update((msgs) =>
            msgs.map((m) =>
              m.id === msgId
                ? {
                    ...m,
                    sources: [...seen.values()].sort((a, b) => b.score - a.score),
                    confidence: event.confidence_score,
                    lowConfidence: event.low_confidence,
                  }
                : m,
            ),
          );
        } else if (event.type === 'token') {
          this.messages.update((msgs) =>
            msgs.map((m) => (m.id === msgId ? { ...m, content: m.content + event.content } : m)),
          );
          this.scrollToBottom();
        } else if (event.type === 'done') {
          this.messages.update((msgs) =>
            msgs.map((m) => (m.id === msgId ? { ...m, streaming: false } : m)),
          );
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        this.messages.update((msgs) => msgs.filter((m) => m.id !== msgId));
        this.error.set(this._translateError(err?.detail));
        this.isLoading.set(false);
      },
    });
  }

  private _translateError(detail: string | undefined): string {
    switch (detail) {
      case 'guardrail:empty_question':
        return 'Question vide.';
      case 'guardrail:too_short':
        return 'Question trop courte (min 6 caractères).';
      case 'guardrail:length_exceeded':
        return 'Question trop longue (max 500 caractères).';
      case 'guardrail:prompt_injection':
        return "Tentative d'injection détectée.";
      case 'guardrail:offensive_content':
        return 'Contenu offensant détecté.';
      default:
        return detail || 'Erreur de communication avec le RAG.';
    }
  }

  selectSuggestion(q: string): void {
    this.prompt.set(q);
    this.sendMessage();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
