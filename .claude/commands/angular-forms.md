# Skill: Angular Forms

Patrones de formularios reactivos para Angular 17+ en este proyecto.

## Reactive Forms — Patrón Estándar (Producción)

```typescript
@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="propertyForm" (ngSubmit)="onSubmit()">
      <input formControlName="title" />
      @if (titleControl.invalid && titleControl.touched) {
        <span class="text-red-500 text-xs">Título requerido</span>
      }

      <select formControlName="type">
        <option value="RENT">Alquiler</option>
        <option value="SALE">Venta</option>
      </select>

      <button type="submit" [disabled]="propertyForm.invalid || isLoading()">
        {{ isLoading() ? 'Guardando...' : 'Publicar' }}
      </button>
    </form>
  `
})
export class PropertyPublishComponent {
  private fb = inject(FormBuilder);

  isLoading = signal(false);

  propertyForm = this.fb.group({
    title:       ['', [Validators.required, Validators.minLength(5)]],
    description: [''],
    price:       [null, [Validators.required, Validators.min(0)]],
    type:        ['RENT', Validators.required]
  });

  get titleControl() { return this.propertyForm.controls.title; }

  onSubmit() {
    if (this.propertyForm.invalid) return;
    this.isLoading.set(true);
    // llamada al servicio...
  }
}
```

## Validadores Personalizados

```typescript
// Validador síncrono
export function positiveNumberValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    return value !== null && value <= 0
      ? { positiveNumber: { value } }
      : null;
  };
}

// Validador asíncrono (ej: verificar email único)
export function uniqueEmailValidator(authService: AuthService): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    return authService.checkEmailAvailable(control.value).pipe(
      debounceTime(300),
      map(available => available ? null : { emailTaken: true }),
      catchError(() => of(null))
    );
  };
}
```

## FormArray — Para Campos Dinámicos

```typescript
// Múltiples features de un inmueble
featuresArray = this.fb.array([
  this.fb.group({ key: [''], value: [''] })
]);

addFeature() {
  this.featuresArray.push(this.fb.group({ key: [''], value: [''] }));
}

removeFeature(index: number) {
  this.featuresArray.removeAt(index);
}
```

## FormGroup Anidado

```typescript
propertyForm = this.fb.group({
  title: ['', Validators.required],
  location: this.fb.group({
    latitude:  [null, Validators.required],
    longitude: [null, Validators.required],
    address:   ['']
  }),
  features: this.fb.group({
    rooms:      [1, Validators.min(1)],
    bathrooms:  [1],
    surface:    [null, Validators.min(0)],
    hasElevator: [false],
    hasParking:  [false]
  })
});
```

## Reglas
- Siempre `ReactiveFormsModule`, nunca `FormsModule` / `[(ngModel)]`.
- Deshabilitar el botón de submit cuando `form.invalid || isLoading()`.
- Mostrar errores solo cuando el control está `touched` o el form fue submitted.
- Usar `signal` para `isLoading`, `errorMessage`, `successMessage` — no variables clásicas.
- Resetear el form tras submit exitoso: `this.form.reset()`.