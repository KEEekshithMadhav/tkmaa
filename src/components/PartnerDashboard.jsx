'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  MapPin, Users, IndianRupee, AlertCircle, Calendar, RefreshCw,
  Loader2, Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 130, damping: 18 } },
}

export function PartnerDashboard() {
  const { can, permissions, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [trainerInfo, setTrainerInfo] = useState(null)
  const [branch, setBranch] = useState(null)
  const [students, setStudents] = useState([])
  const [payments, setPayments] = useState([])
  const [beltCounts, setBeltCounts] = useState([])
  const [sportCounts, setSportCounts] = useState([])
  const [trainerSports, setTrainerSports] = useState([])
  const [batches, setBatches] = useState([])
  const [todayAttendance, setTodayAttendance] = useState([])

  const canSeePayments = can('FEE_TRACKING')

  useEffect(() => {
    if (!authLoading && permissions) {
      loadData()
    }
  }, [authLoading, permissions])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Not logged in'); setLoading(false); return }

      const userId = session.user.id

      // 1. Get this trainer's record
      const { data: trainer, error: trainerErr } = await supabase
        .from('trainers')
        .select('id, branch_id, experience_yrs, specialization, users(full_name, email, phone), branches(id, name, location, phone), trainer_sports(sport_id, sports(sport_name))')
        .eq('user_id', userId)
        .maybeSingle()

      if (trainerErr) throw trainerErr

      if (!trainer || !trainer.branch_id) {
        setError('Your trainer profile has no branch assigned yet. Please contact admin.')
        setLoading(false)
        return
      }

      setTrainerInfo(trainer)
      setBranch(trainer.branches)

      const sportsList = trainer.trainer_sports?.map(ts => ts.sports?.sport_name).filter(Boolean) || []
      setTrainerSports(sportsList)

      const branchId = trainer.branch_id
      const trainerId = trainer.id

      // 2. Batches ONLY assigned to this trainer
      const { data: branchBatches } = await supabase
        .from('batches')
        .select('id, batch_name, start_time, end_time, max_students')
        .eq('trainer_id', trainerId)
        .eq('is_active', true)
        .order('start_time')
      const batchList = branchBatches || []
      setBatches(batchList)

      // 3. Students ONLY in this trainer's assigned batches
      const batchIds = batchList.map(b => b.id)
      let studentList = []

      if (batchIds.length > 0) {
        const { data: sbData } = await supabase
          .from('student_batches')
          .select('student_id')
          .in('batch_id', batchIds)
        const studentIds = sbData?.map(sb => sb.student_id) || []

        if (studentIds.length > 0) {
          const { data: activeStudents } = await supabase
            .from('students')
            .select('id, join_date, is_active, users(full_name), belt_levels(id, name, color, hex, order_rank), student_sports(sport_id, sports(sport_name))')
            .in('id', studentIds)
            .eq('is_active', true)
            .order('join_date', { ascending: false })
          studentList = activeStudents || []
        }
      }

      setStudents(studentList)
      buildBeltCounts(studentList)
      buildSportCounts(studentList)

      // 4. Payments ONLY if authorized (Fee Tracking permission)
      if (canSeePayments) {
        const { data: branchPayments } = await supabase
          .from('payments')
          .select('id, amount, month, status, payment_date, payment_mode, students(users(full_name))')
          .eq('branch_id', branchId)
          .order('created_at', { ascending: false })
          .limit(10)
        setPayments(branchPayments || [])
      }

      // 5. Today's attendance for these students
      const today = new Date().toISOString().split('T')[0]
      const studentIds = studentList.map(s => s.id)
      if (studentIds.length > 0) {
        const { data: attData } = await supabase
          .from('attendance')
          .select('student_id, status')
          .in('student_id', studentIds)
          .eq('date', today)
        setTodayAttendance(attData || [])
      }

    } catch (err) {
      console.error('PartnerDashboard error:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  function buildBeltCounts(studentList) {
    const counts = {}
    studentList.forEach(s => {
      const isKarateStudent = s.student_sports?.some(ss => ss.sports?.sport_name === 'Karate') || s.belt_levels
      if (!isKarateStudent) return
      
      const belt = s.belt_levels?.name || 'White'
      const hex = s.belt_levels?.hex || '#FFFFFF'
      if (!counts[belt]) counts[belt] = { belt, count: 0, color: hex, rank: s.belt_levels?.order_rank || 1 }
      counts[belt].count++
    })
    const arr = Object.values(counts).sort((a, b) => b.rank - a.rank)
    const max = arr[0]?.count || 1
    setBeltCounts(arr.map(b => ({ ...b, pct: Math.round((b.count / max) * 100) })))
  }

  function buildSportCounts(studentList) {
    const counts = {}
    studentList.forEach(s => {
      const sSports = s.student_sports || []
      sSports.forEach(ss => {
        const name = ss.sports?.sport_name
        if (name) {
          counts[name] = (counts[name] || 0) + 1
        }
      })
    })
    const arr = Object.entries(counts).map(([name, count]) => ({ name, count }))
    const max = Math.max(...arr.map(x => x.count), 1)
    setSportCounts(arr.map(x => ({ ...x, pct: Math.round((x.count / max) * 100) })).sort((a, b) => b.count - a.count))
  }

  const totalStudents = students.length
  const paidAmount = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const pendingCount = payments.filter(p => p.status === 'pending' || p.status === 'overdue').length
  const presentToday = todayAttendance.filter(a => a.status === 'present').length

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-gold" />
          <p className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Loading Your Dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-bold text-[#0A1F30]">Dashboard Error</h2>
        <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        <Button onClick={loadData} className="gap-2 bg-[#0A1F30] text-white rounded-xl">
          <RefreshCw className="size-4" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">

      {/* ── Header ── */}
      <motion.header variants={fadeUp} className="space-y-1">
        <Badge variant="outline" className="mb-2 gap-1.5 rounded-full border-gold/30 bg-gold/5 px-3 py-1 text-xs font-semibold text-gold-dark">
          <MapPin className="size-3" />
          {branch?.name} · {branch?.location}
        </Badge>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-[#0A1F30]">
              {branch?.name} — Trainer Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Trainer: <span className="font-semibold text-[#0A1F30]">{trainerInfo?.users?.full_name}</span>
              {trainerSports.length > 0 && (
                <span className="inline-flex gap-1.5 ml-2.5">
                  {trainerSports.map(sport => (
                    <Badge key={sport} variant="secondary" className="text-[9px] bg-gold/15 text-gold-dark hover:bg-gold/25 font-bold uppercase tracking-wider py-0.5 px-2 rounded-md">
                      {sport}
                    </Badge>
                  ))}
                </span>
              )}
            </p>
          </div>
          <Button onClick={loadData} variant="outline" size="sm" className="gap-2 rounded-xl shrink-0">
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
        </div>
      </motion.header>

      {/* ── KPI Row ── */}
      <div className={`grid gap-4 sm:grid-cols-2 ${canSeePayments ? 'lg:grid-cols-4' : 'lg:grid-cols-2'}`}>
        {/* Students */}
        <motion.div variants={fadeUp}>
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                <Users className="size-4 text-gold" /> Active Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="font-heading text-4xl font-extrabold text-[#0A1F30]">{totalStudents}</span>
              <p className="text-xs text-muted-foreground mt-1">in your assigned batches</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Present Today */}
        <motion.div variants={fadeUp}>
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                <Calendar className="size-4 text-emerald-500" /> Present Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="font-heading text-4xl font-extrabold text-emerald-600">{presentToday}</span>
              <p className="text-xs text-muted-foreground mt-1">
                of {totalStudents} students
                {totalStudents > 0 && <> ({Math.round((presentToday / totalStudents) * 100)}%)</>}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Fee Collected (Optional) */}
        {canSeePayments && (
          <motion.div variants={fadeUp}>
            <Card className="rounded-2xl border-transparent bg-[#0A1F30] text-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
                  <IndianRupee className="size-4 text-gold" /> Fee Collected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="font-heading text-3xl font-extrabold text-gold">
                  ₹{paidAmount.toLocaleString('en-IN')}
                </span>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pending Dues (Optional) */}
        {canSeePayments && (
          <motion.div variants={fadeUp}>
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  <AlertCircle className="size-4 text-red-400" /> Pending Dues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="font-heading text-4xl font-extrabold text-red-500">{pendingCount}</span>
                <p className="text-xs text-muted-foreground mt-1">students overdue</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* ── Batches + Belt Distribution ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Batches — 2 cols */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card className="rounded-2xl border-border/60 shadow-sm h-full">
            <CardHeader>
              <CardTitle className="font-heading text-sm font-semibold text-[#0A1F30]">
                Your Active Batches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {batches.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No batches assigned to you yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Contact your Administrator.</p>
                </div>
              ) : (
                batches.map(b => (
                  <div key={b.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-4 py-3 hover:bg-muted/60 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-[#0A1F30]">{b.batch_name || 'Unnamed Batch'}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {b.start_time?.slice(0, 5)} – {b.end_time?.slice(0, 5)}
                      </p>
                    </div>
                    <Badge className="rounded-full bg-gold/10 text-gold-dark border-transparent text-[10px] font-black uppercase tracking-wider">
                      Max {b.max_students}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Belt Distribution / Sport Breakdown — 1 col */}
        <motion.div variants={fadeUp}>
          {trainerSports.includes('Karate') || trainerSports.length === 0 ? (
            <Card className="rounded-2xl border-transparent bg-[#1B3022] text-white shadow-lg h-full">
              <CardHeader>
                <CardTitle className="font-heading text-sm font-semibold text-white/90">
                  Belt Distribution
                </CardTitle>
                <p className="text-[10px] text-white/30 font-mono uppercase tracking-wider">{branch?.name}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {beltCounts.length === 0 ? (
                  <p className="text-xs text-white/30 py-4 text-center">No belt data available</p>
                ) : (
                  beltCounts.map(b => (
                    <div key={b.belt} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-white/70">{b.belt} Belt</span>
                        <span className="font-mono text-white/50">{b.count} students</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${b.pct}%` }}
                          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: b.color === '#FFFFFF' ? '#d1d5db' : b.color }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border-transparent bg-[#0A1F30] text-white shadow-lg h-full">
              <CardHeader>
                <CardTitle className="font-heading text-sm font-semibold text-white/90">
                  Sport Breakdown
                </CardTitle>
                <p className="text-[10px] text-white/30 font-mono uppercase tracking-wider">{branch?.name}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {sportCounts.length === 0 ? (
                  <p className="text-xs text-white/30 py-4 text-center">No students registered in sports yet.</p>
                ) : (
                  sportCounts.map(s => (
                    <div key={s.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-white/70">{s.name}</span>
                        <span className="font-mono text-white/50">{s.count} students</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${s.pct}%` }}
                          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                          className="h-full rounded-full bg-gold"
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* ── Recent Students ── */}
      <motion.div variants={fadeUp}>
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-sm font-semibold text-[#0A1F30]">
              Students under your instruction
            </CardTitle>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
              {totalStudents} active members
            </p>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No students in your batches yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="pb-2 pr-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Name</th>
                      <th className="pb-2 pr-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                        {trainerSports.includes('Karate') || trainerSports.length === 0 ? 'Belt' : 'Sports'}
                      </th>
                      <th className="pb-2 text-right text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.slice(0, 8).map(s => (
                      <tr key={s.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-4 font-medium text-[#0A1F30]">
                          {s.users?.full_name || '—'}
                        </td>
                        <td className="py-3 pr-4">
                          {trainerSports.includes('Karate') || trainerSports.length === 0 ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="inline-block size-2.5 rounded-full border border-black/10"
                                style={{ backgroundColor: s.belt_levels?.hex === '#FFFFFF' ? '#e5e7eb' : (s.belt_levels?.hex || '#e5e7eb') }}
                              />
                              <span className="text-xs text-muted-foreground">{s.belt_levels?.name || 'White'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex gap-1.5 flex-wrap">
                              {(s.student_sports || []).map(ss => (
                                <Badge key={ss.sport_id} variant="outline" className="text-[9px] px-2 py-0.5 rounded-md border-gray-200 text-gray-600 bg-gray-50/50">
                                  {ss.sports?.sport_name}
                                </Badge>
                              ))}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right text-xs text-muted-foreground font-mono">
                          {s.join_date ? new Date(s.join_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {students.length > 8 && (
                  <p className="text-center text-xs text-muted-foreground mt-4 py-2">
                    + {students.length - 8} more students · <a href="/dashboard/students" className="text-gold-dark hover:underline">View All</a>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Recent Payments (Optional) ── */}
      {canSeePayments && payments.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-sm font-semibold text-[#0A1F30]">Recent Fee Collections</CardTitle>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Branch only</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="pb-2 pr-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Student</th>
                      <th className="pb-2 pr-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Month</th>
                      <th className="pb-2 pr-4 text-right text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Amount</th>
                      <th className="pb-2 text-right text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(row => (
                      <tr key={row.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-4 font-medium text-[#0A1F30]">{row.students?.users?.full_name || '—'}</td>
                        <td className="py-3 pr-4 text-muted-foreground text-xs">{row.month}</td>
                        <td className="py-3 pr-4 text-right font-mono text-sm font-semibold text-[#0A1F30]">
                          ₹{Number(row.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 text-right">
                          <Badge className={
                            row.status === 'paid'    ? 'rounded-full bg-emerald-100 text-emerald-700 border-transparent' :
                            row.status === 'overdue' ? 'rounded-full bg-red-100 text-red-700 border-transparent' :
                                                       'rounded-full bg-yellow-100 text-yellow-700 border-transparent'
                          }>
                            {row.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

    </motion.div>
  )
}
