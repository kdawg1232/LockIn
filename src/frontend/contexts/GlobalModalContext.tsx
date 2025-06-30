import React, { createContext, useContext, useState } from 'react';
import { ChallengeResultsModal } from '../components/ChallengeResultsModal';

interface ChallengeResult {
  won: boolean;
  opponentName: string;
  focusScore: number;
  opponentScore: number;
}

type ModalType = 'challengeResults' | null;

interface GlobalModalContextType {
  activeModal: ModalType;
  showModal: (modalType: ModalType) => void;
  hideModal: () => void;
  showChallengeResults: (result: any) => void;
}

const GlobalModalContext = createContext<GlobalModalContextType>({
  activeModal: null,
  showModal: () => {},
  hideModal: () => {},
  showChallengeResults: () => {},
});

export const GlobalModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [challengeResult, setChallengeResult] = useState<any>(null);

  const showModal = (modalType: ModalType) => {
    setActiveModal(modalType);
  };

  const hideModal = () => {
    setActiveModal(null);
  };

  const showChallengeResults = (result: any) => {
    setChallengeResult(result);
    showModal('challengeResults');
  };

  return (
    <GlobalModalContext.Provider
      value={{
        activeModal,
        showModal,
        hideModal,
        showChallengeResults,
      }}
    >
      {children}
    </GlobalModalContext.Provider>
  );
};

export const useGlobalModal = () => useContext(GlobalModalContext); 