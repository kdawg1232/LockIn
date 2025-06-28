import supabase from '../../lib/supabase';

// Interfaces for group management
export interface Group {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  created_at: string;
  member_count?: number;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  // User information for display
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface CreateGroupData {
  name: string;
  description?: string;
}

// Get all groups the user is a member of
export const getUserGroups = async (userId: string) => {
  try {
    console.log('🔍 Fetching groups for user:', userId);

    // Get the user's memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('group_memberships')
      .select('group_id, role, joined_at')
      .eq('user_id', userId);

    if (membershipError) {
      console.error('❌ Error fetching group memberships:', membershipError);
      throw membershipError;
    }

    if (!memberships || memberships.length === 0) {
      console.log('✅ No group memberships found for user');
      return { data: [], error: null };
    }

    // Get groups for each membership (one by one since we don't have .in())
    const groups = [];
    for (const membership of memberships) {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('id, name, description, creator_id, created_at')
        .eq('id', membership.group_id);

      if (groupError) {
        console.error('❌ Error fetching group:', groupError);
        continue; // Skip this group if there's an error
      }

      if (groupData && groupData.length > 0) {
        // Extract the first group from the array (custom client returns arrays)
        const group = Array.isArray(groupData) ? groupData[0] : groupData;
        
        // Get member count for this group
        const { data: memberCountData, error: countError } = await supabase
          .from('group_memberships')
          .select('user_id')
          .eq('group_id', membership.group_id);
        
        const memberCount = memberCountData ? memberCountData.length : 1;
        if (countError) {
          console.error('❌ Error counting group members:', countError);
        }
        
        console.log('📝 Group data for', membership.group_id, ':', group, 'Members:', memberCount);
        groups.push({
          ...group,
          member_count: memberCount,
          user_role: membership.role,
          joined_at: membership.joined_at,
        });
      } else {
        console.log('⚠️ No group data found for', membership.group_id);
      }
    }

    console.log('✅ Successfully fetched user groups:', groups.length);
    return { data: groups, error: null };
  } catch (error) {
    console.error('❌ Error in getUserGroups:', error);
    return { data: null, error };
  }
};

// Create a new group
export const createGroup = async (groupData: CreateGroupData, creatorId: string) => {
  try {
    console.log('🔍 Creating group:', groupData.name);

    // Generate a UUID for the group (since we can't get it back from insert)
    const groupId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    // Create the group with explicit ID
    const { error: groupError } = await supabase
      .from('groups')
      .insert([
        {
          id: groupId,
          name: groupData.name,
          description: groupData.description,
          creator_id: creatorId,
        },
      ]);

    if (groupError) {
      console.error('❌ Error creating group:', groupError);
      throw groupError;
    }

    // Add creator as admin member
    const { error: membershipError } = await supabase
      .from('group_memberships')
      .insert([
        {
          group_id: groupId,
          user_id: creatorId,
          role: 'admin',
        },
      ]);

    if (membershipError) {
      console.error('❌ Error adding creator to group:', membershipError);
      throw membershipError;
    }

    // Fetch the created group to return complete data
    const { data: createdGroup, error: fetchError } = await supabase
      .from('groups')
      .select('id, name, description, creator_id, created_at')
      .eq('id', groupId);

    if (fetchError) {
      console.error('❌ Error fetching created group:', fetchError);
      // Group was created successfully, so return basic info even if fetch fails
      const basicGroupData = {
        id: groupId,
        name: groupData.name,
        description: groupData.description,
        creator_id: creatorId,
        created_at: new Date().toISOString(),
      };
      console.log('✅ Group created successfully (basic info):', basicGroupData.name);
      return { data: basicGroupData, error: null };
    }

    // Return the first group from the array (should be our group)
    const groupResult = Array.isArray(createdGroup) ? createdGroup[0] : createdGroup;
    console.log('✅ Successfully created group:', groupResult?.name || groupData.name);
    return { data: groupResult || { id: groupId, name: groupData.name, description: groupData.description, creator_id: creatorId, created_at: new Date().toISOString() }, error: null };
  } catch (error) {
    console.error('❌ Error in createGroup:', error);
    return { data: null, error };
  }
};

// Get group members with user details
export const getGroupMembers = async (groupId: string) => {
  try {
    console.log('🔍 Fetching members for group:', groupId);

    // First get the group memberships
    const { data: memberships, error } = await supabase
      .from('group_memberships')
      .select('group_id, user_id, role, joined_at')
      .eq('group_id', groupId);

    if (error) {
      console.error('❌ Error fetching group members:', error);
      throw error;
    }

    if (!memberships || memberships.length === 0) {
      console.log('✅ No members found for group');
      return { data: [], error: null };
    }

    // Fetch user details for each member
    const membersWithDetails = [];
    for (const membership of memberships) {
      console.log('🔍 Fetching user details for:', membership.user_id);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username, first_name, last_name')
        .eq('id', membership.user_id);

      if (userError) {
        console.error('❌ Error fetching user details:', userError);
        // Still include the member without user details
        membersWithDetails.push({
          group_id: membership.group_id,
          user_id: membership.user_id,
          role: membership.role,
          joined_at: membership.joined_at,
        });
        continue;
      }

      // Extract user data (custom client returns arrays)
      const user = userData && userData.length > 0 ? userData[0] : null;
      console.log('📝 User data for', membership.user_id, ':', user);

      membersWithDetails.push({
        group_id: membership.group_id,
        user_id: membership.user_id,
        role: membership.role,
        joined_at: membership.joined_at,
        username: user?.username,
        first_name: user?.first_name,
        last_name: user?.last_name,
      });
    }

    console.log('✅ Successfully fetched group members with details:', membersWithDetails.length);
    return { data: membersWithDetails, error: null };
  } catch (error) {
    console.error('❌ Error in getGroupMembers:', error);
    return { data: null, error };
  }
};

// Update group information (admin only)
export const updateGroup = async (groupId: string, updates: Partial<CreateGroupData>, userId: string) => {
  try {
    console.log('🔍 Updating group:', groupId);

    // First verify the user is the creator
    const { data: group, error: verifyError } = await supabase
      .from('groups')
      .select('creator_id')
      .eq('id', groupId);

    if (verifyError || !group || group.creator_id !== userId) {
      throw new Error('Only group creators can update groups');
    }

    // Update the group
    const { data, error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', groupId);

    if (error) {
      console.error('❌ Error updating group:', error);
      throw error;
    }

    console.log('✅ Successfully updated group');
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error in updateGroup:', error);
    return { data: null, error };
  }
};

// Remove member from group (admin only or self-leave)
export const removeMemberFromGroup = async (groupId: string, memberUserId: string, requestingUserId: string) => {
  try {
    console.log('🔍 Removing member from group:', { groupId, memberUserId, requestingUserId });

    // Allow self-removal (leaving group) or admin removal
    const isSelfLeaving = memberUserId === requestingUserId;
    
    if (!isSelfLeaving) {
      // Verify the requesting user is the group creator
      const { data: groups, error: groupError } = await supabase
        .from('groups')
        .select('creator_id')
        .eq('id', groupId);

      if (groupError || !groups || groups.length === 0) {
        throw new Error('Group not found');
      }

      const group = Array.isArray(groups) ? groups[0] : groups;
      if (group.creator_id !== requestingUserId) {
        throw new Error('Only group creators can remove members');
      }
    }

    // Remove the membership using direct HTTP DELETE
    // Since the custom client has limitations, use direct fetch
    try {
      const headers = await (supabase as any).getAuthHeaders();
      const response = await fetch(
        `${(supabase as any).baseUrl}/rest/v1/group_memberships?group_id=eq.${groupId}&user_id=eq.${memberUserId}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove member');
      }
    } catch (fetchError) {
      console.error('❌ Error removing membership via direct delete:', fetchError);
      throw fetchError;
    }



    console.log('✅ Successfully removed member from group');
    return { error: null };
  } catch (error) {
    console.error('❌ Error in removeMemberFromGroup:', error);
    return { error };
  }
};

// Delete group (admin only)
export const deleteGroup = async (groupId: string, userId: string) => {
  try {
    console.log('🔍 Deleting group:', groupId);

    // Verify the user is the group creator
    const { data: groups, error: verifyError } = await supabase
      .from('groups')
      .select('creator_id')
      .eq('id', groupId);

    if (verifyError || !groups || groups.length === 0) {
      throw new Error('Group not found');
    }

    const group = Array.isArray(groups) ? groups[0] : groups;
    if (group.creator_id !== userId) {
      throw new Error('Only group creators can delete groups');
    }

    // Delete all related data using direct HTTP DELETE calls
    try {
      const headers = await (supabase as any).getAuthHeaders();
      
      // Delete all group memberships first (due to foreign key constraints)
      const membershipResponse = await fetch(
        `${(supabase as any).baseUrl}/rest/v1/group_memberships?group_id=eq.${groupId}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      if (!membershipResponse.ok) {
        throw new Error('Failed to delete group memberships');
      }

      // Delete all group invitations
      const invitationResponse = await fetch(
        `${(supabase as any).baseUrl}/rest/v1/group_invitations?group_id=eq.${groupId}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      if (!invitationResponse.ok) {
        throw new Error('Failed to delete group invitations');
      }

      // Finally delete the group
      const groupResponse = await fetch(
        `${(supabase as any).baseUrl}/rest/v1/groups?id=eq.${groupId}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      if (!groupResponse.ok) {
        throw new Error('Failed to delete group');
      }
    } catch (deleteError) {
      console.error('❌ Error deleting group data:', deleteError);
      throw deleteError;
    }

    console.log('✅ Successfully deleted group');
    return { error: null };
  } catch (error) {
    console.error('❌ Error in deleteGroup:', error);
    return { error };
  }
};

// Search users by username (simplified)
export const searchUsers = async (searchTerm: string, currentUserId: string) => {
  try {
    console.log('🔍 Searching users:', searchTerm);

    if (!searchTerm || searchTerm.length < 1) {
      return { data: [], error: null };
    }

    // Get all users excluding current user (then filter client-side)
    // This is not ideal for performance but works with the current client
    const { data: allUsers, error } = await supabase
      .from('users')
      .select('id, username, first_name, last_name')
      .neq('id', currentUserId);

    if (error) {
      console.error('❌ Error fetching users:', error);
      throw error;
    }

    // Filter users client-side by username, first_name, or last_name
    const filteredUsers = allUsers?.filter((user: any) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        user.username?.toLowerCase().includes(searchLower) ||
        user.first_name?.toLowerCase().includes(searchLower) ||
        user.last_name?.toLowerCase().includes(searchLower)
      );
    }).slice(0, 10) || []; // Limit to 10 results

    console.log('✅ Found users:', filteredUsers.length);
    return { data: filteredUsers, error: null };
  } catch (error) {
    console.error('❌ Error in searchUsers:', error);
    return { data: null, error };
  }
}; 