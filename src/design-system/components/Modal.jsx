import { useEffect, useState } from 'react';

/**
 * Modal — centered overlay with backdrop blur + fade/scale in/out.
 *
 * Render unconditionally; visibility driven by `open`. Cleanup unmounts after
 * the exit transition so children can keep their state if needed elsewhere.
 *
 * @typedef {Object} ModalProps
 * @property {boolean} open
 * @property {()=>void} onClose
 * @property {import('react').ReactNode} children
 * @property {number} [maxWidth]
 * @property {string} [bgColor] — modal container background (theme-aware)
 */

/** @param {ModalProps} props */
export const Modal = ({ open, onClose, children, maxWidth = 440, bgColor = 'var(--modal-bg)' }) => {
  const [render, setRender] = useState(false);
  useEffect(() => {
    if (open) setRender(true);
    else if (render) {
      const t = setTimeout(() => setRender(false), 220);
      return () => clearTimeout(t);
    }
  }, [open, render]);

  if (!render) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 transition-opacity duration-200 ease-out"
      style={{
        backgroundColor: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        opacity: open ? 1 : 0,
      }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-[20px] p-8 relative transition-[opacity,transform] duration-200 ease-out"
        style={{
          maxWidth,
          backgroundColor: bgColor,
          color: 'var(--text-primary)',
          opacity: open ? 1 : 0,
          transform: open ? 'scale(1)' : 'scale(0.96)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};
