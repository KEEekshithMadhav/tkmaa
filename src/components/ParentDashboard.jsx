'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy,
  Award,
  Star,
  Calendar,
  MapPin,
  Clock,
  CreditCard,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  Zap,
  CheckCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/* ─── mock data ─── */
const MOCK_DATA = {
  student: {
    name: 'Leo',
    academy: 'Central Academy Branch',
    studentId: 'TK-2024-089',
  },
  belt: {
    current: 'ORANGE BELT',
    level: 'JUNIOR',
    progress: 68,
    nextBelt: 'Green Belt',
    lastRanking: 'OCT 12',
    nextTarget: 'JAN 26',
  },
  stats: {
    medals: 12,
    certificates: 4,
    performance: 'A+',
    attendance: 94,
  },
  events: [
    {
      id: 1,
      title: 'Inter Academy Kumite Trials',
      day: '14',
      location: 'Main Dojo, South Wing',
      actionLabel: 'RSVP',
    },
    {
      id: 2,
      title: 'Holiday Belt Presentation Ceremony',
      day: '22',
      time: '@ 5:00 PM onwards',
      actionLabel: 'Details',
    },
  ],
  fee: {
    status: 'PENDING',
    amount: '$120.00',
    dueDate: 'Dec 01, 2024',
    description: 'Winter Quarter Training',
  },
  achievement: {
    title: 'Excellence in Kata',
    description:
      "Leo showed exceptional discipline during the regional kata exhibition, earning the sensei's commendation.",
    date: 'Nov 2024',
  },
  physical: {
    age: '09',
    height: '132',
    weight: '31',
  },
}

/* ─── animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
}

const stagger = {
  visible: { transition: { staggerChildren: 0.07 } },
}

/* ─── sub-components ─── */

