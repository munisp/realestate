import type { Meta, StoryObj } from '@storybook/react';
import NeighbourhoodLivability from '../components/innovations/NeighbourhoodLivability';

const meta: Meta<typeof NeighbourhoodLivability> = {
  title: 'Innovations/NeighbourhoodLivability',
  component: NeighbourhoodLivability,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Multi-source neighbourhood livability score aggregator with 8 dimensions.' } } },
};
export default meta;
type Story = StoryObj<typeof NeighbourhoodLivability>;

export const Lekki: Story = { args: { lat: 6.4698, lng: 3.5852, neighbourhood: 'Lekki Phase 1' } };
export const VictoriaIsland: Story = { args: { lat: 6.4281, lng: 3.4219, neighbourhood: 'Victoria Island' } };
export const Abuja: Story = { args: { lat: 9.0765, lng: 7.3986, neighbourhood: 'Maitama' } };
