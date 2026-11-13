import { supabase } from "./supabase"

export type ReportTargetType = "profile" | "activity" | "personal_record"
export type ReportReason = "inappropriate_or_sexual_content" | "harassment_or_bullying" | "spam_or_scam" | "fake_profile" | "safety_concern" | "other"

export type BlockedProfile = {
  id: string
  name: string
}

export type ModerationRole = "user" | "moderator" | "admin"
export type ModerationReportStatus = "open" | "in_review" | "resolved" | "dismissed"
export type ModerationReport = {
  id: string
  target_type: ReportTargetType
  target_id: string
  target_user_id: string | null
  reason: ReportReason
  note: string
  evidence: Record<string, unknown>
  status: ModerationReportStatus
  created_at: string
}

function requireSupabase() {
  if (!supabase) throw new Error("Supabase is not configured yet.")
  return supabase
}

function isMissingAuthSession(error: { name?: string; message?: string }) {
  return error.name === 'AuthSessionMissingError' || error.message === 'Auth session missing!'
}

export async function resolveProfileIdByName(name: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from("profiles")
    .select("id")
    .eq("first_name", name)
    .limit(2)

  if (error) throw error
  if (!data?.length)
    throw new Error(
      "This is a demo profile and cannot be reported or blocked yet.",
    )
  if (data.length > 1)
    throw new Error(
      "More than one member has this name. Open their account profile and try again.",
    )
  return data[0].id
}

export async function submitModerationReport(
  targetType: ReportTargetType,
  targetId: string,
  reason: ReportReason,
  note: string,
) {
  const client = requireSupabase()
  const { data, error } = await client.rpc("submit_moderation_report", {
    target_type: targetType,
    target_id: targetId,
    report_reason: reason,
    report_note: note.trim(),
  })

  if (error) throw error
  if (typeof data !== "string")
    throw new Error("The report was not saved. Please try again.")
  return data
}

export async function blockProfile(userId: string) {
  const client = requireSupabase()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error("Sign in before blocking a member.")
  if (userData.user.id === userId)
    throw new Error("You cannot block your own profile.")

  const { error } = await client.from("blocked_users").insert({
    blocker_id: userData.user.id,
    blocked_user_id: userId,
  })
  if (error && error.code !== "23505") throw error
}

export async function unblockProfile(userId: string) {
  const client = requireSupabase()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!userData.user)
    throw new Error("Sign in before changing blocked members.")

  const { error } = await client
    .from("blocked_users")
    .delete()
    .eq("blocker_id", userData.user.id)
    .eq("blocked_user_id", userId)
  if (error) throw error
}

export async function getBlockedProfiles(): Promise<BlockedProfile[]> {
  const client = requireSupabase()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError && !isMissingAuthSession(userError)) throw userError
  if (!userData.user) return []

  const { data: blocks, error: blocksError } = await client
    .from("blocked_users")
    .select("blocked_user_id")
    .eq("blocker_id", userData.user.id)
  if (blocksError) throw blocksError
  if (!blocks?.length) return []

  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("id, first_name")
    .in(
      "id",
      blocks.map((block) => block.blocked_user_id),
    )
  if (profilesError) throw profilesError

  return (profiles ?? []).map((profile) => ({
    id: profile.id,
    name: profile.first_name,
  }))
}

export async function getCurrentModerationRole(): Promise<ModerationRole | null> {
  const client = requireSupabase()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError && !isMissingAuthSession(userError)) throw userError
  if (!userData.user) return null

  const { data, error } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  if (
    data.role !== "user" &&
    data.role !== "moderator" &&
    data.role !== "admin"
  ) {
    throw new Error("Your account has an invalid moderation role.")
  }
  return data.role
}

export async function getModerationReports(): Promise<ModerationReport[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from("moderation_reports")
    .select(
      "id, target_type, target_id, target_user_id, reason, note, evidence, status, created_at",
    )
    .order("created_at", { ascending: false })
  if (error) throw error

  const reports = (data ?? []) as ModerationReport[]
  const priority: Record<ReportReason, number> = {
    safety_concern: 0,
    harassment_or_bullying: 1,
    inappropriate_or_sexual_content: 2,
    fake_profile: 3,
    spam_or_scam: 4,
    other: 5,
  }
  return reports.sort(
    (left, right) =>
      priority[left.reason] - priority[right.reason] ||
      Date.parse(right.created_at) - Date.parse(left.created_at),
  )
}

export async function updateModerationReportStatus(
  reportId: string,
  status: ModerationReportStatus,
) {
  const client = requireSupabase()
  const { error } = await client
    .from("moderation_reports")
    .update({ status })
    .eq("id", reportId)
  if (error) throw error
}

