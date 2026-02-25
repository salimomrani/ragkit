import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER } from 'rxjs';
import { vi } from 'vitest';
import { provideMarkdown } from 'ngx-markdown';

import { Chat } from './chat';
import { RagApiService } from '../../services/rag-api.service';

describe('Chat', () => {
  let component: Chat;
  let fixture: ComponentFixture<Chat>;
  let mockApi: { streamQuery: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockApi = {
      streamQuery: vi.fn().mockReturnValue(NEVER),
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
    expect(mockApi.streamQuery).toHaveBeenCalledWith('hello', []);
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
    expect(mockApi.streamQuery).toHaveBeenCalledWith('question suivante', []);
  });

  // Confidence badge visibility
  it('should not show confidence badge when confidence >= 0.7', () => {
    component.messages.set([{ id: '1', role: 'assistant', content: 'ok', confidence: 0.75 }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.confidence')).toBeNull();
  });

  it('should show confidence badge without low class when 0.5 <= confidence < 0.7', () => {
    component.messages.set([{ id: '1', role: 'assistant', content: 'ok', confidence: 0.55 }]);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.confidence');
    expect(el).not.toBeNull();
    expect(el.classList.contains('low')).toBe(false);
  });

  it('should show confidence badge with low class when confidence < 0.5', () => {
    component.messages.set([{ id: '1', role: 'assistant', content: 'ok', confidence: 0.35 }]);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.confidence');
    expect(el).not.toBeNull();
    expect(el.classList.contains('low')).toBe(true);
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
});
