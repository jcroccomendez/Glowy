import { palettes, radius, spacing, motion, typography } from './tokens';

export default {
  title: 'Foundations/Tokens',
  tags: ['autodocs'],
};

const Swatch = ({ name, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <div style={{ width: 36, height: 36, borderRadius: 8, background: color, border: '1px solid rgba(127,127,127,0.2)' }} />
    <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary, currentColor)' }}>
      <div>{name}</div>
      <div style={{ opacity: 0.6 }}>{color}</div>
    </div>
  </div>
);

export const Colors = {
  render: (_args, { globals }) => {
    const theme = globals.theme || 'dark';
    const p = palettes[theme];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
        {Object.entries(p).map(([name, color]) => <Swatch key={name} name={name} color={color} />)}
      </div>
    );
  },
};

export const Radius = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {Object.entries(radius).map(([k, v]) => (
        <div key={k} style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 12, color: 'currentColor' }}>
          <div style={{ width: 72, height: 72, background: 'var(--tab-inactive, #2a2a2a)', borderRadius: v }} />
          <div style={{ marginTop: 6 }}>{k}</div>
          <div style={{ opacity: 0.6 }}>{v}{typeof v === 'number' ? 'px' : ''}</div>
        </div>
      ))}
    </div>
  ),
};

export const Spacing = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
      {Object.entries(spacing).map(([k, v]) => (
        <div key={k} style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 12, color: 'currentColor' }}>
          <div style={{ width: 16, height: v * 2, background: 'var(--accent, #fff)' }} />
          <div style={{ marginTop: 6 }}>{k}</div>
          <div style={{ opacity: 0.6 }}>{v}px</div>
        </div>
      ))}
    </div>
  ),
};

export const Motion = {
  render: () => (
    <pre style={{ fontFamily: 'monospace', fontSize: 12, color: 'currentColor' }}>
{JSON.stringify(motion, null, 2)}
    </pre>
  ),
};

export const Typography = {
  render: () => (
    <div style={{ color: 'currentColor', fontFamily: typography.family }}>
      {Object.entries(typography.size).map(([k, v]) => (
        <div key={k} style={{ fontSize: v, marginBottom: 8 }}>
          {k} — {v}px — The quick brown fox
        </div>
      ))}
    </div>
  ),
};
