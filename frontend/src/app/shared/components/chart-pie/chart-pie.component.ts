import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
  signal,
} from '@angular/core';
import {
  ArcElement,
  Chart,
  ChartData,
  ChartOptions,
  DoughnutController,
  Legend,
  Tooltip,
} from 'chart.js';

Chart.register(ArcElement, DoughnutController, Tooltip, Legend);

@Component({
  selector: 'app-chart-pie',
  standalone: true,
  imports: [],
  templateUrl: './chart-pie.component.html',
  styleUrls: ['./chart-pie.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartPieComponent implements AfterViewInit, OnDestroy {
  data = input<ChartData<'doughnut'> | null>(null);
  /** Incrementar desde la página padre en ionViewDidEnter para forzar chart.resize() al volver al tab. */
  refreshTrigger = input<number>(0);

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  private readonly initialized = signal(false);

  constructor() {
    effect(() => {
      const data = this.data();
      if (!this.initialized()) return;
      this.chart?.destroy();
      this.chart = null;
      if (data) {
        queueMicrotask(() => { if (!this.chart) this.createChart(data); });
      }
    });

    effect(() => {
      this.refreshTrigger();
      if (!this.initialized() || !this.chart) return;
      this.chart.resize();
    });
  }

  ngAfterViewInit(): void {
    this.initialized.set(true);
  }

  ngOnDestroy(): void {
    this.initialized.set(false);
    this.chart?.destroy();
    this.chart = null;
  }

  private createChart(data: ChartData<'doughnut'>): void {
    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'doughnut',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '70%'
      } as ChartOptions<'doughnut'>,
    });
  }
}
