import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { createGroup } from '../services/groupService';
import { searchUsers } from '../services/groupService';
import { sendMultipleInvitations } from '../services/groupInvitationService';
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

export const CreateGroupScreen = () => {
  const navigation = useNavigation();
  
  // Form state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [invitedUsers, setInvitedUsers] = useState<Array<{id: string; display: string}>>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{id: string; username: string; first_name: string; last_name: string}>>([]);

  // Handle back navigation
  const handleGoBack = () => {
    navigation.goBack();
  };

  // Search for users
  const handleSearchUsers = async (searchTerm: string) => {
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

      setSearchResults(data || []);
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

    // This is for manual entry - we'll search for them later when creating the group
    setInvitedUsers([...invitedUsers, { id: '', display: trimmedInput }]);
    setInviteInput('');
  };

  // Remove user from invitation list
  const handleRemoveInvite = (userToRemove: {id: string; display: string}) => {
    setInvitedUsers(invitedUsers.filter(user => user.id !== userToRemove.id || user.display !== userToRemove.display));
  };

  // Create group and send invitations
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Group Name Required', 'Please enter a name for your group.');
      return;
    }

    setIsCreating(true);
    
    try {
      const { data: { user } } = await supabase.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create a group.');
        return;
      }

      console.log('🔍 Creating group:', groupName.trim());

      // Create the group
      const { data: group, error: groupError } = await createGroup(
        {
          name: groupName.trim(),
          description: groupDescription.trim(),
        },
        user.id
      );

      if (groupError || !group) {
        console.error('Error creating group:', groupError);
        Alert.alert('Error', 'Failed to create group. Please try again.');
        return;
      }

      console.log('✅ Group created successfully:', group.name);

      // Send invitations if there are any users to invite
      if (invitedUsers.length > 0) {
        console.log('🔍 Sending invitations to', invitedUsers.length, 'users');

        // For users with IDs (from search), send invitations directly
        const usersWithIds = invitedUsers.filter(user => user.id);
        
        if (usersWithIds.length > 0) {
          const { successful, failed } = await sendMultipleInvitations(
            group.id,
            usersWithIds.map(user => user.id),
            user.id
          );

          console.log(`✅ Sent ${successful} invitations, ${failed} failed`);
        }

        // For manual entries, we'd need to search for them first
        const manualEntries = invitedUsers.filter(user => !user.id);
        if (manualEntries.length > 0) {
          console.log('⚠️ Manual entries found, these will need to be resolved:', manualEntries.map(u => u.display));
        }

        const totalSent = usersWithIds.length;
        const totalManual = manualEntries.length;

        let message = `${groupName} has been created successfully!`;
        if (totalSent > 0) {
          message += ` Invitations sent to ${totalSent} user${totalSent !== 1 ? 's' : ''}.`;
        }
        if (totalManual > 0) {
          message += ` ${totalManual} manual entr${totalManual !== 1 ? 'ies' : 'y'} could not be automatically invited.`;
        }

        Alert.alert('Group Created!', message, [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]);
      } else {
        Alert.alert('Group Created!', `${groupName} has been created successfully!`, [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]);
      }
      
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
        <Text style={styles.title}>Create Group</Text>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Group Name */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Group Name *</Text>
            <TextInput
              style={styles.textInput}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Enter group name..."
              placeholderTextColor="#9CA3AF"
              maxLength={50}
            />
          </View>

          {/* Group Description */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaInput]}
              value={groupDescription}
              onChangeText={setGroupDescription}
              placeholder="What's this group about? (optional)"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          {/* Invite Users */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Invite Friends</Text>
            <View style={styles.inviteInputContainer}>
              <TextInput
                style={[styles.textInput, styles.inviteInput]}
                value={inviteInput}
                onChangeText={(text) => {
                  setInviteInput(text);
                  handleSearchUsers(text);
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
            <Text style={styles.inputHint}>
              Start typing to search for users or manually enter names
            </Text>

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
              <Text style={styles.invitedUsersTitle}>Invited Users ({invitedUsers.length})</Text>
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
        </ScrollView>

        {/* Create Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.createButton, (!groupName.trim() || isCreating) && styles.createButtonDisabled]}
            onPress={handleCreateGroup}
            disabled={!groupName.trim() || isCreating}
          >
            <Text style={styles.createButtonText}>
              {isCreating ? 'Creating...' : 'Create Group'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8D5BC', // tan-200 (background)
  },

  keyboardContainer: {
    flex: 1,
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

  scrollContent: {
    flex: 1,
    paddingHorizontal: 24,
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

  textAreaInput: {
    height: 80,
    textAlignVertical: 'top',
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

  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 16,
  },

  createButton: {
    backgroundColor: '#cfb991',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  createButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },

  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter',
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