'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface BottomNavContextValue {
  isHidden: boolean;
  hide: () => void;
  show: () => void;
}

const BottomNavContext = createContext<BottomNavContextValue | null>(null);

export function BottomNavProvider({ children }: { children: ReactNode }) {
  const [isHidden, setIsHidden] = useState(false);

  const hide = useCallback(() => setIsHidden(true), []);
  const show = useCallback(() => setIsHidden(false), []);

  return (
    <BottomNavContext.Provider value={{ isHidden, hide, show }}>
      {children}
    </BottomNavContext.Provider>
  );
}

export function useBottomNav() {
  const context = useContext(BottomNavContext);
  if (!context) {
    // Return safe defaults when used outside provider
    return { isHidden: false, hide: () => {}, show: () => {} };
  }
  return context;
}
