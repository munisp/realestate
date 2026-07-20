import type { Meta, StoryObj } from '@storybook/react';
import VoiceSearch from '../components/innovations/VoiceSearch';

const meta: Meta<typeof VoiceSearch> = {
  title: 'Innovations/VoiceSearch',
  component: VoiceSearch,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: 'Voice-first property search using Web Speech API with Nigerian location NLP parsing.' } } },
};
export default meta;
type Story = StoryObj<typeof VoiceSearch>;

export const Default: Story = { args: { onSearch: (filters: any) => console.log('Filters:', filters) } };
export const WithCallback: Story = { args: { onSearch: (filters: any) => alert(JSON.stringify(filters, null, 2)) } };
