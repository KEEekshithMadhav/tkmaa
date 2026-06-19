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
  Dumbbell,
  TrendingUp,
  Calendar
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase, getScopedStudents, getScopedTrainers } from '@/lib/supabase'
import { useBranch } from '@/context/BranchContext'
import { useSport } from '@/context/SportContext'
import { useAuth } from '@/context/AuthContext'

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

// ── Sport-specific feature labels ──
const SPORT_FEATURES = {
  'Karate': { label: 'Belt Distribution', icon: '🥋' },
  'Dance': { label: 'Performances', icon: '💃' },
  'Music': { label: 'Recitals', icon: '🎵' },
  'Chess': { label: 'Rankings', icon: '♟️' },
  'Yoga': { label: 'Sessions', icon: '🧘' },
  'Skating': { label: 'Levels', icon: '⛸️' },
}

// ── Main component ──
export function AdminDashboard() {
  const { permissions } = useAuth()
  const { branches, selectedBranch } = useBranch()
  const { selectedSport, selectedSportName, isKarate, selectedSportData } = useSport()
  const [students, setStudents] = useState([])
  const [trainers, setTrainers] = useState([])
  const [enrollment, setEnrollment] = useState({ total: 0, capacity: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalStudents: 0, totalTrainers: 0, totalBatches: 0, revenue: 0 })

  useEffect(() => {
    async function fetchData() {
      if (!permissions) return
      try {
        await loadDataForFilters(selectedBranch, selectedSport)
      } catch (err) {
        console.error("Dashboard fetch error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [permissions])

  useEffect(() => {
    if (!loading && permissions) loadDataForFilters(selectedBranch, selectedSport)
  }, [selectedBranch, selectedSport, permissions])

  async function loadDataForFilters(branchId, sportId) {
    if (!permissions) return

    // 1. Fetch Students
    const { data: studentData } = await getScopedStudents(permissions, {
      branchId,
      sportId,
      limit: 10
    })

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
    const { data: trainerData } = await getScopedTrainers(permissions, {
      branchId,
      sportId,
      limit: 6
    })

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

    // 3. Aggregate Stats
    const { role, branchIds, sportIds } = permissions

    // Student count query
    let studentCountQuery = supabase.from('students').select('*', { count: 'exact', head: true })
    if (branchId !== 'all') {
      studentCountQuery = studentCountQuery.eq('branch_id', branchId)
    } else if (branchIds.length > 0) {
      studentCountQuery = studentCountQuery.in('branch_id', branchIds)
    }
    
    let filteredStudentIds = null
    const effectiveSportId = sportId && sportId !== 'all' ? sportId : null
    if (effectiveSportId) {
      const { data: ss } = await supabase
        .from('student_sports')
        .select('student_id')
        .eq('sport_id', effectiveSportId)
      filteredStudentIds = ss?.map(s => s.student_id) || []
      if (filteredStudentIds.length === 0) {
        setEnrollment({ total: 0, capacity: 0 })
        setStats({ totalStudents: 0, totalTrainers: 0, totalBatches: 0, revenue: 0 })
        return
      }
      studentCountQuery = studentCountQuery.in('id', filteredStudentIds)
    } else if (role === 'sport_admin' && sportIds.length > 0) {
      const { data: ss } = await supabase
        .from('student_sports')
        .select('student_id')
        .in('sport_id', sportIds)
      filteredStudentIds = ss?.map(s => s.student_id) || []
      if (filteredStudentIds.length === 0) {
        setEnrollment({ total: 0, capacity: 0 })
        setStats({ totalStudents: 0, totalTrainers: 0, totalBatches: 0, revenue: 0 })
        return
      }
      studentCountQuery = studentCountQuery.in('id', filteredStudentIds)
    }
    const { count: studentCount } = await studentCountQuery

    // Trainer count query
    let trainerCountQuery = supabase.from('trainers').select('*', { count: 'exact', head: true })
    if (branchId !== 'all') {
      trainerCountQuery = trainerCountQuery.eq('branch_id', branchId)
    } else if (branchIds.length > 0) {
      trainerCountQuery = trainerCountQuery.in('branch_id', branchIds)
    }

    let filteredTrainerIds = null
    if (effectiveSportId) {
      const { data: ts } = await supabase
        .from('trainer_sports')
        .select('trainer_id')
        .eq('sport_id', effectiveSportId)
      filteredTrainerIds = ts?.map(t => t.trainer_id) || []
      if (filteredTrainerIds.length === 0) {
        // No trainers
      } else {
        trainerCountQuery = trainerCountQuery.in('id', filteredTrainerIds)
      }
    } else if (role === 'sport_admin' && sportIds.length > 0) {
      const { data: ts } = await supabase
        .from('trainer_sports')
        .select('trainer_id')
        .in('sport_id', sportIds)
      filteredTrainerIds = ts?.map(t => t.trainer_id) || []
      if (filteredTrainerIds.length === 0) {
        // No trainers
      } else {
        trainerCountQuery = trainerCountQuery.in('id', filteredTrainerIds)
      }
    }
    const { count: trainerCount } = (filteredTrainerIds && filteredTrainerIds.length === 0) ? { count: 0 } : await trainerCountQuery

    // Batch count query
    let batchCountQuery = supabase.from('batches').select('*', { count: 'exact', head: true })
    if (branchId !== 'all') {
      batchCountQuery = batchCountQuery.eq('branch_id', branchId)
    } else if (branchIds.length > 0) {
      batchCountQuery = batchCountQuery.in('branch_id', branchIds)
    }
    if (effectiveSportId) {
      batchCountQuery = batchCountQuery.eq('sport_id', effectiveSportId)
    } else if (role === 'sport_admin' && sportIds.length > 0) {
      batchCountQuery = batchCountQuery.in('sport_id', sportIds)
    }
    const { count: batchCount } = await batchCountQuery

    const total = studentCount || 0
    const maxCap = branchId === 'all' ? 1500 : 300
    setEnrollment({
      total,
      capacity: Math.min(Math.round((total / maxCap) * 100), 100),
    })

    setStats({
      totalStudents: total,
      totalTrainers: trainerCount || 0,
      totalBatches: batchCount || 0,
      revenue: 0,
    })
  }

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.member_id && s.member_id.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const selectedBranchName = selectedBranch === 'all' ? 'All Branches' : branches.find(b => b.id === selectedBranch)?.name
  const sportFeature = SPORT_FEATURES[selectedSportData?.sport_name] || null

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
            {selectedSportName === 'All Sports' ? 'Master Dashboard' : `${selectedSportName} Dashboard`}
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            {selectedSportName} overview for {selectedBranchName}.
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

      {/* ── Stats Row ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-0 bg-white shadow-sm ring-1 ring-gray-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Users className="size-5 text-blue-600" />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Students</p>
              </div>
              <p className="text-3xl font-bold text-[#0A1F30]">{stats.totalStudents}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-0 bg-white shadow-sm ring-1 ring-gray-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Shield className="size-5 text-emerald-600" />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Trainers</p>
              </div>
              <p className="text-3xl font-bold text-[#0A1F30]">{stats.totalTrainers}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-0 bg-white shadow-sm ring-1 ring-gray-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Calendar className="size-5 text-purple-600" />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Batches</p>
              </div>
              <p className="text-3xl font-bold text-[#0A1F30]">{stats.totalBatches}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-0 bg-white shadow-sm ring-1 ring-gray-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 flex items-center justify-center">
                  {sportFeature
                    ? <span className="text-xl">{sportFeature.icon}</span>
                    : <Dumbbell className="size-5 text-[#C5A059]" />
                  }
                </div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                  {sportFeature ? sportFeature.label : 'Sport Feature'}
                </p>
              </div>
              <p className="text-3xl font-bold text-[#0A1F30]">
                {isKarate ? '9 Belts' : '—'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Enrollment Bar ── */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-2xl border-0 bg-white shadow-sm ring-1 ring-gray-100">
          <CardContent className="p-5">
            <div className="flex items-end justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-[#C5A059]" />
                <span className="text-sm font-semibold text-[#0A1F30]">
                  {selectedSportName} Enrollment ({selectedBranchName})
                </span>
              </div>
              <span className="font-mono text-xs font-medium text-[#22c55e]">
                {enrollment.capacity}% Capacity
              </span>
            </div>
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

      {/* ── Bottom Row: Student Enrollment Table + Academy Trainers ── */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Recent Student Enrollment — takes 3 cols */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Card className="rounded-2xl border-0 bg-white shadow-sm ring-1 ring-gray-100">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#0A1F30]">
                  <Award className="size-4 text-[#C5A059]" />
                  Recent {selectedSportName} Students
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
                  {isKarate ? 'Rank' : 'Status'}
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

                    {/* Belt rank badge (Karate) or Active badge (others) */}
                    {isKarate ? (
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
                    ) : (
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
                        ENROLLED
                      </span>
                    )}

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
                    No students found for {selectedSportName}.
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
                  {selectedSportName} Trainers
                </CardTitle>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#0A1F30]/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#0A1F30]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                  {trainers.length} STAFF
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
                  No trainers found for {selectedSportName}.
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
