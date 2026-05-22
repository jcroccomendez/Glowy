/**
 * Button — pill action button with two variants.
 *
 * @typedef {Object} ButtonProps
 * @property {'primary'|'secondary'} [variant]
 * @property {boolean} [disabled]
 * @property {()=>void} [onClick]
 * @property {import('react').ReactNode} children
 * @property {'light'|'dark'} [theme] — needed when variant='primary' to flip bg/text
 */

const baseClass =
  'flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 font-medium text-[12px] disabled:cursor-not-allowed disabled:opacity-50';

/** @param {ButtonProps & Record<string, any>} props */
export const Button = ({
  variant = 'secondary',
  disabled = false,
  onClick,
  children,
  theme = 'dark',
  className = '',
  ...rest
}) => {
  if (variant === 'primary') {
    const isLight = theme === 'light';
    return (
      <button
        disabled={disabled}
        onClick={onClick}
        className={`${baseClass} ${isLight ? 'bg-[#161616] hover:bg-[#161616]/90' : 'bg-white hover:bg-white/90'} ${className}`}
        style={{ color: isLight ? '#FFFFFF' : '#000000' }}
        {...rest}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`${baseClass} ${className}`}
      style={{ backgroundColor: 'var(--tab-inactive)', color: 'var(--text-muted)' }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--tab-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--tab-inactive)'; }}
      {...rest}
    >
      {children}
    </button>
  );
};
