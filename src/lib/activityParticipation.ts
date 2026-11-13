import {
  databaseUpdateNeededMessage,
  isMissingDatabaseFeature,
} from "./notifications"
import { fixAustralianLatitude, isMissingLocationColumns } from "./location"
import { supabase } from "./supabase"
import {
  getDefaultActivityHero,
  type Activity,
  type ActivityIcon,
} from "../data/mockData"

export type JoinRequestStatus = "pending" | "accepted" | "declined" | "cancelled"

export type ActivityJoinParticipant = {
  id: string
  name: string
  photoUrl: string | null
}

export type PendingActivityJoinRequest = ActivityJoinParticipant & {
  message: string
}

export type ActivityJoinState = {
  status: JoinRequestStatus | null
  acceptedParticipants: ActivityJoinParticipant[]
  pendingRequests: PendingActivityJoinRequest[]
}

export type MySavedActivity = Omit<Activity, "id"> & {
  id: string
  joinStatus: "hosting" | "requested" | "going"
  pendingRequestCount: number
}

export type FeedActivity = Omit<Activity, "id"> & {
  id: string
  viewerJoinStatus: "pending" | "accepted" | null
}

function requireSupabase() {
  if (!supabase) throw new Error("Supabase is not configured yet.")
  return supabase
}

function isJoinRequestStatus(value: string): value is JoinRequestStatus {
  return (
    value === "pending" ||
    value === "accepted" ||
    value === "declined" ||
    value === "cancelled"
  )
}

export async function getActivityJoinState(
  activityId: string,
): Promise<ActivityJoinState> {
  const client = requireSupabase()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error("Sign in to view activity members.")

  const { data: requests, error: requestsError } = await client
    .from("activity_join_requests")
    .select("user_id, request_message, status")
    .eq("activity_id", activityId)
  if (requestsError) throw requestsError

  const rows = requests ?? []
  const profileIds = [...new Set(rows.map((request) => request.user_id))]
  const { data: profiles, error: profilesError } = profileIds.length
    ? await client
        .from("profiles")
        .select("id, first_name, photo_url")
        .in("id", profileIds)
    : { data: [], error: null }
  if (profilesError) throw profilesError

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  )
  const acceptedParticipants = rows
    .filter((request) => request.status === "accepted")
    .flatMap((request) => {
      const profile = profilesById.get(request.user_id)
      return profile
        ? [
            {
              id: request.user_id,
              name: profile.first_name,
              photoUrl: profile.photo_url,
            },
          ]
        : []
    })
  const pendingRequests = rows
    .filter(
      (request) =>
        request.status === "pending" && request.user_id !== userData.user.id,
    )
    .flatMap((request) => {
      const profile = profilesById.get(request.user_id)
      return profile
        ? [
            {
              id: request.user_id,
              name: profile.first_name,
              photoUrl: profile.photo_url,
              message: request.request_message,
            },
          ]
        : []
    })
  const viewerRequest = rows.find(
    (request) => request.user_id === userData.user.id,
  )

  return {
    status:
      viewerRequest && isJoinRequestStatus(viewerRequest.status)
        ? viewerRequest.status
        : null,
    acceptedParticipants,
    pendingRequests,
  }
}

export async function getSavedActivityFeed(): Promise<FeedActivity[]> {
  const client = requireSupabase()
  const { data: sessionData, error: sessionError } =
    await client.auth.getSession()
  if (sessionError) throw sessionError
  const viewerId = sessionData.session?.user.id ?? null

  const { data: activityRows, error: activitiesError } = await client
    .from("activities")
    .select(
      "id, host_id, sport_id, title, starts_at, meeting_point, suburb, spots_total, level_wanted, notes, sport_details, cover_image_url",
    )
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
  if (activitiesError) throw activitiesError

  // Moderators and admins can also read activities waiting for review: keep
  // those out of the feed (your own stay visible to you). Separate query, so the
  // feed still works before the review_status column exists.
  const rows = activityRows ?? []
  const reviewResult = rows.length
    ? await client.from("activities").select("id, review_status").in("id", rows.map((row) => row.id))
    : { data: [], error: null }
  const notLive = new Set(
    (reviewResult.error ? [] : reviewResult.data ?? [])
      .filter((row) => row.review_status !== "approved")
      .map((row) => row.id as string),
  )
  const visibleRows = rows.filter((row) => !notLive.has(row.id) || row.host_id === viewerId)

  return toFeedActivities(client, visibleRows, viewerId)
}

