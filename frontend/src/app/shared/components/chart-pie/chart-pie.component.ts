import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  ArcElement,
  Chart,
  ChartData,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartPieComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() data: ChartData<'doughnut'> | null = null;

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  private initialized = false;

  ngAfterViewInit(): void {
    this.initialized = true;
    if (this.data) {
      this.createChart();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.initialized) {
      this.chart?.destroy();
      this.chart = null;
      if (this.data) {
        this.createChart();
      }
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  private createChart(): void {
    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'doughnut',
      data: this.data!,
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });
  }
}
