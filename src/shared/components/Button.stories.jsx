// ============================================================================
// Button Stories — PulseOps V2 Design System
//
// PURPOSE: Visual test stories for the shared Button component. Used in
// Storybook for design review and interactive testing.
// ============================================================================
import Button from './Button';
import { Save, Trash2, Plus } from 'lucide-react';

export default {
  title: 'Design System/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export const Primary = {
  args: { children: 'Primary Button', variant: 'primary' },
};

export const Secondary = {
  args: { children: 'Secondary Button', variant: 'secondary' },
};

export const Danger = {
  args: { children: 'Delete Item', variant: 'danger', icon: Trash2 },
};

export const Ghost = {
  args: { children: 'Cancel', variant: 'ghost' },
};

export const Small = {
  args: { children: 'Small', size: 'sm' },
};

export const Large = {
  args: { children: 'Large Action', size: 'lg', icon: Plus },
};

export const Loading = {
  args: { children: 'Saving...', loading: true },
};

export const WithIcon = {
  args: { children: 'Save Changes', icon: Save },
};

export const Disabled = {
  args: { children: 'Disabled', disabled: true },
};
