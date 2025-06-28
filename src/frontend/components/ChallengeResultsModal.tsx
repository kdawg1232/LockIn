import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../styles/theme';

export interface ChallengeResultsModalProps {
  visible: boolean;
  onClose: () => void;
  result: {
    won: boolean;
    opponentName: string;
    focusScore: number; // Coins gained by user during this challenge
    opponentScore: number; // Coins gained by opponent during this challenge
  };
}

export const ChallengeResultsModal: React.FC<ChallengeResultsModalProps> = ({
  visible,
  onClose,
  result,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Daily Challenge Results!</Text>
          
          {/* User Stats */}
          <View style={styles.resultsSection}>
            <Text style={styles.resultsName}>You</Text>
            <Text style={styles.resultsStats}>
              Net Coins: {result.focusScore >= 0 ? '+' : ''}{result.focusScore}
            </Text>
          </View>

          <Text style={styles.resultsVs}>VS</Text>

          {/* Opponent Stats */}
          <View style={styles.resultsSection}>
            <Text style={styles.resultsName}>{result.opponentName}</Text>
            <Text style={styles.resultsStats}>
              Net Coins: {result.opponentScore >= 0 ? '+' : ''}{result.opponentScore}
            </Text>
          </View>

          {/* Winner Declaration */}
          <Text style={styles.winnerText}>
            {result.focusScore > result.opponentScore ? 'You won! 🎉' :
             result.focusScore < result.opponentScore ? `${result.opponentName} won! 🏆` :
             "It's a tie! 🤝"}
          </Text>

          <TouchableOpacity
            style={styles.modalButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.modalButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  resultsSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  resultsName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  resultsStats: {
    fontSize: 18,
    color: '#A67C52',
    fontFamily: 'Inter',
  },
  resultsVs: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#A67C52',
    marginVertical: 8,
    fontFamily: 'Inter',
  },
  winnerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 24,
    marginBottom: 32,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  modalButton: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
}); 