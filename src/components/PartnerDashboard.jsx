'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  MapPin,
  Users,
  DollarSign,
  Download,
  Settings,
  Calendar,
  AlertCircle,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

// ─── Animation Variants ─────────────────────────────────
const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 120, damping: 18 },
  },
}

// ─── Mock / Fallback Data ────────────────────────────────
const MOCK = {
  branch: {
    name: 'Downtown Dojo',
    label: 'Branch A',
  },
  totalMembers: {
    count: 1284,
    trend: '+12% from last month',
  },
  feeCollection: {
    collected: 42900,
    target: 45000,
  },
  groups: [
    {
      id: 1,
      name: 'Elite Kumite',
      level: 'Adv',
      schedule: 'Mon, Wed, Fri • 18:00',
      peps: 24,
    },
    {
      id: 2,
      name: 'Junior Dragons',
      level: 'Beg',
      schedule: 'Tue, Thu • 16:30',
      peps: 42,
    },
  ],
  trainers: [
    { id: 1, name: 'Sensei Hiroshi', initials: 'SH' },
    { id: 2, name: 'Master Sarah', initials: 'MS' },
  ],
  recentFees: [
    { id: 1, member: 'James Wilson', plan: 'Premium Unlimited', amount: 150.0, status: 'paid' },
    { id: 2, member: 'Elena Rodriguez', plan: 'Junior Basic', amount: 85.0, status: 'paid' },
    { id: 3, member: 'Marcus Chen', plan: 'Standard Monthly', amount: 110.0, status: 'overdue' },
    { id: 4, member: 'Sophia Blake', plan: 'Elite Membership', amount: 200.0, status: 'paid' },
  ],
  beltDistribution: [
    { belt: 'Black Belts', count: 42, color: '#1a1a1a', pct: 4.5 },
    { belt: 'Brown Belts', count: 86, color: '#8B4513', pct: 9.2 },
    { belt: 'Green / Blue Belts', count: 218, color: '#22c55e', pct: 23.3 },
    { belt: 'White / Yellow Belts', count: 938, color: '#eab308', pct: 100 },
  ],
}

