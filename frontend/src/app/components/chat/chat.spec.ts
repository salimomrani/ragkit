import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { provideMarkdown } from 'ngx-markdown';

import { Chat } from './chat';
import { RagApiService } from '../../services/rag-api.service';
import { ConversationService } from '../../services/conversation.service';

describe('Chat', () => {
  let component: Chat;
  let fixture: ComponentFixture<Chat>;
  let mockApi: { streamQuery: ReturnType<typeof vi.fn>; submitFeedback: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockApi = {
      streamQuery: vi.fn().mockReturnValue(NEVER),
      submitFeedback: vi.fn().mockReturnValue(NEVER),
    };

    await TestBed.configureTestingModule({
      imports: [Chat],
      providers: [provideMarkdown(), { provide: RagApiService, useValue: mockApi }],
    }).compileComponents();

    fixture = TestBed.createComponent(Chat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show suggestion chips when conversation is empty', () => {
    const chips = fixture.nativeElement.querySelectorAll('.suggestion-chip');
    expect(chips.length).toBeGreaterThan(0);
  });

  it('should hide suggestion chips when there are messages', () => {
    component.messages.set([{ id: '1', role: 'user', content: 'hello' }]);
    fixture.detectChanges();
    const chips = fixture.nativeElement.querySelectorAll('.suggestion-chip');
    expect(chips.length).toBe(0);
  });

  it('should have canSend false when prompt is empty', () => {
    expect(component.canSend()).toBe(false);
  });

  it('should have canSend false when isLoading is true', () => {
    component.prompt.set('test');
    component.isLoading.set(true);
    expect(component.canSend()).toBe(false);
  });

  it('should call streamQuery with the prompt and empty history when sendMessage is called with no prior messages', () => {
    component.prompt.set('hello');
    component.sendMessage();
    expect(mockApi.streamQuery).toHaveBeenCalledWith('hello', [], expect.any(String));
  });

  it('should not call streamQuery when prompt is empty', () => {
    component.prompt.set('');
    component.sendMessage();
    expect(mockApi.streamQuery).not.toHaveBeenCalled();
  });

  // T012 — US2: clearConversation resets messages and next query sends empty history
  it('should clear messages when clearConversation is called', () => {
    component.messages.set([
      { id: '1', role: 'user', content: 'Q1' },
      { id: '2', role: 'assistant', content: 'A1' },
    ]);
    component.clearConversation();
    expect(component.messages()).toEqual([]);
  });

  it('should send empty history after clearConversation', () => {
    component.messages.set([
      { id: '1', role: 'user', content: 'Q1' },
      { id: '2', role: 'assistant', content: 'A1' },
    ]);
    component.clearConversation();
    component.prompt.set('question suivante');
    component.sendMessage();
    expect(mockApi.streamQuery).toHaveBeenCalledWith('question suivante', [], expect.any(String));
  });

  // Confidence badge visibility
  it('should not show confidence badge when lowConfidence is false', () => {
    component.messages.set([
      { id: '1', role: 'assistant', content: 'ok', confidence: 0.55, lowConfidence: false },
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.confidence')).toBeNull();
  });

  it('should not show confidence badge when confidence is defined but lowConfidence is absent', () => {
    component.messages.set([{ id: '1', role: 'assistant', content: 'ok', confidence: 0.75 }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.confidence')).toBeNull();
  });

  it('should show confidence badge with low class when lowConfidence is true', () => {
    component.messages.set([
      { id: '1', role: 'assistant', content: 'ok', confidence: 0.35, lowConfidence: true },
    ]);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.confidence');
    expect(el).not.toBeNull();
    expect(el.classList.contains('low')).toBe(true);
  });

  it('should not show similarity score next to sources', () => {
    component.messages.set([
      {
        id: '1',
        role: 'assistant',
        content: 'ok',
        sources: [{ source: 'faq.md', excerpt: '', score: 0.61 }],
      },
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.source-score')).toBeNull();
  });

  // T016 — US3: sendMessage caps history at 12 entries
  it('should send at most 12 history entries regardless of message count', () => {
    const manyMessages = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `msg ${i}`,
    }));
    component.messages.set(manyMessages);
    component.prompt.set('nouvelle question');
    component.sendMessage();
    const [, historyArg] = mockApi.streamQuery.mock.calls[0];
    expect(historyArg.length).toBeLessThanOrEqual(12);
  });

  // T017 — US4: sendMessage passes sessionId to streamQuery
  it('should pass sessionId to streamQuery in sendMessage()', () => {
    const convService = TestBed.inject(ConversationService);
    component.prompt.set('hello');
    component.sendMessage();
    expect(mockApi.streamQuery).toHaveBeenCalledWith('hello', [], convService.sessionId);
  });

  // T026 — US2: loadHistory() called after successful sendMessage (done event)
  it('should call loadHistory after sendMessage completes with done event', async () => {
    const { Subject } = await import('rxjs');
    const subject$ = new Subject<{ type: string; content?: string }>();
    mockApi.streamQuery.mockReturnValue(subject$.asObservable());

    const convService = TestBed.inject(ConversationService);
    vi.spyOn(convService, 'loadHistory').mockImplementation(() => {});

    component.prompt.set('test question');
    component.sendMessage();

    subject$.next({ type: 'done' });
    subject$.complete();

    expect(convService.loadHistory).toHaveBeenCalled();
  });

  // T010 — US1: Feedback button tests
  it('should NOT show feedback buttons while message is streaming', () => {
    component.messages.set([
      {
        id: '1',
        role: 'assistant',
        content: 'partial...',
        streaming: true,
        logId: 'log-1',
        feedbackEnabled: true,
        isPositive: null,
        submitting: false,
        feedbackError: null,
      },
    ]);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.feedback-btn');
    expect(buttons.length).toBe(0);
  });

  it('should show feedback buttons after streaming completes with feedbackEnabled = true', () => {
    component.messages.set([
      {
        id: '1',
        role: 'assistant',
        content: 'Full answer.',
        streaming: false,
        logId: 'log-1',
        feedbackEnabled: true,
        isPositive: null,
        submitting: false,
        feedbackError: null,
      },
    ]);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.feedback-btn');
    expect(buttons.length).toBe(2);
  });

  it('should NOT show feedback buttons when feedbackEnabled is false', () => {
    component.messages.set([
      {
        id: '1',
        role: 'assistant',
        content: 'Blocked.',
        streaming: false,
        logId: null,
        feedbackEnabled: false,
        isPositive: null,
        submitting: false,
        feedbackError: null,
      },
    ]);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.feedback-btn');
    expect(buttons.length).toBe(0);
  });

  it('should call submitFeedback with correct args when thumbs-up is clicked', () => {
    mockApi.submitFeedback.mockReturnValue(
      of({ is_positive: true, comment: null, updated_at: '2026-01-01T00:00:00Z' }),
    );
    component.messages.set([
      {
        id: '1',
        role: 'assistant',
        content: 'Answer.',
        streaming: false,
        logId: 'log-abc',
        feedbackEnabled: true,
        isPositive: null,
        submitting: false,
        feedbackError: null,
      },
    ]);
    fixture.detectChanges();

    const thumbsUp = fixture.nativeElement.querySelector('.feedback-btn[title="Utile"]');
    thumbsUp.click();
    fixture.detectChanges();

    expect(mockApi.submitFeedback).toHaveBeenCalledWith('log-abc', true);
  });

  it('should set isPositive = true on message after successful positive rating', () => {
    mockApi.submitFeedback.mockReturnValue(
      of({ is_positive: true, comment: null, updated_at: '2026-01-01T00:00:00Z' }),
    );
    component.messages.set([
      {
        id: '1',
        role: 'assistant',
        content: 'Answer.',
        streaming: false,
        logId: 'log-abc',
        feedbackEnabled: true,
        isPositive: null,
        submitting: false,
        feedbackError: null,
      },
    ]);
    fixture.detectChanges();

    component.submitRating(0, true);
    fixture.detectChanges();

    expect(component.messages()[0].isPositive).toBe(true);
    expect(component.messages()[0].submitting).toBe(false);
  });

  it('should set feedbackError when submitFeedback fails', () => {
    mockApi.submitFeedback.mockReturnValue(throwError(() => new Error('network error')));
    component.messages.set([
      {
        id: '1',
        role: 'assistant',
        content: 'Answer.',
        streaming: false,
        logId: 'log-abc',
        feedbackEnabled: true,
        isPositive: null,
        submitting: false,
        feedbackError: null,
      },
    ]);
    fixture.detectChanges();

    component.submitRating(0, true);
    fixture.detectChanges();

    expect(component.messages()[0].feedbackError).toBeTruthy();
    expect(component.messages()[0].submitting).toBe(false);
  });

  // T013 — US2: Comment textarea interaction tests
  it('should show textarea when thumbs-down is clicked (showComment becomes true)', () => {
    component.messages.set([
      {
        id: '1',
        role: 'assistant',
        content: 'Answer.',
        streaming: false,
        logId: 'log-abc',
        feedbackEnabled: true,
        isPositive: null,
        submitting: false,
        feedbackError: null,
        showComment: false,
        comment: '',
      },
    ]);
    fixture.detectChanges();

    component.submitRating(0, false);
    fixture.detectChanges();

    expect(component.messages()[0].showComment).toBe(true);
    expect(mockApi.submitFeedback).not.toHaveBeenCalled();
  });

  it('should hide textarea when thumbs-up is clicked (showComment becomes false)', () => {
    mockApi.submitFeedback.mockReturnValue(
      of({ is_positive: true, comment: null, updated_at: '2026-01-01T00:00:00Z' }),
    );
    component.messages.set([
      {
        id: '1',
        role: 'assistant',
        content: 'Answer.',
        streaming: false,
        logId: 'log-abc',
        feedbackEnabled: true,
        isPositive: null,
        submitting: false,
        feedbackError: null,
        showComment: true,
        comment: 'some text',
      },
    ]);
    fixture.detectChanges();

    component.submitRating(0, true);
    fixture.detectChanges();

    expect(component.messages()[0].showComment).toBe(false);
    expect(component.messages()[0].comment).toBe('');
  });

  it('should call submitFeedback with logId, false, and comment when submitWithComment is called', () => {
    mockApi.submitFeedback.mockReturnValue(
      of({ is_positive: false, comment: 'test comment', updated_at: '2026-01-01T00:00:00Z' }),
    );
    component.messages.set([
      {
        id: '1',
        role: 'assistant',
        content: 'Answer.',
        streaming: false,
        logId: 'log-abc',
        feedbackEnabled: true,
        isPositive: null,
        submitting: false,
        feedbackError: null,
        showComment: true,
        comment: 'test comment',
      },
    ]);
    fixture.detectChanges();

    component.submitWithComment(0);
    fixture.detectChanges();

    expect(mockApi.submitFeedback).toHaveBeenCalledWith('log-abc', false, 'test comment');
    expect(component.messages()[0].showComment).toBe(false);
  });

  it('should call submitFeedback with undefined comment when comment is empty string', () => {
    mockApi.submitFeedback.mockReturnValue(
      of({ is_positive: false, comment: null, updated_at: '2026-01-01T00:00:00Z' }),
    );
    component.messages.set([
      {
        id: '1',
        role: 'assistant',
        content: 'Answer.',
        streaming: false,
        logId: 'log-abc',
        feedbackEnabled: true,
        isPositive: null,
        submitting: false,
        feedbackError: null,
        showComment: true,
        comment: '',
      },
    ]);
    fixture.detectChanges();

    component.submitWithComment(0);
    fixture.detectChanges();

    expect(mockApi.submitFeedback).toHaveBeenCalledWith('log-abc', false, undefined);
  });

  it('should set feedbackError and clear submitting when submitWithComment fails', () => {
    mockApi.submitFeedback.mockReturnValue(throwError(() => new Error('network error')));
    component.messages.set([
      {
        id: '1',
        role: 'assistant',
        content: 'Answer.',
        streaming: false,
        logId: 'log-abc',
        feedbackEnabled: true,
        isPositive: null,
        submitting: false,
        feedbackError: null,
        showComment: true,
        comment: 'some comment',
      },
    ]);
    fixture.detectChanges();

    component.submitWithComment(0);
    fixture.detectChanges();

    expect(component.messages()[0].feedbackError).toBeTruthy();
    expect(component.messages()[0].submitting).toBe(false);
  });
});
