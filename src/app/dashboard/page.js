"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, getUserRole } from '@/lib/supabase'
import { Skeleton } from "@/components/ui/skeleton"
import { AdminDashboard } from '@/components/AdminDashboard'
import { PartnerDashboard } from '@/components/PartnerDashboard'
import { ParentDashboard } from '@/components/ParentDashboard'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  const [devRole, setDevRole] = useState(null)

  useEffect(() => {
    async function loadRole() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const userRole = await getUserRole(session.user.id)
          setRole(userRole)
        } else {
          // No session — default to admin for demo purposes
          setRole('admin')
        }
      } catch (err) {
        console.error('Dashboard role fetch error:', err)
        setRole('admin')
      } finally {
        setLoading(false)
      }
    }
    loadRole()
  }, [])

  const activeRole = devRole || role

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 p-2">
        <div className="flex justify-between items-end">
          <div className="space-y-3">
            <Skeleton className="h-4 w-32 bg-gray-200" />
            <Skeleton className="h-10 w-64 bg-gray-200" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-28 bg-gray-200" />
            <Skeleton className="h-10 w-32 bg-gray-200" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-40 w-full rounded-2xl bg-gray-200" />
          <Skeleton className="h-40 w-full rounded-2xl bg-gray-200" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl bg-gray-200" />
        <Skeleton className="h-80 w-full rounded-2xl bg-gray-200" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Dev Role Switcher — for testing */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-6 flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">Dev Role:</span>
          {['admin', 'trainer', 'student'].map(r => (
            <button
              key={r}
              onClick={() => setDevRole(r)}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-bold rounded-lg transition-all ${
                activeRole === r 
                  ? 'bg-[#0A1F30] text-white shadow-sm' 
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}
            >
              {r === 'trainer' ? 'Partner' : r}
            </button>
          ))}
          {devRole && (
            <button 
              onClick={() => setDevRole(null)} 
              className="ml-auto text-[10px] text-gray-400 hover:text-gray-600 uppercase tracking-wider"
            >
              Reset
            </button>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeRole}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {activeRole === 'admin' && <AdminDashboard />}
          {activeRole === 'trainer' && <PartnerDashboard />}
          {(activeRole === 'student' || activeRole === 'parent') && <ParentDashboard />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