// Activities waiting for a moderator, as the same cards as on Home (staff only, via RLS).
export async function getActivitiesWaitingForReview(): Promise<FeedActivity[]> {
  const client = requireSupabase()
  const { data: sessionData } = await client.auth.getSession()
  const { data, error } = await client
    .from("activities")
    .select(feedActivityColumns)
    .eq("review_status", "pending")
    .order("created_at", { ascending: true })
  if (error) throw error
  return toFeedActivities(client, (data ?? []) as ActivityFeedRow[], sessionData.session?.user.id ?? null)
}

type ActivityFeedRow = {
  id: string
  host_id: string
  sport_id: number
  title: string
  starts_at: string
  meeting_point: string
  suburb: string
  spots_total: number
  level_wanted: string
  notes: string
  sport_details: unknown
  cover_image_url: string | null
}

const feedActivityColumns =
  "id, host_id, sport_id, title, starts_at, meeting_point, suburb, spots_total, level_wanted, notes, sport_details, cover_image_url"

// One activity as the same card data as on Home (for activities shared in a chat).
export async function getFeedActivity(id: string): Promise<FeedActivity | null> {
  const client = requireSupabase()
  const { data: sessionData } = await client.auth.getSession()
  const { data, error } = await client.from("activities").select(feedActivityColumns).eq("id", id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const [activity] = await toFeedActivities(client, [data], sessionData.session?.user.id ?? null)
  return activity ?? null
}

async function toFeedActivities(
  client: ReturnType<typeof requireSupabase>,
  rows: ActivityFeedRow[],
  viewerId: string | null,
): Promise<FeedActivity[]> {
  if (!rows.length) return []

  const activityIds = rows.map((activity) => activity.id)
  const profileIds = [...new Set(rows.map((activity) => activity.host_id))]
  const sportIds = [...new Set(rows.map((activity) => activity.sport_id))]
  const [requestsResult, profilesResult, sportsResult, pinsResult] = await Promise.all([
    viewerId
      ? client
          .from("activity_join_requests")
          .select("activity_id, user_id, status")
          .in("activity_id", activityIds)
          .in("status", ["pending", "accepted"])
      : Promise.resolve({ data: [], error: null }),
    client.from("profiles").select("id, first_name, photo_url").in("id", profileIds),
    client.from("sports").select("id, name").in("id", sportIds),
    // Separate query so the feed still loads before the map pin columns exist.
    client.from("activities").select("id, latitude, longitude").in("id", activityIds),
  ])
  if (requestsResult.error) throw requestsResult.error
  if (pinsResult.error && !isMissingLocationColumns(pinsResult.error)) throw pinsResult.error
  const pinsById = new Map(
    (pinsResult.error ? [] : pinsResult.data ?? []).map((pin) => [pin.id, pin]),
  )
  if (profilesResult.error) throw profilesResult.error
  if (sportsResult.error) throw sportsResult.error

  const requests = requestsResult.data ?? []
  const acceptedProfileIds = requests
    .filter((request) => request.status === "accepted")
    .map((request) => request.user_id)
  const acceptedProfilesResult = acceptedProfileIds.length
    ? await client
        .from("profiles")
        .select("id, first_name, photo_url")
        .in("id", acceptedProfileIds)
    : { data: [], error: null }
  if (acceptedProfilesResult.error) throw acceptedProfilesResult.error

  const profilesById = new Map(
    [...(profilesResult.data ?? []), ...(acceptedProfilesResult.data ?? [])].map(
      (profile) => [profile.id, profile],
    ),
  )
  const sportNames = new Map(
    (sportsResult.data ?? []).map((sport) => [sport.id, sport.name]),
  )

  return rows.flatMap((activity): FeedActivity[] => {
    const sport = sportNames.get(activity.sport_id)
    const hostProfile = profilesById.get(activity.host_id)
    const host = hostProfile?.first_name
    if (!sport || !host) return []

    const activityRequests = requests.filter(
      (request) => request.activity_id === activity.id,
    )
    const acceptedRequests = activityRequests.filter(
      (request) => request.status === "accepted",
    )
    const acceptedProfiles = acceptedRequests.flatMap((request) => {
      const profile = profilesById.get(request.user_id)
      return profile ? [profile] : []
    })
    const sportDetails =
      typeof activity.sport_details === "object" &&
      activity.sport_details !== null &&
      !Array.isArray(activity.sport_details)
        ? Object.values(activity.sport_details).filter(
            (value): value is string =>
              typeof value === "string" && value.trim() !== "",
          )
        : []
    const viewerRequest = activityRequests.find(
      (request) => request.user_id === viewerId,
    )

    return [
      {
        id: activity.id,
        sport,
        title: activity.title,
        startsAt: new Date(activity.starts_at),
        facts: sportDetails.slice(0, 3).join(" · "),
        details: {},
        place: activity.meeting_point,
        suburb: activity.suburb,
        latitude: fixAustralianLatitude(pinsById.get(activity.id)?.latitude ?? null, pinsById.get(activity.id)?.longitude ?? null),
        longitude: pinsById.get(activity.id)?.longitude ?? null,
        host,
        spotsTotal: activity.spots_total,
        spotsTaken: acceptedRequests.length,
        level: activity.level_wanted,
        icon: getSportIcon(sport),
        hero: activity.cover_image_url ?? getDefaultActivityHero(sport),
        hostMeta: "",
        notes: activity.notes,
        attendees: [
          host,
          ...acceptedProfiles.map((profile) => profile.first_name),
        ],
        attendeePhotos: [
          hostProfile?.photo_url ?? null,
          ...acceptedProfiles.map((profile) => profile.photo_url),
        ],
        viewerJoinStatus:
          viewerRequest?.status === "pending" ||
          viewerRequest?.status === "accepted"
            ? viewerRequest.status
            : null,
      },
    ]
  })
}

export async function getMySavedActivities(): Promise<MySavedActivity[]> {
  const client = requireSupabase()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError?.name === "AuthSessionMissingError") return []
  if (userError) throw userError
  if (!userData.user) return []

  const userId = userData.user.id
  const [hostedResult, ownRequestsResult] = await Promise.all([
    client
      .from("activities")
      .select(
        "id, host_id, sport_id, title, starts_at, meeting_point, suburb, spots_total, level_wanted, notes, sport_details, cover_image_url",
      )
      .eq("host_id", userId),
    client
      .from("activity_join_requests")
      .select("activity_id, status")
      .eq("user_id", userId)
      .in("status", ["pending", "accepted"]),
  ])
  if (hostedResult.error) throw hostedResult.error
  if (ownRequestsResult.error) throw ownRequestsResult.error

  const hostedActivities = hostedResult.data ?? []
  const ownRequests = ownRequestsResult.data ?? []
  const activityIds = [
    ...new Set([
      ...hostedActivities.map((activity) => activity.id),
      ...ownRequests.map((request) => request.activity_id),
    ]),
  ]
  if (activityIds.length === 0) return []

  const [activitiesResult, requestsResult] = await Promise.all([
    client
      .from("activities")
      .select(
        "id, host_id, sport_id, title, starts_at, meeting_point, suburb, spots_total, level_wanted, notes, sport_details, cover_image_url",
      )
      .in("id", activityIds),
    client
      .from("activity_join_requests")
      .select("activity_id, user_id, status")
      .in("activity_id", activityIds)
      .in("status", ["pending", "accepted"]),
  ])
  if (activitiesResult.error) throw activitiesResult.error
  if (requestsResult.error) throw requestsResult.error

  const activities = activitiesResult.data ?? []
  const requests = requestsResult.data ?? []
  const profileIds = [
    ...new Set([
      ...activities.map((activity) => activity.host_id),
      ...requests
        .filter((request) => request.status === "accepted")
        .map((request) => request.user_id),
    ]),
  ]
  const sportIds = [...new Set(activities.map((activity) => activity.sport_id))]
  const [profilesResult, sportsResult] = await Promise.all([
    client.from("profiles").select("id, first_name, photo_url").in("id", profileIds),
    client.from("sports").select("id, name").in("id", sportIds),
  ])
  if (profilesResult.error) throw profilesResult.error
  if (sportsResult.error) throw sportsResult.error

  const profilesById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile]),
  )
  const sportNames = new Map(
    (sportsResult.data ?? []).map((sport) => [sport.id, sport.name]),
  )

  return activities
    .flatMap((activity): MySavedActivity[] => {
      const sport = sportNames.get(activity.sport_id)
      const hostProfile = profilesById.get(activity.host_id)
      const host = hostProfile?.first_name
      if (!sport || !host) return []

      const ownRequest = ownRequests.find(
        (request) => request.activity_id === activity.id,
      )
      const isHost = activity.host_id === userId
      if (!isHost && !ownRequest) return []

      const activityRequests = requests.filter(
        (request) => request.activity_id === activity.id,
      )
      const acceptedRequests = activityRequests.filter(
        (request) => request.status === "accepted",
      )
      const acceptedProfiles = acceptedRequests.flatMap((request) => {
        const profile = profilesById.get(request.user_id)
        return profile ? [profile] : []
      })
      const sportDetails =
        typeof activity.sport_details === "object" &&
        activity.sport_details !== null &&
        !Array.isArray(activity.sport_details)
          ? Object.values(activity.sport_details).filter(
              (value): value is string =>
              typeof value === "string" && value.trim() !== "",
            )
          : []
      const icon: ActivityIcon = getSportIcon(sport)
      const isUpcoming = Date.parse(activity.starts_at) >= Date.now()
      if (!isUpcoming) return []

      return [
        {
          id: activity.id,
          sport,
          title: activity.title,
          startsAt: new Date(activity.starts_at),
          facts: sportDetails.slice(0, 3).join(" · "),
          details: {},
          place: activity.meeting_point,
          suburb: activity.suburb,
          host,
          spotsTotal: activity.spots_total,
          spotsTaken: acceptedRequests.length,
          level: activity.level_wanted,
          icon,
          hero: activity.cover_image_url ?? getDefaultActivityHero(sport),
          hostMeta: "",
          notes: activity.notes,
          attendees: [
          host,
          ...acceptedProfiles.map((profile) => profile.first_name),
        ],
        attendeePhotos: [
          hostProfile?.photo_url ?? null,
          ...acceptedProfiles.map((profile) => profile.photo_url),
        ],
          joinStatus: isHost
            ? "hosting"
            : ownRequest?.status === "accepted"
              ? "going"
              : "requested",
          pendingRequestCount: isHost
            ? activityRequests.filter((request) => request.status === "pending")
                .length
            : 0,
        },
      ]
    })
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())
}

