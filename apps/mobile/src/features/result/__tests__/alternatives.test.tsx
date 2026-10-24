import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import type { Alternative } from '@/shared/api-schema';

import { Alternatives } from '../alternatives';

jest.mock('@/state/settings', () => ({
  useSettings: () => ({ theme: 'light', lang: 'en' }),
}));
jest.mock('@/lib/open-link', () => ({ openStoreLink: jest.fn() }));

function alternative(estimatedScore: number): Alternative {
  return { brand: 'Brand', productName: `Product ${estimatedScore}`, estimatedScore, whyBetter: '', purchaseUrl: null };
}

describe('Alternatives score gain', () => {
  it('uses the singular for a 1-point gain', async () => {
    await render(<Alternatives items={[alternative(71)]} verdict="AVOID" score={70} marketName="India" />);
    expect(screen.getByText('+1 point')).toBeTruthy();
    expect(screen.getByLabelText('1 point higher than this product')).toBeTruthy();
  });

  it('uses the plural for larger gains', async () => {
    await render(<Alternatives items={[alternative(82)]} verdict="AVOID" score={70} marketName="India" />);
    expect(screen.getByText('+12 points')).toBeTruthy();
    expect(screen.getByLabelText('12 points higher than this product')).toBeTruthy();
  });
});
