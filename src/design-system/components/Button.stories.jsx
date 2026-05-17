import { Button } from './Button';

export default {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: { type: 'inline-radio' }, options: ['secondary', 'primary'] },
    theme: { control: { type: 'inline-radio' }, options: ['dark', 'light'] },
    disabled: { control: 'boolean' },
  },
};

export const Secondary = {
  args: { variant: 'secondary', children: 'Download SVG' },
};

export const PrimaryDark = {
  args: { variant: 'primary', theme: 'dark', children: 'Download Video' },
};

export const PrimaryLight = {
  args: { variant: 'primary', theme: 'light', children: 'Download Video' },
};
