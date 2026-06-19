'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
import { ROLES } from '@/lib/permissions'

const SportContext = createContext()

export function SportProvider({ children }) {
  const [sports, setSports] = useState([])
  const [selectedSport, setSelectedSport] = useState('all')
  const [loading, setLoading] = useState(true)
  const { permissions, loading: authLoading } = useAuth()

  useEffect(() => {
    if (authLoading) return

    async function loadSports() {
      setLoading(true)

      if (!permissions) {
        // No auth — load all active sports (public view)
        const { data } = await supabase
          .from('sports')
          .select('*')
          .eq('status', 'active')
          .order('sport_name')
        if (data && data.length > 0) {
          setSports(data)
          const karate = data.find(s => s.sport_name === 'Karate')
          if (karate) setSelectedSport(karate.id)
        }
        setLoading(false)
        return
      }

      const { role, sportIds, branchIds } = permissions

      // Super admin: all sports
      if (role === ROLES.SUPER_ADMIN || role === 'admin') {
        const { data } = await supabase
          .from('sports')
          .select('*')
          .eq('status', 'active')
          .order('sport_name')
        if (data && data.length > 0) {
          setSports(data)
          const karate = data.find(s => s.sport_name === 'Karate')
          if (karate) setSelectedSport(karate.id)
        }
        setLoading(false)
        return
      }

      // Branch admin: all sports in their branch(es)
      if (role === ROLES.BRANCH_ADMIN && branchIds.length > 0) {
        const { data: branchSports } = await supabase
          .from('branch_sports')
          .select('sports(*)')
          .in('branch_id', branchIds)
        const sportsData = branchSports?.map(bs => bs.sports).filter(Boolean) || []
        // Deduplicate
        const unique = [...new Map(sportsData.map(s => [s.id, s])).values()]
          .filter(s => s.status === 'active')
          .sort((a, b) => a.sport_name.localeCompare(b.sport_name))
        setSports(unique)
        if (unique.length === 1) {
          setSelectedSport(unique[0].id)
        } else {
          const karate = unique.find(s => s.sport_name === 'Karate')
          if (karate) setSelectedSport(karate.id)
        }
        setLoading(false)
        return
      }

      // Sport admin / Trainer: only assigned sports
      if (sportIds.length > 0) {
        const { data } = await supabase
          .from('sports')
          .select('*')
          .in('id', sportIds)
          .eq('status', 'active')
          .order('sport_name')
        if (data && data.length > 0) {
          setSports(data)
          // Auto-select if only one sport
          if (data.length === 1) {
            setSelectedSport(data[0].id)
          } else {
            const karate = data.find(s => s.sport_name === 'Karate')
            if (karate) setSelectedSport(karate.id)
          }
        }
        setLoading(false)
        return
      }

      // Student/parent: their enrolled sports
      if (role === ROLES.STUDENT || role === ROLES.PARENT) {
        const { data: studentSports } = await supabase
          .from('student_sports')
          .select('sports(*)')
          .eq('student_id', permissions.studentRecord?.id)
        const sportsData = studentSports?.map(ss => ss.sports).filter(Boolean) || []
        setSports(sportsData.sort((a, b) => a.sport_name.localeCompare(b.sport_name)))
        if (sportsData.length === 1) {
          setSelectedSport(sportsData[0].id)
        }
        setLoading(false)
        return
      }

      setLoading(false)
    }

    loadSports()
  }, [permissions, authLoading])

  const selectedSportData = sports.find(s => s.id === selectedSport) || null
  const selectedSportName = selectedSport === 'all'
    ? 'All Sports'
    : selectedSportData?.sport_name || 'All Sports'

  const isKarate = selectedSportData?.sport_name === 'Karate'

  // Whether the user can switch sports (sport_admin with 1 sport cannot)
  const canSwitchSport = permissions
    ? (permissions.role === ROLES.SUPER_ADMIN || permissions.role === 'admin' || permissions.role === ROLES.BRANCH_ADMIN || sports.length > 1)
    : true

  const refreshSports = async () => {
    const { data } = await supabase
      .from('sports')
      .select('*')
      .eq('status', 'active')
      .order('sport_name')
    if (data) setSports(data)
  }

  return (
    <SportContext.Provider value={{
      sports,
      selectedSport,
      setSelectedSport,
      selectedSportData,
      selectedSportName,
      isKarate,
      loading,
      canSwitchSport,
      refreshSports
    }}>
      {children}
    </SportContext.Provider>
  )
}

export function useSport() {
  const ctx = useContext(SportContext)
  if (!ctx) {
    // Return safe defaults if used outside provider (e.g., during SSR)
    return {
      sports: [],
      selectedSport: 'all',
      setSelectedSport: () => {},
      selectedSportData: null,
      selectedSportName: 'All Sports',
      isKarate: true,
      loading: true,
      canSwitchSport: true,
      refreshSports: () => {}
    }
  }
  return ctx
}
