import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'relativeDate', standalone: true })
export class RelativeDatePipe implements PipeTransform {
  transform(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);

    const formatted = date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let relative: string;
    if (diffMs < 60_000) {
      relative = "à l'instant";
    } else if (diffMs < 3_600_000) {
      const mins = Math.floor(diffMs / 60_000);
      relative = `il y a ${mins} min`;
    } else if (diffDays === 0) {
      const hrs = Math.floor(diffMs / 3_600_000);
      relative = `il y a ${hrs} h`;
    } else if (diffDays === 1) {
      relative = 'hier';
    } else if (diffDays < 30) {
      relative = `il y a ${diffDays} j`;
    } else {
      relative = '';
    }

    return relative ? `${formatted} · ${relative}` : formatted;
  }
}
