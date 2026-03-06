import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertComponent } from './alert';

describe('AlertComponent', () => {
  let fixture: ComponentFixture<AlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AlertComponent);
  });

  it('renders nothing when message is null', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.alert')).toBeNull();
  });

  it('renders the alert div when message is set', () => {
    fixture.componentRef.setInput('message', 'Une erreur');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.alert')).toBeTruthy();
  });

  it('displays the message text', () => {
    fixture.componentRef.setInput('message', 'Fichier invalide');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Fichier invalide');
  });

  it('applies the type class (error by default)', () => {
    fixture.componentRef.setInput('message', 'Erreur');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.error')).toBeTruthy();
  });

  it('applies success class when type is success', () => {
    fixture.componentRef.setInput('message', 'OK');
    fixture.componentRef.setInput('type', 'success');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.success')).toBeTruthy();
  });

  it('renders nothing when message is empty string', () => {
    fixture.componentRef.setInput('message', '');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.alert')).toBeNull();
  });
});
