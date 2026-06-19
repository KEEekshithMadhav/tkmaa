'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { getBranchesForSport, getScopedBranches, supabase } from '@/lib/supabase'
import { useSport } from './SportContext'
import { useAuth } from './AuthContext'
import { ROLES } from '@/lib/permissions'

const BranchContext = createContext()

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [loading, setLoading] = useState(true)
  const { selectedSport } = useSport()
  const { permissions, loading: authLoading } = useAuth()

  useEffect(() => {
    if (authLoading) return

    async function loadBranches() {
      setLoading(true)
      
      let data = []
      if (!permissions) {
        // Public/not logged in: get all branches for sport
        const { data: publicBranches } = await getBranchesForSport(selectedSport)
        if (publicBranches) data = publicBranches
      } else {
        // Logged in: get scoped branches
        const { data: scoped } = await getScopedBranches(permissions)
        if (scoped) data = scoped

        // Filter by selected sport if selectedSport is not 'all'
        if (selectedSport && selectedSport !== 'all') {
          const { data: branchSports } = await supabase
            .from('branch_sports')
            .select('branch_id')
            .eq('sport_id', selectedSport)
          const activeBranchIds = branchSports?.map(bs => bs.branch_id) || []
          data = data.filter(b => activeBranchIds.includes(b.id))
        }
      }

      setBranches(data)

      // Auto-select logic
      if (data.length === 1) {
        setSelectedBranch(data[0].id)
      } else {
        // If current selection is not 'all' and not in the updated branch list, reset
        const isValidSelection = selectedBranch === 'all' || data.some(b => b.id === selectedBranch)
        if (!isValidSelection) {
          setSelectedBranch(data.length > 0 ? data[0].id : 'all')
        }
      }
      setLoading(false)
    }

    loadBranches()
  }, [selectedSport, permissions, authLoading, selectedBranch])

  const selectedBranchData = branches.find(b => b.id === selectedBranch) || null
  const selectedBranchName = selectedBranch === 'all'
    ? 'All Branches'
    : selectedBranchData?.name || 'All Branches'

  const canSwitchBranch = permissions
    ? (permissions.role === ROLES.SUPER_ADMIN || permissions.role === 'admin' || branches.length > 1)
    : true

  return (
    <BranchContext.Provider value={{
      branches,
      selectedBranch,
      setSelectedBranch,
      selectedBranchData,
      selectedBranchName,
      loading,
      canSwitchBranch
    }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) {
    return {
      branches: [],
      selectedBranch: 'all',
      setSelectedBranch: () => {},
      selectedBranchData: null,
      selectedBranchName: 'All Branches',
      loading: true,
      canSwitchBranch: true
    }
  }
  return ctx
}
