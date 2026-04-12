import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { IonInput, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { AsyncPipe } from '@angular/common';

/**
 * Componente shared de autocompletado — agnóstico al dominio (ADR-05).
 * Recibe sugerencias como Observable y emite el valor seleccionado.
 *
 * @Input  suggestions$ — Observable<string[]> de sugerencias (ya filtradas por el caller)
 * @Output selected     — emite el texto elegido (por sugerencia O por valor libre)
 */
@Component({
  selector: 'app-autocomplete-input',
  templateUrl: 'autocomplete-input.component.html',
  standalone: true,
  imports: [IonInput, IonList, IonItem, IonLabel, AsyncPipe],
})
export class AutocompleteInputComponent implements OnInit, OnDestroy {
  @Input({ required: true }) suggestions$!: Observable<string[]>;
  @Input() placeholder = '';
  @Input() value = '';

  @Output() selected = new EventEmitter<string>();
  @Output() inputChange = new EventEmitter<string>();

  readonly showDropdown = signal(false);
  readonly currentSuggestions = signal<string[]>([]);

  private sub: Subscription | null = null;

  ngOnInit(): void {
    this.sub = this.suggestions$.subscribe(s => {
      this.currentSuggestions.set(s);
      this.showDropdown.set(s.length > 0);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onInput(event: Event): void {
    const val = (event as CustomEvent).detail.value ?? '';
    this.value = val;
    this.inputChange.emit(val);
    if (!val) this.showDropdown.set(false);
  }

  selectSuggestion(text: string): void {
    this.value = text;
    this.showDropdown.set(false);
    this.selected.emit(text);
  }

  onBlur(): void {
    // Pequeño delay para permitir el click en la sugerencia antes de cerrar
    setTimeout(() => {
      this.showDropdown.set(false);
      this.selected.emit(this.value);
    }, 200);
  }
}
