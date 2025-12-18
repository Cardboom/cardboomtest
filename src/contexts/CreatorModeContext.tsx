import { createContext, useContext, useState, ReactNode } from 'react';

interface CreatorModeContextType {
  creatorMode: boolean;
  setCreatorMode: (enabled: boolean) => void;
  toggleCreatorMode: () => void;
}

const CreatorModeContext = createContext<CreatorModeContextType | undefined>(undefined);

export const CreatorModeProvider = ({ children }: { children: ReactNode }) => {
  const [creatorMode, setCreatorMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('creatorMode') === 'true';
    }
    return false;
  });

  const toggleCreatorMode = () => {
    const newValue = !creatorMode;
    setCreatorMode(newValue);
    localStorage.setItem('creatorMode', String(newValue));
  };

  return (
    <CreatorModeContext.Provider value={{ creatorMode, setCreatorMode, toggleCreatorMode }}>
      {children}
    </CreatorModeContext.Provider>
  );
};

export const useCreatorMode = () => {
  const context = useContext(CreatorModeContext);
  if (!context) {
    throw new Error('useCreatorMode must be used within CreatorModeProvider');
  }
  return context;
};
