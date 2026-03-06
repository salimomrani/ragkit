import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state">
      <span class="empty-icon">{{ icon() }}</span>
      <p>{{ message() }}</p>
    </div>
  `,
  styles: `
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 3rem 1rem;
      color: #888;
    }
    .empty-icon {
      font-size: 2rem;
      opacity: 0.5;
    }
    p {
      margin: 0;
      text-align: center;
      line-height: 1.5;
    }
  `,
})
export class EmptyStateComponent {
  icon = input('◎');
  message = input('');
}
