import { createClient } from '@supabase/supabase-js'

// Next.js requires NEXT_PUBLIC_ prefix for client-side env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Warning: Missing Supabase env vars. Supabase client initialized with placeholders.')
}

// Fallback to placeholder values if env vars are not set (e.g. during build/prerendering phases)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      autoRefreshToken: true,
    }
  }
)

// Auto-clear stale/invalid tokens that cause "Invalid Refresh Token" errors
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED') {
      // Token refreshed successfully — all good
    }
    if (event === 'SIGNED_OUT') {
      // Clear any stale keys from localStorage on sign out
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) localStorage.removeItem(key)
      })
    }
  })

  // If there's a stored session but it fails to refresh, clear it
  supabase.auth.getSession().then(({ error }) => {
    if (error && (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token'))) {
      console.warn('Clearing stale auth session:', error.message)
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) localStorage.removeItem(key)
      })
    }
  })
}

// ── Auth helpers ──
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user || null
}

// Role hierarchy: super_admin > sport_admin > branch_admin > admin > trainer > student > parent
export async function getUserRole(userId) {
  if (!userId) return 'student'

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  
  if (error || !data) {
    return 'student'
  }
  
  const role = (data.role || 'student').toLowerCase()
  // Backward compat: treat legacy 'admin' as 'super_admin'
  if (role === 'admin') return 'super_admin'
  return role
}

// Check if user has admin-level access
export function isAdminRole(role) {
  return ['super_admin', 'sport_admin', 'branch_admin', 'admin'].includes(role)
}

// Check if user can manage a specific sport
export async function canManageSport(userId, sportId) {
  const role = await getUserRole(userId)
  if (role === 'super_admin' || role === 'admin') return true
  
  if (role === 'sport_admin') {
    const { data } = await supabase
      .from('sport_admin_assignments')
      .select('id')
      .eq('user_id', userId)
      .eq('sport_id', sportId)
      .maybeSingle()
    return !!data
  }
  return false
}

// ── Data helpers ──
export async function getBranches() {
  const { data, error } = await supabase.from('branches').select('*').order('name')
  return { data, error }
}

export async function getBranchesForSport(sportId) {
  if (!sportId || sportId === 'all') return getBranches()
  const { data, error } = await supabase
    .from('branch_sports')
    .select('branches(*)')
    .eq('sport_id', sportId)
  const branches = data?.map(bs => bs.branches).filter(Boolean) || []
  return { data: branches, error }
}

export async function getTrainers(branchId = 'all') {
  let query = supabase.from('trainers').select('*, users(*), branches(*)')
  if (branchId !== 'all') query = query.eq('branch_id', branchId)
  const { data, error } = await query
  return { data, error }
}

export async function getTrainersForSport(sportId, branchId = 'all') {
  if (!sportId || sportId === 'all') return getTrainers(branchId)
  
  const { data: trainerSports } = await supabase
    .from('trainer_sports')
    .select('trainer_id')
    .eq('sport_id', sportId)
  
  const trainerIds = trainerSports?.map(ts => ts.trainer_id) || []
  if (trainerIds.length === 0) return { data: [], error: null }

  let query = supabase.from('trainers').select('*, users(*), branches(*)').in('id', trainerIds)
  if (branchId !== 'all') query = query.eq('branch_id', branchId)
  const { data, error } = await query
  return { data, error }
}

export async function getStudents(branchId = 'all') {
  let query = supabase.from('students').select('*, users(*), branches(*), belt_levels(*)')
  if (branchId !== 'all') query = query.eq('branch_id', branchId)
  const { data, error } = await query.order('created_at', { ascending: false })
  return { data, error }
}

export async function getStudentsForSport(sportId, branchId = 'all') {
  if (!sportId || sportId === 'all') return getStudents(branchId)

  const { data: studentSports } = await supabase
    .from('student_sports')
    .select('student_id')
    .eq('sport_id', sportId)

  const studentIds = studentSports?.map(ss => ss.student_id) || []
  if (studentIds.length === 0) return { data: [], error: null }

  let query = supabase.from('students').select('*, users(*), branches(*), belt_levels(*)').in('id', studentIds)
  if (branchId !== 'all') query = query.eq('branch_id', branchId)
  const { data, error } = await query.order('created_at', { ascending: false })
  return { data, error }
}

