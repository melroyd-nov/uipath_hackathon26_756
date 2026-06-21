export interface NavItem {
  label: string;
  path: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', path: '/' }],
  },
  {
    label: 'Calls',
    items: [
      { label: 'Call Log', path: '/calls' },
      { label: 'Agents', path: '/agents' },
      { label: 'Live Call', path: '/live' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'Sentiment', path: '/sentiment' },
      { label: 'Escalations', path: '/escalations' },
      { label: 'Compliance', path: '/compliance' },
      { label: 'Resolution', path: '/resolution' },
      { label: 'Intents', path: '/intents' },
      { label: 'Trigger Words', path: '/trigger-words' },
      { label: 'Friction', path: '/friction' },
      { label: 'Marketing', path: '/marketing' },
    ],
  },
  {
    label: 'Follow-ups',
    items: [
      { label: 'Follow-ups', path: '/followups' },
      { label: 'Follow-ups Overview', path: '/followups/overview' },
    ],
  },
  {
    label: 'Assistant',
    items: [{ label: 'AI Insights', path: '/ai-insights' }],
  },
];
