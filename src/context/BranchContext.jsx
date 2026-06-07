'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { getBranches } from '@/lib/supabase'

const BranchContext = createContext()

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadBranches() {
      const { data } = await getBranches()
      if (data) {
        setBranches(data)
      }
      setLoading(false)
    }
    loadBranches()
  }, [])

  return (
    <BranchContext.Provider value={{ branches, selectedBranch, setSelectedBranch, loading }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  return useContext(BranchContext)
}
