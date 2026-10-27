import { ChartConfiguration, Plugin } from 'chart.js';
import { Country } from '../../core/models';

// Chart.js paints on a canvas and cannot read the theme's CSS variables, so these hex values mirror the
// Material tokens for the card surface and text (the app is light-only).
export const CHART_INK = { surface: '#fcf8fd', text: '#1b1b1f', muted: '#46464f' };

// Colour belongs to the country, never to its rank, so a country keeps its colour whatever the data does.
// Three slots of the validated categorical palette: they separate clearly even under colour-blindness.
export const COUNTRY_COLORS: Record<Country, string> = { US: '#2a78d6', INDIA: '#eb6834', UK: '#1baf7a' };

// One series means one hue; the bars differ by length, not by colour.
export const BAR_COLOR = '#2a78d6';

const FONT = 'Inter, Roboto, system-ui, sans-serif';
const MAX_BAR_THICKNESS = 24;
// Wide enough for the longest label the app shows (e.g. 2,484,000) plus the gap after the bar.
const LABEL_ROOM = 72;

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export interface BarItem {
  label: string;
  value: number;
}

export function donutConfig(slices: DonutSlice[]): ChartConfiguration<'doughnut'> {
  return {
    type: 'doughnut',
    data: {
      labels: slices.map((slice) => slice.label),
      datasets: [
        {
          data: slices.map((slice) => slice.value),
          backgroundColor: slices.map((slice) => slice.color),
          // A surface-coloured gap separates slices; an outline would add ink that is not data.
          borderColor: CHART_INK.surface,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      animation: animation(),
      // The page draws its own legend so it can show counts and shares next to the names.
      plugins: { legend: { display: false } },
    },
  };
}

export function barConfig(bars: BarItem[], format: (value: number) => string): ChartConfiguration<'bar'> {
  // Every bar carries its value at the tip, which replaces the value axis and gridlines.
  const tipLabels: Plugin<'bar'> = {
    id: 'tipLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const values = chart.data.datasets[0].data as number[];
      ctx.save();
      ctx.font = `500 12px ${FONT}`;
      ctx.fillStyle = CHART_INK.text;
      ctx.textBaseline = 'middle';
      chart.getDatasetMeta(0).data.forEach((bar, index) => ctx.fillText(format(values[index]), bar.x + 8, bar.y));
      ctx.restore();
    },
  };

  return {
    type: 'bar',
    data: {
      labels: bars.map((bar) => bar.label),
      datasets: [
        {
          data: bars.map((bar) => bar.value),
          backgroundColor: BAR_COLOR,
          barThickness: MAX_BAR_THICKNESS - 4,
          // Rounded at the tip, square where the bar meets the baseline.
          borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 4, bottomRight: 4 },
          borderSkipped: false,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: animation(),
      // The value label is drawn past the bar tip, outside the plot, so it needs margin of its own.
      layout: { padding: { right: LABEL_ROOM } },
      scales: {
        x: { display: false, beginAtZero: true },
        y: { grid: { display: false }, border: { display: false }, ticks: { color: CHART_INK.muted, font: { family: FONT } } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (item) => format(item.parsed.x as number) } },
      },
    },
    plugins: [tipLabels],
  };
}

// Motion is decoration; people who ask their system for less of it get none.
function animation(): false | { duration: number } {
  const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reduced ? false : { duration: 400 };
}
