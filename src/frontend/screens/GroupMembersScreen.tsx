import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types/navigation';
import { getGroupMembers, GroupMember, removeMemberFromGroup, searchUsers } from '../services/groupService';
import { sendMultipleInvitations } from '../services/groupInvitationService';
import { NavigationBar } from '../components/NavigationBar';
import supabase from '../../lib/supabase';

type GroupMembersScreenRouteProp = RouteProp<RootStackParamList, 'GroupMembers'>;

// Interface for group details
interface GroupDetails {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  created_at: string;
}

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

export const GroupMembersScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<GroupMembersScreenRouteProp>();
  const { groupId, groupName } = route.params;
  
  // State management
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Invitation state (integrated into main screen)
  const [showInviteSection, setShowInviteSection] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [invitedUsers, setInvitedUsers] = useState<Array<{id: string; display: string}>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{id: string; username: string; first_name: string; last_name: string}>>([]);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  
  // Keyboard state for better UX
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isActivelySearching, setIsActivelySearching] = useState(false);

  // Get current user ID
  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  // Handle leaving the group
  const handleLeaveGroup = async () => {
    try {
      if (!currentUserId || !groupDetails) {
        Alert.alert('Error', 'Authentication error. Please try again.');
        return;
      }

      // Prevent group creator from leaving
      if (groupDetails.creator_id === currentUserId) {
        Alert.alert('Error', 'Group creators cannot leave their own group. You can delete the group instead.');
        return;
      }

      Alert.alert(
        'Leave Group',
        `Are you sure you want to leave "${groupDetails.name}"?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsLoading(true);
                const { error } = await removeMemberFromGroup(groupId, currentUserId, currentUserId);
                
                if (error) {
                  Alert.alert('Error', 'Failed to leave group. Please try again.');
                  return;
                }

                Alert.alert('Success', 'You have left the group.', [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]);
              } catch (error) {
                console.error('Error leaving group:', error);
                Alert.alert('Error', 'Failed to leave group. Please try again.');
              } finally {
                setIsLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in handleLeaveGroup:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  // Fetch group details
  const fetchGroupDetails = async () => {
    try {
      const { data: groups, error } = await supabase
        .from('groups')
        .select('id, name, description, creator_id, created_at')
        .eq('id', groupId);

      if (error) {
        console.error('Error fetching group details:', error);
        return;
      }

      if (groups && groups.length > 0) {
        const group = Array.isArray(groups) ? groups[0] : groups;
        setGroupDetails(group);
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
    }
  };

  // Fetch group members
  const fetchGroupMembers = async () => {
    try {
      console.log('🔍 Fetching members for group:', groupId);
      
      const { data, error } = await getGroupMembers(groupId);
      
      if (error) {
        console.error('Error fetching group members:', error);
        Alert.alert('Error', 'Failed to load group members. Please try again.');
        return;
      }

      // Only show members (people who have accepted invitations and are in group_memberships)
      setMembers(data || []);
      console.log('✅ Loaded', data?.length || 0, 'group members');
      
    } catch (error) {
      console.error('Error fetching group members:', error);
      Alert.alert('Error', 'Failed to load group members. Please try again.');
    }
  };

  // Search for users (reused from CreateGroupScreen)
  const handleSearchUsers = async (searchTerm: string) => {
    // Set actively searching when user types
    setIsActivelySearching(searchTerm.trim().length > 0);
    
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data: { user } } = await supabase.getUser();
      if (!user) return;

      const { data, error } = await searchUsers(searchTerm.trim(), user.id);
      
      if (error) {
        console.error('Error searching users:', error);
        return;
      }

      // Filter out users who are already members of the group
      const memberUserIds = members.map(member => member.user_id);
      const filteredResults = (data || []).filter((searchUser: {id: string; username: string; first_name: string; last_name: string}) => 
        !memberUserIds.includes(searchUser.id)
      );

      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Add user to invitation list from search results
  const handleAddUserFromSearch = (user: {id: string; username: string; first_name: string; last_name: string}) => {
    if (invitedUsers.find(invited => invited.id === user.id)) {
      Alert.alert('Already Added', 'This user is already in your invitation list.');
      return;
    }

    const displayName = `${user.first_name} ${user.last_name} (@${user.username})`;
    setInvitedUsers([...invitedUsers, { id: user.id, display: displayName }]);
    setInviteInput('');
    setSearchResults([]);
  };

  // Add user manually by input (for backwards compatibility)
  const handleAddInvite = () => {
    if (!inviteInput.trim()) return;
    
    const trimmedInput = inviteInput.trim();
    if (invitedUsers.find(user => user.display === trimmedInput)) {
      Alert.alert('Already Added', 'This user is already in your invitation list.');
      return;
    }

    // This is for manual entry - we'll search for them later when sending invitations
    setInvitedUsers([...invitedUsers, { id: '', display: trimmedInput }]);
    setInviteInput('');
  };

  // Remove user from invitation list
  const handleRemoveInvite = (userToRemove: {id: string; display: string}) => {
    setInvitedUsers(invitedUsers.filter(user => user.id !== userToRemove.id || user.display !== userToRemove.display));
  };

  // Send invitations to selected users
  const handleSendInvitations = async () => {
    if (invitedUsers.length === 0) {
      Alert.alert('No Users Selected', 'Please add users to invite.');
      return;
    }

    setIsSendingInvites(true);
    
    try {
      const { data: { user } } = await supabase.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to send invitations.');
        return;
      }

      // Send invitations only for users with IDs (from search)
      const usersWithIds = invitedUsers.filter(user => user.id);
      
      if (usersWithIds.length > 0) {
        console.log('🔍 Sending invitations to', usersWithIds.length, 'users');

        const { successful, failed } = await sendMultipleInvitations(
          groupId,
          usersWithIds.map(user => user.id),
          user.id
        );

        console.log(`✅ Sent ${successful} invitations, ${failed} failed`);

        // For manual entries, show a note that they couldn't be invited automatically
        const manualEntries = invitedUsers.filter(user => !user.id);
        
        let message = `Invitations sent to ${successful} user${successful !== 1 ? 's' : ''}.`;
        if (failed > 0) {
          message += ` ${failed} invitation${failed !== 1 ? 's' : ''} failed.`;
        }
        if (manualEntries.length > 0) {
          message += ` ${manualEntries.length} manual entr${manualEntries.length !== 1 ? 'ies' : 'y'} could not be automatically invited.`;
        }

        Alert.alert(
          'Invitations Sent!', 
          message, 
          [
            {
              text: 'OK',
              onPress: () => {
                // Clear invitation state and hide section
                setInvitedUsers([]);
                setInviteInput('');
                setSearchResults([]);
                setShowInviteSection(false);
              }
            }
          ]
        );
      } else {
        Alert.alert('No Valid Users', 'Please search and select users from the search results to invite.');
      }
      
    } catch (error) {
      console.error('Error sending invitations:', error);
      Alert.alert('Error', 'Failed to send invitations. Please try again.');
    } finally {
      setIsSendingInvites(false);
    }
  };

  // Cancel invitations
  const handleCancelInvitations = () => {
    setInvitedUsers([]);
    setInviteInput('');
    setSearchResults([]);
    setShowInviteSection(false);
  };

  // Keyboard event listeners for better UX
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      setIsActivelySearching(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Load data when screen mounts
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await getCurrentUser();
      await fetchGroupDetails();
      await fetchGroupMembers();
      setIsLoading(false);
    };

    loadData();
  }, [groupId]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Determine member role display
  const getMemberRoleDisplay = (member: GroupMember) => {
    if (member.role === 'admin') {
      return member.user_id === currentUserId ? 'You (Admin)' : 'Admin';
    }
    return member.user_id === currentUserId ? 'You' : 'Member';
  };

  // Render a member card
  const renderMemberCard = (member: GroupMember) => (
    <View key={member.user_id} style={styles.memberCard}>
      <View style={styles.memberCardHeader}>
        <View style={styles.memberIconContainer}>
          <Ionicons 
            name={member.role === 'admin' ? 'star' : 'person'} 
            size={20} 
            color={member.role === 'admin' ? '#DAA000' : '#cfb991'} 
          />
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {member.username || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unknown User'}
          </Text>
          <Text style={styles.memberRole}>
            {getMemberRoleDisplay(member)}
          </Text>
        </View>
        <Text style={styles.joinedDate}>
          Joined {formatDate(member.joined_at)}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        {/* Header with back button - always visible */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <GridLogo />
          </View>
          
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContentContainer}
        >
          {/* Group Information Section - hide when actively searching on small screens */}
          {!isActivelySearching && (
            <View style={styles.groupInfoSection}>
              <Text style={styles.groupTitle}>{groupDetails?.name || groupName}</Text>
              {groupDetails?.description && (
                <Text style={styles.groupDescription}>{groupDetails.description}</Text>
              )}
              <Text style={styles.groupMeta}>
                Created on {groupDetails ? formatDate(groupDetails.created_at) : 'Unknown'}
              </Text>

              <View style={styles.actionButtonsRow}>
                {/* Invite Members Button - only show for group creators */}
                {currentUserId && groupDetails?.creator_id === currentUserId && (
                  <TouchableOpacity 
                    style={styles.inviteMembersButton} 
                    onPress={() => {
                      setShowInviteSection(!showInviteSection);
                      if (showInviteSection) {
                        // Clear search when closing
                        setInviteInput('');
                        setSearchResults([]);
                        setIsActivelySearching(false);
                        Keyboard.dismiss();
                      }
                    }}
                  >
                    <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.inviteMembersText}>
                      {showInviteSection ? 'Cancel' : 'Invite Members'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Leave Group Button - only show for non-creators */}
                {currentUserId && groupDetails?.creator_id !== currentUserId && (
                  <TouchableOpacity style={styles.leaveGroupButton} onPress={handleLeaveGroup}>
                    <Ionicons name="exit-outline" size={16} color="#DC2626" />
                    <Text style={styles.leaveGroupText}>Leave Group</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          {/* Invite Members Section - shown when toggle is active */}
          {showInviteSection && currentUserId && groupDetails?.creator_id === currentUserId && (
            <View style={[styles.inviteSection, isKeyboardVisible && styles.inviteSectionCompact]}>
              {!isActivelySearching && (
                <Text style={styles.inviteSectionTitle}>Invite New Members</Text>
              )}
              
              {/* Search Input */}
              <View style={styles.inputSection}>
                {!isActivelySearching && (
                  <Text style={styles.inputLabel}>Search for Friends</Text>
                )}
                <View style={styles.inviteInputContainer}>
                  <TextInput
                    style={[styles.textInput, styles.inviteInput]}
                    value={inviteInput}
                    onChangeText={(text) => {
                      setInviteInput(text);
                      handleSearchUsers(text);
                    }}
                    onFocus={() => setIsActivelySearching(true)}
                    onBlur={() => {
                      // Only stop actively searching if input is empty
                      if (!inviteInput.trim()) {
                        setIsActivelySearching(false);
                      }
                    }}
                    placeholder="Search by username or name..."
                    placeholderTextColor="#9CA3AF"
                    onSubmitEditing={handleAddInvite}
                    returnKeyType="search"
                  />
                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={handleAddInvite}
                    disabled={!inviteInput.trim()}
                  >
                    {isSearching ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
                {!isActivelySearching && (
                  <Text style={styles.inputHint}>
                    Start typing to search for users or manually enter names
                  </Text>
                )}

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <View style={styles.searchResults}>
                    {searchResults.map((user) => (
                      <TouchableOpacity
                        key={user.id}
                        style={styles.searchResultItem}
                        onPress={() => handleAddUserFromSearch(user)}
                      >
                        <View style={styles.searchResultInfo}>
                          <Ionicons name="person" size={16} color="#6B7280" />
                          <View style={styles.searchResultText}>
                            <Text style={styles.searchResultName}>
                              {user.first_name} {user.last_name}
                            </Text>
                            <Text style={styles.searchResultUsername}>@{user.username}</Text>
                          </View>
                        </View>
                        <Ionicons name="add" size={16} color="#cfb991" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Invited Users List */}
              {invitedUsers.length > 0 && (
                <View style={styles.invitedUsersSection}>
                  <Text style={styles.invitedUsersTitle}>Users to Invite ({invitedUsers.length})</Text>
                  {invitedUsers.map((user, index) => (
                    <View key={`${user.id}-${index}`} style={styles.invitedUserItem}>
                      <View style={styles.invitedUserInfo}>
                        <Ionicons name="person" size={16} color="#6B7280" />
                        <Text style={styles.invitedUserText}>{user.display}</Text>
                        {!user.id && (
                          <View style={styles.manualEntryBadge}>
                            <Text style={styles.manualEntryText}>Manual</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity 
                        onPress={() => handleRemoveInvite(user)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="close" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Send Invitations Button */}
              {invitedUsers.length > 0 && (
                <View style={styles.sendButtonContainer}>
                  <TouchableOpacity 
                    style={[styles.sendInvitesButton, isSendingInvites && styles.sendInvitesButtonDisabled]}
                    onPress={handleSendInvitations}
                    disabled={isSendingInvites}
                  >
                    <Text style={styles.sendInvitesButtonText}>
                      {isSendingInvites ? 'Sending...' : 'Send Invitations'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

                    {/* Members Section - hide when actively searching */}
          {!isActivelySearching && (
            <View style={styles.membersSection}>
              <Text style={styles.sectionTitle}>
                Members {members.length > 0 && `(${members.length})`}
              </Text>
              
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#cfb991" />
                  <Text style={styles.loadingText}>Loading members...</Text>
                </View>
              ) : members.length === 0 ? (
                <View style={styles.emptyMembersContainer}>
                  <Ionicons name="people-outline" size={48} color="#A67C52" />
                  <Text style={styles.emptyMembersText}>No members found</Text>
                  <Text style={styles.emptyMembersSubtext}>Members will appear here once they accept invitations</Text>
                </View>
              ) : (
                <View style={styles.membersList}>
                  {members.map(renderMemberCard)}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <NavigationBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8D5BC', // tan-200 (background) - consistent with app
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollContent: {
    flex: 1,
  },

  scrollContentContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 120, // Extra padding for navigation bar
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#E8D5BC',
  },

  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(207, 185, 145, 0.3)',
  },

  logoContainer: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  gridContainer: {
    width: 36,
    height: 36,
  },

  gridRow: {
    flexDirection: 'row',
    flex: 1,
  },

  gridSquare: {
    flex: 1,
    margin: 1,
    borderRadius: 2,
  },

  gridDark: {
    backgroundColor: '#000000', // black
  },

  gridTan: {
    backgroundColor: '#cfb991', // tan primary
  },

  groupInfoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  groupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },

  groupDescription: {
    fontSize: 16,
    color: '#555960',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 22,
  },

  groupMeta: {
    fontSize: 14,
    color: '#9D9795',
    textAlign: 'center',
  },

  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },

  membersSection: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555960',
  },

  emptyMembersContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },

  emptyMembersText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },

  emptyMembersSubtext: {
    fontSize: 14,
    color: '#9D9795',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },

  membersList: {
    flex: 1,
  },

  // Invite section styles (matching CreateGroupScreen)
  inviteSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  inviteSectionCompact: {
    padding: 12,
    marginBottom: 16,
  },

  inviteSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
    marginBottom: 16,
  },

  inputSection: {
    marginBottom: 24,
  },

  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
    marginBottom: 8,
  },

  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Inter',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  inviteInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },

  inviteInput: {
    flex: 1,
  },

  addButton: {
    backgroundColor: '#cfb991',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  inputHint: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter',
    marginTop: 4,
  },

  searchResults: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200,
  },

  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  searchResultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },

  searchResultText: {
    flex: 1,
  },

  searchResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },

  searchResultUsername: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter',
  },

  invitedUsersSection: {
    marginBottom: 24,
  },

  invitedUsersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
    marginBottom: 12,
  },

  invitedUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  invitedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },

  invitedUserText: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Inter',
    flex: 1,
  },

  manualEntryBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  manualEntryText: {
    fontSize: 10,
    color: '#92400E',
    fontFamily: 'Inter',
    fontWeight: '600',
  },

  removeButton: {
    padding: 4,
  },

  sendButtonContainer: {
    marginTop: 16,
  },

  sendInvitesButton: {
    backgroundColor: '#cfb991',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  sendInvitesButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },

  sendInvitesButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },

  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  memberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  memberIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  memberInfo: {
    flex: 1,
  },

  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },

  memberRole: {
    fontSize: 14,
    color: '#cfb991',
    fontWeight: '500',
  },

  joinedDate: {
    fontSize: 12,
    color: '#9D9795',
    textAlign: 'right',
  },

  // Leave Group Button styles
  leaveGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FECACA', // Light red background
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    gap: 8,
  },

  leaveGroupText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626', // Red text
  },

  // Invite Members Button styles
  inviteMembersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#cfb991', // tan primary
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 16,
    gap: 8,
  },

  inviteMembersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },


}); 