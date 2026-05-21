"use client"
import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Plus, ChevronRight, X, Shuffle, Users, ShieldCheck, Target, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from '@/lib/supabase'

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
    <div className="bg-white/5 border border-white/10 p-4 min-w-[260px] relative overflow-hidden group">
      <div className="flex justify-between items-center mb-3">
        <div className="text-[8px] uppercase tracking-[0.3em] text-white/30 font-black">Segment {id}</div>
        {!done && (
          <Button 
            variant="ghost" 
            size="xs" 
            onClick={() => onScore(match)}
            className="h-5 text-[8px] uppercase tracking-widest text-gold hover:text-white hover:bg-gold/20 rounded-none border border-gold/20"
          >
            Electronic Scoring
          </Button>
        )}
      </div>
      
      {/* AO - Blue */}
      <motion.div
        whileHover={!done ? { x: 5 } : {}}
        onClick={() => !done && onWinner(id, 'ao')}
        className={`p-3 border mb-2 cursor-pointer transition-all ${
          winner === ao 
          ? "bg-blue-500/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
          : "bg-blue-500/5 border-blue-500/20 grayscale hover:grayscale-0"
        }`}
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">AO (青)</div>
            <div className="text-sm font-bold uppercase tracking-tight">{ao.player?.name}</div>
          </div>
          <div className="flex items-center gap-3">
            {match.aoScore > 0 && <span className="text-xl font-black text-blue-400">{match.aoScore}</span>}
            {winner === ao && <Trophy size={14} className="text-blue-400" />}
          </div>
        </div>
      </motion.div>

      <div className="text-center text-[10px] font-black text-white/10 my-2 tracking-[0.5em]">VS</div>

      {/* AKA - Red */}
      <motion.div
        whileHover={!done ? { x: 5 } : {}}
        onClick={() => !done && onWinner(id, 'aka')}
        className={`p-3 border transition-all ${
          winner === aka 
          ? "bg-red-500/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
          : "bg-red-500/5 border-red-500/20 grayscale hover:grayscale-0"
        }`}
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1">AKA (赤)</div>
            <div className="text-sm font-bold uppercase tracking-tight">{aka.player?.name}</div>
          </div>
          <div className="flex items-center gap-3">
            {match.akaScore > 0 && <span className="text-xl font-black text-red-400">{match.akaScore}</span>}
            {winner === aka && <Trophy size={14} className="text-red-400" />}
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <Card className="bg-black border-gold/30 w-full max-w-2xl rounded-none overflow-hidden shadow-[0_0_50px_rgba(214,184,106,0.15)]">
        <div className="grid grid-cols-2 h-[400px]">
          {/* AO Scoring */}
          <div className="bg-blue-600 flex flex-col items-center justify-center space-y-8 p-8 relative">
            <div className="text-xs font-black uppercase tracking-[0.4em] text-white/50 absolute top-8">AO (Blue) Points</div>
            <div className="text-[120px] font-black text-white leading-none">{aoScore}</div>
            <div className="grid grid-cols-3 gap-2 w-full">
              {[1, 2, 3].map(v => (
                <button 
                  key={v}
                  onClick={() => setAoScore(s => s + v)}
                  className="h-16 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xl transition-colors"
                >
                  +{v}
                </button>
              ))}
              <button 
                onClick={() => setAoScore(s => Math.max(0, s - 1))}
                className="h-16 col-span-3 bg-black/20 hover:bg-black/30 text-white/60 font-bold uppercase tracking-widest text-[10px]"
              >
                Correction (-1)
              </button>
            </div>
          </div>
          
          {/* AKA Scoring */}
          <div className="bg-red-600 flex flex-col items-center justify-center space-y-8 p-8 relative">
            <div className="text-xs font-black uppercase tracking-[0.4em] text-white/50 absolute top-8">AKA (Red) Points</div>
            <div className="text-[120px] font-black text-white leading-none">{akaScore}</div>
            <div className="grid grid-cols-3 gap-2 w-full">
              {[1, 2, 3].map(v => (
                <button 
                  key={v}
                  onClick={() => setAkaScore(s => s + v)}
                  className="h-16 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xl transition-colors"
                >
                  +{v}
                </button>
              ))}
              <button 
                onClick={() => setAkaScore(s => Math.max(0, s - 1))}
                className="h-16 col-span-3 bg-black/20 hover:bg-black/30 text-white/60 font-bold uppercase tracking-widest text-[10px]"
              >
                Correction (-1)
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex border-t border-white/10 h-16">
          <button 
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white/40 uppercase tracking-widest text-[10px] font-bold border-r border-white/10"
          >
            Abort Session
          </button>
          <button 
            onClick={() => onSave(match.id, aoScore, akaScore)}
            className="flex-1 bg-gold hover:bg-gold-dark text-black uppercase tracking-widest text-[10px] font-black"
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
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl p-8 overflow-auto"
    >
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex justify-between items-center border-b border-white/10 pb-8">
          <div>
            <h2 className="text-gold text-sm tracking-[0.4em] uppercase font-bold mb-2">Live Tournament</h2>
            <h1 className="text-4xl font-bold uppercase tracking-tighter">
              {category.ageLabel} <span className="text-gold italic">/</span> {category.weightLabel}
            </h1>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 uppercase tracking-widest text-[10px] rounded-none px-6" onClick={() => setRounds(buildBracket(category.players))}>
              <Shuffle size={14} className="mr-2" /> Re-Seed
            </Button>
            <Button variant="ghost" className="text-white/40 hover:text-white" onClick={onClose}>
              <X size={24} />
            </Button>
          </div>
        </header>

        {champion && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gold p-8 flex items-center gap-8 text-black relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 p-4 opacity-10">
              <Trophy size={160} />
            </div>
            <Trophy size={64} className="drop-shadow-2xl" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.5em] font-black mb-1">Grand Champion</p>
              <h2 className="text-5xl font-black uppercase tracking-tighter">{champion.name}</h2>
              <p className="text-sm font-bold opacity-60 uppercase tracking-widest mt-1">{champion.branch}</p>
            </div>
          </motion.div>
        )}

        <div className="flex gap-12 overflow-x-auto pb-12 items-start scrollbar-hide">
          {rounds.map((round, ri) => {
            const visibleMatches = round.filter(m => !m.ao.bye && !m.aka.bye)
            if (visibleMatches.length === 0 && ri > 0) return null
            return (
              <div key={ri} className="flex-shrink-0 space-y-8">
                <div className="text-center py-2 bg-white/5 border border-white/10">
                  <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-gold">
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
  const [selectedAge, setSelectedAge] = useState('Junior (14-17)')
  const [selectedWeight, setSelectedWeight] = useState('40-45kg')
  const [athletes, setAthletes] = useState([])
  const [activeCat, setActiveCat] = useState(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)

  async function fetchRole() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single()
      setRole(data?.role || 'student')
    }
  }

  async function fetchAthletes() {
    setLoading(true)
    const { data } = await supabase.from('students').select('*, users(*), branches(name), belt_levels(name)')
    if (data) {
      setAthletes(data.map(s => ({
        id: s.id,
        name: s.users?.full_name,
        age: 15, // Mock age if not in DB
        weight: 42, // Mock weight if not in DB
        branch: s.branches?.name,
        belt: s.belt_levels?.name || 'White'
      })))
    }
    setLoading(false)
  }

  useEffect(() => {
    async function loadTournamentData() {
      await fetchAthletes()
      await fetchRole()
    }

    loadTournamentData()
  }, [])

  const matchedAthletes = athletes // In a real app, filter by age/weight logic
  const canManage = role === 'admin' || role === 'trainer'

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-gold animate-pulse shadow-[0_0_10px_rgba(214,184,106,0.5)]" />
            <h2 className="text-gold text-[10px] tracking-[0.5em] uppercase font-black">Championships</h2>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">Tournament <span className="text-gold italic outline-text">Matrix</span></h1>
        </div>
        {canManage && (
          <Button className="bg-gold text-black hover:bg-gold-dark font-bold uppercase tracking-widest px-8 h-12 rounded-none">
            <Trophy className="mr-2" size={18} /> New Tournament
          </Button>
        )}
      </header>

      <div className={`grid grid-cols-1 ${canManage ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-8`}>
        {canManage && (
          <Card className="bg-[#1B2230]/60 border-white/[0.06] backdrop-blur-xl rounded-none lg:col-span-1">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-xs uppercase tracking-[0.3em] text-gold font-black">Bracket Logic</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-white/40">Division (Age)</label>
                  <select className="w-full bg-white/5 border border-white/10 h-12 px-4 text-xs font-bold uppercase tracking-widest text-white outline-none focus:border-gold/50">
                    {Object.keys(AGE_CATS).map(a => <option key={a} value={a} className="bg-black">{a}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-white/40">Classification (Weight)</label>
                  <select className="w-full bg-white/5 border border-white/10 h-12 px-4 text-xs font-bold uppercase tracking-widest text-white outline-none focus:border-gold/50">
                    {Object.keys(WEIGHT_CATS).map(w => <option key={w} value={w} className="bg-black">{w}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="p-4 bg-gold/5 border border-gold/20 space-y-3">
                <div className="flex items-center gap-2 text-gold">
                  <Target size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Matched Athletes: {matchedAthletes.length}</span>
                </div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">
                  System will auto-generate a single-elimination bracket with random seeding.
                </p>
              </div>

              <Button 
                className="w-full bg-gold text-black hover:bg-gold-dark font-black uppercase tracking-widest h-14 rounded-none glow-gold"
                onClick={() => setActiveCat({
                  id: Date.now(),
                  ageLabel: selectedAge,
                  weightLabel: selectedWeight,
                  players: matchedAthletes.slice(0, 8) // Limit for demo
                })}
              >
                Generate Bracket
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className={`bg-[#1B2230]/60 border-white/[0.06] backdrop-blur-xl rounded-none ${canManage ? 'lg:col-span-2' : 'lg:col-span-1'}`}>
          <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-[0.3em] text-gold font-black">Qualified Athletes</CardTitle>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Database Sync Active</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {matchedAthletes.length === 0 ? (
                <div className="p-12 text-center text-white/20 uppercase text-[10px] tracking-widest">No qualified athletes found</div>
              ) : matchedAthletes.slice(0, 10).map((a, i) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-gold">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-tight">{a.name}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">{a.branch}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gold uppercase">{a.belt} Belt</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">Rank #12</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-white/5 text-center">
              <Button 
                variant="ghost" 
                className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white"
                onClick={() => canManage && setActiveCat({
                  id: Date.now(),
                  ageLabel: selectedAge,
                  weightLabel: selectedWeight,
                  players: matchedAthletes.slice(0, 8)
                })}
              >
                {canManage ? "Open Bracket Preview" : "View Bracket Information"} <ChevronRight size={14} className="ml-2" />
              </Button>
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
