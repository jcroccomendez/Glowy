import { Section } from './Section';

export default {
  title: 'Components/Section',
  component: Section,
  tags: ['autodocs'],
};

export const Default = {
  render: () => (
    <div style={{ width: 280 }}>
      <Section>
        <label className="text-[11px] font-normal" style={{ color: 'var(--text-primary)' }}>Presets</label>
        <div className="mt-2 text-[12px]" style={{ color: 'var(--text-subtle)' }}>Content sits inside a sec-bg block with token border.</div>
      </Section>
    </div>
  ),
};
