import '../src/design-system/tokens.css';
import '../src/index.css';

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    backgrounds: { disable: true },
    controls: { expanded: true, matchers: { color: /(background|color)$/i } },
  },
  globalTypes: {
    theme: {
      description: 'Glowy theme',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, { globals }) => {
      const theme = globals.theme || 'dark';
      const bg = theme === 'light' ? '#fbfbfb' : '#141414';
      return (
        <div data-theme={theme} style={{ padding: 24, minHeight: '100vh', background: bg, fontFamily: "'Geist', sans-serif" }}>
          <Story />
        </div>
      );
    },
  ],
};
export default preview;
