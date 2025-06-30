import supabase from '../../lib/supabase';
import { Database } from '../../types/database.types';

// Types from database schema
type Tables = Database['public']['Tables'];
type DailyPairing = Tables['daily_pairings']['Row'];
type GroupMembership = Tables['group_memberships']['Row'];

// Interface for pair data (matches database.types.ts)
export interface PairData {
  user1_id: string;
  user2_id: string;
  is_extra_pair?: boolean;
}

// Interface for group membership with group details
interface GroupWithMembership {
  group_id: string;
  groups: {
    id: string;
    name: string;
  };
}

// Interface for group membership response (updated for actual data structure)
interface GroupMembershipResponse {
  user_id: string;
}

// Interface for simple group membership without nested data
interface SimpleMembership {
  group_id: string;
}

// Validation functions
const validateGroupId = (groupId: string): boolean => {
  if (!groupId || typeof groupId !== 'string' || groupId.trim().length === 0) {
    console.error('❌ Invalid groupId:', groupId);
    return false;
  }
  return true;
};

const validateUserId = (userId: string): boolean => {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    console.error('❌ Invalid userId:', userId);
    return false;
  }
  return true;
};

// Helper function to shuffle array using Fisher-Yates algorithm
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Enhanced pairing algorithm with better logic
const generatePairs = (userIds: string[]): PairData[] => {
  console.log('🎲 Generating pairs for users:', userIds);
  
  // Validation
  if (!Array.isArray(userIds) || userIds.length === 0) {
    console.warn('⚠️ No users provided for pairing');
    return [];
  }

  // Remove duplicates and filter invalid IDs
  const uniqueUserIds = Array.from(new Set(userIds)).filter(id => validateUserId(id));
  
  if (uniqueUserIds.length === 0) {
    console.warn('⚠️ No valid users after filtering');
    return [];
  }

  console.log('🎲 Valid unique users for pairing:', uniqueUserIds.length);

  // Handle single user case
  if (uniqueUserIds.length === 1) {
    console.log('🎲 Single user detected - no pairs possible');
    return [];
  }

  const shuffledUsers = shuffleArray(uniqueUserIds);
  const pairs: PairData[] = [];
  
  // Create regular pairs (floor division ensures even pairing)
  const regularPairCount = Math.floor(shuffledUsers.length / 2);
  console.log('🎲 Creating', regularPairCount, 'regular pairs');
  
  for (let i = 0; i < regularPairCount * 2; i += 2) {
    pairs.push({
      user1_id: shuffledUsers[i],
      user2_id: shuffledUsers[i + 1],
      is_extra_pair: false
    });
  }
  
  // Handle odd user out if exists
  if (shuffledUsers.length % 2 === 1) {
    const unpairedUser = shuffledUsers[shuffledUsers.length - 1];
    console.log('🎲 Handling unpaired user:', unpairedUser);
    
    if (pairs.length > 0) {
      // Pair with a random user from existing pairs (this user gets 2 opponents)
      const randomPairIndex = Math.floor(Math.random() * pairs.length);
      const randomExistingUser = Math.random() < 0.5 ? pairs[randomPairIndex].user1_id : pairs[randomPairIndex].user2_id;
      
      pairs.push({
        user1_id: unpairedUser,
        user2_id: randomExistingUser,
        is_extra_pair: true
      });
      
      console.log('🎲 Created extra pair:', unpairedUser, 'vs', randomExistingUser);
    } else {
      // This shouldn't happen but handle it gracefully
      console.warn('⚠️ Unpaired user but no existing pairs - this should not happen');
    }
  }
  
  console.log('🎲 Generated', pairs.length, 'total pairs');
  return pairs;
};