function getSportIcon(sport: string): ActivityIcon {
  const normalizedSport = sport.toLowerCase()
  if (normalizedSport.includes("fish") || normalizedSport.includes("scuba"))
    return "fish"
  if (normalizedSport.includes("run") || normalizedSport.includes("jog"))
    return "run"
  if (normalizedSport.includes("bike") || normalizedSport.includes("cycling"))
    return "bike"
  if (
    normalizedSport.includes("surf") ||
    normalizedSport.includes("swim") ||
    normalizedSport.includes("kite") ||
    normalizedSport.includes("kayak") ||
    normalizedSport.includes("sailing")
  )
    return "waves"
  if (normalizedSport.includes("gym")) return "gym"
  return "mountain"
}

export async function requestToJoinActivity(
  activityId: string,
  message = "",
): Promise<"pending" | "accepted"> {
  const { data, error } = await requireSupabase().rpc(
    "request_to_join_activity",
    {
      target_activity_id: activityId,
      request_message: message.trim(),
    },
  )
  if (error) throw error
  if (data !== "pending" && data !== "accepted") {
    throw new Error("The join request was not saved. Please try again.")
  }
  return data
}

export async function respondToActivityJoinRequest(
  activityId: string,
  userId: string,
  response: "accepted" | "declined",
) {
  const { error } = await requireSupabase().rpc(
    "respond_to_activity_join_request",
    {
      target_activity_id: activityId,
      target_user_id: userId,
      response,
    },
  )
  if (error) throw error
}

