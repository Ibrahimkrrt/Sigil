import { Injectable, inject } from '@angular/core';
import { LooseRecord } from '@domain/models/loose-record';
import { asNumber } from '@domain/read/as-number';
import { asRecord } from '@domain/read/as-record';
import { asText } from '@domain/read/as-text';
import { Translator } from '../i18n/translator';
import { ChartLayout } from './chart-layout';

/** Lays out a chart block. Every chart carries a text summary for assistive technology. */
@Injectable({ providedIn: 'root' })
export class ChartLayoutBuilder {
  private readonly translator = inject(Translator);

  build(block: LooseRecord): ChartLayout | null {
    const data = (Array.isArray(block['data']) ? block['data'] : [])
      .map((item) => asRecord(item))
      .map((item) => ({ label: asText(item['label']), value: asNumber(item['value'], 0) ?? 0 }))
      .filter((item) => item.label);
    if (!data.length) return null;

    const kind = block['kind'] === 'line' ? 'line' : 'bar';
    const unit = asText(block['unit']);
    const title = asText(block['title']);
    const width = 640, height = 300, left = 44, right = 12, top = 28, bottom = 40;
    const max = this.niceMax(Math.max(...data.map((item) => item.value)));
    const innerWidth = width - left - right;
    const innerHeight = height - top - bottom;
    const y = (value: number): number => top + innerHeight - (value / max) * innerHeight;
    const points = data.map((item, i) => ({ ...item, x: left + (innerWidth / data.length) * (i + 0.5), y: y(item.value) }));
    const t = (source: string, vars?: Record<string, string | number>): string => this.translator.t(source, vars);
    const values = data.map((item) => `${item.label} ${item.value}${unit ? ` ${unit}` : ''}`).join(', ');
    return {
      kind, title, unit, width, height, left, right,
      xLabel: asText(block['xLabel']),
      base: top + innerHeight,
      barWidth: Math.min(64, (innerWidth / data.length) * 0.6),
      points,
      ticks: [0, 0.5, 1].map((fraction) => ({ y: y(max * fraction), label: String(+(max * fraction).toFixed(2)) })),
      line: points.map((point) => `${point.x},${point.y}`).join(' '),
      summary: `${title ? `${title}. ` : ''}${t('{kind} chart with {n} values: {values}.', { kind: t(kind === 'line' ? 'Line' : 'Bar'), n: data.length, values })}`,
    };
  }

  /** The next round number at or above a value: 1, 2, 5 or 10 times a power of ten. */
  private niceMax(value: number): number {
    if (value <= 0) return 1;
    const power = 10 ** Math.floor(Math.log10(value));
    const n = value / power;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * power;
  }
}