// ─── Component ───────────────────────────────────────────
export function PartnerDashboard() {
  const [data, setData] = useState(MOCK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Attempt to pull live data — gracefully fall back to MOCK
        const { data: students } = await supabase
          .from('students')
          .select('id, belt_levels(name)')
        if (students && students.length > 0) {
          // We have live data — you can enrich `data` here
        }
      } catch {
        // silent — keep mock
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const feeProgress = Math.round(
    (data.feeCollection.collected / data.feeCollection.target) * 100
  )

  // ───────────────────────────────────────────────────────
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Header ─────────────────────────────────────── */}
      <motion.header variants={fadeUp} className="space-y-1">
        <Badge
          variant="outline"
          className="mb-2 gap-1.5 rounded-full border-gold/30 bg-gold/5 px-3 py-1 text-xs font-semibold text-gold-dark"
        >
          <MapPin className="size-3" />
          {data.branch.name} ({data.branch.label})
        </Badge>

        <h1 className="font-heading text-3xl font-bold tracking-tight text-[#0A1F30]">
          Branch Overview
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          High level insights for the {data.branch.name}. Monitor membership
          growth, financial health, and training personnel performance.
        </p>
      </motion.header>

      {/* ── Top KPI Row ────────────────────────────────── */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Total Members */}
        <motion.div variants={fadeUp}>
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                <Users className="size-4 text-gold" />
                Total Members
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <span className="font-heading text-4xl font-extrabold tracking-tight text-[#0A1F30]">
                {data.totalMembers.count.toLocaleString()}
              </span>
              <span className="mb-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
                <TrendingUp className="size-3.5" />
                {data.totalMembers.trend}
              </span>
            </CardContent>
          </Card>
        </motion.div>

        {/* Monthly Fee Collection — dark accent */}
        <motion.div variants={fadeUp}>
          <Card className="rounded-2xl border-transparent bg-[#0A1F30] text-white shadow-lg ring-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
                <DollarSign className="size-4 text-gold" />
                Monthly Fee Collection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="font-heading text-4xl font-extrabold tracking-tight text-gold">
                  ${data.feeCollection.collected.toLocaleString()}
                </span>
                <span className="mb-1 text-xs text-white/50">
                  Target:{' '}
                  <span className="text-white/80">
                    ${data.feeCollection.target.toLocaleString()}
                  </span>
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${feeProgress}%` }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                  className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Middle Row: Active Groups + Lead Trainers ─── */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Active Groups — 2 cols */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-sm font-semibold text-[#0A1F30]">
                Active Groups
              </CardTitle>
              <CardAction>
                <Button variant="ghost" size="icon-sm">
                  <Settings className="size-4 text-muted-foreground" />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.groups.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/60"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#0A1F30]">
                      {g.name}{' '}
                      <span className="font-normal text-muted-foreground">
                        ({g.level})
                      </span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="size-3" />
                      {g.schedule}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-gold/10 px-2.5 text-[10px] font-black uppercase tracking-wider text-gold-dark"
                  >
                    {g.peps} peps
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Lead Trainers — 1 col */}
        <motion.div variants={fadeUp}>
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-sm font-semibold text-[#0A1F30]">
                Lead Trainers
              </CardTitle>
              <CardAction>
                <Button variant="ghost" size="icon-sm">
                  <Settings className="size-4 text-muted-foreground" />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.trainers.map((t) => (
                <div key={t.id} className="flex items-center gap-3">
                  {/* Avatar placeholder */}
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#0A1F30] text-xs font-bold text-gold">
                    {t.initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#0A1F30]">
                      {t.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Head Instructor
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/50" />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Recent Fee Collections Table ───────────────── */}
      <motion.div variants={fadeUp}>
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-sm font-semibold text-[#0A1F30]">
              Recent Fee Collections
            </CardTitle>
            <CardAction>
              <Button variant="link" size="sm" className="gap-1 text-xs text-gold-dark">
                <Download className="size-3.5" />
                Download Report
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="pb-2 pr-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                      Member
                    </th>
                    <th className="pb-2 pr-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                      Plan
                    </th>
                    <th className="pb-2 pr-4 text-right text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                      Amount
                    </th>
                    <th className="pb-2 text-right text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                      St.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentFees.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border/30 last:border-0"
                    >
                      <td className="py-3 pr-4 font-medium text-[#0A1F30]">
                        {row.member}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {row.plan}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-sm font-semibold text-[#0A1F30]">
                        ${row.amount.toFixed(2)}
                      </td>
                      <td className="py-3 text-right">
                        <Badge
                          variant={row.status === 'paid' ? 'default' : 'destructive'}
                          className={
                            row.status === 'paid'
                              ? 'rounded-full bg-emerald-100 text-emerald-700 border-transparent'
                              : 'rounded-full'
                          }
                        >
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

      {/* ── Bottom Row: Belt Distribution + Training Cycle */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Belt Distribution — dark accent, 2 cols */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card className="rounded-2xl border-transparent bg-[#1B3022] text-white shadow-lg ring-0">
            <CardHeader>
              <CardTitle className="font-heading text-sm font-semibold text-white/90">
                Belt Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.beltDistribution.map((b) => (
                <div key={b.belt} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white/70">{b.belt}</span>
                    <span className="font-mono text-white/50">
                      {b.count} members
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${b.pct}%` }}
                      transition={{
                        duration: 1,
                        ease: [0.16, 1, 0.3, 1],
                        delay: 0.5,
                      }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: b.color }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Next Training Cycle — info banner, 1 col */}
        <motion.div variants={fadeUp}>
          <Card className="rounded-2xl border-gold/20 bg-gold/5 shadow-sm ring-0">
            <CardContent className="flex flex-col gap-3 pt-5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gold/15">
                <AlertCircle className="size-5 text-gold-dark" />
              </div>
              <div>
                <h3 className="font-heading text-sm font-semibold text-[#0A1F30]">
                  Next Training Cycle
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Summer Belt Evaluations begin in{' '}
                  <span className="font-semibold text-gold-dark">~14 days</span>!
                  All lead trainers must submit eligibility logs by Friday.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