// Team (admin only): who is moderator or admin, and changing a member's role.
export type TeamMember = { id: string; name: string; photoUrl: string | null; role: ModerationRole }

export async function getModerationTeam(): Promise<TeamMember[]> {
  const client = requireSupabase()
  const { data: roles, error } = await client
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["moderator", "admin"])
  if (error) throw error
  const ids = (roles ?? []).map((row) => row.user_id as string)
  if (ids.length === 0) return []
  const { data: profiles, error: profileError } = await client
    .from("profiles")
    .select("id, first_name, photo_url")
    .in("id", ids)
  if (profileError) throw profileError
  const byId = new Map((profiles ?? []).map((profile) => [profile.id as string, profile]))
  return (roles ?? [])
    .map((row) => {
      const profile = byId.get(row.user_id as string)
      return {
        id: row.user_id as string,
        name: (profile?.first_name as string) ?? "Member",
        photoUrl: (profile?.photo_url as string | null) ?? null,
        role: row.role as ModerationRole,
      }
    })
    .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === "admin" ? -1 : 1))
}

export async function searchMembersByName(query: string): Promise<Array<{ id: string; name: string; photoUrl: string | null; suburb: string }>> {
  const client = requireSupabase()
  const term = query.trim()
  if (term.length < 2) return []
  const { data, error } = await client
    .from("profiles")
    .select("id, first_name, photo_url, suburb")
    .ilike("first_name", `%${term.replace(/[%_]/g, "")}%`)
    .order("first_name")
    .limit(10)
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: (row.first_name as string) ?? "Member",
    photoUrl: (row.photo_url as string | null) ?? null,
    suburb: (row.suburb as string) ?? "",
  }))
}

export async function setMemberRole(userId: string, role: "user" | "moderator") {
  const client = requireSupabase()
  const { error } = await client.rpc("set_member_role", { target_user_id: userId, new_role: role })
  if (error) throw error
}

// Admin only: a member's profile as filled in, to fix it for them.
export type AdminProfile = {
  id: string
  email: string
  firstName: string
  dateOfBirth: string
  suburb: string
  bio: string
  photoUrl: string | null
}

export async function adminGetProfile(userId: string): Promise<AdminProfile | null> {
  const client = requireSupabase()
  const { data, error } = await client.rpc("admin_get_profile", { target_user_id: userId })
  if (error) {
    if (error.code === "PGRST202") throw new Error("Editing member profiles needs a database update (SQL 20 in docs/sql-to-run.md).")
    throw error
  }
  const row = (data as Array<Record<string, string | null>> | null)?.[0]
  if (!row) return null
  return {
    id: String(row.id),
    email: row.email ?? "",
    firstName: row.first_name ?? "",
    dateOfBirth: row.date_of_birth ?? "",
    suburb: row.suburb ?? "",
    bio: row.bio ?? "",
    photoUrl: row.photo_url,
  }
}

// Saves the changes and sends the member a notification saying what changed.
export async function adminUpdateProfile(input: {
  userId: string
  firstName: string
  dateOfBirth: string
  suburb: string
  bio: string
  removePhoto: boolean
  note: string
  newPhoto?: File | null
}) {
  const client = requireSupabase()
  // A new photo (already cropped to a square) goes into the member's own folder.
  let newPhotoUrl: string | null = null
  if (input.newPhoto) {
    const path = `${input.userId}/${Date.now()}.jpg`
    const { error: uploadError } = await client.storage.from("avatars").upload(path, input.newPhoto, {
      cacheControl: "3600",
      contentType: "image/jpeg",
      upsert: false,
    })
    if (uploadError) {
      if (/row-level security|unauthorized|403/i.test(uploadError.message)) {
        throw new Error("Uploading a photo for a member needs a database update (SQL 21 in docs/sql-to-run.md).")
      }
      throw uploadError
    }
    newPhotoUrl = client.storage.from("avatars").getPublicUrl(path).data.publicUrl
  }
  const { error } = await client.rpc("admin_update_profile", {
    target_user_id: input.userId,
    new_first_name: input.firstName,
    new_date_of_birth: input.dateOfBirth,
    new_suburb: input.suburb,
    new_bio: input.bio,
    remove_photo: input.removePhoto,
    note: input.note,
    new_photo_url: newPhotoUrl,
  })
  if (error) {
    if (error.code === "PGRST202") throw new Error("Editing member profiles needs a database update (SQL 20 and 21 in docs/sql-to-run.md).")
    throw error
  }
  return newPhotoUrl
}