export async function cancelActivityJoinRequest(activityId: string) {
  const { error } = await requireSupabase().rpc(
    "cancel_activity_join_request",
    { target_activity_id: activityId },
  )
  if (error) throw error
}

export async function leaveActivity(activityId: string, message = "") {
  const { error } = await requireSupabase().rpc("leave_activity", {
    target_activity_id: activityId,
    leave_message: message.trim(),
  })
  if (error) {
    if (isMissingDatabaseFeature(error))
      throw new Error(databaseUpdateNeededMessage)
    throw error
  }
}

export type InvitedActivity = FeedActivity & {
  invitedBy: string
  invitedByPhotoUrl: string | null
  invitedAt: string
}

export async function getPendingInvites(): Promise<InvitedActivity[]> {
  const client = requireSupabase()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError?.name === "AuthSessionMissingError") return []
  if (userError) throw userError
  if (!userData.user) return []

  const { data: invites, error: invitesError } = await client
    .from("activity_invites")
    .select("activity_id, invited_by, created_at")
    .eq("invitee_id", userData.user.id)
    .eq("status", "pending")
  if (invitesError) throw invitesError
  if (!invites?.length) return []

  const [feed, invitersResult] = await Promise.all([
    getSavedActivityFeed(),
    client
      .from("profiles")
      .select("id, first_name, photo_url")
      .in("id", [...new Set(invites.map((invite) => invite.invited_by))]),
  ])
  if (invitersResult.error) throw invitersResult.error
  const invitersById = new Map(
    (invitersResult.data ?? []).map((profile) => [profile.id, profile]),
  )

  return invites
    .flatMap((invite): InvitedActivity[] => {
      const activity = feed.find((item) => item.id === invite.activity_id)
      if (!activity || activity.viewerJoinStatus === "accepted") return []
      const inviter = invitersById.get(invite.invited_by)
      return [
        {
          ...activity,
          invitedBy: inviter?.first_name ?? "Someone",
          invitedByPhotoUrl: inviter?.photo_url ?? null,
          invitedAt: invite.created_at,
        },
      ]
    })
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())
}

