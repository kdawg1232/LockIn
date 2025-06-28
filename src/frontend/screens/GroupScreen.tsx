import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { NavigationBar } from '../components/NavigationBar';
import { getUserGroups, Group } from '../services/groupService';
import supabase from '../../lib/supabase';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

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

export const GroupScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  
  // Add swipe navigation support
  const { panHandlers } = useSwipeNavigation('GroupScreen');
  
  // State management
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup');
  };

  // Fetch user's groups
  const fetchUserGroups = async () => {
    try {
      const { data: { user } } = await supabase.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      console.log('🔍 Fetching groups for user:', user.id);
      
      const { data, error } = await getUserGroups(user.id);
      
      if (error) {
        console.error('Error fetching user groups:', error);
        Alert.alert('Error', 'Failed to load groups. Please try again.');
        return;
      }

      setGroups(data || []);
      console.log('✅ Loaded', data?.length || 0, 'groups');
      
    } catch (error) {
      console.error('Error fetching groups:', error);
      Alert.alert('Error', 'Failed to load groups. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load groups when screen mounts and when it comes into focus
  useEffect(() => {
    fetchUserGroups();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Refresh groups when returning from CreateGroup screen
      if (!isLoading) {
        setIsRefreshing(true);
        fetchUserGroups();
      }
    }, [isLoading])
  );

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  // Navigate to group details
  const handleGroupPress = (group: Group) => {
    navigation.navigate('GroupMembers', {
      groupId: group.id,
      groupName: group.name,
    });
  };



  // Render a group card
  const renderGroupCard = (group: Group) => (
    <TouchableOpacity 
      key={group.id}
      style={styles.groupCard} 
      activeOpacity={0.7}
      onPress={() => handleGroupPress(group)}
    >
      <View style={styles.groupCardHeader}>
        <View style={styles.groupIconContainer}>
          <Ionicons name="people" size={20} color="#cfb991" />
        </View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupMeta}>
            {group.member_count || 1} member{(group.member_count || 1) !== 1 ? 's' : ''} • Created {formatDate(group.created_at)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
      {group.description && (
        <Text style={styles.groupDescription}>{group.description}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }} {...panHandlers}>
        <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <GridLogo />
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Groups</Text>
          {isRefreshing && (
            <ActivityIndicator size="small" color="#cfb991" style={styles.refreshIndicator} />
          )}
        </View>
        
        {/* Create Group Button */}
        <TouchableOpacity style={styles.createGroupButton} onPress={handleCreateGroup}>
          <View style={styles.createGroupButtonContent}>
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <Text style={styles.createGroupButtonText}>Create Group</Text>
          </View>
        </TouchableOpacity>

        {/* Groups List Section */}
        <View style={styles.groupsSection}>
          <Text style={styles.sectionTitle}>
            Your Groups {groups.length > 0 && `(${groups.length})`}
          </Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#cfb991" />
              <Text style={styles.loadingText}>Loading groups...</Text>
            </View>
          ) : groups.length === 0 ? (
            <View style={styles.emptyGroupsContainer}>
              <Ionicons name="people-outline" size={48} color="#A67C52" />
              <Text style={styles.emptyGroupsText}>No groups yet</Text>
              <Text style={styles.emptyGroupsSubtext}>Create or join a group to compete with friends!</Text>
            </View>
          ) : (
            <ScrollView style={styles.groupsList} showsVerticalScrollIndicator={false}>
              {groups.map(renderGroupCard)}
            </ScrollView>
          )}
        </View>
      </View>
      </View>
      <NavigationBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8D5BC', // tan-200 (background) - consistent with app
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 120,
    justifyContent: 'flex-start',
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },

  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 8,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827', // gray-900 (dark text)
    fontFamily: 'Inter',
  },

  refreshIndicator: {
    marginLeft: 8,
  },

  createGroupButton: {
    backgroundColor: '#cfb991', // Primary tan color
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  createGroupButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  createGroupButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },

  groupsSection: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
    marginBottom: 16,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingTop: 100,
  },

  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter',
  },

  emptyGroupsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingTop: 50,
  },

  emptyGroupsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },

  emptyGroupsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontFamily: 'Inter',
    lineHeight: 20,
  },

  groupsList: {
    flex: 1,
  },

  groupCard: {
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

  groupCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  groupIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  groupInfo: {
    flex: 1,
  },

  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
    marginBottom: 4,
  },

  groupMeta: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter',
  },

  groupDescription: {
    fontSize: 14,
    color: '#4B5563',
    fontFamily: 'Inter',
    lineHeight: 20,
    marginTop: 12,
    paddingLeft: 52, // Align with group name
  },

  // Grid logo styles (consistent with other screens)
  gridContainer: {
    width: 36,
    height: 36,
    gap: 2,
  },

  gridRow: {
    flexDirection: 'row',
    gap: 2,
    flex: 1,
  },

  gridSquare: {
    flex: 1,
    borderRadius: 3,
  },

  gridDark: {
    backgroundColor: '#4B5563', // gray-600
  },

  gridTan: {
    backgroundColor: '#A67C52', // tan-500 (primary tan)
  },


}); 