export async function getPayments(filters = {}) {
  let query = supabase
    .from('payments')
    .select('*, students(name, users(full_name)), branches(name)')
    .order('created_at', { ascending: false })
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.branchId) query = query.eq('branch_id', filters.branchId)
  if (filters.month) query = query.eq('month', filters.month)
  const { data, error } = await query
  return { data, error }
}

export async function addStudent(studentData) {
  const { data, error } = await supabase
    .from('students')
    .insert(studentData)
    .select()
    .single()
  return { data, error }
}

export async function addTrainer(trainerData) {
  const { data, error } = await supabase
    .from('trainers')
    .insert(trainerData)
    .select()
    .single()
  return { data, error }
}

export async function getAttendance(studentId) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false })
    .limit(30)
  return { data, error }
}

// ── Sports helpers ──
export async function getSports() {
  const { data, error } = await supabase
    .from('sports')
    .select('*')
    .order('sport_name')
  return { data, error }
}

export async function getActiveSports() {
  const { data, error } = await supabase
    .from('sports')
    .select('*')
    .eq('status', 'active')
    .order('sport_name')
  return { data, error }
}

export async function addSport(sportData) {
  const { data, error } = await supabase
    .from('sports')
    .insert(sportData)
    .select()
    .single()
  return { data, error }
}

export async function updateSport(sportId, updates) {
  const { data, error } = await supabase
    .from('sports')
    .update(updates)
    .eq('id', sportId)
    .select()
    .single()
  return { data, error }
}

export async function deleteSport(sportId) {
  const { error } = await supabase
    .from('sports')
    .delete()
    .eq('id', sportId)
  return { error }
}

export async function getBranchSports(branchId) {
  const { data, error } = await supabase
    .from('branch_sports')
    .select('*, sports(*)')
    .eq('branch_id', branchId)
  return { data, error }
}

export async function assignBranchSport(branchId, sportId) {
  const { data, error } = await supabase
    .from('branch_sports')
    .insert([{ branch_id: branchId, sport_id: sportId }])
    .select()
    .single()
  return { data, error }
}

export async function removeBranchSport(branchId, sportId) {
  const { error } = await supabase
    .from('branch_sports')
    .delete()
    .eq('branch_id', branchId)
    .eq('sport_id', sportId)
  return { error }
}

export async function assignStudentSport(studentId, sportId) {
  const { data, error } = await supabase
    .from('student_sports')
    .insert([{ student_id: studentId, sport_id: sportId }])
    .select()
    .single()
  return { data, error }
}

export async function assignTrainerSport(trainerId, sportId) {
  const { data, error } = await supabase
    .from('trainer_sports')
    .insert([{ trainer_id: trainerId, sport_id: sportId }])
    .select()
    .single()
  return { data, error }
}

