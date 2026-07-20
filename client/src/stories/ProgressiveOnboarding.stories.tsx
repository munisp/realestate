import type { Meta, StoryObj } from '@storybook/react';
import ProgressiveOnboarding from '../components/innovations/ProgressiveOnboarding';

const meta: Meta<typeof ProgressiveOnboarding> = {
  title: 'Innovations/ProgressiveOnboarding',
  component: ProgressiveOnboarding,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Gamified onboarding with XP, badges, and completion meter.' } } },
};
export default meta;
type Story = StoryObj<typeof ProgressiveOnboarding>;

export const NewUser: Story = { args: { userId: 'new-user', completedSteps: [] } };
export const PartiallyComplete: Story = { args: { userId: 'partial-user', completedSteps: ['profile', 'search', 'kyc'] } };
export const FullyComplete: Story = { args: { userId: 'complete-user', completedSteps: ['profile', 'search', 'kyc', 'booking', 'payment', 'referral'] } };
