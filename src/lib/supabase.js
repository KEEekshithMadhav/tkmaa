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
  supabaseAnonKey || 'placeholder-anon-key'
)

// ── Auth helpers ──
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user || null
}

export async function getUserRole(userId) {
  // First get the user's email from auth if possible to apply an admin bypass
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user?.email === 'madhav@gmail.com' || session?.user?.email === 'admin@gmail.com') {
    return 'admin'
  }

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  return (data?.role || 'student').toLowerCase()
}

// ── Data helpers ──
export async function getBranches() {
  const { data, error } = await supabase.from('branches').select('*').order('name')
  return { data, error }
}

export async function getTrainers(branchId = 'all') {
  let query = supabase.from('trainers').select('*, users(*), branches(*)')
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
  await supabase.from('users').update({ role: 'branch_manager' }).eq('id', userId)
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

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, phone')
    .order('full_name')
  return { data, error }
}