function StatCard({ icon: Icon, label, value, accent, index }) {
  return (
    <motion.div variants={fadeUp} custom={index}>
      <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
        <CardContent className="flex items-center gap-4 py-5">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: accent + '14', color: accent }}
          >
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
              {label}
            </p>
            <p className="text-2xl font-heading font-bold leading-tight mt-0.5">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function EventCard({ event }) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm bg-white">
      <CardContent className="flex items-center gap-4 py-4">
        {/* date chip */}
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[#0A1F30] text-white">
          <span className="text-[10px] font-mono uppercase leading-none tracking-wider opacity-70">
            {new Date().toLocaleString('default', { month: 'short' }).toUpperCase()}
          </span>
          <span className="text-xl font-heading font-bold leading-tight">{event.day}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-sm leading-snug truncate">{event.title}</p>
          {event.location && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin className="size-3" />
              {event.location}
            </p>
          )}
          {event.time && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="size-3" />
              {event.time}
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="shrink-0 rounded-lg font-mono text-xs tracking-wider"
        >
          {event.actionLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

/* ═══════════════════════════════════════════════════
   PARENT DASHBOARD
   ═══════════════════════════════════════════════════ */
export function ParentDashboard() {
  const [data, setData] = useState(MOCK_DATA)

  /* Belt colour helpers */
  const beltColor = '#f97316' // orange
  const nextBeltColor = '#22c55e' // green
  const progressPct = data.belt.progress

  /* Circular progress variables */
  const radius = 56
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPct / 100) * circumference

  return (
    <motion.div
      className="space-y-6 pb-10"
      initial="hidden"
      animate="visible"
      variants={stagger}
    >
      {/* ─── HEADER ─── */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">
            {data.student.name}&apos;s Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-sans">
            {data.student.academy} &bull; ID: {data.student.studentId}
          </p>
        </div>
        <Button className="rounded-xl bg-[#0A1F30] hover:bg-[#0A1F30]/90 text-white font-heading text-sm px-5 h-10">
          Attend Class
        </Button>
      </motion.div>

      {/* ─── MONTHLY UPDATE ALERT ─── */}
      <motion.div variants={fadeUp}>
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15">
            <AlertTriangle className="size-4 text-gold-dark" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-heading font-semibold text-gold-dark">
              Monthly Update Required
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Please update your child&apos;s age, weight, and height for the current semester
              records.
            </p>
          </div>
          <Button
            size="sm"
            className="rounded-lg bg-gold hover:bg-gold-dark text-white font-mono text-xs tracking-wider px-4"
          >
            Update
          </Button>
        </div>
      </motion.div>

      {/* ─── BELT LEVEL PROGRESS ─── */}
      <motion.div variants={fadeUp}>
        <Card className="rounded-2xl border-0 shadow-sm bg-white overflow-visible">
          <CardContent className="flex flex-col items-center py-8 gap-5">
            {/* Current belt badge */}
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-mono font-bold tracking-widest text-white uppercase"
              style={{ backgroundColor: '#0A1F30' }}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: beltColor }}
              />
              {data.belt.current} ({data.belt.level})
            </span>

            {/* Circular progress ring */}
            <div className="relative flex items-center justify-center">
              <svg width="140" height="140" className="-rotate-90">
                {/* background ring */}
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                {/* progress arc */}
                <motion.circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={beltColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                  LVL
                </span>
                <span className="text-3xl font-heading font-bold" style={{ color: beltColor }}>
                  {progressPct}
                </span>
              </div>
            </div>

            {/* Progress text + bar */}
            <div className="w-full max-w-xs space-y-2 text-center">
              <p className="text-sm font-sans text-muted-foreground">
                <span className="font-semibold text-foreground">{progressPct}%</span> Progress to{' '}
                <span style={{ color: nextBeltColor }} className="font-semibold">
                  {data.belt.nextBelt}
                </span>
              </p>
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: beltColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                />
              </div>
            </div>

            {/* Date labels */}
            <div className="flex w-full max-w-xs justify-between text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              <span>Last Ranking: {data.belt.lastRanking}</span>
              <span>Next Target: {data.belt.nextTarget}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── STATS GRID ─── */}
      <motion.div
        variants={stagger}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard icon={Trophy} label="Medals" value={data.stats.medals} accent="#C5A059" index={0} />
        <StatCard icon={Award} label="Certificates" value={String(data.stats.certificates).padStart(2, '0')} accent="#6366f1" index={1} />
        <StatCard icon={Zap} label="Performance" value={data.stats.performance} accent="#f97316" index={2} />
        <StatCard icon={CheckCircle} label="Attendance" value={`${data.stats.attendance}%`} accent="#22c55e" index={3} />
      </motion.div>

      {/* ─── ACADEMY EVENTS + FEE STATUS ─── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Events — takes 3 cols */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-bold">Academy Events</h2>
            <button className="text-xs font-mono tracking-wider text-gold-dark hover:text-gold transition-colors uppercase">
              View Calendar
            </button>
          </div>
          <div className="space-y-3">
            {data.events.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </div>

        {/* Fee Status — takes 2 cols */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl border-0 shadow-lg bg-[#0A1F30] text-white h-full">
            <CardContent className="flex flex-col justify-between h-full gap-5 py-6">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono tracking-[0.2em] text-white/60 uppercase">
                    Fee Status
                  </span>
                  <span className="inline-flex items-center rounded-full bg-red-500/20 px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider text-red-400 uppercase">
                    {data.fee.status}
                  </span>
                </div>
                <p className="text-4xl font-heading font-bold mt-3">{data.fee.amount}</p>
                <p className="text-xs text-white/50 mt-2 leading-relaxed">
                  Next invoice due on{' '}
                  <span className="text-white/70 font-medium">{data.fee.dueDate}</span> for &ldquo;
                  {data.fee.description}&rdquo;.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button className="rounded-xl bg-white text-[#0A1F30] hover:bg-white/90 font-heading text-sm px-5 h-9 gap-2">
                  Pay Now <ArrowRight className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-white/20 text-white hover:bg-white/10 font-heading text-sm px-5 h-9"
                >
                  View Invoices
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ─── LATEST ACHIEVEMENT + PHYSICAL STATS ─── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Achievement — 3 cols */}
        <div className="lg:col-span-3">
          <Card className="rounded-2xl border-0 shadow-sm bg-white">
            <CardContent className="py-6 space-y-4">
              <span className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase">
                Latest Achievement
              </span>

              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {/* Illustration area */}
                <div className="w-full sm:w-36 h-28 rounded-xl bg-gradient-to-br from-gold/10 via-gold/5 to-transparent flex items-center justify-center shrink-0">
                  <div className="flex flex-col items-center gap-1">
                    <Trophy className="size-9 text-gold" />
                    <Star className="size-4 text-gold-dark" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-base">{data.achievement.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {data.achievement.description}
                  </p>
                  <p className="text-[10px] font-mono tracking-widest text-muted-foreground mt-3 uppercase">
                    {data.achievement.date}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Physical stats — 2 cols */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl border-0 shadow-sm bg-white h-full">
            <CardContent className="py-6 space-y-4 h-full flex flex-col">
              <span className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase">
                Physical Stats
              </span>

              <div className="grid grid-cols-3 gap-3 flex-1">
                {/* Age */}
                <div className="flex flex-col items-center justify-center rounded-xl bg-[#F8F9FA] p-4">
                  <span className="text-3xl font-heading font-bold">{data.physical.age}</span>
                  <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mt-1">
                    Yrs
                  </span>
                  <span className="text-[10px] font-mono tracking-widest text-muted-foreground/70 uppercase mt-0.5">
                    Age
                  </span>
                </div>
                {/* Height */}
                <div className="flex flex-col items-center justify-center rounded-xl bg-[#F8F9FA] p-4">
                  <span className="text-3xl font-heading font-bold">{data.physical.height}</span>
                  <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mt-1">
                    cm
                  </span>
                  <span className="text-[10px] font-mono tracking-widest text-muted-foreground/70 uppercase mt-0.5">
                    Height
                  </span>
                </div>
                {/* Weight */}
                <div className="flex flex-col items-center justify-center rounded-xl bg-[#F8F9FA] p-4">
                  <span className="text-3xl font-heading font-bold">{data.physical.weight}</span>
                  <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mt-1">
                    kg
                  </span>
                  <span className="text-[10px] font-mono tracking-widest text-muted-foreground/70 uppercase mt-0.5">
                    Weight
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  )
}
