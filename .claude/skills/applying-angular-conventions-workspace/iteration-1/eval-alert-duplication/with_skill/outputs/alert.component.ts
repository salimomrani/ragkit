import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
  selector: "app-alert",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message()) {
      <div class="alert" [class]="type()">{{ message() }}</div>
    }
  `,
})
export class AlertComponent {
  message = input<string | null>(null);
  type = input<"error" | "success" | "info">("error");
}
