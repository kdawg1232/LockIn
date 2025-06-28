import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllInvitations, acceptGroupInvitation, declineGroupInvitation, GroupInvitation } from '../services/groupInvitationService';
import { NavigationBar } from '../components/NavigationBar';
import supabase from '../../lib/supabase';

// Logo component with grid design (consistent with other screens)
const GridLogo: React.FC = () => {
  return (
    <View style={styles.gridContainer}>
      {/* Row 1 */}
      <View style={styles.gridRow}>
        <View style={[styles.gridSquare, styles.gridDark]} />
        <View style={[styles.gridSquare, styles.gridTan]} />
        <View style={[styles.gridSquare, styles.gridDark]} />
      </View>
      {/* Row 2 */}
      <View style={styles.gridRow}>
        <View style={[styles.gridSquare, styles.gridDark]} />
        <View style={[styles.gridSquare, styles.gridTan]} />
        <View style={[styles.gridSquare, styles.gridTan]} />
      </View>
      {/* Row 3 */}
      <View style={styles.gridRow}>
        <View style={[styles.gridSquare, styles.gridDark]} />
        <View style={[styles.gridSquare, styles.gridDark]} />
        <View style={[styles.gridSquare, styles.gridDark]} />
      </View>
    </View>
  );
};

// Use GroupInvitation interface from service

