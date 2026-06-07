"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Plus, ChevronRight, X, Shuffle, Users, ShieldCheck, Target, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from '@/lib/supabase'
import { useBranch } from '@/context/BranchContext'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useForm } from "react-hook-form"

// ── Weight categories (standard karate) ──
const WEIGHT_CATS = {
  'U-30kg':  { min:0,  max:30 },
  '30-35kg': { min:30, max:35 },
  '35-40kg': { min:35, max:40 },
  '40-45kg': { min:40, max:45 },
  '45-50kg': { min:45, max:50 },
  '50-55kg': { min:50, max:55 },
  '55-60kg': { min:55, max:60 },
  '60-65kg': { min:60, max:65 },
  '+65kg':   { min:65, max:999 },
}

// Age categories
const AGE_CATS = {
  'Cadet (10-13)': { min:10, max:13 },
  'Junior (14-17)': { min:14, max:17 },
  'Senior (18+)':   { min:18, max:99 },
  'Kids (6-9)':     { min:6,  max:9  },
}

// Shuffle helper
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Build single-elim bracket from list of players
function buildBracket(players) {
  const shuffled = shuffle(players)
  const rounds = []
  let current = shuffled.map(p => ({ player: p, bye: false }))
  // Pad to power of 2 with byes
  let size = 1
  while (size < current.length) size *= 2
  while (current.length < size) current.push({ player: null, bye: true })

  while (current.length > 1) {
    const matches = []
    for (let i = 0; i < current.length; i += 2) {
      const a = current[i], b = current[i + 1]
      const winner = (a.bye) ? b : (b.bye) ? a : null
      matches.push({ id: `r${rounds.length}_m${i/2}`, ao: a, aka: b, winner, done: winner !== null })
    }
    rounds.push(matches)
    current = matches.map(m => m.winner ? { player: m.winner.player, bye: false } : { player: null, bye: false })
  }
  return rounds
}

