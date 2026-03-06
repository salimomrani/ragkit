import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RagApiService, EvalReport } from '../../services/rag-api.service';
import { ToPercentPipe } from '../../shared/pipes/percent.pipe';
import { AlertComponent } from '../../shared/components/alert';
import { EmptyStateComponent } from '../../shared/components/empty-state';

@Component({
  selector: 'app-eval',
  standalone: true,
  imports: [DatePipe, ToPercentPipe, AlertComponent, EmptyStateComponent],
  templateUrl: './eval.html',
  styleUrls: ['./eval.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Eval implements OnInit {
  private readonly api = inject(RagApiService);

  report = signal<EvalReport | null>(null);
  isLoading = signal(true);
  isRunning = signal(false);
  error = signal<string | null>(null);
  info = signal<string | null>(null);

  ngOnInit(): void {
    this.fetchReport();
    this.api.getEvalStatus().subscribe({
      next: ({ running }) => {
        if (running) {
          this.isRunning.set(true);
          this.info.set('Une évaluation est en cours, veuillez patienter.');
        }
      },
    });
  }

  fetchReport(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.api.getEvalReport().subscribe({
      next: (data) => {
        this.report.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Aucun rapport disponible. Lancez une évaluation.');
        this.isLoading.set(false);
      },
    });
  }

  runEval(): void {
    this.isRunning.set(true);
    this.error.set(null);
    this.info.set(null);
    this.api.runEval().subscribe({
      next: () => {
        this.info.set(
          'Évaluation lancée en arrière-plan. Rafraîchissez manuellement pour voir les résultats.',
        );
      },
      error: (err) => {
        if (err.status === 409) {
          this.info.set('Une évaluation est déjà en cours, veuillez patienter.');
        } else {
          this.error.set("Erreur lors du lancement de l'évaluation.");
          this.isRunning.set(false);
        }
      },
    });
  }

  avg = computed(() => {
    const r = this.report();
    if (!r) return 0;
    return (r.faithfulness + r.answer_relevancy + r.context_recall) / 3;
  });
}
