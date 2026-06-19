'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy, Award, Star, Calendar, MapPin, Clock,
  ArrowRight, AlertTriangle, CheckCircle, Zap,
  Loader2, RefreshCw, IndianRupee, UserRound
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const WEIGHT_CATS = {
  'U-30kg':  { min:0,  max:30 },
  '30-35kg': { min:30, max:35 },
  '35-40kg': { min:35, max:40 },
  '40-45kg': { min:40, max:45 },
  '45-50kg': { min:45, max:50 },
  '50-55kg': { min:50, max:55 },
  '55-60kg': { min:55, max:60 },
  '60-65kg': { min:60, max:65 },
  '+65kg':   { min:65, max:999 },
}

const AGE_CATS = {
  'Cadet (10-13)': { min:10, max:13 },
  'Junior (14-17)': { min:14, max:17 },
  'Senior (18+)':   { min:18, max:99 },
  'Kids (6-9)':     { min:6,  max:9  },
}

function getStudentCategory(dob, weight) {
  if (!dob || !weight) return 'Open'
  const birthYear = new Date(dob).getFullYear()
  const currentYear = new Date().getFullYear()
  const age = currentYear - birthYear

  let ageCat = 'Senior (18+)'
  for (const [label, range] of Object.entries(AGE_CATS)) {
    if (age >= range.min && age <= range.max) {
      ageCat = label
      break
    }
  }

  let weightCat = '+65kg'
  const w = parseFloat(weight)
  for (const [label, range] of Object.entries(WEIGHT_CATS)) {
    if (w >= range.min && w <= range.max) {
      weightCat = label
      break
    }
  }

  return `${ageCat} / ${weightCat}`
}

/* ─── animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
}
const stagger = { visible: { transition: { staggerChildren: 0.07 } } }

function StatCard({ icon: Icon, label, value, accent, index }) {
  return (
    <motion.div variants={fadeUp} custom={index}>
      <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
        <CardContent className="flex items-center gap-4 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: accent + '18', color: accent }}>
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">{label}</p>
            <p className="text-2xl font-heading font-bold leading-tight mt-0.5">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   PARENT / STUDENT DASHBOARD — Strictly Scoped to Own Data
   ═══════════════════════════════════════════════════════ */
