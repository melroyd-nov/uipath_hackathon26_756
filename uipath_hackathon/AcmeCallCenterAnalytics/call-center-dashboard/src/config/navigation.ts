import {
  LayoutDashboard,
  TrendingUp,
  Target,
  AlertTriangle,
  ShieldCheck,
  CheckCircle,
  Zap,
  Flame,
  BarChart3,
  Users,
  PhoneCall,
  ListChecks,
  Brain,
  Gauge,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

// Exact order/labels/icons/routes per UI_Reference.md §2 (NAV_ITEMS) — literal render order.
export const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: TrendingUp, label: 'Sentiment', path: '/sentiment' },
  { icon: Target, label: 'Intents', path: '/intents' },
  { icon: AlertTriangle, label: 'Escalations', path: '/escalations' },
  { icon: ShieldCheck, label: 'Compliance', path: '/compliance' },
  { icon: CheckCircle, label: 'Resolution', path: '/resolution' },
  { icon: Zap, label: 'Trigger Words', path: '/triggers' },
  { icon: Flame, label: 'Friction Points', path: '/friction' },
  { icon: BarChart3, label: 'Marketing', path: '/marketing' },
  { icon: Users, label: 'Agents', path: '/agents' },
  { icon: PhoneCall, label: 'Call Log', path: '/calls' },
  { icon: ListChecks, label: 'Follow-ups', path: '/followups' },
  { icon: Brain, label: 'AI Insights', path: '/ai' },
  { icon: Gauge, label: 'AI Usage', path: '/ai-usage' },
];
