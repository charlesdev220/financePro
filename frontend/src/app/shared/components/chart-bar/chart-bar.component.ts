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
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartDataset,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

Chart.register(
  BarController,
  LineController,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

@Component({
  selector: 'app-chart-bar',
  standalone: true,
  imports: [],
  templateUrl: './chart-bar.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartBarComponent implements AfterViewInit, OnDestroy {
  datasets  = input<ChartDataset[]>([]);
  labels    = input<string[]>([]);
  type      = input<'bar' | 'line'>('bar');
  ariaLabel = input<string>('Gráfico');

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  private readonly initialized = signal(false);

  constructor() {
    effect(() => {
      const datasets = this.datasets();
      const labels   = this.labels();
      const type     = this.type();
      if (!this.initialized()) return;
      this.chart?.destroy();
      this.chart = null;
      if (datasets.length) {
        this.createChart(datasets, labels, type);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initialized.set(true);
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  private createChart(datasets: ChartDataset[], labels: string[], type: 'bar' | 'line'): void {
    this.chart = new Chart(this.canvasRef.nativeElement, {
      type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }
}
