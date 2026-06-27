import type { Theme } from '../hooks/useTheme';

const THEME_ICON: Record<Theme, string> = {
  dark: '🌙',
  light: '☀️',
  neon: '✨',
};

const THEME_LABEL: Record<Theme, string> = {
  dark: '다크',
  light: '라이트',
  neon: '네온',
};

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={`현재: ${THEME_LABEL[theme]}. 클릭하여 변경`}
      title={`테마: ${THEME_LABEL[theme]}`}
    >
      {THEME_ICON[theme]}
    </button>
  );
}
