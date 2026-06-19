"use client"
import { motion, AnimatePresence } from 'framer-motion'
import { Skeleton } from "@/components/ui/skeleton"
import { AdminDashboard } from '@/components/AdminDashboard'
import { PartnerDashboard } from '@/components/PartnerDashboard'
import { ParentDashboard } from '@/components/ParentDashboard'
import { useAuth } from '@/context/AuthContext'

export default function DashboardPage() {
  const { role, loading } = useAuth()

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

  // Determine which dashboard to show based on role
  const isAdmin = ['super_admin', 'admin', 'sport_admin', 'branch_admin'].includes(role)
  const isTrainer = role === 'trainer'
  const isStudentOrParent = role === 'student' || role === 'parent'

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div
          key={role || 'loading'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {isAdmin && <AdminDashboard />}
          {isTrainer && <PartnerDashboard />}
          {isStudentOrParent && <ParentDashboard />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
