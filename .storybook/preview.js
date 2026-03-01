// ============================================================================
// Storybook Preview — PulseOps V2
//
// PURPOSE: Imports global CSS (Tailwind design tokens) so all stories
// render with the same enterprise styling as the production app.
// ============================================================================
import '../src/index.css';

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