export const GroupInvitesScreen = () => {
  const navigation = useNavigation();
  
  // State management
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  // Handle back navigation
  const handleGoBack = () => {
    navigation.goBack();
  };

  // Fetch all invitations (pending, accepted, declined)
  const fetchInvitations = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      console.log('📨 Fetching group invitations for user:', user.id);
      
      const { data, error } = await getAllInvitations(user.id);
      
      if (error) {
        console.error('Error fetching invitations:', error);
        Alert.alert('Error', 'Failed to load invitations. Please try again.');
        return;
      }

      setInvitations(data || []);
      console.log('✅ Loaded', data?.length || 0, 'invitations');
      
    } catch (error) {
      console.error('Error fetching invitations:', error);
      Alert.alert('Error', 'Failed to load invitations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle accepting an invitation
  const handleAcceptInvitation = async (invitationId: string) => {
    setProcessingInviteId(invitationId);
    
    try {
      const { data: { user } } = await supabase.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to accept invitations.');
        return;
      }

      console.log('📨 Accepting invitation:', invitationId);
      
      const { error } = await acceptGroupInvitation(invitationId, user.id);
      
      if (error) {
        console.error('Error accepting invitation:', error);
        Alert.alert('Error', 'Failed to accept invitation. Please try again.');
        return;
      }
      
      // Update local state
      setInvitations(prev => 
        prev.map(invite => 
          invite.id === invitationId 
            ? { ...invite, status: 'accepted' }
            : invite
        )
      );
      
      // Find the invitation to get group name for success message
      const acceptedInvitation = invitations.find(inv => inv.id === invitationId);
      const groupName = acceptedInvitation?.group_name || 'the group';
      
      Alert.alert('Success', `You have successfully joined ${groupName}! You can view it in your Groups tab.`);
      
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation. Please try again.');
    } finally {
      setProcessingInviteId(null);
    }
  };

  // Handle declining an invitation
  const handleDeclineInvitation = async (invitationId: string) => {
    setProcessingInviteId(invitationId);
    
    try {
      const { data: { user } } = await supabase.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to decline invitations.');
        return;
      }

      console.log('📨 Declining invitation:', invitationId);
      
      const { error } = await declineGroupInvitation(invitationId, user.id);
      
      if (error) {
        console.error('Error declining invitation:', error);
        Alert.alert('Error', 'Failed to decline invitation. Please try again.');
        return;
      }
      
      // Update local state
      setInvitations(prev => 
        prev.map(invite => 
          invite.id === invitationId 
            ? { ...invite, status: 'declined' }
            : invite
        )
      );
      
    } catch (error) {
      console.error('Error declining invitation:', error);
      Alert.alert('Error', 'Failed to decline invitation. Please try again.');
    } finally {
      setProcessingInviteId(null);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  // Load invitations when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchInvitations();
    }, [])
  );

  // Get pending invitations count
  const pendingInvitationsCount = invitations.filter(inv => inv.status === 'pending').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <GridLogo />
        </View>
        
        <View style={styles.headerSpacer} />
      </View>

      {/* Title */}
      <Text style={styles.title}>Group Invites</Text>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#cfb991" />
          <Text style={styles.loadingText}>Loading invitations...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {pendingInvitationsCount > 0 && (
            <Text style={styles.pendingCount}>
              {pendingInvitationsCount} pending invitation{pendingInvitationsCount !== 1 ? 's' : ''}
            </Text>
          )}

          {invitations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-outline" size={48} color="#A67C52" />
              <Text style={styles.emptyText}>No invitations</Text>
              <Text style={styles.emptySubtext}>When friends invite you to groups, they'll appear here.</Text>
            </View>
          ) : (
            invitations.map((invitation) => (
              <View key={invitation.id} style={styles.invitationCard}>
                <View style={styles.invitationHeader}>
                  <View style={styles.groupIcon}>
                    <Ionicons name="people" size={20} color="#cfb991" />
                  </View>
                  <View style={styles.invitationInfo}>
                    <Text style={styles.groupName}>{invitation.group_name}</Text>
                    <Text style={styles.inviterText}>
                      Invited by {invitation.inviter_name} • {formatDate(invitation.created_at)}
                    </Text>
                  </View>
                </View>

                {invitation.group_description && (
                  <Text style={styles.groupDescription}>{invitation.group_description}</Text>
                )}

                {invitation.status === 'pending' ? (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.declineButton}
                      onPress={() => handleDeclineInvitation(invitation.id)}
                      disabled={processingInviteId === invitation.id}
                    >
                      <Text style={styles.declineButtonText}>Decline</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.acceptButton}
                      onPress={() => handleAcceptInvitation(invitation.id)}
                      disabled={processingInviteId === invitation.id}
                    >
                      {processingInviteId === invitation.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.statusContainer}>
                    <Text style={[
                      styles.statusText,
                      invitation.status === 'accepted' ? styles.statusAccepted : styles.statusDeclined
                    ]}>
                      {invitation.status === 'accepted' ? 'Accepted' : 'Declined'}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
      <NavigationBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8D5BC', // tan-200 (background)
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerSpacer: {
    width: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    fontFamily: 'Inter',
    marginBottom: 30,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },

  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter',
  },

  scrollContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 100, // Increased to accommodate bottom navigation bar
  },

  pendingCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cfb991',
    fontFamily: 'Inter',
    marginBottom: 16,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingTop: 100,
  },

  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },

  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontFamily: 'Inter',
    lineHeight: 20,
  },

  invitationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },

  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  invitationInfo: {
    flex: 1,
  },

  groupName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
    marginBottom: 4,
  },

  inviterText: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter',
    fontWeight: '500',
  },

  groupDescription: {
    fontSize: 14,
    color: '#4B5563',
    fontFamily: 'Inter',
    lineHeight: 20,
    marginBottom: 16,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },

  declineButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },

  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },

  acceptButton: {
    flex: 1,
    backgroundColor: '#cfb991',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },

  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },

  statusContainer: {
    alignItems: 'center',
  },

  statusText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  statusAccepted: {
    color: '#10B981',
  },

  statusDeclined: {
    color: '#6B7280',
  },

  // Grid logo styles
  gridContainer: {
    width: 30,
    height: 30,
    gap: 2,
  },

  gridRow: {
    flexDirection: 'row',
    gap: 2,
    flex: 1,
  },

  gridSquare: {
    flex: 1,
    borderRadius: 2,
  },

  gridDark: {
    backgroundColor: '#4B5563',
  },

  gridTan: {
    backgroundColor: '#A67C52',
  },
}); 