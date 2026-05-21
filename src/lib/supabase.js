import { createClient } from '@supabase/supabase-js'

// Next.js requires NEXT_PUBLIC_ prefix for client-side env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars. Check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
