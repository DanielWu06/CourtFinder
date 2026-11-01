import { supabase } from './supabase'

export type GroupStatus = 'waiting' | 'called' | 'playing' | 'done' | 'left' | 'removed'

export type GroupMember = {
    id: string
    user_id: string | null
    guest_name: string | null
    joined_at: string
    profile: { display_name: string | null } | null
}

export type QueueGroup = {
    id: string
    venue_id: string
    leader_id: string
    sport: string
    players_needed: number
    skill_level: string
    status: GroupStatus
    sort_key: number
    defer_count: number
    deferred_until: string | null
    court_id: string | null
    called_at: string | null
    expires_at: string | null
    started_at: string | null
    group_members: GroupMember[]
}

export const GROUP_SELECT =
    'id, venue_id, leader_id, sport, players_needed, skill_level, status, sort_key, defer_count, deferred_until, court_id, called_at, expires_at, started_at, group_members(id, user_id, guest_name, joined_at, profile:profiles!group_members_user_id_fkey(display_name))'

export const MAX_GROUP_SIZE = 8

export function memberName(member: GroupMember) {
    return member.profile?.display_name || member.guest_name || 'Player'
}

export function leaderName(group: QueueGroup) {
    const leader = group.group_members.find((member) => member.user_id === group.leader_id)
    return leader ? memberName(leader) : 'Someone'
}

export function groupTitle(group: QueueGroup) {
    return `${leaderName(group)}'s group`
}

export function formatName(playersNeeded: number) {
    return playersNeeded === 2 ? 'Singles' : 'Doubles'
}

export const queueApi = {
    // Expires overdue calls and fills free courts. Safe to call from multiple user pages
    process: (venueId: string) =>
        supabase.rpc('process_venue_queue', { p_venue_id: venueId }),

    createGroup: (args: {
        venueId: string
        sport: string
        playersNeeded: number
        skill: string
        guests: string[]
    }) =>
        supabase.rpc('create_group', {
            p_venue_id: args.venueId,
            p_sport: args.sport,
            p_players_needed: args.playersNeeded,
            p_skill: args.skill,
            p_guests: args.guests,
        }),

    joinGroup: (venueId: string, code: string) =>
        supabase.rpc('join_group', { p_venue_id: venueId, p_code: code }),

    addGuest: (groupId: string, name: string) =>
        supabase.rpc('add_guest', { p_group_id: groupId, p_name: name }),

    removeMember: (memberId: string) =>
        supabase.rpc('remove_member', { p_member_id: memberId }),

    leaveQueue: (groupId: string) => supabase.rpc('leave_queue', { p_group_id: groupId }),

    respond: (groupId: string, accept: boolean) =>
        supabase.rpc('respond_to_call', { p_group_id: groupId, p_accept: accept }),

    finish: (groupId: string) => supabase.rpc('finish_game', { p_group_id: groupId }),

    groupCode: (groupId: string) => supabase.rpc('get_group_code', { p_group_id: groupId }),
}