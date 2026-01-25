import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SettingsSection } from './SettingsSection';
import { useTheme } from 'next-themes';

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: vi.fn(),
}));

describe('SettingsSection', () => {
  it('renders Laptop icon when theme is system', () => {
    (useTheme as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      theme: 'system',
      resolvedTheme: 'dark', // resolvedTheme defaults to dark in system usually if system is dark
      setTheme: vi.fn(),
    });

    render(<SettingsSection />);

    expect(screen.getByTestId('theme-icon-laptop')).toBeInTheDocument();
  });

  it('renders Moon icon when resolvedTheme is dark (and theme is not system)', () => {
    (useTheme as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      theme: 'dark',
      resolvedTheme: 'dark',
      setTheme: vi.fn(),
    });

    render(<SettingsSection />);

    expect(screen.getByTestId('theme-icon-moon')).toBeInTheDocument();
  });

  it('renders Sun icon when resolvedTheme is light (and theme is not system)', () => {
    (useTheme as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: vi.fn(),
    });

    render(<SettingsSection />);

    expect(screen.getByTestId('theme-icon-sun')).toBeInTheDocument();
  });
});