export const groupPairingService = {
  // Get today's pairings for a group
  async getDailyPairings(groupId: string): Promise<DailyPairing | null> {
    try {
      // Validation
      if (!validateGroupId(groupId)) {
        return null;
      }

      console.log('🔄 Getting daily pairings for group:', groupId);
      const today = getTodayDate();
      
      // Get all pairings for this group first, then filter by date
      const result = await supabase
        .from('daily_pairings')
        .select('*')
        .eq('group_id', groupId);
        
      if (result.error) {
        console.error('❌ Error fetching daily pairings:', result.error);
        return null;
      }
      
      // Filter by today's date (custom client doesn't support multiple conditions well)
      let pairingsData = result.data;
      if (Array.isArray(pairingsData)) {
        const todaysPairing = pairingsData.find(pairing => pairing.date === today);
        pairingsData = todaysPairing || null;
      } else if (pairingsData && pairingsData.date !== today) {
        pairingsData = null;
      }
      
      if (pairingsData) {
        console.log('✅ Found existing pairings:', pairingsData.pairs?.length || 0, 'pairs');
        // Validate pairs data structure
        if (!pairingsData.pairs || !Array.isArray(pairingsData.pairs)) {
          console.error('❌ Invalid pairs data structure:', pairingsData.pairs);
          return null;
        }
      } else {
        console.log('ℹ️ No existing pairings found for today');
      }
      
      return pairingsData || null;
    } catch (error) {
      console.error('❌ Error in getDailyPairings:', error);
      return null;
    }
  },
  
  // Generate new pairings for a group
  async generateDailyPairings(groupId: string): Promise<DailyPairing | null> {
    try {
      // Validation
      if (!validateGroupId(groupId)) {
        return null;
      }

      console.log('🔄 Generating new daily pairings for group:', groupId);
      
      // First get all members of the group
      const membersResult = await supabase
        .from('group_memberships')
        .select('user_id')
        .eq('group_id', groupId);
        
      if (membersResult.error) {
        console.error('❌ Error fetching group members:', membersResult.error);
        return null;
      }

      if (!membersResult.data || membersResult.data.length === 0) {
        console.warn('⚠️ No members found in group:', groupId);
        return null;
      }
      
      const userIds = membersResult.data.map((m: GroupMembershipResponse) => m.user_id);
      console.log('👥 Found', userIds.length, 'members in group');
      
      const pairs = generatePairs(userIds);
      
      if (pairs.length === 0) {
        console.warn('⚠️ No pairs generated - insufficient users');
        return null;
      }
      
      const today = getTodayDate();
      
      // Delete any existing pairings for today (get existing pairings first)
      console.log('🗑️ Clearing existing pairings for today...');
      const existingPairingsResult = await supabase
        .from('daily_pairings')
        .select('id')
        .eq('group_id', groupId);
        
      if (existingPairingsResult.error) {
        console.error('❌ Error fetching existing pairings for deletion:', existingPairingsResult.error);
        return null;
      }
      
      // Filter and delete today's pairings
      if (existingPairingsResult.data && Array.isArray(existingPairingsResult.data)) {
        for (const existingPairing of existingPairingsResult.data) {
          // Get full pairing data to check date
          const fullPairingResult = await supabase
            .from('daily_pairings')
            .select('date')
            .eq('id', existingPairing.id);
            
          if (fullPairingResult.data && 
              Array.isArray(fullPairingResult.data) && 
              fullPairingResult.data.length > 0 && 
              fullPairingResult.data[0].date === today) {
            
            // Delete this pairing as it's for today
            await supabase
              .from('daily_pairings')
              .delete()
              .eq('id', existingPairing.id);
          }
        }
      }
      
      // Insert new pairings
      console.log('💾 Inserting new pairings...');
      const insertResult = await supabase
        .from('daily_pairings')
        .insert({
          group_id: groupId,
          date: today,
          pairs: pairs
        });
        
      if (insertResult.error) {
        console.error('❌ Error generating daily pairings:', insertResult.error);
        return null;
      }
      
      // Fetch the created pairing to return complete data (use our own getDailyPairings method)
      const createdPairing = await this.getDailyPairings(groupId);
      
      if (createdPairing) {
        console.log('✅ Generated new daily pairings:', createdPairing.pairs?.length || 0, 'pairs');
        return createdPairing;
      } else {
        console.error('❌ Failed to fetch created pairings');
        return null;
      }
    } catch (error) {
      console.error('❌ Error in generateDailyPairings:', error);
      return null;
    }
  },

  // Check if a user can create an extra pairing in a group
  async canCreateExtraPairing(userId: string, groupId: string): Promise<boolean> {
    try {
      // Validation
      if (!validateUserId(userId) || !validateGroupId(groupId)) {
        return false;
      }

      const pairings = await this.getDailyPairings(groupId);
      if (!pairings || !pairings.pairs || !Array.isArray(pairings.pairs)) {
        console.log('ℹ️ No valid pairings found for extra pair check');
        return false;
      }
      
      // Check if user is already in an extra pair
      const hasExtraPair = pairings.pairs.some(
        pair => pair.is_extra_pair && (pair.user1_id === userId || pair.user2_id === userId)
      );
      
      console.log('🔍 Extra pair check for user', userId, '- already has extra pair:', hasExtraPair);
      return !hasExtraPair;
    } catch (error) {
      console.error('❌ Error in canCreateExtraPairing:', error);
      return false;
    }
  },
  
  // Create an extra pairing between two users
  async createExtraPairing(userId1: string, userId2: string, groupId: string): Promise<boolean> {
    try {
      // Validation
      if (!validateUserId(userId1) || !validateUserId(userId2) || !validateGroupId(groupId)) {
        return false;
      }

      if (userId1 === userId2) {
        console.error('❌ Cannot pair user with themselves:', userId1);
        return false;
      }

      console.log('🔄 Creating extra pairing between users:', { userId1, userId2, groupId });
      
      const pairings = await this.getDailyPairings(groupId);
      if (!pairings || !pairings.pairs || !pairings.id) {
        console.error('❌ Invalid pairings data for extra pair creation:', pairings);
        return false;
      }
      
      // Check if either user already has an extra pair
      if (!(await this.canCreateExtraPairing(userId1, groupId)) || 
          !(await this.canCreateExtraPairing(userId2, groupId))) {
        console.log('❌ One or both users already have an extra pair');
        return false;
      }
      
      // Add new extra pair
      const newPairs = [
        ...pairings.pairs,
        {
          user1_id: userId1,
          user2_id: userId2,
          is_extra_pair: true
        }
      ];
      
      // Update pairings
      const updateResult = await supabase
        .from('daily_pairings')
        .update({ pairs: newPairs })
        .eq('id', pairings.id);
        
      if (updateResult.error) {
        console.error('❌ Error creating extra pairing:', updateResult.error);
        return false;
      }
      
      console.log('✅ Created extra pairing successfully');
      return true;
    } catch (error) {
      console.error('❌ Error in createExtraPairing:', error);
      return false;
    }
  },
  
  // Get all pairings for a user across their groups
  async getUserGroupPairings(userId: string): Promise<{
    groupId: string;
    groupName: string;
    pairing: DailyPairing;
  }[]> {
    try {
      // Validation
      if (!validateUserId(userId)) {
        return [];
      }

      console.log('🔄 Getting all group pairings for user:', userId);
      
      // Get all groups the user is in (simple memberships only)
      const membershipResult = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('user_id', userId);
        
      if (membershipResult.error) {
        console.error('❌ Error fetching user memberships:', membershipResult.error);
        return [];
      }

      if (!membershipResult.data || membershipResult.data.length === 0) {
        console.log('ℹ️ User is not a member of any groups');
        return [];
      }
      
      const today = getTodayDate();
      const results = [];
      
      // Process each membership to get group details and pairings
      for (const membership of membershipResult.data) {
        try {
          // Validate membership data
          if (!membership.group_id || !validateGroupId(membership.group_id)) {
            console.warn('⚠️ Invalid group_id in membership:', membership);
            continue;
          }

          // Get group details
          const groupResult = await supabase
            .from('groups')
            .select('id, name')
            .eq('id', membership.group_id);
          
          if (groupResult.error) {
            console.error('❌ Error fetching group details for:', membership.group_id, groupResult.error);
            continue;
          }

          if (!groupResult.data || groupResult.data.length === 0) {
            console.warn('⚠️ No group data found for:', membership.group_id);
            continue;
          }
          
          // Extract group data (custom client returns arrays)
          const group = Array.isArray(groupResult.data) ? groupResult.data[0] : groupResult.data;
          
          if (!group || !group.name) {
            console.warn('⚠️ Invalid group data:', group);
            continue;
          }
          
          // Get pairings for this group
          const pairingResult = await supabase
            .from('daily_pairings')
            .select('*')
            .eq('group_id', membership.group_id);
            
          if (pairingResult.error) {
            console.error('❌ Error fetching pairings for group:', membership.group_id, pairingResult.error);
            continue;
          }

          if (!pairingResult.data) {
            console.log('ℹ️ No pairings found for group:', membership.group_id);
            continue;
          }
          
          // Filter by today's date (custom client doesn't support multiple conditions well)
          let pairing = null;
          if (Array.isArray(pairingResult.data)) {
            pairing = pairingResult.data.find(p => p.date === today);
          } else if (pairingResult.data.date === today) {
            pairing = pairingResult.data;
          }
          
          if (!pairing || !pairing.pairs || !Array.isArray(pairing.pairs)) {
            console.log('ℹ️ No valid pairing data for group:', membership.group_id);
            continue;
          }
          
          results.push({
            groupId: membership.group_id,
            groupName: group.name,
            pairing: pairing
          });
        } catch (membershipError) {
          console.error('❌ Error processing membership for group:', membership.group_id, membershipError);
          continue;
        }
      }
      
      console.log('✅ Retrieved pairings for', results.length, 'groups out of', membershipResult.data.length, 'memberships');
      return results;
    } catch (error) {
      console.error('❌ Error in getUserGroupPairings:', error);
      return [];
    }
  }
};

