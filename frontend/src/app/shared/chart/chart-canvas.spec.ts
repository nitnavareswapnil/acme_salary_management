import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChartConfiguration } from 'chart.js';
import { vi } from 'vitest';
import { ChartCanvas, CHART_FACTORY } from './chart-canvas';

@Component({
  imports: [ChartCanvas],
  template: `<app-chart-canvas [config]="config()" label="Headcount by country" [height]="200" />`,
})
class Host {
  readonly config = signal<ChartConfiguration>({ type: 'bar', data: { labels: ['a'], datasets: [{ data: [1] }] } });
}

describe('ChartCanvas', () => {
  let fixture: ComponentFixture<Host>;
  const destroyed = vi.fn();
  const factory = vi.fn((_canvas: HTMLCanvasElement, _config: ChartConfiguration) => ({ destroy: destroyed }));

  beforeEach(async () => {
    factory.mockClear();
    destroyed.mockClear();
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [{ provide: CHART_FACTORY, useValue: factory }],
    }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('exposes the chart to assistive technology as a labelled image', () => {
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;

    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBe('Headcount by country');
  });

  it('draws the given configuration on its canvas', () => {
    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory.mock.calls[0][0]).toBe(fixture.nativeElement.querySelector('canvas'));
    expect(factory.mock.calls[0][1]).toBe(fixture.componentInstance.config());
  });

  it('gives the chart box the requested height', () => {
    const box = fixture.nativeElement.querySelector('.chart-box') as HTMLElement;

    expect(box.style.height).toBe('200px');
  });

  it('replaces the chart when the configuration changes', () => {
    const next: ChartConfiguration = { type: 'bar', data: { labels: ['b'], datasets: [{ data: [2] }] } };

    fixture.componentInstance.config.set(next);
    fixture.detectChanges();

    expect(destroyed).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(factory.mock.calls[1][1]).toBe(next);
  });

  it('releases the chart when it is removed', () => {
    fixture.destroy();

    expect(destroyed).toHaveBeenCalledTimes(1);
  });
});
