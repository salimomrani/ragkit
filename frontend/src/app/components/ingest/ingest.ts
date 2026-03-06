import {
  Component,
  signal,
  computed,
  inject,
  viewChild,
  ElementRef,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { RagApiService, Document } from '../../services/rag-api.service';
import { RelativeDatePipe } from '../../shared/pipes/relative-date.pipe';
import { AlertComponent } from '../../shared/components/alert';

@Component({
  selector: 'app-ingest',
  standalone: true,
  imports: [FormsModule, RelativeDatePipe, AlertComponent],
  templateUrl: './ingest.html',
  styleUrls: ['./ingest.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Ingest implements OnInit {
  private readonly api = inject(RagApiService);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  selectedFile = signal<File | null>(null);
  isUploading = signal(false);
  successMsg = signal<string | null>(null);
  error = signal<string | null>(null);
  documents = signal<Document[]>([]);
  isLoadingDocs = signal(false);

  // T002 — Document Viewer State
  viewingDocument = signal<{ name: string; content: string } | null>(null);
  isLoadingContent = signal(false);

  // T001 — selection state
  selectedIds = signal<Set<string>>(new Set());
  isDeleting = signal(false);

  // Search filter
  searchQuery = signal<string>('');

  // Filtered list (used in template)
  filteredDocuments = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.documents();
    return this.documents().filter((d) => d.name.toLowerCase().includes(q));
  });

  // Aggregate stats (always from the full unfiltered list)
  stats = computed(() => ({
    totalDocs: this.documents().length,
    totalChunks: this.documents().reduce((sum, d) => sum + d.chunk_count, 0),
  }));

  // T002 — derived selection state
  allSelected = computed(
    () => this.documents().length > 0 && this.selectedIds().size === this.documents().length,
  );
  someSelected = computed(() => this.selectedIds().size > 0 && !this.allSelected());
  noneSelected = computed(() => this.selectedIds().size === 0);

  ngOnInit(): void {
    this.loadDocuments();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
    this.successMsg.set(null);
    this.error.set(null);
  }

  uploadFile(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.isUploading.set(true);
    this.successMsg.set(null);
    this.error.set(null);

    this.api.ingest(file).subscribe({
      next: (res) => {
        this.successMsg.set(`"${file.name}" ingéré — ${res.chunk_count} chunks.`);
        this.selectedFile.set(null);
        this.isUploading.set(false);
        this.loadDocuments();
        const el = this.fileInput()?.nativeElement;
        if (el) el.value = '';
      },
      error: (err) => {
        this.error.set(err?.error?.detail ?? "Erreur lors de l'envoi.");
        this.isUploading.set(false);
      },
    });
  }

  deleteDocument(id: string, name: string): void {
    if (!confirm(`Supprimer "${name}" de la base de connaissances ?`)) return;
    this.api.deleteDocument(id).subscribe({
      next: () => this.loadDocuments(),
      error: (err) => this.error.set(err?.error?.detail ?? 'Erreur lors de la suppression.'),
    });
  }

  // T003 — selection helpers
  toggleSelection(id: string): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds.set(next);
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  // T013 — select all / deselect all
  toggleAll(): void {
    if (this.allSelected()) {
      this.clearSelection();
    } else {
      this.selectedIds.set(new Set(this.documents().map((d) => d.id)));
    }
  }

  // T006 — delete selected
  deleteSelected(): void {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) return;
    if (!confirm(`Supprimer ${ids.length} document(s) de la base de connaissances ?`)) return;
    this.isDeleting.set(true);
    this.error.set(null);
    forkJoin(ids.map((id) => this.api.deleteDocument(id))).subscribe({
      next: () => {
        this.clearSelection();
        this.isDeleting.set(false);
        this.loadDocuments();
      },
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'Erreur lors de la suppression.');
        this.clearSelection();
        this.isDeleting.set(false);
        this.loadDocuments();
      },
    });
  }

  // T010 — delete all
  deleteAll(): void {
    const docs = this.documents();
    if (docs.length === 0) return;
    if (!confirm(`Supprimer tous les ${docs.length} documents de la base de connaissances ?`))
      return;
    this.isDeleting.set(true);
    this.error.set(null);
    forkJoin(docs.map((d) => this.api.deleteDocument(d.id))).subscribe({
      next: () => {
        this.clearSelection();
        this.isDeleting.set(false);
        this.loadDocuments();
      },
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'Erreur lors de la suppression.');
        this.clearSelection();
        this.isDeleting.set(false);
        this.loadDocuments();
      },
    });
  }

  private loadDocuments(): void {
    this.isLoadingDocs.set(true);
    this.api.getDocuments().subscribe({
      next: (docs) => {
        this.documents.set(docs);
        this.isLoadingDocs.set(false);
      },
      error: () => {
        this.isLoadingDocs.set(false);
      },
    });
  }

  viewDocument(doc: Document): void {
    this.isLoadingContent.set(true);
    this.viewingDocument.set({ name: doc.name, content: '' });
    this.error.set(null);

    this.api.getDocumentContent(doc.id).subscribe({
      next: (res) => {
        this.viewingDocument.set({ name: doc.name, content: res.content });
        this.isLoadingContent.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'Erreur lors de la récupération du contenu.');
        this.isLoadingContent.set(false);
        this.viewingDocument.set(null);
      },
    });
  }

  onModalContentClick(event: Event): void {
    event.stopPropagation();
  }

  onModalContentKeydown(event: Event): void {
    event.stopPropagation();
  }

  closeDocumentView(): void {
    this.viewingDocument.set(null);
  }
}