// Test function to validate pairing logic (remove in production)
export const testPairingLogic = () => {
  console.log('🧪 Testing pairing logic...');
  
  // Test cases with different group sizes
  const testCases = [
    { name: 'Single user', userIds: ['user1'] },
    { name: 'Two users', userIds: ['user1', 'user2'] },
    { name: 'Three users (odd)', userIds: ['user1', 'user2', 'user3'] },
    { name: 'Four users (even)', userIds: ['user1', 'user2', 'user3', 'user4'] },
    { name: 'Five users (odd)', userIds: ['user1', 'user2', 'user3', 'user4', 'user5'] },
    { name: 'Six users (even)', userIds: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6'] },
    { name: 'Empty array', userIds: [] },
    { name: 'Duplicates', userIds: ['user1', 'user2', 'user1', 'user3'] },
    { name: 'Invalid IDs', userIds: ['user1', '', 'user2', null as any, 'user3'] }
  ];

  testCases.forEach(testCase => {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log(`   Input: ${JSON.stringify(testCase.userIds)}`);
    
    const pairs = generatePairs(testCase.userIds);
    console.log(`   Result: ${pairs.length} pairs generated`);
    
    if (pairs.length > 0) {
      pairs.forEach((pair, index) => {
        console.log(`   Pair ${index + 1}: ${pair.user1_id} vs ${pair.user2_id} (extra: ${pair.is_extra_pair || false})`);
      });
      
      // Validate that no user appears more than twice
      const userCounts = new Map<string, number>();
      pairs.forEach(pair => {
        userCounts.set(pair.user1_id, (userCounts.get(pair.user1_id) || 0) + 1);
        userCounts.set(pair.user2_id, (userCounts.get(pair.user2_id) || 0) + 1);
      });
      
      let maxAppearances = 0;
      let violatingUsers: string[] = [];
      userCounts.forEach((count, userId) => {
        if (count > 2) {
          violatingUsers.push(userId);
        }
        maxAppearances = Math.max(maxAppearances, count);
      });
      
      if (violatingUsers.length > 0) {
        console.log(`   ⚠️ VIOLATION: Users appearing more than twice: ${violatingUsers.join(', ')}`);
      } else {
        console.log(`   ✅ Valid: Max appearances per user: ${maxAppearances}`);
      }
    }
  });
  
  console.log('\n🧪 Pairing logic testing complete!');
}; 