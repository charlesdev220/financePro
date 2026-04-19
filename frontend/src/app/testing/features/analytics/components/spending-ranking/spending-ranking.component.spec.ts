import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SpendingRankingComponent } from '../../../../../features/analytics/components/spending-ranking/spending-ranking.component';
import { SpendingItem } from '../../../../../features/analytics/services/analytics.service';

function item(concept: string, amount: number): SpendingItem {
  return { concept, categoryId: 'cat-1', amountBase: amount, isRecurring: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// SpendingRankingComponent — REQ-08
// ─────────────────────────────────────────────────────────────────────────────
describe('SpendingRankingComponent', () => {
  let component: SpendingRankingComponent;
  let fixture: ComponentFixture<SpendingRankingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpendingRankingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SpendingRankingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // REQ-08 sc1: listas con datos → ítems visibles en ambas secciones
  it('should render items in both sections when data is provided', () => {
    // Given
    component.recurrentes = [item('Netflix', 15), item('Gym', 30)];
    component.superfluos  = [item('Cena restaurante', 120)];
    fixture.detectChanges();

    // Then
    const items = fixture.debugElement.queryAll(By.css('.ranking-item'));
    expect(items.length).toBe(3);
  });

  // REQ-08 sc2: superfluos vacío → mensaje @empty en esa sección
  it('should show empty message in superfluos section when superfluos is empty', () => {
    // Given
    component.recurrentes = [item('Netflix', 15)];
    component.superfluos  = [];
    fixture.detectChanges();

    // Then
    const emptyItems = fixture.debugElement.queryAll(By.css('.ranking-empty'));
    expect(emptyItems.length).toBe(1);
    expect(emptyItems[0].nativeElement.textContent).toContain('Sin datos suficientes');
  });

  // REQ-08 sc3: ambas listas vacías → dos mensajes @empty, sin errores de template
  it('should show two empty messages and no errors when both lists are empty', () => {
    // Given
    component.recurrentes = [];
    component.superfluos  = [];
    fixture.detectChanges();

    // Then
    const emptyItems = fixture.debugElement.queryAll(By.css('.ranking-empty'));
    expect(emptyItems.length).toBe(2);
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  // Verifica que los conceptos se renderizan en el DOM
  it('should display concept names in the list items', () => {
    // Given
    component.recurrentes = [item('Spotify', 10)];
    component.superfluos  = [item('Vuelo vacaciones', 800)];
    fixture.detectChanges();

    // Then
    const concepts = fixture.debugElement
      .queryAll(By.css('.ranking-concept'))
      .map(el => el.nativeElement.textContent.trim());
    expect(concepts).toContain('Spotify');
    expect(concepts).toContain('Vuelo vacaciones');
  });
});
