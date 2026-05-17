/**
 * Tooltip — pill-shaped label revealed on group-hover.
 *
 * @typedef {Object} TooltipProps
 * @property {string} label
 * @property {'right'|'left'|'top'|'bottom'} [side]
 * @property {import('react').ReactNode} children
 */

const SIDE_CLASSES = {
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
  left: 'right-full top-1/2 mr-3 -translate-y-1/2',
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
};

/** @param {TooltipProps} props */
export const Tooltip = ({ label, side = 'right', children }) => (
  <div className="relative group">
    {children}
    <span
      role="tooltip"
      className={`pointer-events-none absolute ${SIDE_CLASSES[side]} h-[30px] px-4 inline-flex items-center text-[12px] font-regular rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-150 z-50`}
      style={{ backgroundColor: 'var(--tab-hover)', color: 'var(--text-primary)' }}
    >
      {label}
    </span>
  </div>
);
