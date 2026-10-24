import { describe, expect, it } from '@jest/globals';

import { formatScanDate } from '../format-date';

const labels = { today: 'Today, {time}', yesterday: 'Yesterday, {time}' };

describe('formatScanDate', () => {
  it('accepts the start of the current day as "now"', () => {
    const scannedAt = new Date(2026, 9, 24, 10, 32).getTime();
    expect(formatScanDate(scannedAt, 'en', labels, new Date(2026, 9, 24).getTime())).toMatch(/^Today, /);
    expect(formatScanDate(scannedAt, 'en', labels, new Date(2026, 9, 25).getTime())).toMatch(/^Yesterday, /);
    expect(formatScanDate(scannedAt, 'en', labels, new Date(2026, 9, 26).getTime())).not.toMatch(/Today|Yesterday/);
  });
});