// ── Role & Permission helpers ──
export async function updateUserRole(userId, newRole) {
  const { data, error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}

export async function getBranchManagers(branchId) {
  const { data, error } = await supabase
    .from('branch_managers')
    .select('*, users(id, full_name, email, role, avatar_url)')
    .eq('branch_id', branchId)
  return { data, error }
}

export async function assignBranchManager(userId, branchId) {
  // First update the user's role
  await supabase.from('users').update({ role: 'branch_admin' }).eq('id', userId)
  // Then create the assignment
  const { data, error } = await supabase
    .from('branch_managers')
    .insert([{ user_id: userId, branch_id: branchId }])
    .select()
    .single()
  return { data, error }
}

export async function removeBranchManager(userId, branchId) {
  const { error } = await supabase
    .from('branch_managers')
    .delete()
    .eq('user_id', userId)
    .eq('branch_id', branchId)
  return { error }
}

export async function assignSportAdmin(userId, sportId) {
  await supabase.from('users').update({ role: 'sport_admin' }).eq('id', userId)
  const { data, error } = await supabase
    .from('sport_admin_assignments')
    .insert([{ user_id: userId, sport_id: sportId }])
    .select()
    .single()
  return { data, error }
}

export async function removeSportAdmin(userId, sportId) {
  const { error } = await supabase
    .from('sport_admin_assignments')
    .delete()
    .eq('user_id', userId)
    .eq('sport_id', sportId)
  return { error }
}

export async function getSportAdmins(sportId) {
  const { data, error } = await supabase
    .from('sport_admin_assignments')
    .select('*, users(id, full_name, email, role)')
    .eq('sport_id', sportId)
  return { data, error }
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, phone')
    .order('full_name')
  return { data, error }
}

// ============================================================================
// SCOPED DATA FETCHERS
// These use the permissions object from AuthContext to enforce role hierarchy.
// For super_admin: permissions.branchIds/sportIds are empty → means "all"
// For others: only data within their assigned branches/sports/batches
// ============================================================================

/**
 * Build a scoped students query based on permissions.
 * @param {object} permissions - From AuthContext
 * @param {object} opts - { branchId, sportId, limit }
 */
export async function getScopedStudents(permissions, opts = {}) {
  if (!permissions) return { data: [], error: null }

  const { branchId, sportId, limit = 200 } = opts
  const { role, branchIds, sportIds, batchIds } = permissions

  // For trainers: only students in their batches
  if (role === 'trainer') {
    if (batchIds.length === 0) return { data: [], error: null }
    const { data: sbData } = await supabase
      .from('student_batches')
      .select('student_id')
      .in('batch_id', batchIds)
    const studentIds = sbData?.map(sb => sb.student_id) || []
    if (studentIds.length === 0) return { data: [], error: null }

    const { data, error } = await supabase
      .from('students')
      .select('*, users(*), branches(*), belt_levels(*)')
      .in('id', studentIds)
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  }

  // For sport_admin: students in their sport(s)
  let filteredStudentIds = null
  const effectiveSportId = sportId || (role === 'sport_admin' && sportIds.length > 0 ? sportIds[0] : null)
  if (effectiveSportId && effectiveSportId !== 'all') {
    const { data: ss } = await supabase
      .from('student_sports')
      .select('student_id')
      .eq('sport_id', effectiveSportId)
    filteredStudentIds = ss?.map(s => s.student_id) || []
    if (filteredStudentIds.length === 0) return { data: [], error: null }
  } else if (role === 'sport_admin' && sportIds.length > 0) {
    const { data: ss } = await supabase
      .from('student_sports')
      .select('student_id')
      .in('sport_id', sportIds)
    filteredStudentIds = ss?.map(s => s.student_id) || []
    if (filteredStudentIds.length === 0) return { data: [], error: null }
  }

  let query = supabase
    .from('students')
    .select('*, users(*), branches(*), belt_levels(*)')

  // Branch scoping
  const effectiveBranchId = branchId && branchId !== 'all' ? branchId : null
  if (effectiveBranchId) {
    query = query.eq('branch_id', effectiveBranchId)
  } else if (branchIds.length > 0) {
    // Non-super_admin with branch restrictions
    query = query.in('branch_id', branchIds)
  }
  // super_admin with branchIds=[] means no filter

  if (filteredStudentIds !== null) {
    query = query.in('id', filteredStudentIds)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit)
  return { data, error }
}

/**
 * Build a scoped trainers query based on permissions.
 */
export async function getScopedTrainers(permissions, opts = {}) {
  if (!permissions) return { data: [], error: null }

  const { branchId, sportId, limit = 100 } = opts
  const { role, branchIds, sportIds } = permissions

  // Trainers and students can't see trainers list (they see their own trainer via profile)
  if (role === 'student' || role === 'parent') return { data: [], error: null }

  // Sport filter
  let filteredTrainerIds = null
  const effectiveSportId = sportId || (role === 'sport_admin' && sportIds.length > 0 ? sportIds[0] : null)
  if (effectiveSportId && effectiveSportId !== 'all') {
    const { data: ts } = await supabase
      .from('trainer_sports')
      .select('trainer_id')
      .eq('sport_id', effectiveSportId)
    filteredTrainerIds = ts?.map(t => t.trainer_id) || []
    if (filteredTrainerIds.length === 0) return { data: [], error: null }
  } else if (role === 'sport_admin' && sportIds.length > 0) {
    const { data: ts } = await supabase
      .from('trainer_sports')
      .select('trainer_id')
      .in('sport_id', sportIds)
    filteredTrainerIds = ts?.map(t => t.trainer_id) || []
    if (filteredTrainerIds.length === 0) return { data: [], error: null }
  }

  let query = supabase
    .from('trainers')
    .select('*, users(*), branches(*)')

  // Branch scoping
  const effectiveBranchId = branchId && branchId !== 'all' ? branchId : null
  if (effectiveBranchId) {
    query = query.eq('branch_id', effectiveBranchId)
  } else if (branchIds.length > 0) {
    query = query.in('branch_id', branchIds)
  }

  if (filteredTrainerIds !== null) {
    query = query.in('id', filteredTrainerIds)
  }

  const { data, error } = await query.limit(limit)
  return { data, error }
}

/**
 * Build a scoped batches query based on permissions.
 */
export async function getScopedBatches(permissions, opts = {}) {
  if (!permissions) return { data: [], error: null }

  const { branchId, sportId, limit = 100 } = opts
  const { role, branchIds, sportIds, batchIds } = permissions

  // Trainer: only their batches
  if (role === 'trainer') {
    if (batchIds.length === 0) return { data: [], error: null }
    const { data, error } = await supabase
      .from('batches')
      .select('*, branches(*), sports(*), trainers(*, users(*))')
      .in('id', batchIds)
      .limit(limit)
    return { data, error }
  }

  let query = supabase
    .from('batches')
    .select('*, branches(*), sports(*), trainers(*, users(*))')

  // Branch scoping
  const effectiveBranchId = branchId && branchId !== 'all' ? branchId : null
  if (effectiveBranchId) {
    query = query.eq('branch_id', effectiveBranchId)
  } else if (branchIds.length > 0) {
    query = query.in('branch_id', branchIds)
  }

  // Sport scoping
  const effectiveSportId = sportId || (role === 'sport_admin' && sportIds.length > 0 ? sportIds[0] : null)
  if (effectiveSportId && effectiveSportId !== 'all') {
    query = query.eq('sport_id', effectiveSportId)
  } else if (role === 'sport_admin' && sportIds.length > 0) {
    query = query.in('sport_id', sportIds)
  }

  const { data, error } = await query.limit(limit)
  return { data, error }
}

/**
 * Build a scoped attendance query based on permissions.
 */
export async function getScopedAttendance(permissions, opts = {}) {
  if (!permissions) return { data: [], error: null }

  const { branchId, sportId, date, limit = 500 } = opts
  const { role, branchIds, sportIds, batchIds, studentRecord } = permissions

  // Student: own attendance only
  if (role === 'student' || role === 'parent') {
    if (!studentRecord) return { data: [], error: null }
    let query = supabase
      .from('attendance')
      .select('*')
      .eq('student_id', studentRecord.id)
      .order('date', { ascending: false })
    if (date) query = query.eq('date', date)
    const { data, error } = await query.limit(limit)
    return { data, error }
  }

  // Trainer: only students in their batches
  if (role === 'trainer') {
    if (batchIds.length === 0) return { data: [], error: null }
    // Get student IDs in trainer's batches
    const { data: sbData } = await supabase
      .from('student_batches')
      .select('student_id')
      .in('batch_id', batchIds)
    const studentIds = sbData?.map(sb => sb.student_id) || []
    if (studentIds.length === 0) return { data: [], error: null }

    let query = supabase
      .from('attendance')
      .select('*, students(*, users(full_name))')
      .in('student_id', studentIds)
      .order('date', { ascending: false })
    if (date) query = query.eq('date', date)
    const { data, error } = await query.limit(limit)
    return { data, error }
  }

  // Admin roles: build scoped query
  let query = supabase
    .from('attendance')
    .select('*, students(*, users(full_name), branches(name))')
    .order('date', { ascending: false })

  if (date) query = query.eq('date', date)

  // For sport-scoped attendance, filter by sport_id on attendance if available
  const effectiveSportId = sportId || (role === 'sport_admin' && sportIds.length > 0 ? sportIds[0] : null)
  if (effectiveSportId && effectiveSportId !== 'all') {
    query = query.eq('sport_id', effectiveSportId)
  }

  const { data, error } = await query.limit(limit)

  // Post-filter by branch if needed (attendance doesn't have branch_id directly)
  let filtered = data || []
  const effectiveBranchId = branchId && branchId !== 'all' ? branchId : null
  if (effectiveBranchId) {
    filtered = filtered.filter(a => a.students?.branch_id === effectiveBranchId)
  } else if (branchIds.length > 0) {
    filtered = filtered.filter(a => branchIds.includes(a.students?.branch_id))
  }

  return { data: filtered, error }
}

/**
 * Build a scoped payments query based on permissions.
 */
export async function getScopedPayments(permissions, opts = {}) {
  if (!permissions) return { data: [], error: null }

  const { branchId, status, limit = 200 } = opts
  const { role, branchIds, studentRecord } = permissions

  // Trainers cannot see payments
  if (role === 'trainer') return { data: [], error: null }

  // Student/parent: own payments only
  if (role === 'student' || role === 'parent') {
    if (!studentRecord) return { data: [], error: null }
    let query = supabase
      .from('payments')
      .select('*, students(name, users(full_name)), branches(name)')
      .eq('student_id', studentRecord.id)
      .order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    const { data, error } = await query.limit(limit)
    return { data, error }
  }

  // Admin roles
  let query = supabase
    .from('payments')
    .select('*, students(name, users(full_name), branch_id), branches(name)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const effectiveBranchId = branchId && branchId !== 'all' ? branchId : null
  if (effectiveBranchId) {
    query = query.eq('branch_id', effectiveBranchId)
  }

  const { data, error } = await query.limit(limit)

  // Post-filter by branch for branch_admin
  let filtered = data || []
  if (!effectiveBranchId && branchIds.length > 0) {
    filtered = filtered.filter(p => branchIds.includes(p.students?.branch_id || p.branch_id))
  }

  return { data: filtered, error }
}

/**
 * Get branches the current user can see.
 */
export async function getScopedBranches(permissions) {
  if (!permissions) return { data: [], error: null }

  const { role, branchIds } = permissions

  // Super admin: all branches
  if (role === 'super_admin' || role === 'admin') {
    return getBranches()
  }

  // Others: only their assigned branches
  if (branchIds.length === 0) return { data: [], error: null }
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .in('id', branchIds)
    .order('name')
  return { data, error }
}

/**
 * Get sports the current user can see.
 */
export async function getScopedSports(permissions) {
  if (!permissions) return { data: [], error: null }

  const { role, sportIds, branchIds } = permissions

  // Super admin: all sports
  if (role === 'super_admin' || role === 'admin') {
    return getActiveSports()
  }

  // Branch admin: all sports in their branch(es)
  if (role === 'branch_admin' && branchIds.length > 0) {
    const { data: branchSports } = await supabase
      .from('branch_sports')
      .select('sports(*)')
      .in('branch_id', branchIds)
    const sports = branchSports?.map(bs => bs.sports).filter(Boolean) || []
    // Deduplicate by id
    const unique = [...new Map(sports.map(s => [s.id, s])).values()]
    return { data: unique.sort((a, b) => a.sport_name.localeCompare(b.sport_name)), error: null }
  }

  // Sport admin / trainer: only assigned sports
  if (sportIds.length === 0) return { data: [], error: null }
  const { data, error } = await supabase
    .from('sports')
    .select('*')
    .in('id', sportIds)
    .eq('status', 'active')
    .order('sport_name')
  return { data, error }
}
