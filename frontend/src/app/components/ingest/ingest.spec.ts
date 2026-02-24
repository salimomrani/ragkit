import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Ingest } from './ingest';
import { RagApiService, Document } from '../../services/rag-api.service';

const mockDocs: Document[] = [
  { id: 'a', name: 'alpha.md', chunk_count: 3, ingested_at: '2024-01-01T00:00:00Z' },
  { id: 'b', name: 'beta.txt', chunk_count: 5, ingested_at: '2024-01-02T00:00:00Z' },
  { id: 'c', name: 'gamma.md', chunk_count: 2, ingested_at: '2024-06-15T12:00:00Z' },
];

describe('Ingest', () => {
  let component: Ingest;
  let fixture: ComponentFixture<Ingest>;

  beforeEach(async () => {
    const mockApi = {
      getDocuments: vi.fn().mockReturnValue(of(mockDocs)),
      ingest: vi.fn().mockReturnValue(of({ chunk_count: 3 })),
      deleteDocument: vi.fn().mockReturnValue(of(null)),
    };

    await TestBed.configureTestingModule({
      imports: [Ingest],
      providers: [{ provide: RagApiService, useValue: mockApi }],
    }).compileComponents();

    fixture = TestBed.createComponent(Ingest);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --- Existing selection tests ---

  it('toggleSelection adds an ID to selectedIds', () => {
    component.toggleSelection('a');
    expect(component.selectedIds().has('a')).toBe(true);
  });

  it('toggleSelection twice removes the ID', () => {
    component.toggleSelection('a');
    component.toggleSelection('a');
    expect(component.selectedIds().has('a')).toBe(false);
  });

  it('noneSelected is true by default', () => {
    expect(component.noneSelected()).toBe(true);
  });

  it('allSelected is true when all documents are selected', () => {
    component.selectedIds.set(new Set(['a', 'b', 'c']));
    expect(component.allSelected()).toBe(true);
  });

  it('someSelected is true for partial selection', () => {
    component.selectedIds.set(new Set(['a']));
    expect(component.someSelected()).toBe(true);
    expect(component.allSelected()).toBe(false);
  });

  it('toggleAll selects all; second call clears selection', () => {
    component.toggleAll();
    expect(component.allSelected()).toBe(true);
    component.toggleAll();
    expect(component.noneSelected()).toBe(true);
  });

  // --- New: filteredDocuments ---

  it('filteredDocuments returns all docs when query is empty', () => {
    component.searchQuery.set('');
    expect(component.filteredDocuments().length).toBe(3);
  });

  it('filteredDocuments filters by name (case-insensitive)', () => {
    component.searchQuery.set('ALPHA');
    const result = component.filteredDocuments();
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('a');
  });

  it('filteredDocuments returns partial matches', () => {
    component.searchQuery.set('.md');
    const result = component.filteredDocuments();
    expect(result.length).toBe(2); // alpha.md and gamma.md
  });

  it('filteredDocuments returns empty array when nothing matches', () => {
    component.searchQuery.set('zzznomatch');
    expect(component.filteredDocuments().length).toBe(0);
  });

  // --- New: stats ---

  it('stats.totalDocs equals documents length', () => {
    expect(component.stats().totalDocs).toBe(3);
  });

  it('stats.totalChunks is the sum of all chunk_counts', () => {
    expect(component.stats().totalChunks).toBe(10); // 3 + 5 + 2
  });

  // --- New: formatDate ---

  it('formatDate returns a non-empty string for a valid ISO date', () => {
    const result = component.formatDate('2024-01-01T00:00:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formatDate includes relative time for recent dates', () => {
    const recent = new Date(Date.now() - 2 * 86_400_000).toISOString(); // 2 days ago
    const result = component.formatDate(recent);
    expect(result).toContain('il y a');
  });

  it("formatDate includes \"à l'instant\" for very recent dates", () => {
    const justNow = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago
    const result = component.formatDate(justNow);
    expect(result).toContain("à l'instant");
  });
});
