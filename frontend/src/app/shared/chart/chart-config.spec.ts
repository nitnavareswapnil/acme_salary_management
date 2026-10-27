import { ChartConfiguration } from 'chart.js';
import { BAR_COLOR, barConfig, CHART_INK, COUNTRY_COLORS, donutConfig } from './chart-config';

describe('donutConfig', () => {
  const slices = [
    { label: 'India', value: 3309, color: COUNTRY_COLORS.INDIA },
    { label: 'United Kingdom', value: 3377, color: COUNTRY_COLORS.UK },
  ];

  it('plots the slice values under their labels, one fixed colour each', () => {
    const config = donutConfig(slices);

    expect(config.type).toBe('doughnut');
    expect(config.data.labels).toEqual(['India', 'United Kingdom']);
    expect(config.data.datasets[0].data).toEqual([3309, 3377]);
    expect(config.data.datasets[0].backgroundColor).toEqual([COUNTRY_COLORS.INDIA, COUNTRY_COLORS.UK]);
  });

  it('separates slices with a 2px gap in the surface colour instead of an outline', () => {
    const dataset = donutConfig(slices).data.datasets[0];

    expect(dataset.borderWidth).toBe(2);
    expect(dataset.borderColor).toBe(CHART_INK.surface);
  });

  it('leaves the legend to the page, which can show counts and shares', () => {
    expect(donutConfig(slices).options?.plugins?.legend?.display).toBe(false);
  });

  it('gives each country the same colour whatever its rank', () => {
    expect(COUNTRY_COLORS).toEqual({ US: '#2a78d6', INDIA: '#eb6834', UK: '#1baf7a' });
  });
});

describe('barConfig', () => {
  const bars = [
    { label: 'Engineering Manager', value: 2100000.5 },
    { label: 'Support Agent', value: 700000 },
  ];
  const format = (value: number) => `${Math.round(value / 1000)}K`;

  it('draws horizontal bars with the labels and values in the given order', () => {
    const config = barConfig(bars, format);

    expect(config.type).toBe('bar');
    expect(config.options?.indexAxis).toBe('y');
    expect(config.data.labels).toEqual(['Engineering Manager', 'Support Agent']);
    expect(config.data.datasets[0].data).toEqual([2100000.5, 700000]);
    expect(config.data.datasets[0].backgroundColor).toBe(BAR_COLOR);
  });

  it('keeps bars thin with a rounded tip and a square base', () => {
    const dataset = barConfig(bars, format).data.datasets[0] as { barThickness: number; borderRadius: unknown };

    expect(dataset.barThickness).toBeLessThanOrEqual(24);
    expect(dataset.borderRadius).toEqual({ topLeft: 0, bottomLeft: 0, topRight: 4, bottomRight: 4 });
  });

  it('hides the value axis and gridlines because every bar is labelled', () => {
    const scales = barConfig(bars, format).options?.scales as Record<string, { display?: boolean; grid?: { display?: boolean } }>;

    expect(scales['x'].display).toBe(false);
    expect(scales['y'].grid?.display).toBe(false);
  });

  it('reserves a fixed margin on the right so the longest bar keeps its whole value label', () => {
    // A percentage of the scale is not enough: it shrinks with the plot when role names are long.
    const padding = barConfig(bars, format).options?.layout?.padding as { right: number };

    expect(padding.right).toBeGreaterThanOrEqual(72);
  });

  it('formats tooltip values with the given formatter', () => {
    const tooltip = barConfig(bars, format).options?.plugins?.tooltip as {
      callbacks: { label: (item: { parsed: { x: number } }) => string };
    };

    expect(tooltip.callbacks.label({ parsed: { x: 700000 } })).toBe('700K');
  });

  it('writes each value just past the tip of its bar', () => {
    const plugin = barConfig(bars, format).plugins?.[0] as NonNullable<ChartConfiguration['plugins']>[number];
    const ctx = { save: vi.fn(), restore: vi.fn(), fillText: vi.fn(), font: '', fillStyle: '', textBaseline: '' };
    const chart = {
      ctx,
      data: { datasets: [{ data: [2100000.5, 700000] }] },
      getDatasetMeta: () => ({ data: [{ x: 300, y: 20 }, { x: 120, y: 60 }] }),
    };

    // Chart.js types the hook with extra parameters this plugin does not use.
    (plugin.afterDatasetsDraw as unknown as (chart: unknown) => void)(chart);

    expect(ctx.fillText).toHaveBeenCalledWith('2100K', 308, 20);
    expect(ctx.fillText).toHaveBeenCalledWith('700K', 128, 60);
    expect(ctx.fillStyle).toBe(CHART_INK.text);
  });
});
