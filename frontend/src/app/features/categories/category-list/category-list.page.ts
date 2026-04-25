import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActionSheetController, ModalController, ToastController } from '@ionic/angular/standalone';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonFab, IonFabButton, IonIcon, IonButton, IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, gridOutline } from 'ionicons/icons';
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
    IonFab, IonFabButton, IonIcon, IonButton, IonSpinner,
  ],
})
export class CategoryListPage implements OnInit {
  private readonly store           = inject(Store);
  private readonly modalCtrl       = inject(ModalController);
  private readonly toastCtrl       = inject(ToastController);
  private readonly actionSheetCtrl = inject(ActionSheetController);
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

  constructor() {
    addIcons({ addOutline, gridOutline });
  }

  ngOnInit(): void {
    this.store.dispatch(CategoriesActions.loadCategories());
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
}
