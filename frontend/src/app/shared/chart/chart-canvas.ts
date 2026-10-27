import { Component, effect, ElementRef, inject, InjectionToken, input, viewChild } from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  DoughnutController,
  LinearScale,
  Tooltip,
} from 'chart.js';

export interface ChartHandle {
  destroy(): void;
}

export type ChartFactory = (canvas: HTMLCanvasElement, config: ChartConfiguration) => ChartHandle;

// Only the pieces the two chart types need are registered, so the rest of Chart.js is left out of the bundle.
Chart.register(ArcElement, BarController, BarElement, CategoryScale, DoughnutController, LinearScale, Tooltip);

// Behind a token so tests can swap in a fake: jsdom has no canvas to draw on.
export const CHART_FACTORY = new InjectionToken<ChartFactory>('CHART_FACTORY', {
  providedIn: 'root',
  factory: () => (canvas, config) => new Chart(canvas, config),
});

// Draws one Chart.js configuration. The canvas is an image to assistive technology, so every use must give a
// label that points to the data table which carries the same figures.
@Component({
  selector: 'app-chart-canvas',
  template: `
    <div class="chart-box" [style.height.px]="height()">
      <canvas #canvas role="img" [attr.aria-label]="label()"></canvas>
    </div>
  `,
  styles: `
    .chart-box {
      position: relative;
      width: 100%;
    }
  `,
})
export class ChartCanvas {
  readonly config = input.required<ChartConfiguration>();
  readonly label = input.required<string>();
  readonly height = input(240);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly factory = inject(CHART_FACTORY);

  constructor() {
    // A new configuration builds a fresh chart; the cleanup releases the old one (and on destroy).
    effect((onCleanup) => {
      const chart = this.factory(this.canvas().nativeElement, this.config());
      onCleanup(() => chart.destroy());
    });
  }
}
