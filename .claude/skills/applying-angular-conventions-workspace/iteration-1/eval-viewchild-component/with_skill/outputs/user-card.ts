import {
  Component,
  ChangeDetectionStrategy,
  afterNextRender,
  input,
  output,
} from "@angular/core";
import { DecimalPipe, DatePipe } from "@angular/common";
import { viewChild, ElementRef } from "@angular/core";

@Component({
  selector: "app-user-card",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, DatePipe],
  templateUrl: "./user-card.html",
})
export class UserCardComponent {
  name = input.required<string>();
  date = input.required<string>();

  deleted = output<void>();

  private cardEl = viewChild<ElementRef<HTMLElement>>("cardEl");

  constructor() {
    afterNextRender(() => {
      this.cardEl()?.nativeElement.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  }

  onDelete(): void {
    this.deleted.emit();
  }
}
