import { useState, type ReactNode } from 'react';
import { ScreenStateContext, ScreenStateStore } from './useScreenState';

export function ScreenStateProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new ScreenStateStore());
  return <ScreenStateContext.Provider value={store}>{children}</ScreenStateContext.Provider>;
}
