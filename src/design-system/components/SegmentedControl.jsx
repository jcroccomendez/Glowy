/**
 * SegmentedControl — pill container with one active item.
 *
 * @typedef {Object} SegItem
 * @property {string} key
 * @property {string} [label]
 * @property {import('react').ReactNode} [icon]
 * @property {string} [aria]
 *
 * @typedef {Object} SegmentedControlProps
 * @property {SegItem[]} items
 * @property {string} value
 * @property {(key:string)=>void} onChange
 * @property {string} [ariaLabel]
 */

/** @param {SegmentedControlProps} props */
export const SegmentedControl = ({ items, value, onChange, ariaLabel }) => (
  <div
    role="tablist"
    aria-label={ariaLabel}
    className="flex items-center gap-1 p-1 rounded-full"
    style={{ backgroundColor: 'var(--tab-inactive)' }}
  >
    {items.map(({ key, label, icon, aria }) => {
      const active = value === key;
      return (
        <button
          key={key}
          role="tab"
          aria-selected={active}
          aria-label={aria || label}
          onClick={() => onChange(key)}
          className="flex items-center justify-center min-w-7 h-7 px-3 rounded-full transition-colors duration-200"
          style={{
            backgroundColor: active ? 'var(--tab-hover)' : 'transparent',
            color: active ? 'var(--tab-active-text)' : 'var(--text-subtle)',
          }}
          onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'var(--tab-hover)'; }}
          onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          {icon}
          {label && <span className="text-[12px] font-medium ml-1.5">{label}</span>}
        </button>
      );
    })}
  </div>
);
