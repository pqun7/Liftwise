import { NavigationIcon } from '../components/NavigationIcon';

export const navigationItems = [
  {
    label: 'Home',
    to: '/',
    icon: (
      <NavigationIcon>
        <path d="m3 11 9-8 9 8v10h-6v-6H9v6H3V11Z" />
      </NavigationIcon>
    ),
  },
  {
    label: 'Plan',
    to: '/plan',
    icon: (
      <NavigationIcon>
        <path d="M6 3v3M18 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1ZM8 12h3M8 16h6" />
      </NavigationIcon>
    ),
  },
  {
    label: 'Workout',
    to: '/workout',
    icon: (
      <NavigationIcon>
        <path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" />
      </NavigationIcon>
    ),
  },
  {
    label: 'Progress',
    to: '/progress',
    icon: (
      <NavigationIcon>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </NavigationIcon>
    ),
  },
  {
    label: 'Settings',
    to: '/settings',
    icon: (
      <NavigationIcon>
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19 13.5v-3l-2-.7a7 7 0 0 0-.7-1.7l.9-1.9-2.1-2.1-1.9.9a7 7 0 0 0-1.7-.7L10.8 2h-3l-.7 2.3a7 7 0 0 0-1.7.7l-1.9-.9-2.1 2.1.9 1.9a7 7 0 0 0-.7 1.7l-2 .7v3l2 .7a7 7 0 0 0 .7 1.7l-.9 1.9 2.1 2.1 1.9-.9a7 7 0 0 0 1.7.7l.7 2.3h3l.7-2.3a7 7 0 0 0 1.7-.7l1.9.9 2.1-2.1-.9-1.9a7 7 0 0 0 .7-1.7l2-.7Z"
          transform="translate(1.3) scale(.9)"
        />
      </NavigationIcon>
    ),
  },
] as const;
