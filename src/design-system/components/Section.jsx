/**
 * Section — `sec-bg` rounded panel with token border. Wrap controls inside.
 *
 * @typedef {Object} SectionProps
 * @property {import('react').ReactNode} children
 * @property {string} [className]
 */

/** @param {SectionProps} props */
export const Section = ({ children, className = '' }) => (
  <div className={`bg-[var(--sec-bg)] rounded-[16px] p-3 border border-[var(--border)] ${className}`}>
    {children}
  </div>
);
