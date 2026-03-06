import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'toPercent', standalone: true })
export class ToPercentPipe implements PipeTransform {
  transform(value: number | null | undefined, digits = 0): string {
    const v = value ?? 0;
    return `${(v * 100).toFixed(digits)}%`;
  }
}
