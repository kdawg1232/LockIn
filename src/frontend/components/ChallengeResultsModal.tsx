import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../styles/theme';

interface GroupResult {
  groupName: string;
  opponentName: string;
  focusScore: number;
  opponentScore: number;
}

interface ChallengeResultsModalProps {
  visible: boolean;
  onClose: () => void;
  results: GroupResult[];
}

export const ChallengeResultsModal: React.FC<ChallengeResultsModalProps> = ({
  visible,
  onClose,
  results,
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
          
          <ScrollView style={styles.scrollView}>
            {results.map((result, index) => (
              <View key={index} style={styles.groupSection}>
                <Text style={styles.groupName}>{result.groupName}</Text>
                
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

                {/* Divider for all but last item */}
                {index < results.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </ScrollView>

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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  scrollView: {
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Inter',
  },
  groupSection: {
    marginBottom: 16,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  resultsSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  resultsName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  resultsStats: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  resultsVs: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    marginVertical: 8,
    fontFamily: 'Inter',
  },
  winnerText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 16,
    fontFamily: 'Inter',
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
}); 