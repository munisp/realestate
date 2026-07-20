import type { Meta, StoryObj } from '@storybook/react';
import ThemeEngine from '../components/innovations/ThemeEngine';

const meta: Meta<typeof ThemeEngine> = {
  title: 'Innovations/ThemeEngine',
  component: ThemeEngine,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: 'Adaptive dark/light/high-contrast theme engine with user preference sync.' } } },
};
export default meta;
type Story = StoryObj<typeof ThemeEngine>;

export const Default: Story = {};
export const DarkMode: Story = { parameters: { backgrounds: { default: 'dark' } } };
