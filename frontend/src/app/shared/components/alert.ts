import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-alert',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message()) {
      <div class="alert" [class]="type()">{{ message() }}</div>
    }
  `,
  styles: `
    .alert {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
    }
    .error {
      background: #2a1215;
      color: #f87171;
      border: 1px solid #7f1d1d;
    }
    .success {
      background: #052e16;
      color: #4ade80;
      border: 1px solid #14532d;
    }
    .info {
      background: #172554;
      color: #60a5fa;
      border: 1px solid #1e3a5f;
    }
  `,
})
export class AlertComponent {
  message = input<string | null>(null);
  type = input<'error' | 'success' | 'info'>('error');
}
