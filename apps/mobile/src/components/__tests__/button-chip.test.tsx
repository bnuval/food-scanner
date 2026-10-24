import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import { Button } from '../button';
import { Chip } from '../surfaces';

jest.mock('@/state/settings', () => ({
  useSettings: () => ({ theme: 'light', lang: 'en' }),
}));

const noop = () => {};

describe('Button label', () => {
  it('wraps by default so long labels are never cut off', async () => {
    await render(<Button label="Choose from gallery" variant="outlined" onPress={noop} />);
    const label = screen.getByText('Choose from gallery');
    expect(label.props.numberOfLines).toBeUndefined();
    expect(label.props.maxFontSizeMultiplier).toBeUndefined();
  });

  it('wraps text buttons too', async () => {
    await render(<Button label="Report a problem with this result" variant="text" onPress={noop} />);
    expect(screen.getByText('Report a problem with this result').props.numberOfLines).toBeUndefined();
  });

  it('stays on one line, with capped font scaling, when singleLine is set', async () => {
    await render(<Button label="Analyze (3)" singleLine onPress={noop} />);
    const label = screen.getByText('Analyze (3)');
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.maxFontSizeMultiplier).toBe(1.5);
  });

  it('keeps the 48dp minimum height', async () => {
    await render(<Button label="Try again" onPress={noop} />);
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveStyle({ minHeight: 48 });
  });
});

describe('Chip', () => {
  it('wraps a non-pressable chip label so long highlights are fully readable', async () => {
    const highlight = 'Good source of dietary fibre from whole grain oats and millets';
    await render(<Chip label={highlight} icon="check" />);
    expect(screen.getByText(highlight).props.numberOfLines).toBeUndefined();
  });

  it('keeps an interactive chip on one line', async () => {
    await render(<Chip label="Cosmetics" onPress={noop} />);
    expect(screen.getByText('Cosmetics').props.numberOfLines).toBe(1);
  });

  it('lets callers opt in or out of wrapping', async () => {
    await render(
      <>
        <Chip label="Pressable wraps" onPress={noop} wrap />
        <Chip label="Static single line" wrap={false} />
      </>,
    );
    expect(screen.getByText('Pressable wraps').props.numberOfLines).toBeUndefined();
    expect(screen.getByText('Static single line').props.numberOfLines).toBe(1);
  });

  it('is at least 48dp wide even with a short label and no icon', async () => {
    await render(<Chip label="All" accessibilityRole="radio" onPress={noop} />);
    expect(screen.getByText('All').parent).toHaveStyle({ minWidth: 48 });
  });
});
