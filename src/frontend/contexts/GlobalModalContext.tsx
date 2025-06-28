import React, { createContext, useContext, useState } from 'react';
import { ChallengeResultsModal } from '../components/ChallengeResultsModal';

interface ChallengeResult {
  won: boolean;
  opponentName: string;
  focusScore: number;
  opponentScore: number;
}

interface GlobalModalContextType {
  showChallengeResults: (result: ChallengeResult, onClose?: () => void) => void;
}

const GlobalModalContext = createContext<GlobalModalContextType | undefined>(undefined);

export const useGlobalModal = () => {
  const context = useContext(GlobalModalContext);
  if (!context) {
    throw new Error('useGlobalModal must be used within a GlobalModalProvider');
  }
  return context;
};

export const GlobalModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [challengeResult, setChallengeResult] = useState<ChallengeResult | null>(null);
  const [onCloseCallback, setOnCloseCallback] = useState<(() => void) | null>(null);

  const showChallengeResults = (result: ChallengeResult, onClose?: () => void) => {
    setChallengeResult(result);
    setOnCloseCallback(onClose ? () => onClose : null);
  };

  const handleClose = () => {
    setChallengeResult(null);
    // Call the callback if it exists
    if (onCloseCallback) {
      onCloseCallback();
      setOnCloseCallback(null);
    }
  };

  return (
    <GlobalModalContext.Provider value={{ showChallengeResults }}>
      {children}
      {challengeResult && (
        <ChallengeResultsModal
          visible={true}
          onClose={handleClose}
          result={challengeResult}
        />
      )}
    </GlobalModalContext.Provider>
  );
}; 