// ── Match Card ──
function MatchCard({ match, onWinner, onScore }) {
  const { ao, aka, winner, done, id } = match
  if (ao.bye || aka.bye) return null 

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 min-w-[260px] relative overflow-hidden group">
      <div className="flex justify-between items-center mb-3">
        <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Segment {id}</div>
        {!done && (
          <Button 
            variant="ghost" 
            size="xs" 
            onClick={() => onScore(match)}
            className="h-6 text-[10px] uppercase tracking-wider text-[#C5A059] hover:text-[#0A1F30] hover:bg-gray-100 rounded-lg border border-[#C5A059]/20"
          >
            Electronic Scoring
          </Button>
        )}
      </div>
      
      {/* AO - Blue */}
      <motion.div
        whileHover={!done ? { x: 5 } : {}}
        onClick={() => !done && onWinner(id, 'ao')}
        className={`p-3 rounded-lg border mb-2 cursor-pointer transition-all ${
          winner === ao 
          ? "bg-blue-50 border-blue-200 shadow-sm" 
          : "bg-white border-gray-200 grayscale hover:grayscale-0"
        }`}
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">AO (青)</div>
            <div className="text-sm font-semibold text-[#0A1F30] truncate max-w-[140px]">{ao.player?.name || ao.player?.users?.full_name}</div>
          </div>
          <div className="flex items-center gap-3">
            {match.aoScore > 0 && <span className="text-xl font-bold text-blue-600">{match.aoScore}</span>}
            {winner === ao && <Trophy size={14} className="text-blue-600" />}
          </div>
        </div>
      </motion.div>

      <div className="text-center text-[10px] font-bold text-gray-300 my-2 tracking-[0.2em]">VS</div>

      {/* AKA - Red */}
      <motion.div
        whileHover={!done ? { x: 5 } : {}}
        onClick={() => !done && onWinner(id, 'aka')}
        className={`p-3 rounded-lg border transition-all ${
          winner === aka 
          ? "bg-red-50 border-red-200 shadow-sm" 
          : "bg-white border-gray-200 grayscale hover:grayscale-0"
        }`}
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">AKA (赤)</div>
            <div className="text-sm font-semibold text-[#0A1F30] truncate max-w-[140px]">{aka.player?.name || aka.player?.users?.full_name}</div>
          </div>
          <div className="flex items-center gap-3">
            {match.akaScore > 0 && <span className="text-xl font-bold text-red-600">{match.akaScore}</span>}
            {winner === aka && <Trophy size={14} className="text-red-600" />}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function ScoringModal({ match, onClose, onSave }) {
  const [aoScore, setAoScore] = useState(match.aoScore || 0)
  const [akaScore, setAkaScore] = useState(match.akaScore || 0)

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4"
    >
      <Card className="bg-white border-gray-200 w-full max-w-2xl rounded-2xl overflow-hidden shadow-xl">
        <div className="grid grid-cols-2 h-[400px]">
          {/* AO Scoring */}
          <div className="bg-blue-600 flex flex-col items-center justify-center space-y-8 p-8 relative">
            <div className="text-xs font-bold uppercase tracking-widest text-white/80 absolute top-8">AO (Blue) Points</div>
            <div className="text-[120px] font-bold text-white leading-none">{aoScore}</div>
            <div className="grid grid-cols-3 gap-2 w-full">
              {[1, 2, 3].map(v => (
                <button 
                  key={v}
                  onClick={() => setAoScore(s => s + v)}
                  className="h-16 bg-white/20 hover:bg-white/30 rounded-lg border border-white/30 text-white font-bold text-xl transition-colors"
                >
                  +{v}
                </button>
              ))}
              <button 
                onClick={() => setAoScore(s => Math.max(0, s - 1))}
                className="h-12 col-span-3 bg-black/20 hover:bg-black/30 rounded-lg text-white/80 font-bold uppercase tracking-wider text-[10px]"
              >
                Correction (-1)
              </button>
            </div>
          </div>
          
          {/* AKA Scoring */}
          <div className="bg-red-600 flex flex-col items-center justify-center space-y-8 p-8 relative">
            <div className="text-xs font-bold uppercase tracking-widest text-white/80 absolute top-8">AKA (Red) Points</div>
            <div className="text-[120px] font-bold text-white leading-none">{akaScore}</div>
            <div className="grid grid-cols-3 gap-2 w-full">
              {[1, 2, 3].map(v => (
                <button 
                  key={v}
                  onClick={() => setAkaScore(s => s + v)}
                  className="h-16 bg-white/20 hover:bg-white/30 rounded-lg border border-white/30 text-white font-bold text-xl transition-colors"
                >
                  +{v}
                </button>
              ))}
              <button 
                onClick={() => setAkaScore(s => Math.max(0, s - 1))}
                className="h-12 col-span-3 bg-black/20 hover:bg-black/30 rounded-lg text-white/80 font-bold uppercase tracking-wider text-[10px]"
              >
                Correction (-1)
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex border-t border-gray-100 h-16">
          <button 
            onClick={onClose}
            className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-500 uppercase tracking-wider text-xs font-bold border-r border-gray-200"
          >
            Abort Session
          </button>
          <button 
            onClick={() => onSave(match.id, aoScore, akaScore)}
            className="flex-1 bg-[#C5A059] hover:bg-[#C5A059]/90 text-white uppercase tracking-wider text-xs font-bold"
          >
            Confirm Scores & Sync
          </button>
        </div>
      </Card>
    </motion.div>
  )
}

