import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { SpendingRankingComponent } from '../../../../../features/analytics/components/spending-ranking/spending-ranking.component';
import { SpendingItem } from '../../../../../features/analytics/services/analytics.service';

function item(concept: string, amount: number): SpendingItem {
  return { concept, categoryId: 'cat-1', amountBase: amount, isRecurring: false };
}

describe('SpendingRankingComponent', () => {
  let spectator: Spectator<SpendingRankingComponent>;

  const createComponent = createComponentFactory({
    component: SpendingRankingComponent,
  });

  beforeEach(() => {
    spectator = createComponent({
      props: {
        recurrentes: [],
        superfluos: []
      }
    });
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  // REQ-08 sc1: listas con datos → ítems visibles en ambas secciones
  it('should render items in both sections when data is provided', () => {
    spectator.setInput('recurrentes', [item('Netflix', 15), item('Gym', 30)]);
    spectator.setInput('superfluos', [item('Cena restaurante', 120)]);

    const items = spectator.queryAll('.ranking-item');
    expect(items.length).toBe(3);
  });

  // REQ-08 sc2: superfluos vacío → mensaje @empty en esa sección
  it('should show empty message in superfluos section when superfluos is empty', () => {
    spectator.setInput('recurrentes', [item('Netflix', 15)]);
    spectator.setInput('superfluos', []);

    const emptyItems = spectator.queryAll('.ranking-empty');
    expect(emptyItems.length).toBe(1);
    expect(emptyItems[0].textContent).toContain('Sin datos suficientes');
  });

  // REQ-08 sc3: ambas listas vacías → dos mensajes @empty, sin errores de template
  it('should show two empty messages and no errors when both lists are empty', () => {
    spectator.setInput('recurrentes', []);
    spectator.setInput('superfluos', []);

    const emptyItems = spectator.queryAll('.ranking-empty');
    expect(emptyItems.length).toBe(2);
  });

  // Verifica que los conceptos se renderizan en el DOM
  it('should display concept names in the list items', () => {
    spectator.setInput('recurrentes', [item('Spotify', 10)]);
    spectator.setInput('superfluos', [item('Vuelo vacaciones', 800)]);

    const concepts = spectator.queryAll('.ranking-concept').map(el => el.textContent?.trim());
    expect(concepts).toContain('Spotify');
    expect(concepts).toContain('Vuelo vacaciones');
  });
});