export function ParentDashboard() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [student, setStudent] = useState(null)
  const [payments, setPayments] = useState([])
  const [achievements, setAchievements] = useState([])
  const [attendance, setAttendance] = useState([])
  const [tournaments, setTournaments] = useState([])
  const [studentSports, setStudentSports] = useState([])
  const [registeredTournamentIds, setRegisteredTournamentIds] = useState(new Set())
  const [registeringTourId, setRegisteringTourId] = useState(null)
  const [selectedTour, setSelectedTour] = useState(null)
  const [regAgeCat, setRegAgeCat] = useState('')
  const [regWeightCat, setRegWeightCat] = useState('')
  const [regWeight, setRegWeight] = useState('')
  const [regHeight, setRegHeight] = useState('')

  useEffect(() => {
    if (!authLoading && user) {
      loadData()
    }
  }, [authLoading, user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const userId = user.id

      // 2. Get student profile strictly by this user's ID
      const { data: studentData, error: sErr } = await supabase
        .from('students')
        .select(`
          id, join_date, dob, gender, parent_name, parent_phone,
          notes, is_active, weight, height, branch_id,
          users(full_name, email, phone),
          branches(id, name, location),
          belt_levels(id, name, color, hex, order_rank, next_belt),
          trainers(id, users(full_name)),
          student_sports(sport_id, sports(sport_name))
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()

      if (sErr) throw sErr

      if (!studentData) {
        setError('No active student profile found for your account. Please contact your branch admin.')
        setLoading(false)
        return
      }

      setStudent(studentData)
      
      const sportsList = studentData.student_sports?.map(ss => ss.sports?.sport_name).filter(Boolean) || []
      setStudentSports(sportsList)

      const studentId = studentData.id
      const branchId = studentData.branches?.id

      // 3. Payments for THIS student only
      const { data: payData } = await supabase
        .from('payments')
        .select('id, amount, month, status, payment_date, payment_mode, due_date')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(10)
      setPayments(payData || [])

      // 4. Achievements for THIS student only
      const { data: achData } = await supabase
        .from('achievements')
        .select('id, title, description, category, medal, date')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
        .limit(6)
      setAchievements(achData || [])

      // 5. Attendance for THIS student only (last 30 classes)
      const { data: attData } = await supabase
        .from('attendance')
        .select('id, date, status')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
        .limit(30)
      setAttendance(attData || [])

      // 6. Upcoming tournaments for THIS student's branch only
      const today = new Date().toISOString().split('T')[0]
      const tourQuery = supabase
        .from('tournaments')
        .select('id, title, event_date, location, status, description')
        .gte('event_date', today)
        .order('event_date')
        .limit(3)
      if (branchId) tourQuery.eq('branch_id', branchId)
      const { data: tourData } = await tourQuery
      setTournaments(tourData || [])

    } catch (err) {
      console.error('ParentDashboard error:', err)
      setError(err.message || 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }

  const openRegisterModal = (tour) => {
    setSelectedTour(tour)
    setRegWeight(student?.weight || '')
    setRegHeight(student?.height || '')

    // Pre-calculate categories based on profile
    const defaultCat = getStudentCategory(student?.dob, student?.weight)
    const [agePart, weightPart] = defaultCat.split(' / ')
    setRegAgeCat(agePart || 'Senior (18+)')
    setRegWeightCat(weightPart || '+65kg')
  }

  const handleRegisterConfirm = async () => {
    if (!regWeight || parseFloat(regWeight) <= 0) {
      toast.error('Weight is mandatory and must be greater than 0.')
      return
    }
    if (!regHeight || parseFloat(regHeight) <= 0) {
      toast.error('Height is mandatory and must be greater than 0.')
      return
    }
    if (!regAgeCat || !regWeightCat) {
      toast.error('Please select both division and classification.')
      return
    }

    setRegisteringTourId(selectedTour.id)
    const toastId = toast.loading('Processing registration...')

    try {
      const weightNum = parseFloat(regWeight)
      const heightNum = parseFloat(regHeight)

      // Step 1: Update weight and height in the students table if changed
      if (weightNum !== student?.weight || heightNum !== student?.height) {
        const { error: profileErr } = await supabase
          .from('students')
          .update({
            weight: weightNum,
            height: heightNum
          })
          .eq('id', student.id)
        
        if (profileErr) throw profileErr
        
        // Update local student state dynamically
        setStudent(prev => ({
          ...prev,
          weight: weightNum,
          height: heightNum
        }))
      }

      // Step 2: Register for the tournament with selected category
      const finalCategory = `${regAgeCat} / ${regWeightCat}`
      const { error: regErr } = await supabase
        .from('tournament_participants')
        .insert([{
          tournament_id: selectedTour.id,
          student_id: student.id,
          category: finalCategory
        }])

      if (regErr) throw regErr

      toast.success('Successfully registered for tournament!', { id: toastId })
      setRegisteredTournamentIds(prev => {
        const next = new Set(prev)
        next.add(selectedTour.id)
        return next
      })
      setSelectedTour(null)
    } catch (err) {
      toast.error('Registration failed: ' + err.message, { id: toastId })
    } finally {
      setRegisteringTourId(null)
    }
  }

  /* ─── Derived values ─── */
  const belt = student?.belt_levels
  const isKarateStudent = studentSports.includes('Karate') || studentSports.length === 0
  const beltHex = (belt?.hex && belt.hex !== '#FFFFFF') ? belt.hex : '#9ca3af'
  const progressColor = isKarateStudent ? beltHex : '#C5A059'
  const presentDays = attendance.filter(a => a.status === 'present').length
  const totalDays = attendance.length || 1
  const attendancePct = Math.round((presentDays / totalDays) * 100)
  const medalCount = achievements.filter(a => ['gold', 'silver', 'bronze'].includes(a.medal)).length
  const certCount = achievements.filter(a => a.medal === 'certificate').length
  const pendingPayment = payments.find(p => p.status === 'pending' || p.status === 'overdue')
  const latestPayment = payments[0]

  // Circular progress
  const radius = 56
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (attendancePct / 100) * circumference

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-gold" />
          <p className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Loading Your Dashboard...</p>
        </div>
      </div>
    )
  }

  /* ─── Error / no profile ─── */
  if (error || !student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <div className="text-5xl">🥋</div>
        <h2 className="text-xl font-bold text-[#0A1F30]">Profile Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-sm">{error || 'Student profile not found for this account.'}</p>
        <Button onClick={loadData} className="gap-2 bg-[#0A1F30] text-white rounded-xl">
          <RefreshCw className="size-4" /> Try Again
        </Button>
      </div>
    )
  }

  return (
    <motion.div className="space-y-6 pb-10" initial="hidden" animate="visible" variants={stagger}>

      {/* ── Header ── */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="gap-1.5 rounded-full border-gold/30 bg-gold/5 px-3 py-1 text-xs font-semibold text-gold-dark">
              <MapPin className="size-3" />
              {student.branches?.name || 'TKMAA'}
            </Badge>
          </div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">
            {student.users?.full_name?.split(' ')[0]}&apos;s Dashboard
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <p className="text-sm text-muted-foreground">
              {student.branches?.name} · {student.users?.email}
            </p>
            {studentSports.length > 0 && (
              <span className="inline-flex gap-1.5 ml-2.5">
                {studentSports.map(sport => (
                  <Badge key={sport} variant="secondary" className="text-[9px] bg-gold/15 text-gold-dark hover:bg-gold/25 font-bold uppercase tracking-wider py-0.5 px-2 rounded-md border-transparent">
                    {sport}
                  </Badge>
                ))}
              </span>
            )}
          </div>
        </div>
        <Button onClick={loadData} variant="outline" className="rounded-xl gap-2 shrink-0">
          <RefreshCw className="size-4" /> Refresh
        </Button>
      </motion.div>

      {/* ── Pending fee alert ── */}
      {pendingPayment && (
        <motion.div variants={fadeUp}>
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
              <AlertTriangle className="size-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-heading font-semibold text-red-700">Fee Payment Due</p>
              <p className="text-xs text-red-500 mt-0.5">
                ₹{Number(pendingPayment.amount).toLocaleString('en-IN')} pending for {pendingPayment.month}
                {pendingPayment.due_date && <> · Due: {new Date(pendingPayment.due_date).toLocaleDateString('en-IN')}</>}
              </p>
            </div>
            <Badge className="rounded-full bg-red-500 text-white border-transparent uppercase text-[10px] font-mono tracking-wider">
              {pendingPayment.status}
            </Badge>
          </div>
        </motion.div>
      )}

      {/* ── Belt + Attendance Ring ── */}
      <motion.div variants={fadeUp}>
        <Card className="rounded-2xl border-0 shadow-sm bg-white">
          <CardContent className="flex flex-col items-center py-8 gap-5">
            {/* Belt badge */}
            {isKarateStudent ? (
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-mono font-bold tracking-widest text-white uppercase" style={{ backgroundColor: '#0A1F30' }}>
                <span className="inline-block h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: beltHex }} />
                {belt?.name || 'White'} Belt
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-mono font-bold tracking-widest text-white uppercase" style={{ backgroundColor: '#0A1F30' }}>
                Active Student
              </span>
            )}

            {/* Circular attendance ring */}
            <div className="relative flex items-center justify-center">
              <svg width="140" height="140" className="-rotate-90">
                <circle cx="70" cy="70" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round" />
                <motion.circle
                  cx="70" cy="70" r={radius} fill="none"
                  stroke={progressColor} strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">Attend.</span>
                <span className="text-3xl font-heading font-bold" style={{ color: progressColor }}>{attendancePct}%</span>
              </div>
            </div>

            {/* Attendance summary */}
            <div className="w-full max-w-xs text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{presentDays}</span> present out of{' '}
                <span className="font-semibold text-foreground">{attendance.length}</span> sessions
              </p>
              {isKarateStudent && belt?.next_belt && (
                <p className="text-xs text-muted-foreground">
                  Next: <span className="font-semibold text-emerald-600">{belt.next_belt} Belt</span>
                </p>
              )}
            </div>

            {/* Info row */}
            <div className="flex flex-wrap gap-6 justify-center text-center">
              <div>
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Branch</p>
                <p className="text-sm font-semibold text-[#0A1F30] mt-0.5">{student.branches?.name || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Trainer</p>
                <p className="text-sm font-semibold text-[#0A1F30] mt-0.5">{student.trainers?.users?.full_name || 'Not Assigned'}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Joined</p>
                <p className="text-sm font-semibold text-[#0A1F30] mt-0.5">
                  {student.join_date ? new Date(student.join_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                </p>
              </div>
              {student.dob && (
                <div>
                  <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">DOB</p>
                  <p className="text-sm font-semibold text-[#0A1F30] mt-0.5">{new Date(student.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              )}
              {student.gender && (
                <div>
                  <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Gender</p>
                  <p className="text-sm font-semibold text-[#0A1F30] mt-0.5 capitalize">{student.gender}</p>
                </div>
              )}
              {student.weight && (
                <div>
                  <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Weight</p>
                  <p className="text-sm font-semibold text-[#0A1F30] mt-0.5">{student.weight} kg</p>
                </div>
              )}
              {student.height && (
                <div>
                  <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Height</p>
                  <p className="text-sm font-semibold text-[#0A1F30] mt-0.5">{student.height} cm</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Stats Grid ── */}
      <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Trophy}      label="Medals"      value={medalCount}          accent="#C5A059" index={0} />
        <StatCard icon={Award}       label="Certificates" value={certCount}           accent="#6366f1" index={1} />
        <StatCard icon={CheckCircle} label="Attendance"  value={`${attendancePct}%`} accent="#22c55e" index={2} />
        {isKarateStudent ? (
          <StatCard icon={Zap}         label="Belt Rank"   value={`#${belt?.order_rank || 1}`} accent="#f97316" index={3} />
        ) : (
          <StatCard icon={Zap}         label="My Sports"   value={studentSports.length} accent="#f97316" index={3} />
        )}
      </motion.div>

      {/* ── Tournaments + Fee Status ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Upcoming Tournaments for THIS branch */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-lg font-heading font-bold">
            Upcoming Tournaments
            <span className="ml-2 text-sm font-normal text-muted-foreground">— {student.branches?.name}</span>
          </h2>
          <div className="space-y-3">
            {tournaments.length === 0 ? (
              <Card className="rounded-2xl border-0 shadow-sm bg-white">
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No upcoming tournaments for {student.branches?.name} 🥋
                </CardContent>
              </Card>
            ) : (
              tournaments.map(ev => (
                <Card key={ev.id} className="rounded-2xl border-0 shadow-sm bg-white">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[#0A1F30] text-white">
                      <span className="text-[10px] font-mono uppercase leading-none tracking-wider opacity-70">
                        {new Date(ev.event_date).toLocaleString('default', { month: 'short' }).toUpperCase()}
                      </span>
                      <span className="text-xl font-heading font-bold leading-tight">
                        {new Date(ev.event_date).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-semibold text-sm">{ev.title}</p>
                      {ev.location && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="size-3" /> {ev.location}
                        </p>
                      )}
                      {ev.status && (
                        <Badge className="mt-1 rounded-full text-[9px] bg-gold/10 text-gold-dark border-transparent">{ev.status}</Badge>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {registeredTournamentIds.has(ev.id) ? (
                        <Badge className="rounded-full bg-emerald-500/15 text-emerald-600 border-transparent gap-1 py-1.5 px-3 font-semibold text-xs">
                          <CheckCircle className="size-3.5" /> Registered
                        </Badge>
                      ) : isKarateStudent ? (
                        <Button 
                          onClick={() => openRegisterModal(ev)}
                          disabled={registeringTourId === ev.id}
                          className="bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-xl text-xs font-semibold px-5 h-9"
                        >
                          Register
                        </Button>
                      ) : (
                        <Badge className="rounded-full bg-gray-100 text-gray-400 border-transparent gap-1 py-1.5 px-3 font-semibold text-xs">
                          Karate Only
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Fee Status — THIS student only */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl border-0 shadow-lg bg-[#0A1F30] text-white h-full">
            <CardContent className="flex flex-col justify-between h-full gap-5 py-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <IndianRupee className="size-4 text-gold" />
                  <span className="text-[10px] font-mono tracking-[0.2em] text-white/60 uppercase">My Fee Status</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase ${
                    pendingPayment ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {pendingPayment ? pendingPayment.status : 'Clear'}
                  </span>
                </div>

                {latestPayment ? (
                  <>
                    <p className="text-4xl font-heading font-bold text-gold">
                      ₹{Number(latestPayment.amount).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-white/50 mt-1">{latestPayment.month}</p>
                  </>
                ) : (
                  <p className="text-sm text-white/30 mt-2">No fee records found.</p>
                )}

                {/* Last 4 payments */}
                <div className="mt-5 space-y-2.5">
                  {payments.slice(0, 4).map(p => (
                    <div key={p.id} className="flex items-center justify-between">
                      <span className="text-xs text-white/50">{p.month}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/70 font-mono">₹{Number(p.amount).toLocaleString('en-IN')}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          p.status === 'paid'    ? 'bg-emerald-500/20 text-emerald-400' :
                          p.status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                                                   'bg-yellow-500/20 text-yellow-400'
                        }`}>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {pendingPayment && (
                <Button className="w-full rounded-xl bg-white text-[#0A1F30] hover:bg-white/90 font-heading text-sm h-9 gap-2">
                  Pay Now <ArrowRight className="size-3.5" />
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ── Achievements ── */}
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-heading font-bold mb-4">My Achievements</h2>
        {achievements.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm bg-white">
            <CardContent className="py-10 text-center">
              <div className="text-3xl mb-3">🏆</div>
              <p className="text-sm text-muted-foreground">No achievements yet — keep training hard!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {achievements.map(a => (
              <Card key={a.id} className="rounded-2xl border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardContent className="py-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/10">
                      <Trophy className="size-5 text-gold" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-semibold text-sm leading-snug">{a.title}</p>
                      <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mt-0.5">
                        {a.date ? new Date(a.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : ''}
                      </p>
                    </div>
                  </div>
                  {a.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{a.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.medal && (
                      <Badge className={`rounded-full text-[10px] font-mono border-transparent ${
                        a.medal === 'gold'        ? 'bg-yellow-100 text-yellow-700' :
                        a.medal === 'silver'      ? 'bg-gray-100 text-gray-600' :
                        a.medal === 'bronze'      ? 'bg-orange-100 text-orange-700' :
                        a.medal === 'certificate' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-purple-100 text-purple-700'
                      }`}>
                        {a.medal}
                      </Badge>
                    )}
                    {a.category && (
                      <Badge variant="outline" className="rounded-full text-[10px] font-mono">{a.category}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Recent Attendance ── */}
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-heading font-bold mb-4">Recent Attendance</h2>
        <Card className="rounded-2xl border-0 shadow-sm bg-white">
          <CardContent className="py-5">
            {attendance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No attendance records yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {attendance.map(a => (
                  <div
                    key={a.id}
                    title={`${a.date} — ${a.status}`}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold cursor-default transition-transform hover:scale-110 ${
                      a.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                      a.status === 'late'    ? 'bg-yellow-100 text-yellow-700' :
                                               'bg-red-100 text-red-700'
                    }`}
                  >
                    {new Date(a.date).getDate()}
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/40">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-sm bg-emerald-300" /> Present
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-sm bg-yellow-300" /> Late
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-sm bg-red-300" /> Absent
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Tournament Registration Modal ── */}
      <Dialog open={!!selectedTour} onOpenChange={() => setSelectedTour(null)}>
        <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-md p-0 overflow-hidden shadow-xl">
          <DialogHeader className="p-6 border-b border-gray-100">
            <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">
              Register for {selectedTour?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Student Name:</span>
                <span className="font-semibold text-[#0A1F30]">{student?.users?.full_name}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Weight (kg) <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  step="0.1" 
                  required
                  value={regWeight}
                  onChange={e => setRegWeight(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 h-10 px-4 rounded-lg text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Height (cm) <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  step="0.1" 
                  required
                  value={regHeight}
                  onChange={e => setRegHeight(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 h-10 px-4 rounded-lg text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Division (Age Category)</label>
                <select 
                  value={regAgeCat} 
                  onChange={e => setRegAgeCat(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 h-10 px-4 rounded-lg text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10"
                >
                  {Object.keys(AGE_CATS).map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Classification (Weight Category)</label>
                <select 
                  value={regWeightCat} 
                  onChange={e => setRegWeightCat(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 h-10 px-4 rounded-lg text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10"
                >
                  {Object.keys(WEIGHT_CATS).map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setSelectedTour(null)} className="flex-1 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50">
                Cancel
              </Button>
              <Button 
                onClick={handleRegisterConfirm}
                disabled={registeringTourId !== null}
                className="flex-1 bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-lg h-10 font-semibold"
              >
                {registeringTourId !== null ? <Loader2 className="size-4 animate-spin" /> : "Confirm & Register"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </motion.div>
  )
}
