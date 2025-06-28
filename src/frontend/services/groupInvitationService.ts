import supabase from '../../lib/supabase';

// Interfaces for group invitations
export interface GroupInvitation {
  id: string;
  group_id: string;
  inviter_id: string;
  invitee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  // Additional data for display
  group_name?: string;
  group_description?: string;
  inviter_name?: string;
  inviter_username?: string;
}

// Send invitation to join a group (simplified)
export const sendGroupInvitation = async (groupId: string, inviteeId: string, inviterId: string) => {
  try {
    console.log('🔍 Sending group invitation:', { groupId, inviteeId, inviterId });

    // Generate a UUID for the invitation
    const invitationId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    // Create the invitation (simplified - skip duplicate checks for now due to client limitations)
    const { error } = await supabase
      .from('group_invitations')
      .insert([
        {
          id: invitationId,
          group_id: groupId,
          inviter_id: inviterId,
          invitee_id: inviteeId,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error('❌ Error sending group invitation:', error);
      throw error;
    }

    console.log('✅ Successfully sent group invitation');
    return { data: { id: invitationId }, error: null };
  } catch (error) {
    console.error('❌ Error in sendGroupInvitation:', error);
    return { data: null, error };
  }
};

// Send invitations to multiple users
export const sendMultipleInvitations = async (groupId: string, inviteeIds: string[], inviterId: string) => {
  try {
    console.log('🔍 Sending multiple group invitations:', { groupId, count: inviteeIds.length });

    const results = await Promise.allSettled(
      inviteeIds.map(inviteeId => sendGroupInvitation(groupId, inviteeId, inviterId))
    );

    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    console.log(`✅ Sent ${successful} invitations, ${failed} failed`);
    
    return {
      successful,
      failed,
      results,
      error: null
    };
  } catch (error) {
    console.error('❌ Error in sendMultipleInvitations:', error);
    return { successful: 0, failed: inviteeIds.length, results: [], error };
  }
};

// Get pending invitations for a user (simplified)
export const getPendingInvitations = async (userId: string) => {
  try {
    console.log('🔍 Fetching pending invitations for user:', userId);

    // Get invitations for the user
    const { data: invitations, error } = await supabase
      .from('group_invitations')
      .select('id, group_id, inviter_id, invitee_id, status, created_at, updated_at')
      .eq('invitee_id', userId);

    if (error) {
      console.error('❌ Error fetching invitations:', error);
      throw error;
    }

    // Filter for pending status (client-side since we can't chain multiple conditions)
    const pendingInvitations = invitations?.filter((inv: any) => inv.status === 'pending') || [];

    // Transform the data for easier use (without group/user details for now)
    const transformedInvitations: GroupInvitation[] = pendingInvitations.map((invitation: any) => ({
      id: invitation.id,
      group_id: invitation.group_id,
      inviter_id: invitation.inviter_id,
      invitee_id: invitation.invitee_id,
      status: invitation.status,
      created_at: invitation.created_at,
      updated_at: invitation.updated_at,
      // Note: group_name, inviter_name etc. will be populated separately if needed
    }));

    console.log('✅ Successfully fetched pending invitations:', transformedInvitations.length);
    return { data: transformedInvitations, error: null };
  } catch (error) {
    console.error('❌ Error in getPendingInvitations:', error);
    return { data: null, error };
  }
};

// Accept a group invitation (simplified)
export const acceptGroupInvitation = async (invitationId: string, userId: string) => {
  try {
    console.log('🔍 Accepting group invitation:', invitationId);

    // Get the invitation details first
    const { data: invitations, error: inviteError } = await supabase
      .from('group_invitations')
      .select('group_id, invitee_id, status')
      .eq('id', invitationId);

    if (inviteError || !invitations || invitations.length === 0) {
      throw new Error('Invitation not found');
    }

    const invitation = Array.isArray(invitations) ? invitations[0] : invitations;

    // Verify it's the right user and status
    if (invitation.invitee_id !== userId || invitation.status !== 'pending') {
      throw new Error('Invalid invitation or already processed');
    }

    // Update invitation status to accepted
    const { error: updateError } = await supabase
      .from('group_invitations')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (updateError) {
      console.error('❌ Error updating invitation status:', updateError);
      throw updateError;
    }

    // Add user to group as member
    const { error: membershipError } = await supabase
      .from('group_memberships')
      .insert([
        {
          group_id: invitation.group_id,
          user_id: userId,
          role: 'member',
        },
      ]);

    if (membershipError) {
      console.error('❌ Error adding user to group:', membershipError);
      throw membershipError;
    }

    console.log('✅ Successfully accepted group invitation');
    return { error: null };
  } catch (error) {
    console.error('❌ Error in acceptGroupInvitation:', error);
    return { error };
  }
};

// Decline a group invitation (simplified)
export const declineGroupInvitation = async (invitationId: string, userId: string) => {
  try {
    console.log('🔍 Declining group invitation:', invitationId);

    // Simple update without complex chaining
    const { error } = await supabase
      .from('group_invitations')
      .update({ 
        status: 'declined',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (error) {
      console.error('❌ Error declining invitation:', error);
      throw error;
    }

    console.log('✅ Successfully declined group invitation');
    return { error: null };
  } catch (error) {
    console.error('❌ Error in declineGroupInvitation:', error);
    return { error };
  }
};

// Get invitation count for a user (simplified)
export const getPendingInvitationCount = async (userId: string) => {
  try {
    console.log('🔍 Fetching pending invitation count for user:', userId);

    // Get all invitations for the user
    const { data: invitations, error } = await supabase
      .from('group_invitations')
      .select('status')
      .eq('invitee_id', userId);

    if (error) {
      console.error('❌ Error fetching invitations:', error);
      throw error;
    }

    // Count pending ones client-side
    const pendingCount = invitations?.filter((inv: any) => inv.status === 'pending').length || 0;

    console.log('✅ Pending invitations count:', pendingCount);
    return { count: pendingCount, error: null };
  } catch (error) {
    console.error('❌ Error in getPendingInvitationCount:', error);
    return { count: 0, error };
  }
};

// Get all invitations for a user with group and inviter details
export const getAllInvitations = async (userId: string) => {
  try {
    console.log('🔍 Fetching all invitations for user:', userId);

    // Get invitations for the user
    const { data: invitations, error } = await supabase
      .from('group_invitations')
      .select('id, group_id, inviter_id, invitee_id, status, created_at, updated_at')
      .eq('invitee_id', userId);

    if (error) {
      console.error('❌ Error fetching invitations:', error);
      throw error;
    }

    if (!invitations || invitations.length === 0) {
      console.log('✅ No invitations found');
      return { data: [], error: null };
    }

    // Sort invitations by creation date (newest first)
    const sortedInvitations = invitations.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Get unique group IDs and inviter IDs for batch fetching
    const groupIds = [...new Set(sortedInvitations.map((inv: any) => inv.group_id as string))] as string[];
    const inviterIds = [...new Set(sortedInvitations.map((inv: any) => inv.inviter_id as string))] as string[];

    // Fetch group details for each group (since we can't use .in() in our simple client)
    const groupPromises = groupIds.map(async (groupId: string) => {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, description')
        .eq('id', groupId);
      
      if (error) {
        console.error('❌ Error fetching group:', groupId, error);
        return null;
      }
      
      return data && data.length > 0 ? data[0] : null;
    });

    // Fetch inviter details for each user
    const inviterPromises = inviterIds.map(async (inviterId: string) => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, username')
        .eq('id', inviterId);
      
      if (error) {
        console.error('❌ Error fetching user:', inviterId, error);
        return null;
      }
      
      return data && data.length > 0 ? data[0] : null;
    });

    // Wait for all promises to resolve
    const [groupResults, inviterResults] = await Promise.all([
      Promise.all(groupPromises),
      Promise.all(inviterPromises)
    ]);

    // Create lookup maps for efficient data joining
    const groupsMap = new Map();
    groupResults.forEach((group: any, index: number) => {
      if (group) {
        groupsMap.set(groupIds[index], group);
      }
    });

    const invitersMap = new Map();
    inviterResults.forEach((user: any, index: number) => {
      if (user) {
        invitersMap.set(inviterIds[index], user);
      }
    });

    // Transform the data with group and inviter details
    const transformedInvitations: GroupInvitation[] = sortedInvitations.map((invitation: any) => {
      const group = groupsMap.get(invitation.group_id);
      const inviter = invitersMap.get(invitation.inviter_id);

      return {
        id: invitation.id,
        group_id: invitation.group_id,
        inviter_id: invitation.inviter_id,
        invitee_id: invitation.invitee_id,
        status: invitation.status,
        created_at: invitation.created_at,
        updated_at: invitation.updated_at,
        // Add group details
        group_name: group?.name || 'Unknown Group',
        group_description: group?.description || '',
        // Add inviter details
        inviter_name: inviter 
          ? `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || inviter.username || 'Unknown User'
          : 'Unknown User',
        inviter_username: inviter?.username || '',
      };
    });

    console.log('✅ Successfully fetched all invitations with details:', transformedInvitations.length);
    return { data: transformedInvitations, error: null };
  } catch (error) {
    console.error('❌ Error in getAllInvitations:', error);
    return { data: null, error };
  }
}; 