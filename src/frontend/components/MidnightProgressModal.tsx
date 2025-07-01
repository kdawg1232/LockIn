import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../styles';

interface MidnightProgressModalProps {
  visible: boolean;
  onClose: () => void;
  userStats: {
    coinsGained: number;
    coinsLost: number;
    netCoins: number;
  };
  userName: string;
}

export const MidnightProgressModal: React.FC<MidnightProgressModalProps> = ({
  visible,
  onClose,
  userStats,
  userName
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🌙 Day Complete!</Text>
            <Text style={styles.subtitle}>Your Progress Summary</Text>
          </View>

          {/* User Stats */}
          <View style={styles.statsContainer}>
            <Text style={styles.userName}>{userName}</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>+{userStats.coinsGained}</Text>
                <Text style={styles.statLabel}>Coins Gained</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>-{userStats.coinsLost}</Text>
                <Text style={styles.statLabel}>Coins Lost</Text>
              </View>
              
              <View style={[styles.statCard, styles.netStatCard]}>
                <Text style={[
                  styles.statValue, 
                  styles.netStatValue,
                  { color: userStats.netCoins >= 0 ? colors.success : colors.error }
                ]}>
                  {userStats.netCoins >= 0 ? '+' : ''}{userStats.netCoins}
                </Text>
                <Text style={styles.statLabel}>Net Coins</Text>
              </View>
            </View>
          </View>

          {/* 6 AM Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>
              🌅 Come back at 6 AM to see who won the challenge!
            </Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },

  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: spacing.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },

  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  title: {
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },

  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  statsContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },

  userName: {
    fontSize: 18,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: spacing.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  netStatCard: {
    borderColor: colors.primary,
    borderWidth: 2,
  },

  statValue: {
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  netStatValue: {
    fontSize: 22,
  },

  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: typography.fontWeight.medium,
  },

  messageContainer: {
    backgroundColor: colors.lightBlue,
    borderRadius: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    width: '100%',
  },

  messageText: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: typography.fontWeight.medium,
    lineHeight: 22,
  },

  closeButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
  },

  closeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
}); 