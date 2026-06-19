"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Medal, Search, MapPin, Building, Loader2, Sparkles, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useBranch } from '@/context/BranchContext'
import { useAuth } from '@/context/AuthContext'

export default function LeaderboardPage() {
  const { selectedBranch } = useBranch()
  const { permissions, role } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overall') // 'overall', 'branch', 'state'
  const [searchQuery, setSearchQuery] = useState('')

  // Aggregated data lists
  const [overallLeaderboard, setOverallLeaderboard] = useState([])
  const [branchLeaderboard, setBranchLeaderboard] = useState([])
  const [stateLeaderboard, setStateLeaderboard] = useState([])

  const fetchAndProcessData = async () => {
    if (!permissions) return
    setLoading(true)
    try {
      // 1. Fetch all completed tournament matches and include their tournament details to resolve branches
      const { data: matches, error: matchesErr } = await supabase
        .from('tournament_matches')
        .select(`
          *,
          tournaments(
            id,
            branch_id,
            sport_id
          ),
          ao:ao_id(
            id,
            branch_id,
            users(full_name),
            branches(name)
          ),
          aka:aka_id(
            id,
            branch_id,
            users(full_name),
            branches(name)
          ),
          winner:winner_id(
            id,
            branch_id,
            users(full_name),
            branches(name)
          )
        `)
        .eq('status', 'completed')

      if (matchesErr) throw matchesErr

      // 2. Fetch all students to ensure we have user names and branches mapped
      const { data: students, error: studentsErr } = await supabase
        .from('students')
        .select(`
          id,
          branch_id,
          users(full_name),
          branches(name),
          student_sports(sport_id)
        `)

      if (studentsErr) throw studentsErr

      // Filter matches and students by selected branch scope and user sport scope
      const isBranchFiltered = selectedBranch && selectedBranch !== 'all'
      const mySportsList = permissions?.sportIds || []
      const isSportsAdminUser = role === 'sport_admin'

      const filteredStudents = isBranchFiltered
        ? (students || []).filter(s => s.branch_id === selectedBranch)
        : (students || [])

      const finalStudents = isSportsAdminUser
        ? filteredStudents.filter(s => {
            const studentSportIds = s.student_sports?.map(ss => ss.sport_id) || []
            return studentSportIds.some(id => mySportsList.includes(id))
          })
        : filteredStudents

      const filteredMatches = isBranchFiltered
        ? (matches || []).filter(m => m.tournaments?.branch_id === selectedBranch)
        : (matches || [])

      const finalMatches = isSportsAdminUser
        ? filteredMatches.filter(m => mySportsList.includes(m.tournaments?.sport_id))
        : filteredMatches

      // Initialize stats dictionary
      const studentStats = {}
      finalStudents.forEach(s => {
        studentStats[s.id] = {
          id: s.id,
          name: s.users?.full_name || 'Unknown Athlete',
          branchName: s.branches?.name || 'No Dojo',
          branchId: s.branch_id,
          state: s.state || 'Telangana',
          wins: 0,
          losses: 0,
          gold: 0,
          silver: 0,
          bronze: 0,
          points: 0
        }
      })

      // 3. Process Medals (Gold, Silver, Bronze)
      // Group matches by tournament + category to find finals & semi-finals
      const groups = {}
      finalMatches.forEach(m => {
        const key = `${m.tournament_id}_${m.category}`
        if (!groups[key]) groups[key] = []
        groups[key].push(m)
      })

      Object.values(groups).forEach(groupMatches => {
        const maxRound = Math.max(...groupMatches.map(m => m.round))
        
        // Final Match: round = maxRound, match_number = 0
        const finalMatch = groupMatches.find(m => m.round === maxRound && m.match_number === 0)
        if (finalMatch && finalMatch.winner_id) {
          const winnerId = finalMatch.winner_id
          const loserId = finalMatch.ao_id === winnerId ? finalMatch.aka_id : finalMatch.ao_id
          
          if (studentStats[winnerId]) {
            studentStats[winnerId].gold += 1
          }
          if (loserId && studentStats[loserId]) {
            studentStats[loserId].silver += 1
          }
        }

        // Semi-final matches: round = maxRound - 1
        if (maxRound >= 1) {
          const semiMatches = groupMatches.filter(m => m.round === maxRound - 1)
          semiMatches.forEach(sm => {
            if (sm.winner_id) {
              const loserId = sm.ao_id === sm.winner_id ? sm.aka_id : sm.ao_id
              
              // Verify the loser is not a bye
              const isAoBye = sm.ao_penalties?.is_bye
              const isAkaBye = sm.aka_penalties?.is_bye
              const loserIsBye = sm.ao_id === sm.winner_id ? isAkaBye : isAoBye
              
              if (loserId && !loserIsBye && studentStats[loserId]) {
                studentStats[loserId].bronze += 1
              }
            }
          })
        }
      })

      // 4. Process Wins, Losses and Total Points
      finalMatches.forEach(m => {
        const aoId = m.ao_id
        const akaId = m.aka_id
        const winnerId = m.winner_id

        // AO details
        if (aoId && !m.ao_penalties?.is_bye) {
          if (studentStats[aoId]) {
            studentStats[aoId].points += m.ao_score || 0
            if (winnerId === aoId) {
              studentStats[aoId].wins += 1
            } else if (winnerId && winnerId !== aoId) {
              studentStats[aoId].losses += 1
            }
          }
        }

        // AKA details
        if (akaId && !m.aka_penalties?.is_bye) {
          if (studentStats[akaId]) {
            studentStats[akaId].points += m.aka_score || 0
            if (winnerId === akaId) {
              studentStats[akaId].wins += 1
            } else if (winnerId && winnerId !== akaId) {
              studentStats[akaId].losses += 1
            }
          }
        }
      })

      // 5. Build Overall Leaderboard List
      const overallList = Object.values(studentStats)
      // Sort criteria: Gold -> Silver -> Bronze -> Wins -> Points
      overallList.sort((a, b) => {
        if (b.gold !== a.gold) return b.gold - a.gold
        if (b.silver !== a.silver) return b.silver - a.silver
        if (b.bronze !== a.bronze) return b.bronze - a.bronze
        if (b.wins !== a.wins) return b.wins - a.wins
        return b.points - a.points
      })
      setOverallLeaderboard(overallList)

      // 6. Build Branch-Wise Leaderboard
      const branchMap = {}
      overallList.forEach(s => {
        const key = s.branchName || 'No Dojo'
        if (!branchMap[key]) {
          branchMap[key] = {
            name: key,
            gold: 0,
            silver: 0,
            bronze: 0,
            wins: 0,
            losses: 0,
            points: 0
          }
        }
        branchMap[key].gold += s.gold
        branchMap[key].silver += s.silver
        branchMap[key].bronze += s.bronze
        branchMap[key].wins += s.wins
        branchMap[key].losses += s.losses
        branchMap[key].points += s.points
      })
      const branchList = Object.values(branchMap).sort((a, b) => {
        if (b.gold !== a.gold) return b.gold - a.gold
        if (b.silver !== a.silver) return b.silver - a.silver
        if (b.bronze !== a.bronze) return b.bronze - a.bronze
        if (b.wins !== a.wins) return b.wins - a.wins
        return b.points - a.points
      })
      setBranchLeaderboard(branchList)

      // 7. Build State-Wise Leaderboard
      const stateMap = {}
      overallList.forEach(s => {
        const key = s.state || 'Telangana'
        if (!stateMap[key]) {
          stateMap[key] = {
            name: key,
            gold: 0,
            silver: 0,
            bronze: 0,
            wins: 0,
            losses: 0,
            points: 0
          }
        }
        stateMap[key].gold += s.gold
        stateMap[key].silver += s.silver
        stateMap[key].bronze += s.bronze
        stateMap[key].wins += s.wins
        stateMap[key].losses += s.losses
        stateMap[key].points += s.points
      })
      const stateList = Object.values(stateMap).sort((a, b) => {
        if (b.gold !== a.gold) return b.gold - a.gold
        if (b.silver !== a.silver) return b.silver - a.silver
        if (b.bronze !== a.bronze) return b.bronze - a.bronze
        if (b.wins !== a.wins) return b.wins - a.wins
        return b.points - a.points
      })
      setStateLeaderboard(stateList)

    } catch (err) {
      toast.error('Failed to load leaderboard data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAndProcessData()
  }, [selectedBranch, permissions])

  // Filtering helpers based on tab
  const getFilteredData = () => {
    if (activeTab === 'overall') {
      return overallLeaderboard.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.state.toLowerCase().includes(searchQuery.toLowerCase())
      )
    } else if (activeTab === 'branch') {
      return branchLeaderboard.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    } else {
      return stateLeaderboard.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
  }

  const filteredData = getFilteredData()

  // Get Top 3 athletes for the podium (only for overall tab)
  const topThree = overallLeaderboard.slice(0, 3)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-[#C5A059]" />
          <p className="text-sm font-mono uppercase tracking-widest text-[#0A1F30]/40">Generating Standings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20 text-[#0A1F30]">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0A1F30] sm:text-3xl">
            Academy Leaderboard
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            Real-time standings and rankings across all sports, dojos, and states
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchAndProcessData} variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50 uppercase tracking-wider text-[10px] font-black rounded-lg px-4 cursor-pointer">
            <RotateCcw size={14} className="mr-2 text-[#C5A059]" /> Refresh Stats
          </Button>
        </div>
      </header>

      {/* Tabs Selector & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex bg-gray-100 p-1.5 rounded-xl gap-1.5 w-fit">
          <button
            onClick={() => { setActiveTab('overall'); setSearchQuery('') }}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'overall'
                ? 'bg-[#0A1F30] text-white shadow-sm'
                : 'text-gray-500 hover:text-[#0A1F30]'
            }`}
          >
            Overall Athletes
          </button>
          <button
            onClick={() => { setActiveTab('branch'); setSearchQuery('') }}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'branch'
                ? 'bg-[#0A1F30] text-white shadow-sm'
                : 'text-gray-500 hover:text-[#0A1F30]'
            }`}
          >
            Branch Wise (Dojos)
          </button>
          <button
            onClick={() => { setActiveTab('state'); setSearchQuery('') }}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'state'
                ? 'bg-[#0A1F30] text-white shadow-sm'
                : 'text-gray-500 hover:text-[#0A1F30]'
            }`}
          >
            State Wise
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Search by ${activeTab === 'overall' ? 'athlete, dojo...' : activeTab === 'branch' ? 'dojo name...' : 'state name...'}`}
            className="pl-10 pr-4 bg-white border-gray-200 rounded-xl h-10 text-sm focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10"
          />
        </div>
      </div>

      {/* Athlete Podium (Only on Overall Tab and if there is data) */}
      {activeTab === 'overall' && topThree.length > 0 && searchQuery === '' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-10 pb-6 max-w-4xl mx-auto">
          {/* 2nd Place */}
          {topThree[1] && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center order-2 md:order-1"
            >
              <div className="relative mb-3 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full border-2 border-slate-300 bg-slate-100 flex items-center justify-center text-slate-700 font-extrabold text-lg shadow-md">
                  2
                </div>
                <div className="absolute -top-3 right-0 bg-slate-400 text-white rounded-full p-1 shadow-sm">
                  <Medal size={14} />
                </div>
              </div>
              <div className="text-center bg-white border border-gray-100 rounded-2xl p-4 shadow-sm w-full space-y-1">
                <h3 className="text-sm font-black uppercase tracking-wide truncate">{topThree[1].name}</h3>
                <p className="text-[10px] text-gray-450 truncate">{topThree[1].branchName}</p>
                <div className="flex gap-1.5 justify-center pt-2">
                  <span className="text-[9px] uppercase font-bold text-gray-400 bg-gray-50 border border-gray-150 px-2 py-0.5 rounded-full">
                    {topThree[1].gold}G · {topThree[1].silver}S · {topThree[1].bronze}B
                  </span>
                </div>
              </div>
              <div className="h-16 w-full bg-gradient-to-t from-slate-200/50 to-slate-100/50 border-t border-slate-200 rounded-t-xl mt-4 flex items-center justify-center font-bold text-slate-500">
                SLATE DIVISION
              </div>
            </motion.div>
          )}

          {/* 1st Place (Winner) */}
          {topThree[0] && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className="flex flex-col items-center order-1 md:order-2 z-10 scale-105"
            >
              <div className="relative mb-4 flex flex-col items-center">
                <motion.div 
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="w-20 h-20 rounded-full border-4 border-amber-400 bg-amber-50 flex items-center justify-center text-amber-600 font-black text-2xl shadow-[0_0_25px_rgba(245,158,11,0.25)]"
                >
                  1
                </motion.div>
                <div className="absolute -top-4 bg-amber-400 text-white rounded-full p-1.5 shadow-md">
                  <Trophy size={16} />
                </div>
              </div>
              <div className="text-center bg-white border-2 border-amber-300 rounded-2xl p-5 shadow-md w-full space-y-1.5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 bg-amber-400 text-white font-mono text-[8px] font-black rounded-bl">CHAMPION</div>
                <h3 className="text-base font-black uppercase tracking-wide truncate">{topThree[0].name}</h3>
                <p className="text-xs text-amber-600 font-semibold truncate">{topThree[0].branchName}</p>
                <div className="flex gap-1.5 justify-center pt-2">
                  <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles size={10} /> {topThree[0].gold} Gold Medals
                  </span>
                </div>
              </div>
              <div className="h-24 w-full bg-gradient-to-t from-amber-200/50 to-amber-100/50 border-t border-amber-200 rounded-t-xl mt-4 flex items-center justify-center font-black text-amber-700 tracking-wider">
                GOLDEN DOJO
              </div>
            </motion.div>
          )}

          {/* 3rd Place */}
          {topThree[2] && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center order-3"
            >
              <div className="relative mb-3 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full border-2 border-amber-700/30 bg-amber-950/5 flex items-center justify-center text-amber-800 font-extrabold text-lg shadow-md">
                  3
                </div>
                <div className="absolute -top-3 right-0 bg-slate-400 text-white rounded-full p-1 shadow-sm">
                  <Medal size={14} />
                </div>
              </div>
              <div className="text-center bg-white border border-gray-100 rounded-2xl p-4 shadow-sm w-full space-y-1">
                <h3 className="text-sm font-black uppercase tracking-wide truncate">{topThree[2].name}</h3>
                <p className="text-[10px] text-gray-450 truncate">{topThree[2].branchName}</p>
                <div className="flex gap-1.5 justify-center pt-2">
                  <span className="text-[9px] uppercase font-bold text-gray-400 bg-gray-50 border border-gray-150 px-2 py-0.5 rounded-full">
                    {topThree[2].gold}G · {topThree[2].silver}S · {topThree[2].bronze}B
                  </span>
                </div>
              </div>
              <div className="h-12 w-full bg-gradient-to-t from-orange-200/40 to-orange-100/40 border-t border-orange-200 rounded-t-xl mt-4 flex items-center justify-center font-bold text-amber-900/60">
                BRONZE DIVISION
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Main Ranking Table */}
      <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden text-[#0A1F30]">
        <CardHeader className="border-b border-gray-100 p-6 flex flex-row items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-wider text-[#0A1F30] font-bold">
            {activeTab === 'overall' ? 'Individual Athlete Standings' : activeTab === 'branch' ? 'Dojo Standings' : 'State Standings'}
          </CardTitle>
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 bg-gray-50 border border-gray-150 py-1 px-3 rounded-full">
            Rankings sorted by Gold Medals
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-500 h-12">
                  <th className="pl-6 w-16 text-center">Rank</th>
                  <th className="pl-4">Name / Title</th>
                  {activeTab === 'overall' && <th className="pl-4">Dojo (Branch)</th>}
                  {activeTab === 'overall' && <th className="pl-4">State</th>}
                  <th className="pl-4 text-center w-16">Gold</th>
                  <th className="pl-4 text-center w-16">Silver</th>
                  <th className="pl-4 text-center w-16">Bronze</th>
                  <th className="pl-4 text-center w-16">Wins</th>
                  <th className="pl-4 text-center w-16">Losses</th>
                  <th className="pr-6 text-right w-24">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-gray-400 uppercase text-xs tracking-wider font-bold">
                      No matching records found in registry
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors h-14 text-sm font-semibold">
                      <td className="pl-6 text-center">
                        {idx + 1 === 1 ? (
                          <span className="inline-flex h-6 w-6 rounded-full bg-amber-400 text-white text-xs font-black items-center justify-center shadow-sm">1</span>
                        ) : idx + 1 === 2 ? (
                          <span className="inline-flex h-6 w-6 rounded-full bg-slate-300 text-white text-xs font-black items-center justify-center shadow-sm">2</span>
                        ) : idx + 1 === 3 ? (
                          <span className="inline-flex h-6 w-6 rounded-full bg-amber-700/60 text-white text-xs font-black items-center justify-center shadow-sm">3</span>
                        ) : (
                          <span className="text-gray-450 font-mono text-xs">{idx + 1}</span>
                        )}
                      </td>
                      <td className="pl-4">
                        <div className="flex items-center gap-2">
                          {activeTab === 'overall' ? (
                            <div className="h-2 w-2 rounded-full bg-indigo-500" />
                          ) : activeTab === 'branch' ? (
                            <Building size={14} className="text-[#C5A059]" />
                          ) : (
                            <MapPin size={14} className="text-blue-500" />
                          )}
                          <span className="text-[#0A1F30] font-bold">{item.name}</span>
                        </div>
                      </td>
                      {activeTab === 'overall' && (
                        <td className="pl-4 text-gray-500">{item.branchName}</td>
                      )}
                      {activeTab === 'overall' && (
                        <td className="pl-4 text-gray-500">{item.state}</td>
                      )}
                      <td className="pl-4 text-center">
                        <span className={`inline-flex items-center justify-center h-6 w-8 rounded font-mono font-bold text-xs ${item.gold > 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'text-gray-300'}`}>
                          {item.gold}
                        </span>
                      </td>
                      <td className="pl-4 text-center">
                        <span className={`inline-flex items-center justify-center h-6 w-8 rounded font-mono font-bold text-xs ${item.silver > 0 ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'text-gray-300'}`}>
                          {item.silver}
                        </span>
                      </td>
                      <td className="pl-4 text-center">
                        <span className={`inline-flex items-center justify-center h-6 w-8 rounded font-mono font-bold text-xs ${item.bronze > 0 ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'text-gray-300'}`}>
                          {item.bronze}
                        </span>
                      </td>
                      <td className="pl-4 text-center font-mono text-xs text-gray-600">{item.wins}</td>
                      <td className="pl-4 text-center font-mono text-xs text-gray-400">{item.losses}</td>
                      <td className="pr-6 text-right font-mono font-bold text-[#C5A059]">{item.points} pts</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
