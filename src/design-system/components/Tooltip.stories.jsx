import { Tooltip } from './Tooltip';

export default {
  title: 'Components/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  argTypes: {
    side: { control: { type: 'inline-radio' }, options: ['right', 'left', 'top', 'bottom'] },
  },
};

export const Default = {
  args: { label: 'Hello world', side: 'right' },
  render: (args) => (
    <Tooltip {...args}>
      <button className="w-10 h-10 rounded-full bg-[var(--tab-inactive)] text-[var(--text-primary)]">i</button>
    </Tooltip>
  ),
};
