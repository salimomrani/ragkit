import { Component, inject, effect, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ConversationService } from '../../../services/conversation.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state';

@Component({
  selector: 'app-history-panel',
  standalone: true,
  imports: [DatePipe, EmptyStateComponent],
  templateUrl: './history-panel.html',
  styleUrls: ['./history-panel.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPanel {
  readonly conversationService = inject(ConversationService);

  constructor() {
    effect(() => {
      if (this.conversationService.historyOpen()) {
        this.conversationService.loadHistory();
      }
    });
  }

  selectConversation(sessionId: string): void {
    this.conversationService.loadConversation(sessionId);
  }

  deleteConversation(sessionId: string): void {
    if (window.confirm('Supprimer cette conversation ?')) {
      this.conversationService.deleteConversation(sessionId);
    }
  }

  close(): void {
    this.conversationService.historyOpen.set(false);
  }

  back(): void {
    this.conversationService.selectedConversation.set(null);
  }

  loadMore(): void {
    this.conversationService.loadMore();
  }
}
