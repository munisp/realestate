import type { Meta, StoryObj } from '@storybook/react';
import CollaborativeWishlist from '../components/innovations/CollaborativeWishlist';

const meta: Meta<typeof CollaborativeWishlist> = {
  title: 'Innovations/CollaborativeWishlist',
  component: CollaborativeWishlist,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Real-time collaborative property wishlist with co-browsing and voting.' } } },
};
export default meta;
type Story = StoryObj<typeof CollaborativeWishlist>;

export const Default: Story = { args: { boardId: 'demo-board-123' } };
export const SharedBoard: Story = { args: { boardId: 'shared-board-456', readOnly: false } };
