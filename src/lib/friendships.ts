import { useEffect, useState } from 'react'
import type { CommunityMember } from '../data/mockData'
import { databaseUpdateNeededMessage, isMissingDatabaseFeature } from './notifications'
import { communityProfileColumns, toCommunityMembers, type CommunityProfileRow } from './profile'
import { supabase } from './supabase'

export type FriendStatus = 'none' | 'outgoing' | 'incoming' | 'friends'

export type IncomingFriendRequest = { requestId: string; member: CommunityMember }

export type MyFriendships = {
  friends: CommunityMember[]
  incoming: IncomingFriendRequest[]
  outgoingIds: string[]
}

type RequestRow = { id: string; requester_id: string; addressee_id: string; status: string }

export const friendsChangedEvent = 'count-me-in-friends-changed'

function announceChange() {
  window.dispatchEvent(new Event(friendsChangedEvent))
}

async function getViewerId() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

async function membersByIds(ids: string[]): Promise<Map<string, CommunityMember>> {
  if (!supabase || ids.length === 0) return new Map()
  const { data, error } = await supabase
    .from('profiles')
    .select(communityProfileColumns)
    .in('id', ids)
    .returns<CommunityProfileRow[]>()
  if (error) throw error
  const members = await toCommunityMembers(data ?? [])
  return new Map(members.map((member) => [member.id ?? member.name, member]))
}

// Your friends and open requests. Null when you are not signed in.
export async function getMyFriendships(): Promise<MyFriendships | null> {
  const viewerId = await getViewerId()
  if (!supabase || !viewerId) return null
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${viewerId},addressee_id.eq.${viewerId}`)
    .in('status', ['pending', 'accepted'])
    .returns<RequestRow[]>()
  if (error) {
    if (isMissingDatabaseFeature(error)) return { friends: [], incoming: [], outgoingIds: [] }
    throw error
  }
  const rows = data ?? []
  const otherId = (row: RequestRow) => (row.requester_id === viewerId ? row.addressee_id : row.requester_id)
  const members = await membersByIds([...new Set(rows.map(otherId))])
  return {
    friends: rows
      .filter((row) => row.status === 'accepted')
      .flatMap((row) => members.get(otherId(row)) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name)),
    incoming: rows
      .filter((row) => row.status === 'pending' && row.addressee_id === viewerId)
      .flatMap((row) => {
        const member = members.get(row.requester_id)
        return member ? [{ requestId: row.id, member }] : []
      }),
    outgoingIds: rows.filter((row) => row.status === 'pending' && row.requester_id === viewerId).map((row) => row.addressee_id),
  }
}

// Friends of any member (accepted friendships are visible to everyone).
export async function getFriendsOf(profileId: string): Promise<CommunityMember[] | null> {
  if (!supabase || !(await getViewerId())) return null
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, requester_id, addressee_id, status')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`)
    .returns<RequestRow[]>()
  if (error) {
    if (isMissingDatabaseFeature(error)) return []
    throw error
  }
  const ids = (data ?? []).map((row) => (row.requester_id === profileId ? row.addressee_id : row.requester_id))
  const members = await membersByIds(ids)
  return ids.flatMap((id) => members.get(id) ?? []).sort((a, b) => a.name.localeCompare(b.name))
}

// Null when you are not signed in or it is your own profile.
export async function getFriendStatus(profileId: string): Promise<{ status: FriendStatus; requestId: string | null } | null> {
  const viewerId = await getViewerId()
  if (!supabase || !viewerId || viewerId === profileId) return null
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, requester_id, addressee_id, status')
    .or(`and(requester_id.eq.${viewerId},addressee_id.eq.${profileId}),and(requester_id.eq.${profileId},addressee_id.eq.${viewerId})`)
    .in('status', ['pending', 'accepted'])
    .returns<RequestRow[]>()
  if (error) {
    if (isMissingDatabaseFeature(error)) throw new Error(databaseUpdateNeededMessage)
    throw error
  }
  const row = (data ?? [])[0]
  if (!row) return { status: 'none', requestId: null }
  if (row.status === 'accepted') return { status: 'friends', requestId: row.id }
  return { status: row.requester_id === viewerId ? 'outgoing' : 'incoming', requestId: row.id }
}

async function rpc(name: string, args: Record<string, unknown>) {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { data, error } = await supabase.rpc(name, args)
  if (error) {
    if (isMissingDatabaseFeature(error)) throw new Error(databaseUpdateNeededMessage)
    throw error
  }
  announceChange()
  return data
}

export const sendFriendRequest = (profileId: string) => rpc('send_friend_request', { target_profile_id: profileId })
export const respondToFriendRequest = (requestId: string, accept: boolean) =>
  rpc('respond_to_friend_request', { target_request_id: requestId, accept })
export const removeFriend = (profileId: string) => rpc('remove_friend', { target_profile_id: profileId })

// Your friendships, refreshed whenever a request is sent or answered.
export function useMyFriendships() {
  const [state, setState] = useState<{ data: MyFriendships | null; loaded: boolean; error: string }>({
    data: null,
    loaded: false,
    error: '',
  })
  useEffect(() => {
    let active = true
    function load() {
      getMyFriendships()
        .then((data) => {
          if (active) setState({ data, loaded: true, error: '' })
        })
        .catch((error: unknown) => {
          if (active) setState((current) => ({ ...current, loaded: true, error: error instanceof Error ? error.message : 'Unable to load your friends.' }))
        })
    }
    load()
    window.addEventListener(friendsChangedEvent, load)
    return () => {
      active = false
      window.removeEventListener(friendsChangedEvent, load)
    }
  }, [])
  return state
}
