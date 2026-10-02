import { CalendarDays, ChartNoAxesColumnIncreasing, Dumbbell, Ellipsis, House } from 'lucide-react';

export const navigationItems = [
  {
    label: 'Home',
    to: '/',
    icon: <House className="nav-icon" aria-hidden="true" />,
  },
  {
    label: 'Plan',
    to: '/plan',
    icon: <CalendarDays className="nav-icon" aria-hidden="true" />,
  },
  {
    label: 'Workout',
    to: '/workout',
    icon: <Dumbbell className="nav-icon" aria-hidden="true" />,
  },
  {
    label: 'Progress',
    to: '/progress',
    icon: <ChartNoAxesColumnIncreasing className="nav-icon" aria-hidden="true" />,
  },
  {
    label: 'More',
    to: '/settings',
    icon: <Ellipsis className="nav-icon" aria-hidden="true" />,
  },
] as const;
