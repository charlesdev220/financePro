import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { Observable, switchMap } from 'rxjs';
import { IonInput, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';

/**
 * Componente shared de autocompletado — agnóstico al dominio (ADR-05).
 * Recibe sugerencias como Observable y emite el valor seleccionado.
 */
@Component({
  selector: 'app-autocomplete-input',
  templateUrl: 'autocomplete-input.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonInput, IonList, IonItem, IonLabel],
})
export class AutocompleteInputComponent {
  suggestions$ = input.required<Observable<string[]>>();
  placeholder  = input<string>('');
  value        = input<string>('');

  selected    = output<string>();
  inputChange = output<string>();

  readonly showDropdown = signal(false);

  /** Sugerencias aplanadas desde el Observable externo, reactivas al signal suggestions$. */
  readonly currentSuggestions = toSignal(
    toObservable(this.suggestions$).pipe(switchMap(obs$ => obs$)),
    { initialValue: [] as string[] },
  );

  protected readonly _value = signal('');

  constructor() {
    effect(() => { this._value.set(this.value()); });
    effect(() => { this.showDropdown.set(this.currentSuggestions().length > 0); });
  }

  onInput(event: Event): void {
    const val = (event as CustomEvent).detail.value ?? '';
    this._value.set(val);
    this.inputChange.emit(val);
    if (!val) this.showDropdown.set(false);
  }

  selectSuggestion(text: string): void {
    this._value.set(text);
    this.showDropdown.set(false);
    this.selected.emit(text);
  }

  onBlur(): void {
    // Pequeño delay para permitir el click en la sugerencia antes de cerrar
    setTimeout(() => {
      this.showDropdown.set(false);
      this.selected.emit(this._value());
    }, 200);
  }
}
