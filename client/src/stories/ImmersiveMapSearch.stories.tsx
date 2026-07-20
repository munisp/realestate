import type { Meta, StoryObj } from '@storybook/react';
import ImmersiveMapSearch from '../components/innovations/ImmersiveMapSearch';

const meta: Meta<typeof ImmersiveMapSearch> = {
  title: 'Innovations/ImmersiveMapSearch',
  component: ImmersiveMapSearch,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Immersive map search with Tinder-style swipe cards and Framer Motion physics.' } } },
};
export default meta;
type Story = StoryObj<typeof ImmersiveMapSearch>;

export const Default: Story = {};
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile' } } };
