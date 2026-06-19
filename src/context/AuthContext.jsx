'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ROLES, ROLE_LABELS, hasPermission, isOverallAdmin, isAdminRole } from '@/lib/permissions'

const AuthContext = createContext(null)

/**
 * AuthProvider — Central auth context that resolves the full permission scope.
 *
 * Loads:
 *  - user session from Supabase auth
 *  - user record from public.users (role)
 *  - branch assignments from branch_managers
 *  - sport assignments from sport_admin_assignments
 *  - trainer record (branch_id, sport via trainer_sports, batch via batches)
 *  - student record (branch_id, sport via student_sports)
 *
 * Exposes a `permissions` object:
 *  { role, userId, branchIds, sportIds, batchIds, trainerRecord, studentRecord }
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)          // Supabase auth user
  const [userRecord, setUserRecord] = useState(null) // public.users row
  const [permissions, setPermissions] = useState(null)
  const [loading, setLoading] = useState(true)

  // Resolve full permission scope for the current user
  const resolvePermissions = useCallback(async (authUser) => {
    if (!authUser) {
      setPermissions(null)
      return
    }

    try {
      // 1. Fetch user record
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (!userData) {
        setUserRecord(null)
        setPermissions({
          role: ROLES.STUDENT,
          userId: authUser.id,
          branchIds: [],
          sportIds: [],
          batchIds: [],
          trainerRecord: null,
          studentRecord: null,
        })
        return
      }

      setUserRecord(userData)

      // Normalize role (backward compat: 'admin' → 'super_admin')
      const role = userData.role === 'admin' ? ROLES.SUPER_ADMIN : (userData.role || ROLES.STUDENT)

      let branchIds = []
      let sportIds = []
      let batchIds = []
      let trainerRecord = null
      let studentRecord = null

      // 2. Resolve scope based on role
      if (isOverallAdmin(role)) {
        // Super admin: no restrictions — branchIds/sportIds stay empty (meaning "all")
        // We use empty arrays to signal "unrestricted"
      } else if (role === ROLES.BRANCH_ADMIN) {
        // Fetch assigned branches
        const { data: assignments } = await supabase
          .from('branch_managers')
          .select('branch_id')
          .eq('user_id', authUser.id)
        branchIds = assignments?.map(a => a.branch_id) || []
      } else if (role === ROLES.SPORT_ADMIN) {
        // Fetch assigned sports
        const { data: sportAssignments } = await supabase
          .from('sport_admin_assignments')
          .select('sport_id')
          .eq('user_id', authUser.id)
        sportIds = sportAssignments?.map(a => a.sport_id) || []

        // Fetch assigned branches from branch_managers
        const { data: managerAssignments } = await supabase
          .from('branch_managers')
          .select('branch_id')
          .eq('user_id', authUser.id)
        
        const assignedBranches = managerAssignments?.map(a => a.branch_id) || []
        
        if (assignedBranches.length > 0) {
          branchIds = assignedBranches
        } else if (sportIds.length > 0) {
          // Fallback to branches offering those sports
          const { data: branchSports } = await supabase
            .from('branch_sports')
            .select('branch_id')
            .in('sport_id', sportIds)
          branchIds = [...new Set(branchSports?.map(bs => bs.branch_id) || [])]
        }
      } else if (role === ROLES.TRAINER) {
        // Fetch trainer record
        const { data: trainerData } = await supabase
          .from('trainers')
          .select('*, trainer_sports(sport_id)')
          .eq('user_id', authUser.id)
          .maybeSingle()

        if (trainerData) {
          trainerRecord = trainerData
          branchIds = [trainerData.branch_id]
          sportIds = trainerData.trainer_sports?.map(ts => ts.sport_id) || []

          // Fetch assigned batches
          const { data: batchData } = await supabase
            .from('batches')
            .select('id')
            .eq('trainer_id', trainerData.id)
          batchIds = batchData?.map(b => b.id) || []
        }
      } else if (role === ROLES.STUDENT || role === ROLES.PARENT) {
        // Fetch student record
        const { data: studentData } = await supabase
          .from('students')
          .select('*, student_sports(sport_id), student_batches(batch_id)')
          .eq('user_id', authUser.id)
          .maybeSingle()

        if (studentData) {
          studentRecord = studentData
          branchIds = [studentData.branch_id]
          sportIds = studentData.student_sports?.map(ss => ss.sport_id) || []
          batchIds = studentData.student_batches?.map(sb => sb.batch_id) || []
        }
      }

      setPermissions({
        role,
        userId: authUser.id,
        branchIds,
        sportIds,
        batchIds,
        trainerRecord,
        studentRecord,
      })
    } catch (err) {
      console.error('AuthContext: Failed to resolve permissions', err)
      setPermissions({
        role: ROLES.STUDENT,
        userId: authUser.id,
        branchIds: [],
        sportIds: [],
        batchIds: [],
        trainerRecord: null,
        studentRecord: null,
      })
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return

      if (session?.user) {
        setUser(session.user)
        await resolvePermissions(session.user)
      }
      setLoading(false)
    }

    init()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await resolvePermissions(session.user)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserRecord(null)
          setPermissions(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [resolvePermissions])

  // Convenience getters
  const role = permissions?.role || null
  const isAuthenticated = !!user
  const isSuperAdmin = isOverallAdmin(role)
  const isBranchAdmin = role === ROLES.BRANCH_ADMIN
  const isSportsAdmin = role === ROLES.SPORT_ADMIN
  const isTrainer = role === ROLES.TRAINER
  const isStudent = role === ROLES.STUDENT
  const isParent = role === ROLES.PARENT
  const isAnyAdmin = isAdminRole(role)

  // Role display
  const roleLabel = role ? ROLE_LABELS[role] || role : ''

  // Branch label(s) for display (e.g., "Hyderabad Branch")
  // This is populated later by BranchContext using the branchIds

  /**
   * Check if current user has a specific permission.
   */
  const can = useCallback((permission) => {
    if (!role) return false
    return hasPermission(role, permission)
  }, [role])

  /**
   * Refresh permissions (e.g., after role change).
   */
  const refreshPermissions = useCallback(async () => {
    if (user) {
      setLoading(true)
      await resolvePermissions(user)
      setLoading(false)
    }
  }, [user, resolvePermissions])

  return (
    <AuthContext.Provider value={{
      // Auth state
      user,
      userRecord,
      loading,
      isAuthenticated,

      // Permissions
      permissions,
      role,
      roleLabel,
      can,

      // Role shortcuts
      isSuperAdmin,
      isBranchAdmin,
      isSportsAdmin,
      isTrainer,
      isStudent,
      isParent,
      isAnyAdmin,

      // Actions
      refreshPermissions,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to consume auth context. Returns safe defaults if used outside provider.
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    return {
      user: null,
      userRecord: null,
      loading: true,
      isAuthenticated: false,
      permissions: null,
      role: null,
      roleLabel: '',
      can: () => false,
      isSuperAdmin: false,
      isBranchAdmin: false,
      isSportsAdmin: false,
      isTrainer: false,
      isStudent: false,
      isParent: false,
      isAnyAdmin: false,
      refreshPermissions: () => {},
    }
  }
  return ctx
}
