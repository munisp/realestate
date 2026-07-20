import type { Meta, StoryObj } from '@storybook/react';
import SmartMortgageCalculator from '../components/innovations/SmartMortgageCalculator';

const meta: Meta<typeof SmartMortgageCalculator> = {
  title: 'Innovations/SmartMortgageCalculator',
  component: SmartMortgageCalculator,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Real-time CBN rate mortgage calculator with bank comparison and amortisation schedule.' } } },
};
export default meta;
type Story = StoryObj<typeof SmartMortgageCalculator>;

export const Default: Story = {};
export const WithHighValueProperty: Story = { args: { initialPrice: 500000000 } };
export const WithLowDeposit: Story = { args: { initialPrice: 50000000, initialDeposit: 10 } };
