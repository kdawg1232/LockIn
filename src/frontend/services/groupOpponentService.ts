import supabase from '../../lib/supabase';
import { getUserGroups } from './groupService';
import { getOpponentOfTheDay } from './opponentService';
import { groupPairingService } from './groupPairingService';

// Interface for group opponent data
export interface GroupOpponent {
  id: string;
  firstName: string;
  lastName: string;
  university: string;
  major: string;
  avatarUrl?: string;
  groupId: string;
  groupName: string;
  isFromGroup: boolean; // Distinguish between group opponents and random opponents
}

// Interface for service response
interface GroupOpponentsResponse {
  data: GroupOpponent[] | null;
  error: string | null;
}

/**
 * Fetches opponents from all groups the user belongs to using actual daily pairings
 * Returns the user's actual paired opponents from each group
 * Includes fallback logic for users with no groups
 */
export const getGroupOpponents = async (currentUserId: string): Promise<GroupOpponentsResponse> => {
  try {
    console.log('🎯 Fetching group opponents using daily pairings for user:', currentUserId);
    
    // Use the groupPairingService to get actual daily pairings for all user's groups
    const groupPairings = await groupPairingService.getUserGroupPairings(currentUserId);
    
    if (groupPairings.length === 0) {
      console.log('📝 User has no group pairings, using random opponent system');
      
      const randomOpponent = await getOpponentOfTheDay(currentUserId);
      if (randomOpponent) {
        const groupOpponent: GroupOpponent = {
          id: randomOpponent.id,
          firstName: randomOpponent.firstName,
          lastName: randomOpponent.lastName,
          university: randomOpponent.university,
          major: randomOpponent.major,
          avatarUrl: randomOpponent.avatarUrl,
          groupId: 'random',
          groupName: 'Daily Match',
          isFromGroup: false
        };
        
        return { data: [groupOpponent], error: null };
      } else {
        return { data: [], error: 'No opponents available' };
      }
    }
    
    const opponents: GroupOpponent[] = [];
    
    // Process each group's pairings
    for (const groupPairing of groupPairings) {
      const { groupId, groupName, pairing } = groupPairing;
      
      console.log('🔍 Processing pairings for group:', groupName);
      
      try {
        // Find the user's opponent in this group's pairs
        const userPair = pairing.pairs.find(pair => 
          pair.user1_id === currentUserId || pair.user2_id === currentUserId
        );
        
        if (!userPair) {
          console.log(`📝 User not found in any pairs for group ${groupName}, skipping`);
          continue;
        }
        
        // Get the opponent's ID (the other user in the pair)
        const opponentId = userPair.user1_id === currentUserId ? userPair.user2_id : userPair.user1_id;
        
        // Fetch opponent's user details
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, first_name, last_name, university, major, avatar_url')
          .eq('id', opponentId);
        
        if (userError || !userData || userData.length === 0) {
          console.error(`❌ Error fetching opponent details for ${opponentId}:`, userError);
          continue; // Skip this opponent
        }
        
        const user = Array.isArray(userData) ? userData[0] : userData;
        
        // Create group opponent object
        const groupOpponent: GroupOpponent = {
          id: user.id,
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          university: user.university || '',
          major: user.major || '',
          avatarUrl: user.avatar_url,
          groupId: groupId,
          groupName: groupName,
          isFromGroup: true
        };
        
        opponents.push(groupOpponent);
        console.log(`✅ Added paired opponent from group ${groupName}:`, `${groupOpponent.firstName} ${groupOpponent.lastName}`);
        
      } catch (error) {
        console.error(`❌ Error processing pairings for group ${groupName}:`, error);
        continue; // Skip this group on error
      }
    }
    
    // If no group opponents found, fall back to random opponent
    if (opponents.length === 0) {
      console.log('📝 No paired opponents found, falling back to random opponent');
      
      const randomOpponent = await getOpponentOfTheDay(currentUserId);
      if (randomOpponent) {
        const groupOpponent: GroupOpponent = {
          id: randomOpponent.id,
          firstName: randomOpponent.firstName,
          lastName: randomOpponent.lastName,
          university: randomOpponent.university,
          major: randomOpponent.major,
          avatarUrl: randomOpponent.avatarUrl,
          groupId: 'random',
          groupName: 'Daily Match',
          isFromGroup: false
        };
        
        opponents.push(groupOpponent);
      }
    }
    
    console.log(`🎯 Successfully fetched ${opponents.length} paired opponents`);
    return { data: opponents, error: null };
    
  } catch (error) {
    console.error('❌ Error in getGroupOpponents:', error);
    return { data: null, error: 'Failed to fetch group opponents' };
  }
};

/**
 * Gets a specific opponent by ID from the group opponents list
 * Useful for refreshing single opponent stats without refetching all
 */
export const getOpponentById = async (opponentId: string): Promise<GroupOpponent | null> => {
  try {
    console.log('🔍 Fetching opponent details for ID:', opponentId);
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, university, major, avatar_url')
      .eq('id', opponentId);
    
    if (error || !userData || userData.length === 0) {
      console.error('❌ Error fetching opponent details:', error);
      return null;
    }
    
    const user = Array.isArray(userData) ? userData[0] : userData;
    
    // Try to find which group this opponent belongs to
    // This is a simplified version - in production you might want to cache this info
    const opponent: GroupOpponent = {
      id: user.id,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      university: user.university || '',
      major: user.major || '',
      avatarUrl: user.avatar_url,
      groupId: 'unknown',
      groupName: 'Unknown Group',
      isFromGroup: true
    };
    
    return opponent;
    
  } catch (error) {
    console.error('❌ Error in getOpponentById:', error);
    return null;
  }
}; 