import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActionSheetController, AlertController, ModalController, ToastController } from '@ionic/angular/standalone';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonFab, IonFabButton, IonIcon, IonButton, IonButtons, IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, gridOutline, checkmarkOutline, closeOutline } from 'ionicons/icons';
import { CategoriesActions } from '@store/categories/categories.actions';
import { selectActiveCategories, selectCategoriesRowMap, selectCategoriesLoading } from '@store/categories/categories.selectors';
import { ICategory } from '@models/category.model';
import { AuthService } from '@core/services/auth.service';
import { CategoryFormComponent } from '@features/categories/category-form/category-form.component';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';

@Component({
  selector: 'app-category-list',
  templateUrl: 'category-list.page.html',
  styleUrls: [],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonFab, IonFabButton, IonIcon, IonButton, IonButtons, IonSpinner,
  ],
})
export class CategoryListPage implements OnInit {
  private readonly store           = inject(Store);
  private readonly modalCtrl       = inject(ModalController);
  private readonly toastCtrl       = inject(ToastController);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly alertCtrl       = inject(AlertController);
  private readonly authService     = inject(AuthService);

  /** Estado de carga de categorías para mostrar spinner mientras llegan del store. */
  readonly loading = toSignal(this.store.select(selectCategoriesLoading), { initialValue: false });
  /** Categorías activas del usuario desde el store NgRx. */
  readonly categories = toSignal(this.store.select(selectActiveCategories), { initialValue: [] });
  /** Mapa categoryId → rowNumber en Sheets, necesario para el borrado. */
  private readonly rowMap = toSignal(this.store.select(selectCategoriesRowMap), { initialValue: {} as Record<string, number> });

  /** Categorías de tipo gasto para la sección "Gastos" del grid. */
  readonly expenseCategories = computed(() =>
    this.categories().filter(c => c.type === TRANSACTION_TYPES.EXPENSE)
  );

  /** Categorías de tipo ingreso para la sección "Ingresos" del grid. */
  readonly incomeCategories = computed(() =>
    this.categories().filter(c => c.type === TRANSACTION_TYPES.INCOME)
  );

  /** True cuando el modo de selección múltiple está activo. */
  readonly selectionMode = signal(false);
  /** IDs de categorías seleccionadas actualmente. */
  readonly selectedIds   = signal(new Set<string>());
  /** Cantidad de categorías seleccionadas. */
  readonly selectedCount = computed(() => this.selectedIds().size);

  constructor() {
    addIcons({ addOutline, gridOutline, checkmarkOutline, closeOutline });
  }

  ngOnInit(): void {
    this.store.dispatch(CategoriesActions.loadCategories());
  }

  /** Activa o desactiva el modo selección. Al desactivar, limpia la selección. */
  toggleSelectionMode(): void {
    this.selectionMode.update(v => !v);
    if (!this.selectionMode()) {
      this.selectedIds.set(new Set());
    }
  }

  /** Agrega o quita el id de la selección activa. */
  toggleSelection(categoryId: string): void {
    this.selectedIds.update(s => {
      const n = new Set(s);
      n.has(categoryId) ? n.delete(categoryId) : n.add(categoryId);
      return n;
    });
  }

  async openAddModal(): Promise<void> {
    const user = this.authService.getUser();
    if (!user) return;
    const modal = await this.modalCtrl.create({
      component: CategoryFormComponent,
      componentProps: { userId: user.sub },
      backdropDismiss: true,
    });
    await modal.present();
  }

  async openEditModal(cat: ICategory): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: CategoryFormComponent,
      componentProps: { category: cat, rowNumber: this.rowMap()[cat.categoryId] },
      backdropDismiss: true,
    });
    await modal.present();
  }

  async onTilePress(cat: ICategory): Promise<void> {
    if (this.selectionMode()) {
      this.toggleSelection(cat.categoryId);
      return;
    }
    const actionSheet = await this.actionSheetCtrl.create({
      header: cat.name,
      buttons: [
        {
          text: 'Editar',
          icon: 'create-outline',
          handler: () => { this.openEditModal(cat); },
        },
        {
          text: 'Eliminar',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => { this.deleteCategory(cat); },
        },
        {
          text: 'Cancelar',
          role: 'cancel',
        },
      ],
    });
    await actionSheet.present();
  }

  async confirmDeleteSelected(): Promise<void> {
    const count = this.selectedCount();
    const alert = await this.alertCtrl.create({
      header: 'Eliminar categorías',
      message: `¿Eliminar ${count} ${count === 1 ? 'categoría' : 'categorías'}? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.selectedIds().forEach(id => {
              const rn = this.rowMap()[id];
              if (rn) this.store.dispatch(CategoriesActions.deleteCategory({ categoryId: id, rowNumber: rn }));
            });
            this.selectionMode.set(false);
            this.selectedIds.set(new Set());
            this.showSuccessToast(count);
          },
        },
      ],
    });
    await alert.present();
  }

  private async deleteCategory(cat: ICategory): Promise<void> {
    const rowNumber = this.rowMap()[cat.categoryId];
    if (!rowNumber) return;
    this.store.dispatch(CategoriesActions.deleteCategory({ categoryId: cat.categoryId, rowNumber }));
    const toast = await this.toastCtrl.create({
      message: 'Categoría desactivada',
      duration: 2000,
      color: 'medium',
    });
    await toast.present();
  }

  private async showSuccessToast(count: number): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: `${count} ${count === 1 ? 'categoría eliminada' : 'categorías eliminadas'}`,
      duration: 2500,
      color: 'success',
    });
    await toast.present();
  }
}
