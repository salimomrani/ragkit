import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface HistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export type StreamEvent =
  | {
      type: 'meta';
      sources: { source: string; excerpt: string; score: number }[];
      confidence_score: number;
      low_confidence: boolean;
    }
  | { type: 'token'; content: string }
  | { type: 'done'; latency_ms: number; answer: string };

export interface QueryResponse {
  answer: string;
  sources: { source: string; excerpt: string; score: number }[];
  confidence_score: number;
  low_confidence: boolean;
}

export interface IngestResponse {
  document_id: string;
  name: string;
  chunk_count: number;
}

export interface Document {
  id: string;
  name: string;
  chunk_count: number;
  ingested_at: string;
}

export interface EvalPerQuestion {
  question: string;
  expected_source: string;
  source_found: boolean;
  answer_length: number;
}

export interface EvalReport {
  run_at: string;
  faithfulness: number;
  answer_relevancy: number;
  context_recall: number;
  per_question: EvalPerQuestion[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  question_masked: string;
  retrieved_sources: string[];
  similarity_scores: number[];
  answer: string;
  faithfulness_score: number;
  latency_ms: number;
  guardrail_triggered: string | null;
  rejected: boolean;
  rejection_reason: string | null;
}

@Injectable({ providedIn: 'root' })
export class RagApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  query(question: string): Observable<QueryResponse> {
    return this.http.post<QueryResponse>(`${this.apiUrl}/query`, { question });
  }

  streamQuery(question: string, history: HistoryEntry[] = []): Observable<StreamEvent> {
    return new Observable((observer) => {
      const controller = new AbortController();
      const token = this.authService.token();
      fetch(`${this.apiUrl}/query/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question, history }),
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) return res.json().then((e) => observer.error(e));
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          const pump = (): Promise<void> =>
            reader.read().then(({ done, value }) => {
              if (done) {
                observer.complete();
                return;
              }
              buffer += decoder.decode(value, { stream: true });
              const parts = buffer.split('\n\n');
              buffer = parts.pop() ?? '';
              for (const part of parts) {
                if (part.startsWith('data: ')) {
                  try {
                    observer.next(JSON.parse(part.slice(6)));
                  } catch {
                    /* ignore malformed SSE chunks */
                  }
                }
              }
              return pump();
            });
          return pump();
        })
        .catch((err) => {
          if (err.name !== 'AbortError') observer.error(err);
        });
      return () => controller.abort();
    });
  }

  ingest(file: File): Observable<IngestResponse> {
    return new Observable((observer) => {
      const reader = new FileReader();
      reader.onload = () => {
        this.http
          .post<IngestResponse>(`${this.apiUrl}/ingest`, {
            text: reader.result as string,
            name: file.name,
          })
          .subscribe(observer);
      };
      reader.onerror = () => observer.error(reader.error);
      reader.readAsText(file);
    });
  }

  getDocuments(): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}/documents`);
  }

  deleteDocument(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/documents/${id}`);
  }

  getLogs(): Observable<LogEntry[]> {
    return this.http.get<LogEntry[]>(`${this.apiUrl}/logs`);
  }

  getEvalReport(): Observable<EvalReport> {
    return this.http.get<EvalReport>(`${this.apiUrl}/evaluation/report`);
  }

  runEval(): Observable<{ status: string; scores: unknown }> {
    return this.http.post<{ status: string; scores: unknown }>(`${this.apiUrl}/evaluation/run`, {});
  }
}
