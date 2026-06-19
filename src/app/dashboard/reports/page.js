"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  BarChart3, Calendar, Download, Filter, TrendingUp, Users, 
  CreditCard, ShieldAlert, CheckCircle2, XCircle, Clock, Loader2
} from 'lucide-react'
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  CartesianGrid, BarChart, Bar, Legend 
} from 'recharts'
import { useBranch } from '@/context/BranchContext'
import { useSport } from '@/context/SportContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function ReportsPage() {
  const { selectedBranch, branches } = useBranch()
  const { selectedSport, selectedSportName } = useSport()
  const [reportType, setReportType] = useState('monthly') // daily, weekly, monthly, custom
  const [trainers, setTrainers] = useState([])
  const [selectedTrainer, setSelectedTrainer] = useState('all')
  const [loading, setLoading] = useState(false)
  const [schemaError, setSchemaError] = useState(false)
  
  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  // Data states
  const [stats, setStats] = useState({
    attendanceRate: 0,
    totalRevenue: 0,
    newEnrollments: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0
  })
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    async function loadTrainers() {
      const { data } = await supabase.from('trainers').select('id, users(full_name)')
      setTrainers(data || [])
    }
    loadTrainers()
  }, [])

  useEffect(() => {
    fetchReportData()
  }, [selectedBranch, selectedSport, selectedTrainer, reportType, startDate, endDate])

  async function fetchReportData() {
    setLoading(true)
    setSchemaError(false)
    try {
      // Determine date ranges based on reportType
      let start = startDate
      let end = endDate
      const today = new Date()

      if (reportType === 'daily') {
        start = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0]
        end = new Date().toISOString().split('T')[0]
      } else if (reportType === 'weekly') {
        start = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0]
        end = new Date().toISOString().split('T')[0]
      } else if (reportType === 'monthly') {
        start = new Date(today.setMonth(today.getMonth() - 6)).toISOString().split('T')[0]
        end = new Date().toISOString().split('T')[0]
      }

      // 1. Fetch Students/Enrollments
      let sQuery = supabase.from('students').select('id, created_at, trainer_id, branch_id, student_sports(sport_id)')
      if (selectedBranch !== 'all') sQuery = sQuery.eq('branch_id', selectedBranch)
      if (selectedTrainer !== 'all') sQuery = sQuery.eq('trainer_id', selectedTrainer)
      
      const { data: studentsData, error: sErr } = await sQuery
      if (sErr) {
        if (sErr.message.includes('relation') || sErr.message.includes('does not exist')) {
          setSchemaError(true)
        }
        throw sErr
      }

      // Filter students by sport
      const filteredStudents = (studentsData || []).filter(s => {
        if (selectedSport === 'all') return true
        const sports = s.student_sports || []
        return sports.some(ss => ss.sport_id === selectedSport)
      })

      const studentIds = filteredStudents.map(s => s.id)
      
      // Calculate enrollments in date range
      const rangeEnrollments = filteredStudents.filter(s => {
        const created = s.created_at?.split('T')[0]
        return created >= start && created <= end
      })

      // 2. Fetch Payments
      let pQuery = supabase.from('payments').select('id, amount, status, created_at, student_id')
        .eq('status', 'paid')
        .gte('created_at', start + 'T00:00:00Z')
        .lte('created_at', end + 'T23:59:59Z')

      if (studentIds.length > 0 && selectedSport !== 'all') {
        pQuery = pQuery.in('student_id', studentIds)
      }

      const { data: paymentsData } = await pQuery
      
      // Filter payments by branch / trainer if selected (since payments aren't directly linked, we link via studentIds)
      const filteredPayments = (paymentsData || []).filter(p => {
        if (selectedBranch === 'all' && selectedTrainer === 'all' && selectedSport === 'all') return true
        return studentIds.includes(p.student_id)
      })

      const totalRevenue = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

      // 3. Fetch Attendance
      let aQuery = supabase.from('attendance').select('id, date, status, student_id')
        .gte('date', start)
        .lte('date', end)

      if (studentIds.length > 0 && (selectedBranch !== 'all' || selectedTrainer !== 'all' || selectedSport !== 'all')) {
        aQuery = aQuery.in('student_id', studentIds)
      }

      const { data: attData } = await aQuery
      
      let presentCount = 0
      let absentCount = 0
      let lateCount = 0
      
      if (attData) {
        attData.forEach(r => {
          if (r.status === 'present') presentCount++
          else if (r.status === 'absent') absentCount++
          else if (r.status === 'late') lateCount++
        })
      }

      const totalAtt = presentCount + absentCount + lateCount
      const attendanceRate = totalAtt > 0 ? Math.round(((presentCount + lateCount * 0.5) / totalAtt) * 100) : 0

      // Update Summary Stats
      setStats({
        attendanceRate,
        totalRevenue,
        newEnrollments: rangeEnrollments.length,
        presentCount,
        absentCount,
        lateCount
      })

      // Generate Chart Data based on dates in range
      const dayMap = {}
      
      // Seed range
      const curr = new Date(start)
      const last = new Date(end)
      while (curr <= last) {
        const dateStr = curr.toISOString().split('T')[0]
        dayMap[dateStr] = { date: dateStr, revenue: 0, enrollments: 0, present: 0, total: 0 }
        curr.setDate(curr.getDate() + 1)
      }

      // Aggregate revenue
      filteredPayments.forEach(p => {
        const dateStr = p.created_at?.split('T')[0]
        if (dayMap[dateStr]) {
          dayMap[dateStr].revenue += parseFloat(p.amount || 0)
        }
      })

      // Aggregate enrollments
      rangeEnrollments.forEach(s => {
        const dateStr = s.created_at?.split('T')[0]
        if (dayMap[dateStr]) {
          dayMap[dateStr].enrollments++
        }
      })

      // Aggregate attendance
      if (attData) {
        attData.forEach(a => {
          if (dayMap[a.date]) {
            dayMap[a.date].total++
            if (a.status === 'present' || a.status === 'late') {
              dayMap[a.date].present++
            }
          }
        })
      }

      const formattedData = Object.values(dayMap).map(d => {
        const rate = d.total > 0 ? Math.round((d.present / d.total) * 100) : 0
        return {
          name: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          Revenue: d.revenue,
          Enrollments: d.enrollments,
          "Attendance Rate (%)": rate
        }
      })

      setChartData(formattedData)
    } catch (err) {
      console.error("Error generating report:", err)
      if (schemaError || err.message?.includes('relation') || err.message?.includes('does not exist')) {
        generateMockData()
      }
    } finally {
      setLoading(false)
    }
  }

  function generateMockData() {
    // Falls back to mock data if DB schema is not ready yet
    setStats({
      attendanceRate: 88,
      totalRevenue: 24500,
      newEnrollments: 14,
      presentCount: 120,
      absentCount: 10,
      lateCount: 15
    })

    const mock = [
      { name: 'Mon', Revenue: 4000, Enrollments: 2, "Attendance Rate (%)": 90 },
      { name: 'Tue', Revenue: 3000, Enrollments: 1, "Attendance Rate (%)": 85 },
      { name: 'Wed', Revenue: 5000, Enrollments: 4, "Attendance Rate (%)": 92 },
      { name: 'Thu', Revenue: 2000, Enrollments: 1, "Attendance Rate (%)": 80 },
      { name: 'Fri', Revenue: 6000, Enrollments: 3, "Attendance Rate (%)": 95 },
      { name: 'Sat', Revenue: 4500, Enrollments: 3, "Attendance Rate (%)": 88 }
    ]
    setChartData(mock)
  }

  const exportCSV = () => {
    if (chartData.length === 0) return
    const headers = ['Date Period', 'Revenue Collected (₹)', 'New Enrollments', 'Attendance Rate (%)']
    const csvRows = chartData.map(d => [
      d.name,
      d.Revenue,
      d.Enrollments,
      d["Attendance Rate (%)"]
    ])
    
    const csvContent = [headers.join(','), ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `tkmaa_report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Report metrics exported to CSV')
  }

  const selectedBranchName = selectedBranch === 'all' ? 'All Branches' : branches.find(b => b.id === selectedBranch)?.name

  const reportTypes = [
    { id: 'daily', label: 'Daily (7 Days)', icon: Calendar },
    { id: 'weekly', label: 'Weekly (30 Days)', icon: TrendingUp },
    { id: 'monthly', label: 'Monthly (6 Months)', icon: BarChart3 },
    { id: 'custom', label: 'Custom Date Range', icon: Filter },
  ]

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0A1F30] sm:text-3xl">
            Reports & Analytics
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            {selectedSportName} reports for {selectedBranchName}
          </p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="text-xs rounded-lg h-10 gap-1.5">
          <Download size={14} /> 
          <span>Export Summary</span>
        </Button>
      </header>

      {/* RLS or Schema Warnings */}
      {schemaError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800 text-xs">
          <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={16} />
          <div>
            <p className="font-bold mb-1">Database Schema Migration Required</p>
            <p className="leading-relaxed">
              We detected that the new database tables (e.g. `sports`, `student_sports`) have not been created yet.
              We are displaying mock dashboard metrics. Please execute the SQL statements in the file <span className="font-mono bg-amber-100 px-1 py-0.5 rounded font-semibold text-amber-900">sports_migration.sql</span> in your Supabase SQL Editor to enable full dynamic reporting.
            </p>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden p-5">
        <div className="flex flex-col lg:flex-row gap-5 justify-between items-start lg:items-center">
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            {reportTypes.map(rt => (
              <Button
                key={rt.id}
                variant={reportType === rt.id ? 'default' : 'outline'}
                onClick={() => setReportType(rt.id)}
                className={`text-xs rounded-lg h-9 ${
                  reportType === rt.id
                    ? 'bg-[#0A1F30] text-white hover:bg-[#0A1F30]/90'
                    : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <rt.icon size={13} className="mr-1.5" />
                {rt.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 w-full lg:w-auto items-center">
            {/* Trainer Filter */}
            <div className="w-full sm:w-44">
              <select
                value={selectedTrainer}
                onChange={(e) => setSelectedTrainer(e.target.value)}
                className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-[#0A1F30] outline-none focus:border-[#C5A059]"
              >
                <option value="all">All Trainers</option>
                {trainers.map(t => (
                  <option key={t.id} value={t.id}>{t.users?.full_name}</option>
                ))}
              </select>
            </div>

            {/* Date range inputs for custom */}
            {reportType === 'custom' && (
              <div className="flex gap-2 items-center w-full sm:w-auto">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-xs w-full sm:w-32"
                />
                <span className="text-gray-400 text-xs">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-xs w-full sm:w-32"
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Attendance Rate", val: `${stats.attendanceRate}%`, icon: Users, color: "text-blue-600", bg: "bg-blue-50/50" },
          { label: "Revenue Collected", val: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50/50" },
          { label: "New Enrollments", val: stats.newEnrollments, icon: TrendingUp, color: "text-[#C5A059]", bg: "bg-[#C5A059]/10" }
        ].map((stat, i) => (
          <Card key={i} className="rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{stat.label}</p>
                <div className={`p-2 rounded-lg ${stat.bg}`}><stat.icon size={18} className={stat.color} /></div>
              </div>
              <div className="text-3xl font-black text-[#0A1F30]">{loading ? <Loader2 className="animate-spin text-[#C5A059]" size={20} /> : stat.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Column (2 cols) */}
        <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm lg:col-span-2 p-6">
          <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-[#0A1F30]">Performance Metrics Over Time</CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[320px]">
            {loading ? (
              <div className="h-full flex flex-col justify-center items-center gap-2">
                <Loader2 className="animate-spin text-[#C5A059]" size={32} />
                <span className="text-xs text-gray-400 font-medium">Generating Report Charts...</span>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                No transaction or enrollment activity recorded in the selected period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0A1F30', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue (₹)" />
                  <Area type="monotone" dataKey="Attendance Rate (%)" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAttendance)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Attendance Breakdown Column (1 col) */}
        <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 flex flex-col">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-sm font-bold text-[#0A1F30]">Attendance Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col justify-center gap-5">
            {loading ? (
              <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin text-[#C5A059]" /></div>
            ) : (
              <>
                {[
                  { label: 'Present Sessions', count: stats.presentCount, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                  { label: 'Absent Sessions', count: stats.absentCount, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
                  { label: 'Late Enrollments', count: stats.lateCount, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50/50 border border-gray-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${item.bg}`}><item.icon size={15} className={item.color} /></div>
                      <span className="text-xs font-semibold text-gray-500">{item.label}</span>
                    </div>
                    <span className="text-sm font-black text-[#0A1F30]">{item.count}</span>
                  </div>
                ))}

                <div className="mt-2 text-[10px] text-gray-400 font-medium italic text-center">
                  💡 Tip: The attendance rate calculates presenting students including late arrivals as half-day presence.
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
