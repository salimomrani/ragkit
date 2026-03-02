import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RagApiService, LogEntry } from '../../services/rag-api.service';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './logs.html',
  styleUrls: ['./logs.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logs implements OnInit {
  private readonly api = inject(RagApiService);

  logs = signal<LogEntry[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  expandedId = signal<string | null>(null);
  expandedFeedbackId = signal<string | null>(null);

  ngOnInit(): void {
    this.fetchLogs();
  }

  fetchLogs(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.api.getLogs().subscribe({
      next: (data) => {
        this.logs.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set("Impossible de charger l'historique.");
        this.isLoading.set(false);
      },
    });
  }

  toggleRow(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  toggleFeedback(id: string): void {
    this.expandedFeedbackId.set(this.expandedFeedbackId() === id ? null : id);
  }

  reasonLabel(reason: string | null): string {
    switch (reason) {
      case 'guardrail:empty_question':
        return 'Question vide';
      case 'guardrail:length_exceeded':
        return 'Question trop longue';
      case 'guardrail:prompt_injection':
        return 'Injection de prompt';
      case 'guardrail:offensive_content':
        return 'Contenu offensant';
      default:
        return reason ?? 'Refusé';
    }
  }
}