export async function respondToActivityInvite(
  activityId: string,
  response: "accepted" | "declined",
) {
  const { error } = await requireSupabase().rpc("respond_to_activity_invite", {
    target_activity_id: activityId,
    response,
  })
  if (error) {
    if (isMissingDatabaseFeature(error))
      throw new Error(databaseUpdateNeededMessage)
    throw error
  }
  window.dispatchEvent(new Event("count-me-in-invites-changed"))
}

// Host takes the activity down. Everyone going or waiting gets a notification
// with the optional message. Returns how many members were notified.
export async function cancelActivity(activityId: string, message = "") {
  const { data, error } = await requireSupabase().rpc("cancel_activity", {
    target_activity_id: activityId,
    cancel_message: message.trim(),
  })
  if (error) {
    if (isMissingDatabaseFeature(error))
      throw new Error(databaseUpdateNeededMessage)
    throw error
  }
  return typeof data === "number" ? data : 0
}

export type ProfileActivities = {
  upcoming: FeedActivity[]
  latest: FeedActivity | null
}

// Activities a member hosts or is going to: upcoming ones, plus the most
// recent one that already happened.
export async function getProfileActivities(
  profileId: string,
): Promise<ProfileActivities> {
  const client = requireSupabase()
  const { data: sessionData, error: sessionError } =
    await client.auth.getSession()
  if (sessionError) throw sessionError
  const viewerId = sessionData.session?.user.id ?? null

  const { data: joined, error: joinedError } = await client
    .from("activity_join_requests")
    .select("activity_id")
    .eq("user_id", profileId)
    .eq("status", "accepted")
  if (joinedError) throw joinedError

  const joinedIds = (joined ?? []).map((row) => row.activity_id)
  const filter = joinedIds.length
    ? `host_id.eq.${profileId},id.in.(${joinedIds.join(",")})`
    : `host_id.eq.${profileId}`
  const now = new Date().toISOString()

  const [upcomingResult, latestResult] = await Promise.all([
    client
      .from("activities")
      .select(feedActivityColumns)
      .or(filter)
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(5),
    client
      .from("activities")
      .select(feedActivityColumns)
      .or(filter)
      .lt("starts_at", now)
      .order("starts_at", { ascending: false })
      .limit(1),
  ])
  if (upcomingResult.error) throw upcomingResult.error
  if (latestResult.error) throw latestResult.error

  const [upcoming, latest] = await Promise.all([
    toFeedActivities(client, upcomingResult.data ?? [], viewerId),
    toFeedActivities(client, latestResult.data ?? [], viewerId),
  ])
  return { upcoming, latest: latest[0] ?? null }
}