function CategoryBracket({ category, onClose }) {
  const [rounds, setRounds] = useState(() => buildBracket(category.players))
  const [scoringMatch, setScoringMatch] = useState(null)

  const setWinner = (matchId, side) => {
    setRounds(prev => {
      const next = prev.map(r => r.map(m => m.id === matchId
        ? { ...m, winner: side === 'ao' ? m.ao : m.aka, done: true }
        : m
      ))
      for (let ri = 0; ri < next.length - 1; ri++) {
        const curRound = next[ri]
        const nextRound = next[ri + 1]
        curRound.forEach((m, mi) => {
          if (!m.done || !m.winner) return
          const nextMatchIdx = Math.floor(mi / 2)
          const slot = mi % 2 === 0 ? 'ao' : 'aka'
          if (nextRound[nextMatchIdx]) {
            nextRound[nextMatchIdx] = {
              ...nextRound[nextMatchIdx],
              [slot]: m.winner,
              winner: null,
              done: false,
            }
          }
        })
      }
      return next
    })
  }

  const saveScore = (matchId, aoScore, akaScore) => {
    setRounds(prev => prev.map(r => r.map(m => m.id === matchId 
      ? { ...m, aoScore, akaScore } 
      : m
    )))
    setScoringMatch(null)
  }

  const champion = rounds.length > 0 ? rounds[rounds.length - 1][0]?.winner?.player : null

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-white/95 backdrop-blur-xl p-8 overflow-auto"
    >
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex justify-between items-center border-b border-gray-200 pb-8">
          <div>
            <h2 className="text-gray-500 text-sm tracking-widest uppercase font-bold mb-2">Live Tournament</h2>
            <h1 className="text-3xl font-heading font-bold text-[#0A1F30] uppercase">
              {category.ageLabel} <span className="text-gray-300 mx-2">/</span> {category.weightLabel}
            </h1>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50 uppercase tracking-wider text-[10px] rounded-lg px-6" onClick={() => setRounds(buildBracket(category.players))}>
              <Shuffle size={14} className="mr-2" /> Re-Seed
            </Button>
            <Button variant="ghost" className="text-gray-400 hover:text-gray-600" onClick={onClose}>
              <X size={24} />
            </Button>
          </div>
        </header>

        {champion && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-2xl p-8 flex items-center gap-8 text-[#0A1F30] relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 p-4 opacity-5 text-[#C5A059]">
              <Trophy size={160} />
            </div>
            <Trophy size={64} className="text-[#C5A059] drop-shadow-md" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#C5A059] font-bold mb-1">Grand Champion</p>
              <h2 className="text-3xl font-heading font-bold uppercase">{champion.name || champion.users?.full_name}</h2>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-1">{champion.branch || champion.branches?.name}</p>
            </div>
          </motion.div>
        )}

        <div className="flex gap-12 overflow-x-auto pb-12 items-start scrollbar-hide">
          {rounds.map((round, ri) => {
            const visibleMatches = round.filter(m => !m.ao.bye && !m.aka.bye)
            if (visibleMatches.length === 0 && ri > 0) return null
            return (
              <div key={ri} className="flex-shrink-0 space-y-8">
                <div className="text-center py-2 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
                    {ri === rounds.length - 1 ? "FINALS" : ri === rounds.length - 2 ? "SEMI-FINALS" : `ROUND ${ri + 1}`}
                  </p>
                </div>
                <div className="space-y-6 flex flex-col justify-around min-h-[500px]">
                  {visibleMatches.map(m => (
                    <MatchCard key={m.id} match={m} onWinner={(id, side) => setWinner(id, side)} onScore={setScoringMatch} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {scoringMatch && (
          <ScoringModal 
            match={scoringMatch} 
            onClose={() => setScoringMatch(null)} 
            onSave={saveScore} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function TournamentPage() {
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const { branches } = useBranch()
  
  const [selectedAge, setSelectedAge] = useState('Junior (14-17)')
  const [selectedWeight, setSelectedWeight] = useState('40-45kg')
  const [activeCat, setActiveCat] = useState(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)

  const [openCreate, setOpenCreate] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single()
        setRole(data?.role || 'student')
      }
      await fetchTournaments()
    }
    init()
  }, [])

  async function fetchTournaments() {
    setLoading(true)
    const { data } = await supabase.from('tournaments').select('*, branches(name)').order('event_date', { ascending: false })
    if (data) {
      setTournaments(data)
      if (data.length > 0 && !selectedTournament) {
        setSelectedTournament(data[0].id)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    if (selectedTournament) fetchParticipants()
  }, [selectedTournament])

  async function fetchParticipants() {
    const { data } = await supabase
      .from('tournament_participants')
      .select('*, students(*, users(full_name), branches(name), belt_levels(name))')
      .eq('tournament_id', selectedTournament)
    if (data) {
      setParticipants(data)
    }
  }

  const onCreateTournament = async (data) => {
    const toastId = toast.loading("Creating tournament...")
    try {
      const { error } = await supabase.from('tournaments').insert([{
        title: data.title,
        event_date: data.eventDate,
        location: data.location,
        branch_id: data.branchId || null,
        description: data.description
      }])
      if (error) throw error
      toast.success("Tournament created", { id: toastId })
      setOpenCreate(false)
      reset()
      fetchTournaments()
    } catch (e) {
      toast.error(e.message, { id: toastId })
    }
  }

  // Determine eligible athletes for the selected age/weight
  // For demo, we just use the participants registered to this tournament
  const matchedAthletes = participants.map(p => p.students)
  const canManage = role === 'admin' || role === 'trainer'

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0A1F30] sm:text-3xl">
            Tournament Matrix
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            Generate and manage tournament brackets
          </p>
        </div>
        {canManage && (
          <>
          <Button onClick={() => setOpenCreate(true)} className="bg-[#0A1F30] hover:bg-[#0A1F30]/90 text-white rounded-lg text-xs font-semibold">
            <Plus className="mr-2" size={16} /> New Tournament
          </Button>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-md p-0 overflow-hidden">
              <DialogHeader className="p-6 border-b border-gray-100">
                <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">Create Tournament</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onCreateTournament)} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Tournament Title</label>
                  <Input {...register("title", { required: true })} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Event Date</label>
                    <Input type="date" {...register("eventDate", { required: true })} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Host Branch</label>
                    <select {...register("branchId")} className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                      <option value="">No specific branch</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Location / Address</label>
                  <Input {...register("location", { required: true })} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Description</label>
                  <Input {...register("description")} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpenCreate(false)} className="flex-1 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</Button>
                  <Button type="submit" className="flex-1 bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-lg">Create</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </>
        )}
      </header>

      {tournaments.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tournaments.map(t => (
            <Button 
              key={t.id} 
              variant={selectedTournament === t.id ? "default" : "outline"}
              onClick={() => setSelectedTournament(t.id)}
              className={selectedTournament === t.id ? "bg-[#0A1F30] text-white" : "text-gray-500"}
            >
              {t.title}
            </Button>
          ))}
        </div>
      )}

      <div className={`grid grid-cols-1 ${canManage ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-8`}>
        {canManage && (
          <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm lg:col-span-1">
            <CardHeader className="border-b border-gray-100 p-6">
              <CardTitle className="text-sm uppercase tracking-wider text-[#0A1F30] font-bold">Bracket Logic</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Division (Age)</label>
                  <select value={selectedAge} onChange={e => setSelectedAge(e.target.value)} className="w-full bg-gray-50 border border-gray-200 h-10 px-4 rounded-lg text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10">
                    {Object.keys(AGE_CATS).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Classification (Weight)</label>
                  <select value={selectedWeight} onChange={e => setSelectedWeight(e.target.value)} className="w-full bg-gray-50 border border-gray-200 h-10 px-4 rounded-lg text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10">
                    {Object.keys(WEIGHT_CATS).map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Target size={14} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Registered Athletes: {matchedAthletes.length}</span>
                </div>
                <p className="text-[11px] text-emerald-600/80 uppercase tracking-wider leading-relaxed">
                  System will auto-generate a single-elimination bracket with random seeding.
                </p>
              </div>

              <Button 
                className="w-full bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-lg h-10 font-semibold"
                disabled={matchedAthletes.length === 0}
                onClick={() => setActiveCat({
                  id: Date.now(),
                  ageLabel: selectedAge,
                  weightLabel: selectedWeight,
                  players: matchedAthletes.slice(0, 16) // Limit for UI
                })}
              >
                Generate Bracket
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className={`rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden ${canManage ? 'lg:col-span-2' : 'lg:col-span-1'}`}>
          <CardHeader className="border-b border-gray-100 p-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wider text-[#0A1F30] font-bold">Registered Athletes</CardTitle>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Database Sync Active</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {matchedAthletes.length === 0 ? (
                <div className="p-12 text-center text-gray-400 uppercase text-xs tracking-wider">No athletes registered to this tournament</div>
              ) : matchedAthletes.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0A1F30]">{a.users?.full_name}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{a.branches?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-[#C5A059] uppercase">{a.belt_levels?.name} Belt</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <AnimatePresence>
        {activeCat && (
          <CategoryBracket 
            category={activeCat} 
            onClose={() => setActiveCat(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}
