import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from "@angular/core";
import { DecimalPipe } from "@angular/common";

@Component({
  selector: "app-user-card",
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div #cardContainer class="user-card">
      <div class="user-card__info">
        <span class="user-card__name">{{ name }}</span>
        <span class="user-card__date">{{ date }}</span>
        <span class="user-card__id">ID: {{ userId | number }}</span>
      </div>
      <button class="user-card__delete" (click)="onDelete()">Supprimer</button>
    </div>
  `,
  styles: [
    `
      .user-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        margin-bottom: 8px;
      }
      .user-card__info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .user-card__name {
        font-weight: 600;
      }
      .user-card__date,
      .user-card__id {
        font-size: 0.85rem;
        color: #666;
      }
      .user-card__delete {
        background: #e53935;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 14px;
        cursor: pointer;
      }
      .user-card__delete:hover {
        background: #b71c1c;
      }
    `,
  ],
})
export class UserCardComponent implements AfterViewInit {
  @Input() name!: string;
  @Input() date!: string;
  @Input() userId: number = 0;

  @Output() delete = new EventEmitter<void>();

  @ViewChild("cardContainer") cardContainer!: ElementRef<HTMLDivElement>;

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.cardContainer.nativeElement.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 0);
  }

  onDelete(): void {
    this.delete.emit();
  }
}
