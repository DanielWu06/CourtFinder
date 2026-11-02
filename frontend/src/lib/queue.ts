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
    walk_up: boolean
    staff_action: string | null
    staff_action_at: string | null
    extra_minutes: number
    group_members: GroupMember[]
}

export const GROUP_SELECT =
    'id, venue_id, leader_id, sport, players_needed, skill_level, status, sort_key, defer_count, deferred_until, court_id, called_at, expires_at, started_at, walk_up, staff_action, staff_action_at, extra_minutes, group_members(id, user_id, guest_name, joined_at, profile:profiles!group_members_user_id_fkey(display_name))'

export const MAX_GROUP_SIZE = 8

export function memberName(member: GroupMember) {
    return member.profile?.display_name || member.guest_name || 'Player'
}

// Walk-up groups are led by the staff member who added them, so they're named
// after their first listed person instead.
export function leaderName(group: QueueGroup) {
    if (group.walk_up) {
        const first = group.group_members[0]
        return first ? memberName(first) : 'Walk-up'
    }

    const leader = group.group_members.find((member) => member.user_id === group.leader_id)
    return leader ? memberName(leader) : 'Someone'
}

export function groupTitle(group: QueueGroup) {
    return group.walk_up ? `${leaderName(group)}'s group (walk-up)` : `${leaderName(group)}'s group`
}

export function formatName(playersNeeded: number) {
    return playersNeeded === 2 ? 'Singles' : 'Doubles'
}

// True for a short while after staff move a group, so the group's players
// understand why their place changed.
export function wasMovedByStaff(group: QueueGroup) {
    if (group.staff_action !== 'moved' || !group.staff_action_at) return false
    return Date.now() - new Date(group.staff_action_at).getTime() < 10 * 60 * 1000
}

export const queueApi = {
    // Expires overdue calls and fills free courts. Safe to call from many
    // pages at once.
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

// Staff-only actions. They ignore eligibility rules and never count as
// penalties; the database checks the caller belongs to the venue.
export const staffApi = {
    addWalkup: (args: {
        venueId: string
        sport: string
        playersNeeded: number
        skill: string
        names: string[]
    }) =>
        supabase.rpc('staff_add_walkup', {
            p_venue_id: args.venueId,
            p_sport: args.sport,
            p_players_needed: args.playersNeeded,
            p_skill: args.skill,
            p_names: args.names,
        }),

    // Places a waiting group just after another waiting group, or at the
    // front when afterGroupId is null.
    moveGroup: (groupId: string, afterGroupId: string | null) =>
        supabase.rpc('staff_move_group', {
            p_group_id: groupId,
            p_after_group_id: afterGroupId,
        }),

    removeGroup: (groupId: string) => supabase.rpc('staff_remove_group', { p_group_id: groupId }),

    // start = false calls the group; start = true puts them straight on the court.
    assignCourt: (groupId: string, courtId: string, start: boolean) =>
        supabase.rpc('staff_assign_court', {
            p_group_id: groupId,
            p_court_id: courtId,
            p_start: start,
        }),

    respond: (groupId: string, accept: boolean) =>
        supabase.rpc('staff_respond_to_call', { p_group_id: groupId, p_accept: accept }),

    cancelCall: (groupId: string) => supabase.rpc('staff_cancel_call', { p_group_id: groupId }),

    endGame: (groupId: string) => supabase.rpc('staff_end_game', { p_group_id: groupId }),

    extendGame: (groupId: string, minutes: number) =>
        supabase.rpc('staff_extend_game', { p_group_id: groupId, p_minutes: minutes }),

    setCourtStatus: (courtId: string, status: 'available' | 'unavailable') =>
        supabase.rpc('staff_set_court_status', { p_court_id: courtId, p_status: status }),

    setAutoCalling: (venueId: string, on: boolean) =>
        supabase.rpc('staff_set_auto_calling', { p_venue_id: venueId, p_on: on }),

    addGuest: (groupId: string, name: string) =>
        supabase.rpc('staff_add_guest', { p_group_id: groupId, p_name: name }),

    removeMember: (memberId: string) =>
        supabase.rpc('staff_remove_member', { p_member_id: memberId }),
}