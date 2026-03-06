import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state';

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(EmptyStateComponent);
  });

  it('renders the empty-state container', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeTruthy();
  });

  it('displays the default icon', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-icon').textContent).toContain('◎');
  });

  it('displays a custom icon', () => {
    fixture.componentRef.setInput('icon', '◫');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-icon').textContent).toContain('◫');
  });

  it('displays the message', () => {
    fixture.componentRef.setInput('message', 'Aucun document.');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aucun document.');
  });

  it('renders an empty message by default', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p').textContent.trim()).toBe('');
  });
});
