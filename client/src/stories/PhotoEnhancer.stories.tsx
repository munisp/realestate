import type { Meta, StoryObj } from '@storybook/react';
import PhotoEnhancer from '../components/innovations/PhotoEnhancer';

const meta: Meta<typeof PhotoEnhancer> = {
  title: 'Innovations/PhotoEnhancer',
  component: PhotoEnhancer,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: 'AI-powered property photo enhancer using Canvas API and CSS filters.' } } },
};
export default meta;
type Story = StoryObj<typeof PhotoEnhancer>;

export const Default: Story = { args: { imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800' } };
export const ApartmentPhoto: Story = { args: { imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800' } };
