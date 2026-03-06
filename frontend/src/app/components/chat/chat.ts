import {
  Component,
  signal,
  computed,
  inject,
  ElementRef,
  Injector,
  viewChild,
  afterNextRender,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';
import { HistoryEntry, RagApiService, FeedbackEntry } from '../../services/rag-api.service';
import { ConversationService } from '../../services/conversation.service';
import { HistoryPanel } from './history-panel/history-panel';
import { Message } from '../../models/message';
import { ToPercentPipe } from '../../shared/pipes/percent.pipe';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, MarkdownComponent, HistoryPanel, ToPercentPipe],
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chat {
  private readonly messagesEl = viewChild<ElementRef<HTMLElement>>('messagesEl');
  private readonly injector = inject(Injector);
  private readonly api = inject(RagApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly conversationService = inject(ConversationService);

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
    afterNextRender(
      () => {
        const el = this.messagesEl()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      },
      { injector: this.injector },
    );
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
      {
        id: msgId,
        role: 'assistant',
        content: '',
        streaming: true,
        logId: null,
        feedbackEnabled: true,
        isPositive: null,
        submitting: false,
        feedbackError: null,
      },
    ]);
    this.prompt.set('');
    this.isLoading.set(true);
    this.error.set(null);
    this.scrollToBottom();

    this.api
      .streamQuery(question, history, this.conversationService.sessionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
                      feedbackEnabled: !event.guardrail_triggered,
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
            this.conversationService.loadHistory();
          } else if (event.type === 'log') {
            this.messages.update((msgs) =>
              msgs.map((m) => (m.id === msgId ? { ...m, logId: event.log_id } : m)),
            );
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

  submitRating(msgIndex: number, isPositive: boolean): void {
    const msgs = this.messages();
    const msg = msgs[msgIndex];
    if (!msg || !msg.logId || msg.submitting) return;

    if (!isPositive) {
      this.messages.update((m) =>
        m.map((item, i) =>
          i === msgIndex ? { ...item, showComment: true, isPositive: false, comment: '' } : item,
        ),
      );
      return;
    }

    this.messages.update((m) =>
      m.map((item, i) =>
        i === msgIndex
          ? { ...item, submitting: true, feedbackError: null, showComment: false, comment: '' }
          : item,
      ),
    );

    this.api
      .submitFeedback(msg.logId, isPositive)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (_entry: FeedbackEntry) => {
          this.messages.update((m) =>
            m.map((item, i) =>
              i === msgIndex ? { ...item, isPositive, submitting: false } : item,
            ),
          );
        },
        error: () => {
          this.messages.update((m) =>
            m.map((item, i) =>
              i === msgIndex
                ? { ...item, submitting: false, feedbackError: "Erreur lors de l'envoi." }
                : item,
            ),
          );
        },
      });
  }

  submitWithComment(msgIndex: number): void {
    const msgs = this.messages();
    const msg = msgs[msgIndex];
    if (!msg || !msg.logId || msg.submitting) return;

    const trimmed = msg.comment?.trim();
    const comment = trimmed || undefined;

    this.messages.update((m) =>
      m.map((item, i) =>
        i === msgIndex ? { ...item, submitting: true, feedbackError: null } : item,
      ),
    );

    this.api
      .submitFeedback(msg.logId, false, comment)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (_entry: FeedbackEntry) => {
          this.messages.update((m) =>
            m.map((item, i) =>
              i === msgIndex
                ? { ...item, isPositive: false, submitting: false, showComment: false, comment: '' }
                : item,
            ),
          );
        },
        error: () => {
          this.messages.update((m) =>
            m.map((item, i) =>
              i === msgIndex
                ? { ...item, submitting: false, feedbackError: "Erreur lors de l'envoi." }
                : item,
            ),
          );
        },
      });
  }

  updateComment(msgIndex: number, value: string): void {
    this.messages.update((m) =>
      m.map((item, i) => (i === msgIndex ? { ...item, comment: value } : item)),
    );
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
