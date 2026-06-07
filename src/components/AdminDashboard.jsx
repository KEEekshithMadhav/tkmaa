'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Download,
  Plus,
  Search,
  Users,
  Shield,
  Award,
  UserPlus,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useBranch } from '@/context/BranchContext'

// ── Belt color map ──
const BELT_COLORS = {
  'BLACK BELT': '#1a1a1a',
  'BROWN BELT': '#8B4513',
  'GREEN BELT': '#22c55e',
  'YELLOW BELT': '#eab308',
  'WHITE BELT': '#e5e7eb',
  'ORANGE BELT': '#f97316',
  'BLUE BELT': '#3b82f6',
}

// ── Attendance color map ──
const ATT_COLORS = {
  good: '#22c55e',
  moderate: '#eab308',
  poor: '#ef4444',
}

// ── Mock Head Instructor ──
const MOCK_HEAD_INSTRUCTOR = {
  name: 'Master Elena Vance',
  initials: 'EV',
  rank: '5TH DAN BLACK BELT',
  description:
    'Head Admin and Chief Instructor of Central Branch. Over 15 years of disciplinary excellence in Shotokan Karate.',
  online: true,
}

// ── Animation variants ──
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// ── Initials avatar component ──
function InitialsAvatar({ initials, size = 'md', bgColor, online }) {
  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
  }

  return (
    <div className="relative inline-flex">
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-heading font-semibold text-white shadow-sm`}
        style={{ backgroundColor: bgColor || '#0A1F30' }}
      >
        {initials}
      </div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 block w-3 h-3 rounded-full border-2 border-white ${
            online ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
      )}
    </div>
  )
}

// ── Main component ──
export function AdminDashboard() {
  const { branches, selectedBranch } = useBranch()
  const [students, setStudents] = useState([])
  const [trainers, setTrainers] = useState([])
  const [enrollment, setEnrollment] = useState({ total: 0, capacity: 0 })
  const [headInstructor] = useState(MOCK_HEAD_INSTRUCTOR)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        await loadDataForBranch(selectedBranch)
      } catch (err) {
        console.error("Dashboard fetch error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (!loading) loadDataForBranch(selectedBranch)
  }, [selectedBranch])

  async function loadDataForBranch(branchId) {
    // 1. Fetch Students
    let sQuery = supabase.from('students').select('*, users(*), belt_levels(*)')
    if (branchId !== 'all') sQuery = sQuery.eq('branch_id', branchId)
    sQuery = sQuery.order('created_at', { ascending: false }).limit(10)
    
    const { data: studentData } = await sQuery

    if (studentData) {
      setStudents(
        studentData.map((s) => ({
          id: s.id,
          member_id: s.member_id || 'N/A',
          name: s.users?.full_name || s.name || 'Unknown',
          initials: (s.users?.full_name || s.name || 'UN').split(' ').map((n) => n[0]).join('').toUpperCase(),
          belt: s.belt_levels?.name?.toUpperCase() || 'WHITE BELT',
          attendance: 'good',
          color: BELT_COLORS[s.belt_levels?.name?.toUpperCase()] || '#3b82f6',
        }))
      )
    } else {
      setStudents([])
    }

    // 2. Fetch Trainers
    let tQuery = supabase.from('trainers').select('*, users(*)')
    if (branchId !== 'all') tQuery = tQuery.eq('branch_id', branchId)
    tQuery = tQuery.limit(6)

    const { data: trainerData } = await tQuery

    if (trainerData) {
      setTrainers(
        trainerData.map((t) => ({
          id: t.id,
          member_id: t.member_id || 'N/A',
          name: t.users?.full_name || t.name || 'Unknown',
          initials: (t.users?.full_name || t.name || 'UN').split(' ').map((n) => n[0]).join('').toUpperCase(),
          role: (Array.isArray(t.specialization) && t.specialization.length > 0) ? t.specialization[0].toUpperCase() : 'INSTRUCTOR',
          tags: t.certifications || [],
          color: '#0A1F30',
        }))
      )
    } else {
      setTrainers([])
    }

    // 3. Fetch Enrollment Count
    let cQuery = supabase.from('students').select('*', { count: 'exact', head: true })
    if (branchId !== 'all') cQuery = cQuery.eq('branch_id', branchId)
    
    const { count } = await cQuery

    if (count !== null) {
      // Assuming a max capacity of 1500 for total, or 300 per branch
      const maxCap = branchId === 'all' ? 1500 : 300
      setEnrollment({
        total: count,
        capacity: Math.min(Math.round((count / maxCap) * 100), 100),
      })
    }
  }

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.member_id && s.member_id.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const selectedBranchName = selectedBranch === 'all' ? 'All Branches' : branches.find(b => b.id === selectedBranch)?.name

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full space-y-6 p-1"
    >
      {/* ── Header ── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0A1F30] sm:text-3xl">
            Master Dashboard
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            Academy overview for {selectedBranchName}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="default" className="gap-1.5 text-xs h-10">
            <Download className="size-3.5" />
            Export Data
          </Button>
          <Button
            size="default"
            className="gap-1.5 bg-[#0A1F30] text-xs text-white hover:bg-[#0A1F30]/90 h-10"
          >
            <Plus className="size-3.5 text-[#C5A059]" />
            <span>Register New</span>
          </Button>
        </div>
      </motion.div>

      {/* ── Top Row: Enrollment + Head Instructor ── */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Active Enrollment */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-0 bg-white shadow-sm ring-1 ring-gray-100">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A1F30]/5">
                  <Users className="size-4 text-[#0A1F30]" />
                </div>
                <CardTitle className="text-sm font-medium text-gray-500">
                  Active Enrollment ({selectedBranchName})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <span className="font-heading text-4xl font-bold tracking-tight text-[#0A1F30]">
                  {enrollment.total.toLocaleString()}
                </span>
                <span className="mb-1 font-mono text-xs font-medium text-[#22c55e]">
                  {enrollment.capacity}% Capacity
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#22c55e] to-[#16a34a]"
                  initial={{ width: 0 }}
                  animate={{ width: `${enrollment.capacity}%` }}
                  transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Head Instructor Card */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-0 bg-[#0A1F30] text-white shadow-sm ring-0">
            <CardContent className="flex items-start gap-4 pt-2">
              <InitialsAvatar
                initials={headInstructor.initials}
                size="lg"
                bgColor="#C5A059"
                online={headInstructor.online}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading text-base font-semibold">
                    {headInstructor.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-[#C5A059]">
                    <Shield className="size-3" />
                    {headInstructor.rank}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-white/70">
                  {headInstructor.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Bottom Row: Student Enrollment Table + Academy Trainers ── */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Recent Student Enrollment — takes 3 cols */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Card className="rounded-2xl border-0 bg-white shadow-sm ring-1 ring-gray-100">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#0A1F30]">
                  <Award className="size-4 text-[#C5A059]" />
                  Recent Student Enrollment
                </CardTitle>
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-gray-100 pb-2">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Student / ID
                </span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Rank
                </span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-center w-8">
                  ATT
                </span>
              </div>

              {/* Table rows */}
              <div className="divide-y divide-gray-50">
                {filteredStudents.map((student, idx) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.08 }}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-3"
                  >
                    {/* Student name + avatar */}
                    <div className="flex items-center gap-3 min-w-0">
                      <InitialsAvatar
                        initials={student.initials}
                        size="sm"
                        bgColor={student.color}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate font-sans text-sm font-medium text-[#0A1F30]">
                          {student.name}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">{student.member_id}</span>
                      </div>
                    </div>

                    {/* Belt rank badge */}
                    <span
                      className="inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider"
                      style={{
                        backgroundColor:
                          (BELT_COLORS[student.belt] || '#e5e7eb') + '18',
                        color: BELT_COLORS[student.belt] || '#6b7280',
                        border: `1px solid ${
                          (BELT_COLORS[student.belt] || '#e5e7eb') + '30'
                        }`,
                      }}
                    >
                      {student.belt}
                    </span>

                    {/* Attendance dot */}
                    <div className="flex justify-center w-8">
                      <span
                        className="block h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            ATT_COLORS[student.attendance] || '#9ca3af',
                        }}
                      />
                    </div>
                  </motion.div>
                ))}

                {filteredStudents.length === 0 && (
                  <div className="py-8 text-center text-xs text-gray-400">
                    No students found.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Academy Trainers — takes 2 cols */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="rounded-2xl border-0 bg-white shadow-sm ring-1 ring-gray-100">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#0A1F30]">
                  Academy Trainers
                </CardTitle>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#0A1F30]/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#0A1F30]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                  {trainers.length} STAFF ON DUTY
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {trainers.map((trainer, idx) => (
                <motion.div
                  key={trainer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + idx * 0.1 }}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5"
                >
                  <div className="flex items-start gap-3">
                    <InitialsAvatar
                      initials={trainer.initials}
                      size="sm"
                      bgColor={trainer.color}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-sans text-sm font-semibold text-[#0A1F30] truncate pr-2">
                          {trainer.name}
                        </h4>
                        <span className="text-[9px] font-mono font-semibold text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                          {trainer.member_id}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] font-medium tracking-wider text-gray-400 mt-0.5">
                        {trainer.role}
                      </p>
                      {/* Tags */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {trainer.tags && trainer.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-md bg-[#C5A059]/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-[#C5A059]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {trainers.length === 0 && (
                <div className="py-6 text-center text-xs text-gray-400">
                  No trainers found in this branch.
                </div>
              )}

              {/* Add staff button */}
              <Button
                variant="outline"
                className="mt-1 w-full gap-1.5 border-dashed border-gray-200 text-xs text-gray-400 hover:border-[#C5A059] hover:text-[#C5A059]"
              >
                <UserPlus className="size-3.5" />
                ADD STAFF MEMBER
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default AdminDashboard
