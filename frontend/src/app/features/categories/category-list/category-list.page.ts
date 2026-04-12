import { Component, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonList, IonItem, IonLabel, IonBadge,
  IonFab, IonFabButton, IonIcon, IonButton, IonButtons,
  IonNote,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, createOutline } from 'ionicons/icons';
import { CategoriesActions } from '../../../store/categories/categories.actions';
import {
  selectActiveCategories,
  selectCategoriesRowMap,
} from '../../../store/categories/categories.selectors';
import { ICategory } from '../../../models/category.model';
import { AuthService } from '../../../core/services/auth.service';
import { CategoryFormComponent } from '../category-form/category-form.component';

@Component({
  selector: 'app-category-list',
  templateUrl: 'category-list.page.html',
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonList, IonItem, IonLabel, IonBadge,
    IonFab, IonFabButton, IonIcon, IonButton, IonButtons, IonNote,
  ],
})
export class CategoryListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly authService = inject(AuthService);

  readonly categories = toSignal(this.store.select(selectActiveCategories), { initialValue: [] });
  private readonly rowMap = toSignal(this.store.select(selectCategoriesRowMap), { initialValue: {} as Record<string, number> });

  constructor() {
    addIcons({ addOutline, trashOutline, createOutline });
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
    });
    await modal.present();
  }

  async openEditModal(cat: ICategory): Promise<void> {
    const rowNumber = this.rowMap()[cat.categoryId];
    const modal = await this.modalCtrl.create({
      component: CategoryFormComponent,
      componentProps: { category: cat, rowNumber },
    });
    await modal.present();
  }

  async deleteCategory(cat: ICategory): Promise<void> {
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
