"use client"
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Plus, ChevronRight, X, Shuffle, Users, Shield, ShieldCheck, Target, Loader2, AlertCircle, RotateCcw, Edit2, Volume2, Settings, Power } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from '@/lib/supabase'
import { useBranch } from '@/context/BranchContext'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useForm } from "react-hook-form"
import { Badge } from "@/components/ui/badge"
import { useSport } from "@/context/SportContext"
import { useAuth } from "@/context/AuthContext"
import WinnerCeremony from '@/components/WinnerCeremony'

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

// Reconstruct rounds from db rows
function parseDbMatchesToRounds(dbMatches) {
  if (!dbMatches || dbMatches.length === 0) return []
  const maxRound = Math.max(...dbMatches.map(m => m.round))
  const rounds = Array.from({ length: maxRound + 1 }, () => [])
  
  dbMatches.forEach(m => {
    rounds[m.round][m.match_number] = {
      id: m.id,
      ao: { player: m.ao, bye: !!m.ao_penalties?.is_bye },
      aka: { player: m.aka, bye: !!m.aka_penalties?.is_bye },
      winner: m.winner ? { player: m.winner, bye: false } : null,
      done: m.status === 'completed',
      aoScore: m.ao_score || 0,
      akaScore: m.aka_score || 0,
      status: m.status
    }
  })
  return rounds
}

// ── Match Card ──
function MatchCard({ match, onWinner, onScore, onEditSeeding, canManage }) {
  const { ao, aka, winner, done } = match
  if (ao.bye || aka.bye) return null 

  const aoName = ao.player?.name || ao.player?.users?.full_name || 'AO'
  const akaName = aka.player?.name || aka.player?.users?.full_name || 'AKA'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 min-w-[280px] relative overflow-hidden group shadow-sm text-[#0A1F30]">
      <div className="flex justify-between items-center mb-4">
        <div className="text-[9px] uppercase tracking-[0.2em] text-[#C5A059] font-black">Segment Registry</div>
        {!done && (
          <div className="flex gap-1.5">
            <Button 
              variant="ghost" 
              size="xs" 
              onClick={() => {
                window.open(`/dashboard/tournaments/kumite?matchId=${match.id}&ao=${encodeURIComponent(aoName)}&aka=${encodeURIComponent(akaName)}`, '_blank')
              }}
              className="h-6 text-[9px] font-black uppercase tracking-wider text-[#C5A059] hover:text-white hover:bg-[#C5A059] rounded-lg border border-[#C5A059]/20 transition-all cursor-pointer"
            >
              Electronic
            </Button>
            <Button 
              variant="ghost" 
              size="xs" 
              onClick={() => onScore(match)}
              className="h-6 text-[9px] font-black uppercase tracking-wider text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all cursor-pointer"
            >
              Score
            </Button>
          </div>
        )}
      </div>
      
      {/* AO - Blue */}
      <motion.div
        whileHover={!done ? { x: 5 } : {}}
        className={`p-3 rounded-xl border mb-3 transition-all ${
          winner?.player?.id === ao.player?.id && winner?.player?.id !== null
            ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm font-semibold" 
            : "bg-white border-gray-200 text-gray-500 grayscale hover:grayscale-0 hover:text-[#0A1F30]"
        }`}
      >
        <div className="flex justify-between items-center">
          <div onClick={() => !done && onWinner(match.id, 'ao')} className="flex-1 cursor-pointer">
            <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5">AO (青)</div>
            <div className="text-sm font-bold truncate max-w-[150px]">{aoName}</div>
            <div className="text-[9px] text-gray-400 mt-0.5">{ao.player?.branches?.name || ''}</div>
          </div>
          <div className="flex items-center gap-3">
            {match.aoScore > 0 && <span className="text-xl font-bold text-blue-600 mr-2">{match.aoScore}</span>}
            {winner?.player?.id === ao.player?.id && winner?.player?.id !== null && <Trophy size={14} className="text-blue-600 mr-2" />}
            {match.status === 'pending' && canManage && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEditSeeding({ matchId: match.id, slot: 'ao_id', athlete: ao.player })
                }}
                className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-[#C5A059] transition-colors cursor-pointer"
              >
                <Edit2 size={12} />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="text-center text-[9px] font-black text-gray-300 my-3 tracking-[0.35em] uppercase">VS</div>

      {/* AKA - Red */}
      <motion.div
        whileHover={!done ? { x: 5 } : {}}
        className={`p-3 rounded-xl border transition-all ${
          winner?.player?.id === aka.player?.id && winner?.player?.id !== null
            ? "bg-red-50 border-red-200 text-red-700 shadow-sm font-semibold" 
            : "bg-white border-gray-200 text-gray-500 grayscale hover:grayscale-0 hover:text-[#0A1F30]"
        }`}
      >
        <div className="flex justify-between items-center">
          <div onClick={() => !done && onWinner(match.id, 'aka')} className="flex-1 cursor-pointer">
            <div className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1.5">AKA (赤)</div>
            <div className="text-sm font-bold truncate max-w-[150px]">{akaName}</div>
            <div className="text-[9px] text-gray-400 mt-0.5">{aka.player?.branches?.name || ''}</div>
          </div>
          <div className="flex items-center gap-3">
            {match.akaScore > 0 && <span className="text-xl font-bold text-red-600 mr-2">{match.akaScore}</span>}
            {winner?.player?.id === aka.player?.id && winner?.player?.id !== null && <Trophy size={14} className="text-red-600 mr-2" />}
            {match.status === 'pending' && canManage && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEditSeeding({ matchId: match.id, slot: 'aka_id', athlete: aka.player })
                }}
                className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-[#C5A059] transition-colors cursor-pointer"
              >
                <Edit2 size={12} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function ScoringModal({ match, onClose, onSave, categoryName, tournamentTitle }) {
  // Scores by technique
  const [aoYuko,     setAoYuko]     = useState(0)
  const [aoWazaAri,  setAoWazaAri]  = useState(0)
  const [aoIppon,    setAoIppon]    = useState(0)
  const [aoBonusPoints, setAoBonusPoints] = useState(0)

  const [akaYuko,    setAkaYuko]    = useState(0)
  const [akaWazaAri, setAkaWazaAri] = useState(0)
  const [akaIppon,   setAkaIppon]   = useState(0)
  const [akaBonusPoints, setAkaBonusPoints] = useState(0)

  const aoScore  = aoYuko  + aoWazaAri  * 2 + aoIppon  * 3 + aoBonusPoints
  const akaScore = akaYuko + akaWazaAri * 2 + akaIppon * 3 + akaBonusPoints

  const [senshu, setSenshu] = useState(null)
  
  // Auto senshu rules
  useEffect(() => {
    if (senshu === null) {
      if (aoScore > 0 && akaScore === 0) setSenshu('ao')
      if (akaScore > 0 && aoScore === 0) setSenshu('aka')
    }
  }, [aoScore, akaScore, senshu])

  const PENALTY_LABELS = ['1C', '2C', '3C', 'HC', 'H']
  const [aoC1,  setAoC1]  = useState([])
  const [akaC1, setAkaC1] = useState([])
  
  const togglePenalty = (side, lbl) => {
    const idx     = PENALTY_LABELS.indexOf(lbl)
    const setter  = side === 'ao' ? setAoC1  : setAkaC1
    const current = side === 'ao' ? aoC1     : akaC1
    setter(current.includes(lbl) ? PENALTY_LABELS.slice(0, idx) : PENALTY_LABELS.slice(0, idx + 1))
  }

  const [matchMins, setMatchMins] = useState(1)
  const [matchSecs, setMatchSecs] = useState(30)
  const [timeLeft,  setTimeLeft]  = useState(90)
  const [isRunning, setIsRunning] = useState(false)
  const [kdMode,    setKdMode]    = useState(false)
  const [fieldNum,  setFieldNum]  = useState(1)
  const [extraTimeUsed, setExtraTimeUsed] = useState(0)
  const [isExtraTime, setIsExtraTime] = useState(false)
  
  const timerRef = useRef(null)

  const totalDuration = matchMins * 60 + matchSecs

  const [currentDateTime, setCurrentDateTime] = useState('')
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
      setCurrentDateTime(`${timeStr} | ${dateStr}`)
    }
    updateTime()
    const timer = setInterval(updateTime, 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { 
            setIsRunning(false)
            playBuzzer()
            return 0 
          }
          return t - 1
        })
      }, 1000)
    } else { 
      clearInterval(timerRef.current) 
    }
    return () => clearInterval(timerRef.current)
  }, [isRunning])

  const playBuzzer = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.connect(g)
      g.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(110, ctx.currentTime)
      g.gain.setValueAtTime(0.4, ctx.currentTime)
      osc.start()
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2)
      osc.stop(ctx.currentTime + 2)
    } catch (e) {}
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec < 10 ? '0' : ''}${sec}`
  }

  const aoName  = match.ao.player?.users?.full_name  || match.ao.player?.name  || 'AO athlete'
  const akaName = match.aka.player?.users?.full_name || match.aka.player?.name || 'AKA athlete'
  const aoDojo  = match.ao.player?.branches?.name   || ''
  const akaDojo = match.aka.player?.branches?.name  || ''
  const aoState  = match.ao.player?.state  || ''
  const akaState = match.aka.player?.state || ''
  const aoBelt  = match.ao.player?.belt_levels || null
  const akaBelt = match.aka.player?.belt_levels || null

  const [saving, setSaving] = useState(false)
  const [showCeremony, setShowCeremony] = useState(false)
  const [showHantei, setShowHantei] = useState(false)
  const [hanteiWinner, setHanteiWinner] = useState(null)
  const [finalMatchData, setFinalMatchData] = useState(null)

  const handleConfirm = async () => {
    if (aoScore === akaScore && !senshu && !hanteiWinner) {
      setShowHantei(true)
      return
    }

    setSaving(true)
    try {
      const winnerSide = hanteiWinner || (aoScore > akaScore ? 'ao' : akaScore > aoScore ? 'aka' : senshu)
      const winMethod = hanteiWinner 
        ? 'referee_decision' 
        : (aoScore === akaScore && senshu ? 'senshu' : 'score')

      const matchData = {
        aoScore, akaScore,
        aoIppon, aoWazaAri, aoYuko, aoBonusPoints,
        aoC1: aoC1.includes('1C'),
        aoC2: aoC1.includes('2C'),
        aoC3: aoC1.includes('3C'),
        aoHC: aoC1.includes('HC'),
        aoH: aoC1.includes('H'),
        aoPenaltiesList: aoC1,
        akaIppon, akaWazaAri, akaYuko, akaBonusPoints,
        akaC1: akaC1.includes('1C'),
        akaC2: akaC1.includes('2C'),
        akaC3: akaC1.includes('3C'),
        akaHC: akaC1.includes('HC'),
        akaH: akaC1.includes('H'),
        akaPenaltiesList: akaC1,
        senshu,
        matchDuration: totalDuration - timeLeft,
        extraTimeUsed,
        winnerCorner: winnerSide,
        winMethod
      }

      await onSave(match.id, matchData)
      setFinalMatchData(matchData)
      setShowCeremony(true)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleHanteiSelect = (side) => {
    setShowHantei(false)
    setHanteiWinner(side)
    saveHanteiAndProceed(side)
  }

  const saveHanteiAndProceed = async (winnerSide) => {
    setSaving(true)
    try {
      const matchData = {
        aoScore, akaScore,
        aoIppon, aoWazaAri, aoYuko, aoBonusPoints,
        aoC1: aoC1.includes('1C'),
        aoC2: aoC1.includes('2C'),
        aoC3: aoC1.includes('3C'),
        aoHC: aoC1.includes('HC'),
        aoH: aoC1.includes('H'),
        aoPenaltiesList: aoC1,
        akaIppon, akaWazaAri, akaYuko, akaBonusPoints,
        akaC1: akaC1.includes('1C'),
        akaC2: akaC1.includes('2C'),
        akaC3: akaC1.includes('3C'),
        akaHC: akaC1.includes('HC'),
        akaH: akaC1.includes('H'),
        akaPenaltiesList: akaC1,
        senshu,
        matchDuration: totalDuration - timeLeft,
        extraTimeUsed,
        winnerCorner: winnerSide,
        winMethod: 'referee_decision'
      }

      await onSave(match.id, matchData)
      setFinalMatchData(matchData)
      setShowCeremony(true)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // Toggles extra time mode
  const handleToggleExtraTime = () => {
    setIsRunning(false)
    if (isExtraTime) {
      // Turn off: Reset to standard time
      setIsExtraTime(false)
      setTimeLeft(totalDuration)
      setExtraTimeUsed(0)
    } else {
      // Turn on: Add 60 seconds
      setIsExtraTime(true)
      setTimeLeft(60)
      setExtraTimeUsed(prev => prev + 60)
    }
  }

  const AvatarOrInitials = ({ name, hexColor }) => {
    const initials = name ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : 'AT'
    return (
      <div 
        className="w-12 h-12 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center font-bold text-slate-600 shadow-inner overflow-hidden flex-shrink-0"
      >
        {initials}
      </div>
    )
  }

  const KarateSilhouette = ({ isAo }) => (
    <svg 
      viewBox="0 0 100 100" 
      className={`w-12 h-12 ${isAo ? 'text-[#003882]' : 'text-[#a60000]'} fill-current flex-shrink-0`}
      style={{ transform: isAo ? 'none' : 'scaleX(-1)' }}
    >
      <path d="M50 20c3.3 0 6-2.7 6-6s-2.7-6-6-6-6 2.7-6 6 2.7 6 6 6zm-7.6 15.6L30.2 47.8c-.8.8-.8 2 0 2.8.8.8 2 .8 2.8 0l11.4-11.4 7.6 22.8c.4 1.2 1.6 2 2.8 2h15.2c1.1 0 2-.9 2-2s-.9-2-2-2H61.6L54.8 39l7.8-7.8 19.8 19.8c.8.8 2 .8 2.8 0 .8-.8.8-2 0-2.8L66.6 29.6c-.8-.8-2-.8-2.8 0l-9.6 9.6-1.8-5.4L61 24.2c.8-.8.8-2 0-2.8-.8-.8-2-.8-2.8 0l-10.2 10.2-2.6-7.8c-.4-1.2-1.6-2-2.8-2H28c-1.1 0-2 .9-2 2s.9 2 2 2h13.2l1.2 3.6z" />
    </svg>
  )

  const TechniqueCard = ({ label, count, onAdd, onSub, side }) => {
    const isAo = side === 'ao'
    return (
      <div className="bg-white rounded-[14px] p-2 flex items-center justify-between border border-slate-200 shadow-sm w-full h-[52px]">
        <div className="flex flex-col text-left">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{label}</span>
          <span className="text-2xl font-black text-slate-800 font-sans leading-none">{count}</span>
        </div>
        <div className="flex gap-1 items-center">
          <button 
            type="button" 
            onClick={onAdd} 
            className={`w-9 h-7 flex items-center justify-center text-xs font-black text-white rounded-lg cursor-pointer shadow-sm active:scale-95 transition-all ${
              isAo ? 'bg-[#003882] hover:bg-blue-700' : 'bg-[#a60000] hover:bg-red-700'
            }`}
          >
            +1
          </button>
          <button 
            type="button" 
            onClick={onSub} 
            className="w-8 h-7 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg cursor-pointer active:scale-95 transition-all"
          >
            -1
          </button>
        </div>
      </div>
    )
  }

  const BonusPointsCard = ({ val, setVal, side }) => {
    const isAo = side === 'ao'
    return (
      <div className="bg-white rounded-[14px] p-2 flex items-center justify-between border border-slate-200 shadow-sm w-full h-[52px]">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Bonus Pts</span>
        <div className="flex items-center gap-1.5">
          <button 
            type="button" 
            onClick={() => setVal(v => Math.max(0, v - 1))} 
            className="w-7 h-7 flex items-center justify-center text-xs font-black text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg cursor-pointer active:scale-95 transition-all"
          >
            -
          </button>
          <span className="font-sans font-black text-sm text-slate-800 min-w-4 text-center">{val}</span>
          <button 
            type="button" 
            onClick={() => setVal(v => v + 1)} 
            className={`w-7 h-7 flex items-center justify-center text-xs font-black text-white rounded-lg cursor-pointer shadow-sm active:scale-95 transition-all ${
              isAo ? 'bg-[#003882] hover:bg-blue-700' : 'bg-[#a60000] hover:bg-red-700'
            }`}
          >
            +
          </button>
        </div>
      </div>
    )
  }

  const SenshuCard = ({ checked, onChange, onSub, side }) => {
    const isAo = side === 'ao'
    return (
      <div className="bg-white rounded-[14px] p-2 flex items-center justify-between border border-slate-200 shadow-sm w-full h-[52px]">
        <label className="flex items-center gap-1.5 cursor-pointer text-[9px] font-black text-slate-700 uppercase tracking-wider select-none">
          <input 
            type="checkbox" 
            checked={checked} 
            onChange={onChange}
            className={`w-3.5 h-3.5 rounded border-slate-300 focus:ring-0 cursor-pointer ${
              isAo ? 'text-[#003882]' : 'text-[#a60000]'
            }`}
          />
          <span>Senshu</span>
        </label>
        <button 
          type="button" 
          onClick={onSub} 
          className="w-8 h-7 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg cursor-pointer active:scale-95 transition-all"
        >
          -1
        </button>
      </div>
    )
  }

  const aoPenaltiesList = () => (
    <div className="flex flex-col items-center select-none">
      <span className="text-[9px] text-white/50 font-black uppercase tracking-[0.2em] mb-1">Penalties</span>
      <div className="flex justify-center gap-3">
        {['1C', '2C', '3C', 'HC', 'H'].map((lbl) => {
          const isAct = aoC1.includes(lbl)
          const displayLabel = lbl === '1C' ? 'C1' : lbl === '2C' ? 'C2' : lbl === '3C' ? 'C3' : lbl
          return (
            <div key={lbl} className="flex flex-col items-center">
              <span className="text-[8px] font-mono text-white/50 font-black mb-0.5">{displayLabel}</span>
              <button
                type="button"
                onClick={() => togglePenalty('ao', lbl)}
                className={`w-11 h-7 rounded-lg border-2 transition-all flex items-center justify-center cursor-pointer ${
                  isAct 
                    ? lbl === 'H' 
                      ? 'bg-red-500 border-red-400 text-white shadow-md' 
                      : lbl === 'HC' 
                      ? 'bg-orange-500 border-orange-400 text-white shadow-md' 
                      : 'bg-yellow-400 border-yellow-300 text-slate-900 shadow-md font-bold'
                    : 'bg-transparent border-[#004B93]/60 hover:bg-white/5'
                }`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )

  const akaPenaltiesList = () => (
    <div className="flex flex-col items-center select-none">
      <span className="text-[9px] text-white/50 font-black uppercase tracking-[0.2em] mb-1">Penalties</span>
      <div className="flex justify-center gap-3">
        {['1C', '2C', '3C', 'HC', 'H'].map((lbl) => {
          const isAct = akaC1.includes(lbl)
          const displayLabel = lbl === '1C' ? 'C1' : lbl === '2C' ? 'C2' : lbl === '3C' ? 'C3' : lbl
          return (
            <div key={lbl} className="flex flex-col items-center">
              <span className="text-[8px] font-mono text-white/50 font-black mb-0.5">{displayLabel}</span>
              <button
                type="button"
                onClick={() => togglePenalty('aka', lbl)}
                className={`w-11 h-7 rounded-lg border-2 transition-all flex items-center justify-center cursor-pointer ${
                  isAct 
                    ? lbl === 'H' 
                      ? 'bg-red-500 border-red-400 text-white shadow-md' 
                      : lbl === 'HC' 
                      ? 'bg-orange-500 border-orange-400 text-white shadow-md' 
                      : 'bg-yellow-400 border-yellow-350 text-slate-900 shadow-md font-bold'
                    : 'bg-transparent border-[#a60000]/60 hover:bg-white/5'
                }`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )

  if (showCeremony && finalMatchData) {
    return (
      <WinnerCeremony
        match={match}
        aoScore={finalMatchData.aoScore}
        akaScore={finalMatchData.akaScore}
        aoIppon={finalMatchData.aoIppon}
        aoWazaAri={finalMatchData.aoWazaAri}
        aoYuko={finalMatchData.aoYuko}
        aoBonusPoints={finalMatchData.aoBonusPoints}
        akaIppon={finalMatchData.akaIppon}
        akaWazaAri={finalMatchData.akaWazaAri}
        akaYuko={finalMatchData.akaYuko}
        akaBonusPoints={finalMatchData.akaBonusPoints}
        aoPenalties={finalMatchData.aoPenaltiesList}
        akaPenalties={finalMatchData.akaPenaltiesList}
        senshu={finalMatchData.senshu}
        matchDuration={finalMatchData.matchDuration}
        extraTimeUsed={finalMatchData.extraTimeUsed}
        onClose={onClose}
      />
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 z-[100] flex flex-col bg-[#e2e8f0] text-slate-800 font-sans select-none overflow-hidden"
    >
      {/* ── Top Header Bar ── */}
      <header className="flex items-center justify-between px-6 bg-white border-b border-slate-200 shadow-sm h-16 flex-shrink-0">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-2 select-none">
          <div className="flex items-center">
            <span className="text-2xl font-black italic tracking-tighter text-[#0A1F30] flex items-center">
              <span className="text-[#ef4444] text-3xl">N</span>
              <span className="text-slate-400 font-normal mx-1">-</span>
              <span className="text-slate-800">PRO</span>
            </span>
          </div>
          <div className="flex flex-col leading-none border-l border-slate-300 pl-2">
            <span className="text-[9px] font-black tracking-widest text-[#0a1f30] uppercase">Tournament</span>
            <span className="text-[8px] font-bold text-[#ef4444] tracking-wider uppercase">Karate</span>
          </div>
        </div>

        {/* Tournament Info */}
        <div className="text-center">
          <h2 className="text-[#0a1f30] font-black text-sm uppercase tracking-wider leading-none">
            {tournamentTitle || 'WKF CHAMPIONSHIP 2024'}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="bg-[#003882] text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider leading-none">
              Field {fieldNum}
            </span>
            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wide">
              {categoryName ? `KUMITE INDIVIDUAL - ${categoryName}` : 'KUMITE INDIVIDUAL'}
            </span>
          </div>
        </div>

        {/* Top Control Buttons */}
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => { const next = !kdMode; setKdMode(next); setIsRunning(false); setTimeLeft(next ? 30 : totalDuration) }} 
            className="flex flex-col items-center justify-center w-12 h-12 bg-white hover:bg-slate-50 text-slate-800 rounded-xl border border-slate-200 shadow-sm cursor-pointer transition-all active:scale-95"
          >
            <Settings size={16} className="text-slate-600 mb-0.5" />
            <span className="text-[8px] font-black uppercase tracking-wider">Setup</span>
          </button>
          <button 
            type="button"
            onClick={() => window.open(`/dashboard/tournaments/kumite?matchId=${match.id}&ao=${encodeURIComponent(aoName)}&aka=${encodeURIComponent(akaName)}`, '_blank')}
            className="flex flex-col items-center justify-center w-12 h-12 bg-white hover:bg-slate-50 text-slate-800 rounded-xl border border-slate-200 shadow-sm cursor-pointer transition-all active:scale-95"
          >
            <Users size={16} className="text-slate-600 mb-0.5" />
            <span className="text-[8px] font-black uppercase tracking-wider">Match</span>
          </button>
          <button 
            type="button"
            onClick={playBuzzer}
            className="flex flex-col items-center justify-center w-12 h-12 bg-white hover:bg-slate-50 text-slate-800 rounded-xl border border-slate-200 shadow-sm cursor-pointer transition-all active:scale-95"
          >
            <Volume2 size={16} className="text-slate-600 mb-0.5" />
            <span className="text-[8px] font-black uppercase tracking-wider">Sound</span>
          </button>
          <button 
            type="button"
            onClick={onClose}
            className="flex flex-col items-center justify-center w-12 h-12 bg-[#ef4444] hover:bg-red-700 text-white rounded-xl shadow-sm cursor-pointer transition-all active:scale-95 border-none"
          >
            <Power size={16} className="mb-0.5" />
            <span className="text-[8px] font-black uppercase tracking-wider">Exit</span>
          </button>
        </div>
      </header>

      {/* ── Competitor Header Cards row ── */}
      <div className="grid grid-cols-[1fr_260px_1fr] gap-4 px-6 py-2 bg-[#e2e8f0]/40 flex-shrink-0 items-center select-none">
        
        {/* AO Competitor Card */}
        <div className="bg-white rounded-2xl p-3 flex items-center justify-between border border-slate-200 shadow-sm h-20 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#003882]" />
          <div className="flex items-center gap-2">
            <KarateSilhouette isAo={true} />
            <div className="leading-none text-left">
              <div className="text-[#003882] text-xs font-black uppercase tracking-wider mb-0.5">AO (BLUE)</div>
              <h3 className="text-base font-black text-slate-800 uppercase truncate max-w-[150px] tracking-wide mb-0.5 leading-tight">
                {aoName}
              </h3>
              <p className="text-[9px] text-slate-500 font-bold mb-0.5">
                {aoDojo || 'Bachupally Dojo'}
              </p>
              <p className="text-[8px] text-[#C5A059] font-black tracking-wider uppercase flex items-center gap-0.5">
                📍 {aoState || 'Telangana'}
              </p>
            </div>
          </div>
          <AvatarOrInitials name={aoName} hexColor="#003882" />
        </div>

        {/* Center Match Time Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex flex-col items-center justify-center h-20 relative">
          <span className="text-[8px] font-black text-slate-400 tracking-widest uppercase mb-0.5">Match Time</span>
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <button 
                type="button" 
                onClick={() => { setIsRunning(false); setTimeLeft(t => Math.min(t + 10, 999)) }}
                className="text-[9px] text-slate-400 hover:text-slate-700 cursor-pointer font-bold leading-none p-0.5"
              >
                ▲
              </button>
              <button 
                type="button" 
                onClick={() => { setIsRunning(false); setTimeLeft(t => Math.max(0, t - 10)) }}
                className="text-[9px] text-slate-400 hover:text-slate-700 cursor-pointer font-bold leading-none p-0.5"
              >
                ▼
              </button>
            </div>
            
            <span className={`text-2xl font-black font-mono tracking-widest leading-none ${
              isRunning 
                ? 'text-slate-800' 
                : (timeLeft <= 30 && timeLeft > 0 ? 'text-[#ef4444] animate-pulse' : 'text-slate-700')
            }`}>
              {formatTime(timeLeft)}
            </span>
            
            <div className="flex flex-col">
              <button 
                type="button" 
                onClick={() => { setIsRunning(false); setTimeLeft(t => Math.min(t + 1, 999)) }}
                className="text-[9px] text-slate-400 hover:text-slate-700 cursor-pointer font-bold leading-none p-0.5"
              >
                ▲
              </button>
              <button 
                type="button" 
                onClick={() => { setIsRunning(false); setTimeLeft(t => Math.max(0, t - 1)) }}
                className="text-[9px] text-slate-400 hover:text-slate-700 cursor-pointer font-bold leading-none p-0.5"
              >
                ▼
              </button>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => setIsRunning(r => !r)}
            className="mt-1 px-4 py-0.5 bg-[#008f39] hover:bg-[#00702a] text-white rounded-md text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 border-none"
          >
            Start / Stop
          </button>
        </div>

        {/* AKA Competitor Card */}
        <div className="bg-white rounded-2xl p-3 flex items-center justify-between border border-slate-200 shadow-sm h-20 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#a60000]" />
          <AvatarOrInitials name={akaName} hexColor="#a60000" />
          <div className="flex items-center gap-2">
            <div className="leading-none text-right">
              <div className="text-[#a60000] text-xs font-black uppercase tracking-wider mb-0.5">AKA (RED)</div>
              <h3 className="text-base font-black text-slate-800 uppercase truncate max-w-[150px] tracking-wide mb-0.5 leading-tight">
                {akaName}
              </h3>
              <p className="text-[9px] text-slate-500 font-bold mb-0.5">
                {akaDojo || 'Pragati Nagar Dojo'}
              </p>
              <p className="text-[8px] text-[#C5A059] font-black tracking-wider uppercase flex items-center gap-0.5 justify-end">
                📍 {akaState || 'Telangana'}
              </p>
            </div>
            <KarateSilhouette isAo={false} />
          </div>
        </div>

      </div>

      {/* ── Main Scoreboards grid ── */}
      <main className="flex-1 grid grid-cols-[1fr_260px_1fr] bg-[#e2e8f0]/40 overflow-hidden flex-shrink-0">
        
        {/* AO Column (Left, Blue Background) */}
        <section className="bg-[#003882] p-4 flex flex-col justify-between overflow-hidden relative">
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }}
          />

          <div className="flex-1 grid grid-cols-[1fr_1fr] gap-4 overflow-hidden z-10 items-center">
            {/* Left Col: Technique widgets */}
            <div className="flex flex-col gap-2 justify-center h-full">
              <TechniqueCard label="IPPON (3 PTS)" count={aoIppon} onAdd={() => setAoIppon(i => i + 1)} onSub={() => setAoIppon(i => Math.max(0, i - 1))} side="ao" />
              <TechniqueCard label="WAZA-ARI (2 PTS)" count={aoWazaAri} onAdd={() => setAoWazaAri(w => w + 1)} onSub={() => setAoWazaAri(w => Math.max(0, w - 1))} side="ao" />
              <TechniqueCard label="YUKO (1 PT)" count={aoYuko} onAdd={() => setAoYuko(y => y + 1)} onSub={() => setAoYuko(y => Math.max(0, y - 1))} side="ao" />
              <BonusPointsCard val={aoBonusPoints} setVal={setAoBonusPoints} side="ao" />
              <SenshuCard checked={senshu === 'ao'} onChange={() => setSenshu(s => s === 'ao' ? null : 'ao')} onSub={() => setAoYuko(y => Math.max(0, y - 1))} side="ao" />
            </div>

            {/* Right Col: Giant Score digits */}
            <div className="bg-[#00295c] border border-white/10 rounded-2xl flex items-center justify-center h-full relative shadow-inner overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#003882]/90 to-transparent pointer-events-none" />
              <span className="text-[130px] font-black font-sans leading-none text-white drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] select-none">
                {aoScore}
              </span>
            </div>
          </div>

          <div className="mt-4 border-t border-white/15 pt-3 z-10 flex-shrink-0">
            {aoPenaltiesList()}
          </div>
        </section>

        {/* Center Control column */}
        <section className="bg-[#0b131a] p-4 flex flex-col justify-between overflow-y-auto border-x border-slate-800 select-none">
          <div className="text-center my-4 flex flex-col items-center justify-center gap-1.5 z-10">
            <div className="text-white/30 font-black font-sans text-3xl tracking-[0.2em] uppercase select-none">VS</div>
            <div className="border border-white/10 rounded-xl px-4 py-2 bg-white/5 text-center min-w-[120px] shadow-inner">
              <span className="text-[8px] font-sans text-white/50 font-black uppercase tracking-wider block mb-0.5">Match Number</span>
              <span className="text-xl font-black text-white font-mono leading-none">1</span>
            </div>
          </div>

          <div className="w-full max-w-[220px] mx-auto space-y-4 z-10 my-auto">
            <div className="border border-white/10 rounded-2xl p-3 bg-white/5 text-center flex flex-col gap-2 shadow-sm">
              <span className="text-[9px] text-white/50 font-black uppercase tracking-widest block">Extra Time</span>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => { setTimeLeft(t => t + 30); setExtraTimeUsed(prev => prev + 30) }} 
                  className="flex-1 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-[9px] font-black uppercase cursor-pointer border-none transition-colors"
                >
                  +30 Sec
                </button>
                <button 
                  type="button" 
                  onClick={() => { setTimeLeft(t => t + 60); setExtraTimeUsed(prev => prev + 60) }} 
                  className="flex-1 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-[9px] font-black uppercase cursor-pointer border-none transition-colors"
                >
                  +1 Min
                </button>
              </div>
            </div>

            <div className="border border-white/10 rounded-2xl p-3 bg-white/5 text-center flex flex-col gap-2 shadow-sm">
              <span className="text-[9px] text-white/50 font-black uppercase tracking-widest block">Reset Time</span>
              <div className="flex items-center gap-1 justify-center">
                <input type="number" min="0" max="9" value={matchMins} onChange={e=>setMatchMins(Math.max(0,Math.min(9,parseInt(e.target.value)||0)))} className="w-9 h-7 text-center text-xs font-bold border border-white/10 rounded bg-white/5 text-white outline-none focus:border-[#C5A059]" />
                <span className="text-white font-bold text-sm">:</span>
                <input type="number" min="0" max="59" value={String(matchSecs).padStart(2,'0')} onChange={e=>setMatchSecs(Math.max(0,Math.min(59,parseInt(e.target.value)||0)))} className="w-10 h-7 text-center text-xs font-bold border border-white/10 rounded bg-white/5 text-white outline-none focus:border-[#C5A059]" />
                <button type="button" onClick={() => { setIsRunning(false); setTimeLeft(matchMins*60+matchSecs) }} className="px-2.5 py-1.5 bg-[#003882] hover:bg-blue-700 text-white rounded-lg text-[9px] font-black cursor-pointer active:scale-95 border-none">SET</button>
              </div>
            </div>
          </div>
        </section>

        {/* AKA Column (Right, Red Background) */}
        <section className="bg-[#a60000] p-4 flex flex-col justify-between overflow-hidden relative">
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }}
          />

          <div className="flex-1 grid grid-cols-[1fr_260px_1fr] bg-[#e5e7eb] overflow-hidden flex-shrink-0" style={{ display: 'none' }} />

          <div className="flex-1 grid grid-cols-[1fr_1fr] gap-4 overflow-hidden z-10 items-center">
            {/* Left Col: Giant Score digits */}
            <div className="bg-[#800000] border border-white/10 rounded-2xl flex items-center justify-center h-full relative shadow-inner overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tl from-[#a60000]/90 to-transparent pointer-events-none" />
              <span className="text-[130px] font-black font-sans leading-none text-white drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] select-none">
                {akaScore}
              </span>
            </div>

            {/* Right Col: Technique widgets */}
            <div className="flex flex-col gap-2 justify-center h-full">
              <TechniqueCard label="IPPON (3 PTS)" count={akaIppon} onAdd={() => setAkaIppon(i => i + 1)} onSub={() => setAkaIppon(i => Math.max(0, i - 1))} side="aka" />
              <TechniqueCard label="WAZA-ARI (2 PTS)" count={akaWazaAri} onAdd={() => setAkaWazaAri(w => w + 1)} onSub={() => setAkaWazaAri(w => Math.max(0, w - 1))} side="aka" />
              <TechniqueCard label="YUKO (1 PT)" count={akaYuko} onAdd={() => setAkaYuko(y => y + 1)} onSub={() => setAkaYuko(y => Math.max(0, y - 1))} side="aka" />
              <BonusPointsCard val={akaBonusPoints} setVal={setAkaBonusPoints} side="aka" />
              <SenshuCard checked={senshu === 'aka'} onChange={() => setSenshu(s => s === 'aka' ? null : 'aka')} onSub={() => setAkaYuko(y => Math.max(0, y - 1))} side="aka" />
            </div>
          </div>

          <div className="mt-4 border-t border-white/15 pt-3 z-10 flex-shrink-0">
            {akaPenaltiesList()}
          </div>
        </section>

      </main>

      {/* ── Footer Action Bar ── */}
      <footer className="flex items-center justify-between px-6 bg-white border-t border-slate-200 shadow-md h-16 flex-shrink-0 select-none">
        
        {/* Reset Match */}
        <button 
          type="button"
          onClick={() => { if(!confirm('Reset all match scores and timers?')) return; setAoYuko(0);setAoWazaAri(0);setAoIppon(0);setAoBonusPoints(0);setAkaYuko(0);setAkaWazaAri(0);setAkaIppon(0);setAkaBonusPoints(0);setAoC1([]);setAkaC1([]);setSenshu(null);setIsRunning(false);setTimeLeft(totalDuration);setExtraTimeUsed(0);setIsExtraTime(false);setKdMode(false);setHanteiWinner(null); }} 
          className="flex items-center gap-2 px-5 py-2.5 bg-[#ef4444] hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer border-none shadow-sm transition-colors active:scale-95"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm-6 8c0-1.01.25-1.97.7-2.8L6.24 7.74C5.46 8.97 5 10.43 5 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3c-3.31 0-6-2.69-6-6z"/>
          </svg>
          Reset Match
        </button>

        {/* Match Data */}
        <button 
          type="button"
          className="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 bg-white rounded-xl px-5 py-2.5 text-xs font-black uppercase cursor-pointer transition-colors active:scale-95 shadow-sm"
        >
          <svg className="w-4 h-4 text-slate-500 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Match Data
        </button>

        {/* Live Scoreboard */}
        <button 
          type="button"
          onClick={() => window.open(`/dashboard/tournaments/kumite?matchId=${match.id}&ao=${encodeURIComponent(aoName)}&aka=${encodeURIComponent(akaName)}`, '_blank')}
          className="flex items-center gap-2 bg-[#008f39] hover:bg-[#00702a] text-white rounded-xl px-7 py-2.5 text-xs font-black uppercase cursor-pointer border-none shadow-md transition-colors active:scale-95"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14H7v-5h3v5zm4 0h-3V7h3v10zm4 0h-3v-7h3v7z"/>
          </svg>
          Live Scoreboard
        </button>

        {/* Replay */}
        <button 
          type="button"
          className="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 bg-white rounded-xl px-5 py-2.5 text-xs font-black uppercase cursor-pointer transition-colors active:scale-95 shadow-sm"
        >
          <svg className="w-4 h-4 text-slate-500 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Replay
        </button>

        {/* Next Match */}
        <button 
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          className="flex items-center gap-2 bg-[#004B93] hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 text-xs font-black uppercase cursor-pointer border-none shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95"
        >
          {saving ? 'Syncing...' : 'Next Match'}
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>
      </footer>

      {/* ── Status Bar ── */}
      <div className="bg-[#f1f5f9] border-t border-slate-200 px-6 py-1 flex justify-between items-center text-[10px] font-bold text-slate-500 h-7 flex-shrink-0 select-none">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-slate-400 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          TATAMI 1
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-slate-400 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          REFEREE: VIJAY KUMAR
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-slate-400 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {currentDateTime || '10:30 AM | 25 MAY 2024'}
        </span>
      </div>

      {showHantei && (
        <div className="fixed inset-0 z-[115] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-205 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-yellow-500" />
            <div className="text-4xl mb-3">⚖️</div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider mb-2">Hantei Required</h3>
            <p className="text-slate-550 text-xs mb-6">
              Scores are equal ({aoScore} - {akaScore}) and no Senshu is active. The winner must be declared by Referee Decision.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleHanteiSelect('ao')}
                className="flex-1 py-3 bg-[#003882] hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 border-none"
              >
                Award to AO
              </button>
              <button
                type="button"
                onClick={() => handleHanteiSelect('aka')}
                className="flex-1 py-3 bg-[#a60000] hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer hover:shadow-lg hover:shadow-red-500/20 active:scale-95 border-none"
              >
                Award to AKA
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowHantei(false)}
              className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-550 hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

function CategoryBracket({ category, onClose, tournamentTitle }) {
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [scoringMatch, setScoringMatch] = useState(null)
  const [seedingEdit, setSeedingEdit] = useState(null) // { matchId, slot, athlete }
  const [canManage, setCanManage] = useState(false)

  const categoryName = `${category.ageLabel}${category.weightLabel ? ' / ' + category.weightLabel : ''}`

  // Fetch admin role
  useEffect(() => {
    async function loadRole() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single()
        const userRole = data?.role || 'student'
        setCanManage(userRole === 'admin' || userRole === 'trainer' || userRole === 'super_admin')
      }
    }
    loadRole()
  }, [])

  const propagateBracket = async (tournamentId, catName) => {
    const { data: dbMatches, error } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('category', catName)
      .order('round', { ascending: true })
      .order('match_number', { ascending: true })

    if (error) throw error
    if (!dbMatches || dbMatches.length === 0) return

    const maxRound = Math.max(...dbMatches.map(m => m.round))
    const roundsList = Array.from({ length: maxRound + 1 }, () => [])
    dbMatches.forEach(m => {
      roundsList[m.round][m.match_number] = m
    })

    // Clean all round > 0 match progression
    for (let r = 1; r <= maxRound; r++) {
      roundsList[r].forEach(m => {
        m.ao_id = null
        m.aka_id = null
        m.winner_id = null
        m.status = 'pending'
        m.ao_penalties = {}
        m.aka_penalties = {}
      })
    }

    // Re-propagate matches round by round
    for (let r = 0; r <= maxRound; r++) {
      const currentMatches = roundsList[r]
      for (let mi = 0; mi < currentMatches.length; mi++) {
        const m = currentMatches[mi]
        
        const isAoBye = !!m.ao_penalties?.is_bye
        const isAkaBye = !!m.aka_penalties?.is_bye
        const isCompleted = m.status === 'completed'

        if (isAoBye || isAkaBye) {
          m.status = 'completed'
          if (isAoBye && !isAkaBye) {
            m.winner_id = m.aka_id
          } else if (isAkaBye && !isAoBye) {
            m.winner_id = m.ao_id
          } else {
            m.winner_id = null
          }
        } else if (isCompleted && m.winner_id) {
          m.status = 'completed'
        } else {
          m.winner_id = null
          m.status = 'pending'
        }

        // Advance winner to the next round slot
        if (m.winner_id && r < maxRound) {
          const nextMi = Math.floor(mi / 2)
          const slot = mi % 2 === 0 ? 'ao_id' : 'aka_id'
          const penSlot = mi % 2 === 0 ? 'ao_penalties' : 'aka_penalties'
          const nextMatch = roundsList[r + 1][nextMi]
          if (nextMatch) {
            nextMatch[slot] = m.winner_id
            nextMatch[penSlot] = {} // reset
          }
        }

        // Propagate bye markers
        if (r < maxRound) {
          const nextMi = Math.floor(mi / 2)
          const penSlot = mi % 2 === 0 ? 'ao_penalties' : 'aka_penalties'
          const nextMatch = roundsList[r + 1][nextMi]
          if (nextMatch) {
            if (isAoBye && isAkaBye) {
              nextMatch[penSlot] = { is_bye: true }
            }
          }
        }
      }
    }

    // Save changes back to database
    for (const m of dbMatches) {
      await supabase
        .from('tournament_matches')
        .update({
          ao_id: m.ao_id,
          aka_id: m.aka_id,
          winner_id: m.winner_id,
          status: m.status,
          ao_penalties: m.ao_penalties || {},
          aka_penalties: m.aka_penalties || {}
        })
        .eq('id', m.id)
    }
  }

  const handleSwapSeeding = async (matchId1, slot1, matchId2, slot2) => {
    const toastId = toast.loading('Swapping athlete positions...')
    try {
      const { data: m1 } = await supabase.from('tournament_matches').select('*').eq('id', matchId1).single()
      const { data: m2 } = await supabase.from('tournament_matches').select('*').eq('id', matchId2).single()

      const p1 = m1[slot1]
      const p2 = m2[slot2]
      const p1_bye = m1[`${slot1.split('_')[0]}_penalties`]?.is_bye
      const p2_bye = m2[`${slot2.split('_')[0]}_penalties`]?.is_bye

      const side1 = slot1.split('_')[0]
      const side2 = slot2.split('_')[0]

      const { error: err1 } = await supabase.from('tournament_matches')
        .update({
          [slot1]: p2,
          [`${side1}_penalties`]: p2_bye ? { is_bye: true } : {}
        })
        .eq('id', matchId1)
      if (err1) throw err1

      const { error: err2 } = await supabase.from('tournament_matches')
        .update({
          [slot2]: p1,
          [`${side2}_penalties`]: p1_bye ? { is_bye: true } : {}
        })
        .eq('id', matchId2)
      if (err2) throw err2

      await propagateBracket(category.tournamentId, categoryName)

      toast.success('Athletes swapped successfully!', { id: toastId })
      setSeedingEdit(null)
      await refreshBracket()
    } catch (err) {
      toast.error('Failed to swap athletes: ' + err.message, { id: toastId })
    }
  }

  const handleMoveSeeding = async (matchId1, slot1, matchId2, slot2) => {
    const toastId = toast.loading('Moving athlete to empty slot...')
    try {
      const side1 = slot1.split('_')[0]
      const side2 = slot2.split('_')[0]

      const { data: m1 } = await supabase.from('tournament_matches').select('*').eq('id', matchId1).single()
      const playerToMove = m1[slot1]

      const { error: err1 } = await supabase.from('tournament_matches')
        .update({
          [slot1]: null,
          [`${side1}_penalties`]: { is_bye: true }
        })
        .eq('id', matchId1)
      if (err1) throw err1

      const { error: err2 } = await supabase.from('tournament_matches')
        .update({
          [slot2]: playerToMove,
          [`${side2}_penalties`]: {}
        })
        .eq('id', matchId2)
      if (err2) throw err2

      await propagateBracket(category.tournamentId, categoryName)

      toast.success('Athlete moved successfully!', { id: toastId })
      setSeedingEdit(null)
      await refreshBracket()
    } catch (err) {
      toast.error('Failed to move athlete: ' + err.message, { id: toastId })
    }
  }

  const refreshBracket = async () => {
    setLoading(true)
    const { data: dbMatches, error } = await supabase
      .from('tournament_matches')
      .select(`
        *,
        ao:ao_id(
          id,
          users(full_name),
          branches(name),
          belt_levels(name, hex, order_rank)
        ),
        aka:aka_id(
          id,
          users(full_name),
          branches(name),
          belt_levels(name, hex, order_rank)
        ),
        winner:winner_id(
          id,
          users(full_name),
          branches(name),
          belt_levels(name, hex, order_rank)
        )
      `)
      .eq('tournament_id', category.tournamentId)
      .eq('category', categoryName)
      .order('round', { ascending: true })
      .order('match_number', { ascending: true })

    if (!error && dbMatches) {
      setRounds(parseDbMatchesToRounds(dbMatches))
    }
    setLoading(false)
  }

  const buildAndSaveBracket = async () => {
    setLoading(true)
    const generatedRounds = buildBracket(category.players)
    const rowsToInsert = []

    for (let ri = 0; ri < generatedRounds.length; ri++) {
      const roundMatches = generatedRounds[ri]
      for (let mi = 0; mi < roundMatches.length; mi++) {
        const m = roundMatches[mi]
        rowsToInsert.push({
          tournament_id: category.tournamentId,
          category: categoryName,
          round: ri,
          match_number: mi,
          ao_id: m.ao.player?.id || null,
          aka_id: m.aka.player?.id || null,
          ao_score: 0,
          aka_score: 0,
          ao_penalties: m.ao.bye ? { is_bye: true } : {},
          aka_penalties: m.aka.bye ? { is_bye: true } : {},
          winner_id: m.winner?.player?.id || null,
          status: m.done ? 'completed' : 'pending',
          match_duration: 120
        })
      }
    }

    const { data: insertedMatches, error: insertError } = await supabase
      .from('tournament_matches')
      .insert(rowsToInsert)
      .select(`
        *,
        ao:ao_id(
          id,
          users(full_name),
          branches(name),
          belt_levels(name, hex, order_rank)
        ),
        aka:aka_id(
          id,
          users(full_name),
          branches(name),
          belt_levels(name, hex, order_rank)
        ),
        winner:winner_id(
          id,
          users(full_name),
          branches(name),
          belt_levels(name, hex, order_rank)
        )
      `)
      .order('round', { ascending: true })
      .order('match_number', { ascending: true })

    if (insertError) {
      toast.error('Error saving bracket to database: ' + insertError.message)
    } else if (insertedMatches) {
      const parsedRounds = parseDbMatchesToRounds(insertedMatches)
      setRounds(parsedRounds)
    }
    setLoading(false)
  }

  useEffect(() => {
    async function loadOrCreateBracket() {
      setLoading(true)
      
      const { data: dbMatches, error } = await supabase
        .from('tournament_matches')
        .select(`
          *,
          ao:ao_id(
            id,
            users(full_name),
            branches(name),
            belt_levels(name, hex, order_rank)
          ),
          aka:aka_id(
            id,
            users(full_name),
            branches(name),
            belt_levels(name, hex, order_rank)
          ),
          winner:winner_id(
            id,
            users(full_name),
            branches(name),
            belt_levels(name, hex, order_rank)
          )
        `)
        .eq('tournament_id', category.tournamentId)
        .eq('category', categoryName)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true })

      if (error) {
        toast.error('Error loading bracket: ' + error.message)
        setLoading(false)
        return
      }

      if (dbMatches && dbMatches.length > 0) {
        setRounds(parseDbMatchesToRounds(dbMatches))
        setLoading(false)
      } else {
        await buildAndSaveBracket()
      }
    }

    loadOrCreateBracket()
  }, [category])

  // Recursive advance function
  const advanceWinner = async (match, winnerId) => {
    const nextRound = match.round + 1
    const nextMatchNum = Math.floor(match.match_number / 2)
    const slot = match.match_number % 2 === 0 ? 'ao_id' : 'aka_id'

    const { data: nextMatch, error: findError } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', match.tournament_id)
      .eq('category', match.category)
      .eq('round', nextRound)
      .eq('match_number', nextMatchNum)
      .maybeSingle()

    if (findError) throw findError
    if (!nextMatch) return

    const updateData = { [slot]: winnerId }
    const otherSlot = slot === 'ao_id' ? 'aka' : 'ao'
    const isOtherBye = !!nextMatch[`${otherSlot}_penalties`]?.is_bye

    if (isOtherBye) {
      updateData.winner_id = winnerId
      updateData.status = 'completed'

      const { error: updateErr } = await supabase
        .from('tournament_matches')
        .update(updateData)
        .eq('id', nextMatch.id)
      if (updateErr) throw updateErr

      nextMatch[slot] = winnerId
      await advanceWinner(nextMatch, winnerId)
    } else {
      const { error: updateErr } = await supabase
        .from('tournament_matches')
        .update(updateData)
        .eq('id', nextMatch.id)
      if (updateErr) throw updateErr
    }
  }

  const handleSetWinner = async (matchId, side) => {
    const toastId = toast.loading('Advancing winner in database...')
    try {
      let targetMatch = null
      for (const r of rounds) {
        const found = r.find(m => m.id === matchId)
        if (found) {
          targetMatch = found
          break
        }
      }
      if (!targetMatch) throw new Error('Match not found')

      const winnerPlayer = side === 'ao' ? targetMatch.ao.player : targetMatch.aka.player
      if (!winnerPlayer) throw new Error('No athlete in selected slot')

      const { data: dbMatch, error: fetchErr } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', matchId)
        .single()
      if (fetchErr) throw fetchErr

      const { error: updateErr } = await supabase
        .from('tournament_matches')
        .update({ 
          winner_id: winnerPlayer.id,
          status: 'completed'
        })
        .eq('id', matchId)
      if (updateErr) throw updateErr

      await advanceWinner(dbMatch, winnerPlayer.id)

      toast.success('Winner advanced successfully!', { id: toastId })
      await refreshBracket()
    } catch (err) {
      toast.error('Failed to advance winner: ' + err.message, { id: toastId })
    }
  }

  const saveScore = async (matchId, matchData) => {
    const toastId = toast.loading('Saving match scores to database...')
    try {
      let targetMatch = null
      for (const r of rounds) {
        const found = r.find(m => m.id === matchId)
        if (found) {
          targetMatch = found
          break
        }
      }
      if (!targetMatch) throw new Error('Match not found')

      let winnerId = null
      if (matchData.winnerCorner === 'ao') winnerId = targetMatch.ao.player?.id
      else if (matchData.winnerCorner === 'aka') winnerId = targetMatch.aka.player?.id

      const { error: updateErr } = await supabase
        .from('tournament_matches')
        .update({
          ao_score: matchData.aoScore,
          aka_score: matchData.akaScore,
          winner_id: winnerId,
          status: 'completed',

          // Detailed technique counts
          ao_yuko_count: matchData.aoYuko,
          ao_waza_ari_count: matchData.aoWazaAri,
          ao_ippon_count: matchData.aoIppon,
          ao_bonus_points: matchData.aoBonusPoints,

          aka_yuko_count: matchData.akaYuko,
          aka_waza_ari_count: matchData.akaWazaAri,
          aka_ippon_count: matchData.akaIppon,
          aka_bonus_points: matchData.akaBonusPoints,

          // Senshu
          senshu: matchData.senshu,
          ao_senshu: matchData.senshu === 'ao',
          aka_senshu: matchData.senshu === 'aka',

          // Penalties
          ao_penalty_c1: matchData.aoC1,
          ao_penalty_c2: matchData.aoC2,
          ao_penalty_c3: matchData.aoC3,
          ao_penalty_hc: matchData.aoHC,
          ao_penalty_h: matchData.aoH,

          aka_penalty_c1: matchData.akaC1,
          aka_penalty_c2: matchData.akaC2,
          aka_penalty_c3: matchData.akaC3,
          aka_penalty_hc: matchData.akaHC,
          aka_penalty_h: matchData.akaH,

          ao_c1_penalties: matchData.aoPenaltiesList,
          aka_c1_penalties: matchData.akaPenaltiesList,

          // Match statistics
          match_duration: matchData.matchDuration,
          extra_time_used: matchData.extraTimeUsed,
          winner_corner: matchData.winnerCorner,
          win_method: matchData.winMethod,
          result_timestamp: new Date().toISOString()
        })
        .eq('id', matchId)
      if (updateErr) throw updateErr

      if (winnerId) {
        const { data: dbMatch, error: fetchErr } = await supabase
          .from('tournament_matches')
          .select('*')
          .eq('id', matchId)
          .single()
        if (fetchErr) throw fetchErr

        await advanceWinner(dbMatch, winnerId)
      }

      toast.success('Scores saved and bracket synchronized!', { id: toastId })
      await refreshBracket()
    } catch (err) {
      toast.error('Failed to save score: ' + err.message, { id: toastId })
      throw err
    }
  }

  const handleReSeed = async () => {
    if (!confirm('Are you sure you want to regenerate draw? This will clear all scoring progress, match results, and timer states for this category.')) return
    
    const toastId = toast.loading('Regenerating bracket and database rows...')
    try {
      const { error: deleteErr } = await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', category.tournamentId)
        .eq('category', categoryName)

      if (deleteErr) throw deleteErr

      await buildAndSaveBracket()
      toast.success('Bracket successfully regenerated!', { id: toastId })
    } catch (err) {
      toast.error('Failed to regenerate bracket: ' + err.message, { id: toastId })
    }
  }

  const champion = rounds.length > 0 ? rounds[rounds.length - 1][0]?.winner?.player : null

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 left-0 lg:left-72 z-50 bg-white/95 backdrop-blur-xl text-[#0A1F30] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-[#C5A059]" size={36} />
        <span className="text-xs uppercase font-mono tracking-widest text-gray-500">Loading bracket registry...</span>
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-y-0 right-0 left-0 lg:left-72 z-50 bg-white/95 backdrop-blur-xl text-[#0A1F30] p-6 md:p-8 lg:p-12 overflow-auto lg:border-l lg:border-gray-200/50 shadow-2xl"
    >
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex justify-between items-center border-b border-gray-200 pb-8">
          <div>
            <h2 className="text-[#C5A059] text-[10px] tracking-[0.35em] uppercase font-black mb-1.5">Live Tournament</h2>
            <h1 className="text-2xl font-heading font-black text-[#0A1F30] uppercase tracking-wider">
              {categoryName}
            </h1>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50 uppercase tracking-wider text-[10px] font-black rounded-lg px-4 cursor-pointer" onClick={refreshBracket}>
              <RotateCcw size={14} className="mr-2 text-[#C5A059]" /> Sync Scores
            </Button>
            {canManage && (
              <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50 uppercase tracking-wider text-[10px] font-black rounded-lg px-4 cursor-pointer" onClick={handleReSeed}>
                <Shuffle size={14} className="mr-2 text-[#C5A059]" /> Regenerate Draw
              </Button>
            )}
            <Button variant="ghost" className="text-gray-400 hover:text-gray-600 cursor-pointer" onClick={onClose}>
              <X size={24} />
            </Button>
          </div>
        </header>

        {champion && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-2xl p-8 flex items-center gap-8 text-[#0A1F30] relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 p-4 opacity-[0.03] text-[#C5A059]">
              <Trophy size={160} />
            </div>
            <Trophy size={64} className="text-[#C5A059] drop-shadow-md" />
            <div>
              <p className="text-[9px] uppercase tracking-[0.25em] text-[#C5A059] font-black mb-2">Grand Champion</p>
              <h2 className="text-3xl font-heading font-black uppercase tracking-wide">{champion.name || champion.users?.full_name}</h2>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">{champion.branch || champion.branches?.name}</p>
            </div>
          </motion.div>
        )}

        <div className="flex gap-12 overflow-x-auto pb-12 items-start scrollbar-hide">
          {rounds.length === 0 ? (
            <div className="w-full text-center py-20 text-gray-400 uppercase tracking-wider text-xs font-black">
              Bracket could not be built. Verify you have registered athletes.
            </div>
          ) : rounds.map((round, ri) => {
            const visibleMatches = round.filter(m => !m.ao.bye && !m.aka.bye)
            if (visibleMatches.length === 0 && ri > 0) return null
            return (
              <div key={ri} className="flex-shrink-0 space-y-8">
                <div className="text-center py-2 bg-gray-55 rounded-lg border border-gray-150">
                  <p className="text-[9px] uppercase tracking-[0.2em] font-black text-[#C5A059]">
                    {ri === rounds.length - 1 ? "FINALS" : ri === rounds.length - 2 ? "SEMI-FINALS" : `ROUND ${ri + 1}`}
                  </p>
                </div>
                <div className="space-y-6 flex flex-col justify-around min-h-[500px]">
                  {visibleMatches.map(m => (
                    <MatchCard key={m.id} match={m} onWinner={handleSetWinner} onScore={setScoringMatch} onEditSeeding={setSeedingEdit} canManage={canManage} />
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
            categoryName={categoryName}
            tournamentTitle={tournamentTitle}
          />
        )}
      </AnimatePresence>

      {/* ── Edit Seeding Modal ── */}
      <AnimatePresence>
        {seedingEdit && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-[#0A1F30]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-gray-200 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative"
            >
              <h3 className="font-heading text-lg font-black text-[#0A1F30] uppercase tracking-wider mb-4 border-b border-gray-150 pb-2">
                Edit Seeding: {seedingEdit.athlete.name || seedingEdit.athlete.users?.full_name}
              </h3>
              
              <div className="space-y-6 max-h-96 overflow-y-auto pr-1">
                {/* Swap athletes section */}
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-widest text-[#C5A059] font-black border-b border-gray-100 pb-1">Swap Positions With:</h4>
                  <div className="space-y-1.5">
                    {rounds[0] && (() => {
                      const options = []
                      rounds[0].forEach((m, mi) => {
                        if (m.ao.player && m.ao.player.id !== seedingEdit.athlete.id) {
                          options.push({ matchId: m.id, slot: 'ao_id', name: m.ao.player.name || m.ao.player.users?.full_name, desc: `Match ${mi} AO` })
                        }
                        if (m.aka.player && m.aka.player.id !== seedingEdit.athlete.id) {
                          options.push({ matchId: m.id, slot: 'aka_id', name: m.aka.player.name || m.aka.player.users?.full_name, desc: `Match ${mi} AKA` })
                        }
                      })
                      if (options.length === 0) return <p className="text-xs text-gray-400">No other athletes to swap with</p>
                      return options.map(opt => (
                        <div key={`${opt.matchId}_${opt.slot}`} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-150 rounded-lg text-xs">
                          <div>
                            <span className="font-bold text-gray-750">{opt.name}</span>
                            <span className="text-[9px] text-[#C5A059] ml-2 uppercase font-mono bg-amber-50 px-1.5 py-0.5 rounded">{opt.desc}</span>
                          </div>
                          <Button 
                            onClick={() => handleSwapSeeding(seedingEdit.matchId, seedingEdit.slot, opt.matchId, opt.slot)}
                            size="xs"
                            className="bg-[#0A1F30] text-white hover:bg-[#0A1F30]/90 text-[10px] rounded border-none cursor-pointer"
                          >
                            Swap
                          </Button>
                        </div>
                      ))
                    })()}
                  </div>
                </div>

                {/* Move player section */}
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-widest text-[#C5A059] font-black border-b border-gray-100 pb-1">Move to Empty Slot (Bye):</h4>
                  <div className="space-y-1.5">
                    {rounds[0] && (() => {
                      const options = []
                      rounds[0].forEach((m, mi) => {
                        if (m.ao.bye) {
                          options.push({ matchId: m.id, slot: 'ao_id', desc: `Match ${mi} AO (Bye)` })
                        }
                        if (m.aka.bye) {
                          options.push({ matchId: m.id, slot: 'aka_id', desc: `Match ${mi} AKA (Bye)` })
                        }
                      })
                      if (options.length === 0) return <p className="text-xs text-gray-400">No empty slots available</p>
                      return options.map(opt => (
                        <div key={`${opt.matchId}_${opt.slot}`} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-150 rounded-lg text-xs">
                          <span className="font-mono text-gray-650 font-bold">{opt.desc}</span>
                          <Button 
                            onClick={() => handleMoveSeeding(seedingEdit.matchId, seedingEdit.slot, opt.matchId, opt.slot)}
                            size="xs"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] rounded border-none cursor-pointer"
                          >
                            Move
                          </Button>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-150 mt-6">
                <Button type="button" variant="outline" onClick={() => setSeedingEdit(null)} className="rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer">
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function KataScoringModal({ performance, onClose, onSave }) {
  const [kataName, setKataName] = useState(performance.kata_name || '')
  const [judgeCount, setJudgeCount] = useState(performance.judge_scores?.length || 5)
  const [scores, setScores] = useState([])

  useEffect(() => {
    const defaultScores = Array.from({ length: judgeCount }, (_, i) => performance.judge_scores?.[i] || 7.0)
    setScores(defaultScores)
  }, [judgeCount, performance])

  const handleScoreChange = (idx, val) => {
    const nextScores = [...scores]
    nextScores[idx] = parseFloat(val) || 0
    setScores(nextScores)
  }

  const calculateTotal = () => {
    if (scores.length < 3) return 0
    const sorted = [...scores].sort((a, b) => a - b)
    let toSum = []
    if (judgeCount === 3) {
      toSum = sorted
    } else if (judgeCount === 5) {
      toSum = sorted.slice(1, 4)
    } else if (judgeCount === 7) {
      toSum = sorted.slice(2, 5)
    }
    const sum = toSum.reduce((acc, curr) => acc + curr, 0)
    return parseFloat(sum.toFixed(2))
  }

  const totalScore = calculateTotal()

  const getDiscards = () => {
    if (scores.length < 3) return []
    const indexed = scores.map((val, idx) => ({ val, idx }))
    indexed.sort((a, b) => a.val - b.val)
    
    const discards = []
    if (judgeCount === 5) {
      discards.push(indexed[0].idx)
      discards.push(indexed[4].idx)
    } else if (judgeCount === 7) {
      discards.push(indexed[0].idx)
      discards.push(indexed[1].idx)
      discards.push(indexed[5].idx)
      discards.push(indexed[6].idx)
    }
    return discards
  }

  const discardIndexes = getDiscards()

  const handleSave = () => {
    if (!kataName.trim()) {
      toast.error('Please enter the performed Kata name.')
      return
    }
    onSave(performance.student_id, performance.id, kataName, scores, totalScore)
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-[#0A1F30]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white border border-gray-205 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative"
      >
        <h3 className="font-heading text-lg font-black text-[#0A1F30] uppercase tracking-wider mb-4 border-b border-gray-150 pb-2">
          Input Kata Score: {performance.student?.users?.full_name}
        </h3>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-[#C5A059] font-black">Kata Name</label>
            <Input 
              value={kataName} 
              onChange={e => setKataName(e.target.value)} 
              placeholder="e.g. Bassai Dai, Kanku Dai, Chatanyara Kushanku" 
              className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm focus:border-[#C5A059]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-[#C5A059] font-black">Judge Panel Size</label>
            <div className="flex gap-2">
              {[3, 5, 7].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setJudgeCount(c)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-black transition-all cursor-pointer ${
                    judgeCount === c 
                      ? 'bg-[#0A1F30] border-[#0A1F30] text-white shadow-sm' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-55'
                  }`}
                >
                  {c} Judges
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-[#C5A059] font-black block">Judge Scores</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {scores.map((s, idx) => {
                const isDiscarded = discardIndexes.includes(idx)
                return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <span className="text-[8px] font-mono text-gray-400 font-bold uppercase">Judge {idx + 1}</span>
                    <input 
                      type="number"
                      step="0.1"
                      min="5.0"
                      max="10.0"
                      value={s}
                      onChange={e => handleScoreChange(idx, e.target.value)}
                      className={`w-full text-center h-10 border rounded-lg text-sm font-black outline-none focus:ring-2 focus:ring-[#C5A059]/10 ${
                        isDiscarded 
                          ? 'border-red-200 bg-red-50 text-red-500 line-through' 
                          : 'border-gray-200 bg-gray-50 text-[#0A1F30] focus:border-[#C5A059]'
                      }`}
                    />
                  </div>
                )
              })}
            </div>
            {judgeCount > 3 && (
              <p className="text-[9px] text-gray-450 italic text-center mt-1">
                Note: Highlighted scores are discarded (highest/lowest excluded).
              </p>
            )}
          </div>

          <div className="bg-[#0A1F30] text-white rounded-xl p-4 flex items-center justify-between shadow-inner mt-4">
            <div>
              <span className="text-[8px] uppercase tracking-wider text-gray-400 font-bold block">Final Calculated Score</span>
              <span className="text-sm font-sans text-yellow-400 font-black">WKF Standard Rule</span>
            </div>
            <span className="text-3xl font-black font-mono text-yellow-400">{totalScore}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-150 mt-6">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-5 font-semibold cursor-pointer border-none">
            Save & Sync
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

function CategoryKataScores({ category, onClose }) {
  const [performances, setPerformances] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeRound, setActiveRound] = useState(1)
  const [scoringPerformance, setScoringPerformance] = useState(null)
  const [canManage, setCanManage] = useState(false)
  const categoryName = category.ageLabel

  useEffect(() => {
    async function loadRole() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single()
        setCanManage(['admin', 'trainer', 'super_admin'].includes(data?.role))
      }
    }
    loadRole()
  }, [])

  useEffect(() => {
    loadPerformances()
  }, [category, activeRound])

  const loadPerformances = async () => {
    setLoading(true)
    try {
      const { data: dbData, error } = await supabase
        .from('tournament_kata_performances')
        .select(`*, students(*, users(full_name), branches(name), belt_levels(name))`)
        .eq('tournament_id', category.tournamentId)
        .eq('category', categoryName)
        .eq('round', activeRound)

      if (error) throw error

      const initialMap = {}
      category.players.forEach(p => {
        initialMap[p.id] = {
          student_id: p.id,
          student: p,
          kata_name: '',
          judge_scores: [],
          total_score: 0,
          status: 'pending',
          isNew: true
        }
      })

      dbData?.forEach(row => {
        if (initialMap[row.student_id]) {
          initialMap[row.student_id] = {
            id: row.id,
            student_id: row.student_id,
            student: row.students,
            kata_name: row.kata_name || '',
            judge_scores: row.judge_scores || [],
            total_score: row.total_score || 0,
            status: row.status,
            isNew: false
          }
        }
      })

      const list = Object.values(initialMap).sort((a, b) => b.total_score - a.total_score)
      setPerformances(list)
    } catch (err) {
      toast.error('Failed to load performances: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveScore = async (studentId, perfId, kataName, scores, totalScore) => {
    const toastId = toast.loading('Saving score...')
    try {
      if (perfId) {
        const { error } = await supabase
          .from('tournament_kata_performances')
          .update({
            kata_name: kataName,
            judge_scores: scores,
            total_score: totalScore,
            status: 'completed'
          })
          .eq('id', perfId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('tournament_kata_performances')
          .insert([{
            tournament_id: category.tournamentId,
            category: categoryName,
            round: activeRound,
            student_id: studentId,
            kata_name: kataName,
            judge_scores: scores,
            total_score: totalScore,
            status: 'completed'
          }])
        if (error) throw error
      }
      toast.success('Scores saved successfully!', { id: toastId })
      setScoringPerformance(null)
      await loadPerformances()
    } catch (err) {
      toast.error('Failed to save score: ' + err.message, { id: toastId })
    }
  }

  const handleAdvanceCandidates = async () => {
    const completed = performances.filter(p => p.status === 'completed' && p.total_score > 0)
    if (completed.length < 2) {
      toast.error('Need at least 2 candidates with scores to advance.')
      return
    }
    const countToAdvance = Math.pow(2, Math.floor(Math.log2(completed.length)))
    const toAdvance = completed.slice(0, countToAdvance)

    if (!confirm(`Advance the top ${toAdvance.length} athletes to Round ${activeRound + 1}?`)) return
    
    const toastId = toast.loading('Advancing candidates...')
    try {
      const rows = toAdvance.map(p => ({
        tournament_id: category.tournamentId,
        category: categoryName,
        round: activeRound + 1,
        student_id: p.student_id,
        status: 'pending',
        judge_scores: [],
        total_score: 0
      }))

      const { error } = await supabase
        .from('tournament_kata_performances')
        .insert(rows)

      if (error && !error.message.includes('duplicate')) throw error

      toast.success(`Advanced top ${toAdvance.length} candidates to Round ${activeRound + 1}!`, { id: toastId })
      setActiveRound(activeRound + 1)
    } catch (err) {
      toast.error('Failed to advance: ' + err.message, { id: toastId })
    }
  }

  const handleClearRound = async () => {
    if (!confirm(`Clear all score entries for Round ${activeRound}? This action is permanent.`)) return
    const toastId = toast.loading('Clearing round...')
    try {
      const { error } = await supabase
        .from('tournament_kata_performances')
        .delete()
        .eq('tournament_id', category.tournamentId)
        .eq('category', categoryName)
        .eq('round', activeRound)
      if (error) throw error
      toast.success('Round scores cleared!', { id: toastId })
      await loadPerformances()
    } catch (err) {
      toast.error('Failed to clear: ' + err.message, { id: toastId })
    }
  }

  const champion = activeRound > 1 && performances.length > 0 && performances.every(p => p.status === 'completed') && performances[0].total_score > 0
    ? performances[0].student 
    : null

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 left-0 lg:left-72 z-50 bg-white/95 backdrop-blur-xl text-[#0A1F30] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-[#C5A059]" size={36} />
        <span className="text-xs uppercase font-mono tracking-widest text-gray-500">Loading Kata Registry...</span>
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-y-0 right-0 left-0 lg:left-72 z-50 bg-white/95 backdrop-blur-xl text-[#0A1F30] p-6 md:p-8 lg:p-12 overflow-auto lg:border-l lg:border-gray-200/50 shadow-2xl"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b border-gray-200 pb-6">
          <div>
            <h2 className="text-[#C5A059] text-[10px] tracking-[0.35em] uppercase font-black mb-1.5">Kata Tournament</h2>
            <h1 className="text-2xl font-heading font-black text-[#0A1F30] uppercase tracking-wider">
              {categoryName}
            </h1>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
              {[1, 2, 3].map(r => (
                <button
                  key={r}
                  onClick={() => setActiveRound(r)}
                  className={`px-3 py-1 rounded text-xs font-black transition-all cursor-pointer ${
                    activeRound === r 
                      ? 'bg-[#0A1F30] text-white' 
                      : 'text-gray-500 hover:text-[#0A1F30]'
                  }`}
                >
                  Round {r}
                </button>
              ))}
            </div>
            
            <Button variant="outline" className="border-gray-200 text-gray-650 hover:bg-gray-50 uppercase tracking-wider text-[10px] font-black rounded-lg px-4 cursor-pointer" onClick={loadPerformances}>
              <RotateCcw size={14} className="mr-2 text-[#C5A059]" /> Sync Scores
            </Button>
            
            {canManage && (
              <>
                <Button variant="outline" className="border-gray-200 text-gray-650 hover:bg-gray-50 uppercase tracking-wider text-[10px] font-black rounded-lg px-4 cursor-pointer text-red-500 hover:text-red-700" onClick={handleClearRound}>
                  Clear Scores
                </Button>
                <Button variant="outline" className="border-gray-200 text-gray-650 hover:bg-gray-50 uppercase tracking-wider text-[10px] font-black rounded-lg px-4 cursor-pointer" onClick={handleAdvanceCandidates}>
                  Advance candidates
                </Button>
              </>
            )}

            <Button variant="ghost" className="text-gray-400 hover:text-gray-650 cursor-pointer" onClick={onClose}>
              <X size={24} />
            </Button>
          </div>
        </header>

        {champion && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-2xl p-6 flex items-center gap-6 text-[#0A1F30] relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 p-4 opacity-[0.03] text-[#C5A059]">
              <Trophy size={140} />
            </div>
            <Trophy size={48} className="text-[#C5A059] drop-shadow-md" />
            <div>
              <p className="text-[9px] uppercase tracking-[0.25em] text-[#C5A059] font-black mb-1">Kata Champion</p>
              <h2 className="text-2xl font-heading font-black uppercase tracking-wide">{champion.name || champion.users?.full_name}</h2>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-0.5">{champion.branches?.name}</p>
            </div>
          </motion.div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-150 text-[10px] font-black uppercase tracking-wider text-gray-500 h-12">
                <th className="pl-6 w-16 text-center">Rank</th>
                <th className="pl-4">Competitor</th>
                <th className="pl-4">Branch / Dojo</th>
                <th className="pl-4">Kata Form</th>
                <th className="pl-4 text-center">Individual Scores</th>
                <th className="pr-6 text-right w-32">Total Score</th>
                {canManage && <th className="pr-6 text-center w-24">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm font-semibold">
              {performances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400 uppercase text-xs tracking-wider font-bold">
                    No matching competitors registered in this category
                  </td>
                </tr>
              ) : performances.map((p, idx) => {
                const sName = p.student?.users?.full_name || 'Unknown Competitor'
                const isWinner = idx === 0 && p.total_score > 0
                return (
                  <tr key={p.student_id} className="hover:bg-gray-55/50 transition-colors h-16">
                    <td className="pl-6 text-center">
                      {isWinner ? (
                        <span className="inline-flex h-6 w-6 rounded-full bg-amber-400 text-white text-xs font-black items-center justify-center shadow-sm">1</span>
                      ) : idx === 1 && p.total_score > 0 ? (
                        <span className="inline-flex h-6 w-6 rounded-full bg-slate-300 text-white text-xs font-black items-center justify-center shadow-sm">2</span>
                      ) : idx === 2 && p.total_score > 0 ? (
                        <span className="inline-flex h-6 w-6 rounded-full bg-amber-700/60 text-white text-xs font-black items-center justify-center shadow-sm">3</span>
                      ) : (
                        <span className="text-gray-400 font-mono text-xs">{idx + 1}</span>
                      )}
                    </td>
                    <td className="pl-4">
                      <div className="font-bold text-[#0A1F30]">{sName}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{p.student?.belt_levels?.name || 'White'} Belt</div>
                    </td>
                    <td className="pl-4 text-gray-500">{p.student?.branches?.name || 'N/A'}</td>
                    <td className="pl-4">
                      {p.kata_name ? (
                        <span className="font-mono text-xs text-gray-700 bg-gray-50 border border-gray-150 px-2.5 py-0.5 rounded-full">
                          {p.kata_name}
                        </span>
                      ) : (
                        <span className="text-gray-300 italic text-xs">Not Performed</span>
                      )}
                    </td>
                    <td className="pl-4 text-center font-mono text-xs text-gray-450">
                      {p.judge_scores?.length > 0 ? p.judge_scores.join(' · ') : '—'}
                    </td>
                    <td className="pr-6 text-right font-mono font-black text-xl text-[#C5A059]">
                      {p.total_score > 0 ? `${p.total_score.toFixed(2)} pts` : '—'}
                    </td>
                    {canManage && (
                      <td className="pr-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button 
                            onClick={() => setScoringPerformance(p)}
                            size="xs"
                            className="bg-[#0A1F30] hover:bg-[#0A1F30]/90 text-white text-[10px] font-black uppercase tracking-wider py-1 rounded cursor-pointer border-none"
                          >
                            Score
                          </Button>
                          <Button 
                            onClick={() => {
                              window.open(`/dashboard/tournaments/kata?tournamentId=${category.tournamentId}&category=${encodeURIComponent(categoryName)}&round=${activeRound}&studentId=${p.student_id}`, '_blank')
                            }}
                            size="xs"
                            className="border border-[#C5A059]/20 hover:bg-[#C5A059]/15 text-[#C5A059] text-[10px] font-black uppercase tracking-wider py-1 rounded cursor-pointer"
                          >
                            Board
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {scoringPerformance && (
          <KataScoringModal 
            performance={scoringPerformance} 
            onClose={() => setScoringPerformance(null)}
            onSave={handleSaveScore}
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
  const { selectedSport, selectedSportName } = useSport()
  const { permissions, role: authRole } = useAuth()
  
  const [selectedAge, setSelectedAge] = useState('Junior (14-17)')
  const [selectedWeight, setSelectedWeight] = useState('40-45kg')
  const [activeCat, setActiveCat] = useState(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  const [student, setStudent] = useState(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [isRegisteredPaid, setIsRegisteredPaid] = useState(false)
  const [registeredCategory, setRegisteredCategory] = useState('')
  const [openRegister, setOpenRegister] = useState(false)
  
  const [regAgeCat, setRegAgeCat] = useState('')
  const [regWeightCat, setRegWeightCat] = useState('')
  const [regWeight, setRegWeight] = useState('')
  const [regHeight, setRegHeight] = useState('')
  const [registering, setRegistering] = useState(false)

  const [openCreate, setOpenCreate] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  // New options fields
  const [belts, setBelts] = useState([])
  const [customCategories, setCustomCategories] = useState([])
  const [newCustomCategory, setNewCustomCategory] = useState('')
  
  // Spot Registration states
  const [openSpotReg, setOpenSpotReg] = useState(false)
  const [spotRegCategory, setSpotRegCategory] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])

  const selectedT = tournaments.find(t => t.id === selectedTournament)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single()
        const userRole = data?.role || 'student'
        setRole(userRole)

        if (userRole === 'student' || userRole === 'parent') {
          const { data: sData } = await supabase
            .from('students')
            .select('id, dob, weight, height, users(full_name)')
            .eq('user_id', session.user.id)
            .maybeSingle()
          setStudent(sData)
        }
      }
      
      // Fetch belt levels for belt-wise tournaments
      const { data: bData } = await supabase.from('belt_levels').select('name').order('order_rank')
      if (bData) setBelts(bData)
    }
    init()
  }, [])

  useEffect(() => {
    if (permissions) {
      fetchTournaments()
    }
  }, [permissions])

  async function fetchTournaments() {
    setLoading(true)
    let query = supabase.from('tournaments').select('*, branches(name)')
    
    if (authRole === 'sport_admin' && permissions?.sportIds?.length > 0) {
      query = query.in('sport_id', permissions.sportIds)
    }

    const { data } = await query.order('event_date', { ascending: false })
    if (data) {
      setTournaments(data)
      if (data.length > 0 && !selectedTournament) {
        setSelectedTournament(data[0].id)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    async function checkRegistration() {
      if (selectedTournament && student?.id) {
        const { data } = await supabase
          .from('tournament_participants')
          .select('category, payment_status')
          .eq('tournament_id', selectedTournament)
          .eq('student_id', student.id)
          .maybeSingle()
        if (data) {
          setIsRegistered(true)
          setRegisteredCategory(data.category)
          setIsRegisteredPaid(data.payment_status === 'paid')
        } else {
          setIsRegistered(false)
          setRegisteredCategory('')
          setIsRegisteredPaid(false)
        }
      }
    }
    checkRegistration()
  }, [selectedTournament, student])

  useEffect(() => {
    if (selectedTournament) {
      fetchParticipants()
      setCustomCategories([])
      // Default standard selection
      if (selectedT?.tournament_type === 'belt_wise') {
        setSelectedAge('White Belt')
        setSelectedWeight('')
      } else {
        setSelectedAge('Junior (14-17)')
        setSelectedWeight('40-45kg')
      }
    }
  }, [selectedTournament, tournaments])

  async function fetchParticipants() {
    const { data } = await supabase
      .from('tournament_participants')
      .select('*, students(*, users(full_name), branches(name), belt_levels(name))')
      .eq('tournament_id', selectedTournament)
    if (data) {
      setParticipants(data)
    }
  }

  function getStudentCategory(dob, weight) {
    if (!dob || !weight) return 'Open'
    const birthYear = new Date(dob).getFullYear()
    const currentYear = new Date().getFullYear()
    const age = currentYear - birthYear

    let ageCat = 'Senior (18+)'
    for (const [label, range] of Object.entries(AGE_CATS)) {
      if (age >= range.min && age <= range.max) {
        ageCat = label
        break
      }
    }

    let weightCat = '+65kg'
    const w = parseFloat(weight)
    for (const [label, range] of Object.entries(WEIGHT_CATS)) {
      if (w >= range.min && w <= range.max) {
        weightCat = label
        break
      }
    }

    return `${ageCat} / ${weightCat}`
  }

  // Handle student self registration
  const handleRegisterConfirm = async () => {
    if (selectedT?.registration_status === 'closed') {
      toast.error('Registrations are closed for this tournament.')
      return
    }

    if (!regWeight || parseFloat(regWeight) <= 0) {
      toast.error('Weight is mandatory and must be greater than 0.')
      return
    }
    if (!regHeight || parseFloat(regHeight) <= 0) {
      toast.error('Height is mandatory and must be greater than 0.')
      return
    }

    // Determine category based on tournament type
    let finalCategory = ''
    if (selectedT?.tournament_type === 'belt_wise') {
      if (!regAgeCat) {
        toast.error('Please select a belt category.')
        return
      }
      finalCategory = regAgeCat // regAgeCat is reused for belt selection in UI
    } else {
      if (!regAgeCat || !regWeightCat) {
        toast.error('Please select both division and classification.')
        return
      }
      finalCategory = `${regAgeCat} / ${regWeightCat}`
    }

    setRegistering(true)
    const toastId = toast.loading('Processing registration...')

    try {
      const weightNum = parseFloat(regWeight)
      const heightNum = parseFloat(regHeight)

      if (weightNum !== student?.weight || heightNum !== student?.height) {
        const { error: profileErr } = await supabase
          .from('students')
          .update({
            weight: weightNum,
            height: heightNum
          })
          .eq('id', student.id)
        
        if (profileErr) throw profileErr
        
        setStudent(prev => ({
          ...prev,
          weight: weightNum,
          height: heightNum
        }))
      }

      // If entry fee > 0 and payment is required
      const defaultPaymentStatus = (selectedT?.entry_fee > 0 && selectedT?.registration_rules === 'payment_required') 
        ? 'pending' 
        : 'paid'

      const { error: regErr } = await supabase
        .from('tournament_participants')
        .insert([{
          tournament_id: selectedTournament,
          student_id: student.id,
          category: finalCategory,
          payment_status: defaultPaymentStatus
        }])

      if (regErr) throw regErr

      toast.success(
        defaultPaymentStatus === 'pending'
          ? 'Registration recorded! Pending payment confirmation.'
          : 'Successfully registered for tournament!',
        { id: toastId }
      )
      setIsRegistered(true)
      setRegisteredCategory(finalCategory)
      setIsRegisteredPaid(defaultPaymentStatus === 'paid')
      setOpenRegister(false)
      fetchParticipants()
    } catch (err) {
      toast.error('Registration failed: ' + err.message, { id: toastId })
    } finally {
      setRegistering(false)
    }
  }

  // Spot registration logic for admins
  const handleSpotRegister = async (studentId) => {
    const toastId = toast.loading('Registering student on spot...')
    try {
      const isAlreadyReg = participants.some(p => p.student_id === studentId && p.category === spotRegCategory)
      if (isAlreadyReg) {
        toast.error('Student is already registered in this category.', { id: toastId })
        return
      }

      const { error } = await supabase
        .from('tournament_participants')
        .insert([{
          tournament_id: selectedTournament,
          student_id: studentId,
          category: spotRegCategory,
          payment_status: 'paid' // Automatically active/paid for spot
        }])

      if (error) throw error
      toast.success('Student registered successfully!', { id: toastId })
      setOpenSpotReg(false)
      setStudentSearch('')
      setSearchResults([])
      fetchParticipants()
    } catch (err) {
      toast.error('Registration failed: ' + err.message, { id: toastId })
    }
  }

  // Spot registration student search trigger
  useEffect(() => {
    if (studentSearch.trim().length < 2) {
      setSearchResults([])
      return
    }
    async function search() {
      const { data } = await supabase
        .from('students')
        .select('id, users(full_name), branches(name), belt_levels(name)')
        .ilike('users.full_name', `%${studentSearch}%`)
        .limit(10)
      if (data) setSearchResults(data)
    }
    search()
  }, [studentSearch])

  // Custom Category addition helper
  const handleAddCustomCategory = () => {
    const trimmed = newCustomCategory.trim()
    if (!trimmed) return
    if (customCategories.includes(trimmed)) {
      toast.error('Category already exists.')
      return
    }
    setCustomCategories(prev => [...prev, trimmed])
    setSelectedAge(trimmed)
    setSelectedWeight('')
    setNewCustomCategory('')
    toast.success(`Category "${trimmed}" added!`)
  }

  const handleCloseRegistrationAndDraft = async () => {
    if (!confirm('Are you sure you want to close registration and automatically generate brackets? This will lock registrations.')) return
    const toastId = toast.loading('Closing registrations and generating drafts...')
    try {
      const { error: tErr } = await supabase
        .from('tournaments')
        .update({ registration_status: 'closed' })
        .eq('id', selectedTournament)

      if (tErr) throw tErr

      setTournaments(prev => prev.map(t => t.id === selectedTournament ? { ...t, registration_status: 'closed' } : t))

      // Group paid/active participants by category
      const activeParticipants = participants.filter(p => p.payment_status === 'paid')
      const catMap = {}
      activeParticipants.forEach(p => {
        if (!p.category) return
        if (!catMap[p.category]) catMap[p.category] = []
        catMap[p.category].push(p.students)
      })

      // Generate single-elim draft sheets for all active categories
      for (const [catName, players] of Object.entries(catMap)) {
        if (players.length < 2) continue

        // Check if matches already exist
        const { data: existingMatches } = await supabase
          .from('tournament_matches')
          .select('id')
          .eq('tournament_id', selectedTournament)
          .eq('category', catName)
          .limit(1)

        if (existingMatches && existingMatches.length > 0) continue

        const generatedRounds = buildBracket(players)
        const rowsToInsert = []

        for (let ri = 0; ri < generatedRounds.length; ri++) {
          const roundMatches = generatedRounds[ri]
          for (let mi = 0; mi < roundMatches.length; mi++) {
            const m = roundMatches[mi]
            rowsToInsert.push({
              tournament_id: selectedTournament,
              category: catName,
              round: ri,
              match_number: mi,
              ao_id: m.ao.player?.id || null,
              aka_id: m.aka.player?.id || null,
              ao_score: 0,
              aka_score: 0,
              ao_penalties: m.ao.bye ? { is_bye: true } : {},
              aka_penalties: m.aka.bye ? { is_bye: true } : {},
              winner_id: m.winner?.player?.id || null,
              status: m.done ? 'completed' : 'pending',
              match_duration: 120
            })
          }
        }

        const { error: insErr } = await supabase
          .from('tournament_matches')
          .insert(rowsToInsert)
        if (insErr) throw insErr
      }

      toast.success('Registration closed and brackets drafted successfully!', { id: toastId })
      fetchParticipants()
    } catch (err) {
      toast.error('Draft generation failed: ' + err.message, { id: toastId })
    }
  }

  const handleReOpenRegistration = async () => {
    if (!confirm('Are you sure you want to re-open registration? This will allow new athletes to register.')) return
    const toastId = toast.loading('Re-opening registrations...')
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ registration_status: 'open' })
        .eq('id', selectedTournament)

      if (error) throw error

      setTournaments(prev => prev.map(t => t.id === selectedTournament ? { ...t, registration_status: 'open' } : t))
      toast.success('Registrations re-opened successfully!', { id: toastId })
    } catch (err) {
      toast.error('Failed to re-open: ' + err.message, { id: toastId })
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
        description: data.description,
        entry_fee: parseFloat(data.entryFee) || 0,
        sport_id: selectedSport !== 'all' ? selectedSport : null,
        tournament_type: data.tournamentType || 'non_belt',
        registration_rules: data.registrationRules || 'open',
        registration_status: 'open'
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

  // Get active lists of unique categories
  const categoriesFromParticipants = Array.from(new Set(participants.map(p => p.category))).filter(Boolean)
  const allCategories = Array.from(new Set([
    ...categoriesFromParticipants,
    ...customCategories
  ])).filter(Boolean)

  const targetCategory = selectedWeight ? `${selectedAge} / ${selectedWeight}` : selectedAge
  const matchedAthletes = participants
    .filter(p => p.category === targetCategory)
    .map(p => p.students)
    .filter(Boolean)

  const canManage = role === 'admin' || role === 'trainer' || role === 'super_admin'

  if (selectedSportName !== 'Karate') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white border border-gray-150 rounded-2xl shadow-sm text-[#0A1F30]">
        <Trophy size={48} className="text-gray-300 mb-4 animate-pulse" />
        <h3 className="text-lg font-bold text-[#0A1F30] mb-2 font-heading">Karate-Only Module</h3>
        <p className="text-sm text-gray-500 max-w-md">
          The Tournament Matrix and Kumite scoring systems are Karate-specific. Please switch to the Karate sport in the sidebar to access tournament management.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-[#C5A059]" />
          <p className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Loading Tournaments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20 text-[#0A1F30]">
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
          <Button onClick={() => setOpenCreate(true)} className="bg-[#0A1F30] hover:bg-[#0A1F30]/90 text-white rounded-lg text-xs font-semibold cursor-pointer border-none">
            <Plus className="mr-2" size={16} /> New Tournament
          </Button>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-md p-0 overflow-hidden text-[#0A1F30]">
              <DialogHeader className="p-6 border-b border-gray-100">
                <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">Create Tournament</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onCreateTournament)} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Tournament Title</label>
                  <Input {...register("title", { required: true })} className="bg-gray-55 border-gray-200 rounded-lg h-10 text-sm focus:border-[#C5A059]" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Tournament Type</label>
                    <select {...register("tournamentType")} className="w-full bg-gray-55 border border-gray-200 rounded-lg h-10 px-4 text-xs font-semibold outline-none focus:border-[#C5A059] cursor-pointer">
                      <option value="non_belt">Age / Weight / Height (Non-Belt)</option>
                      <option value="belt_wise">Belt Wise (Dojo)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Registration Rule</label>
                    <select {...register("registrationRules")} className="w-full bg-gray-55 border border-gray-200 rounded-lg h-10 px-4 text-xs font-semibold outline-none focus:border-[#C5A059] cursor-pointer">
                      <option value="open">Open (Immediate Active)</option>
                      <option value="payment_required">Payment Required if fee &gt; 0</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Event Date</label>
                    <Input type="date" {...register("eventDate", { required: true })} className="bg-gray-55 border-gray-200 rounded-lg h-10 text-sm focus:border-[#C5A059]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Host Branch</label>
                    <select {...register("branchId")} className="w-full bg-gray-55 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                      <option value="">No specific branch</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Location / Address</label>
                    <Input {...register("location", { required: true })} className="bg-gray-55 border-gray-200 rounded-lg h-10 text-sm focus:border-[#C5A059]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Entry Fee (₹)</label>
                    <Input type="number" step="0.01" defaultValue={0} {...register("entryFee")} className="bg-gray-55 border-gray-200 rounded-lg h-10 text-sm focus:border-[#C5A059]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Description</label>
                  <Input {...register("description")} className="bg-gray-55 border-gray-200 rounded-lg h-10 text-sm focus:border-[#C5A059]" />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpenCreate(false)} className="flex-1 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-55 cursor-pointer">Cancel</Button>
                  <Button type="submit" className="flex-1 bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-lg cursor-pointer border-none">Create</Button>
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
              className={selectedTournament === t.id ? "bg-[#0A1F30] text-white cursor-pointer border-none" : "text-gray-500 border-gray-200 hover:bg-gray-55 cursor-pointer"}
            >
              {t.title}
            </Button>
          ))}
        </div>
      )}

      {canManage ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm lg:col-span-1 text-[#0A1F30]">
            <CardHeader className="border-b border-gray-100 p-6">
              <CardTitle className="text-sm uppercase tracking-wider text-[#0A1F30] font-bold">Bracket Logic</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                {selectedT?.tournament_type === 'belt_wise' ? (
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Belt Category</label>
                    <select 
                      value={selectedAge} 
                      onChange={e => {
                        setSelectedAge(e.target.value)
                        setSelectedWeight('')
                      }}
                      className="w-full bg-gray-50 border border-gray-200 h-10 px-4 rounded-lg text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10 cursor-pointer"
                    >
                      {belts.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Select Category</label>
                      <select 
                        value={selectedAge} 
                        onChange={e => {
                          setSelectedAge(e.target.value)
                          setSelectedWeight('')
                        }}
                        className="w-full bg-gray-55 border border-gray-200 h-10 px-4 rounded-lg text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10 cursor-pointer"
                      >
                        <option value="">Choose Category</option>
                        {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        {Object.keys(AGE_CATS).map(a => (
                          Object.keys(WEIGHT_CATS).map(w => {
                            const cat = `${a} / ${w}`
                            if (!allCategories.includes(cat)) {
                              return <option key={cat} value={cat}>{cat}</option>
                            }
                            return null
                          })
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-[9px] uppercase tracking-wider text-gray-400 font-black block">Or Add Custom Category</label>
                      <div className="flex gap-2">
                        <Input
                          value={newCustomCategory}
                          onChange={e => setNewCustomCategory(e.target.value)}
                          placeholder="e.g. 10-12 Years / 25-30 KG / Category A"
                          className="bg-gray-50 border-gray-200 rounded-lg h-10 text-xs focus:border-[#C5A059]"
                        />
                        <Button onClick={handleAddCustomCategory} className="bg-[#0A1F30] hover:bg-[#0A1F30]/90 text-white rounded-lg h-10 text-xs cursor-pointer border-none">
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {matchedAthletes.length < 2 ? (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-2 text-red-700">
                  <div className="flex items-center gap-2 font-semibold text-xs">
                    <AlertCircle size={14} className="text-red-600" />
                    <span>Matched Athletes: {matchedAthletes.length}</span>
                  </div>
                  <p className="text-[11px] text-red-600/80 leading-relaxed">
                    Need at least 2 athletes in this category to generate a tournament bracket.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2 text-emerald-700">
                  <div className="flex items-center gap-2 font-semibold text-xs">
                    <Target size={14} />
                    <span>Matched Athletes: {matchedAthletes.length}</span>
                  </div>
                  <p className="text-[11px] text-emerald-600/80 leading-relaxed">
                    System will auto-generate a single-elimination bracket with random seeding.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-[#C5A059] hover:bg-[#C5A059]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg h-10 font-semibold transition-all cursor-pointer border-none"
                  disabled={matchedAthletes.length < (selectedAge?.toLowerCase().includes('kata') ? 1 : 2)}
                  onClick={() => setActiveCat({
                    id: Date.now(),
                    tournamentId: selectedTournament,
                    ageLabel: selectedAge,
                    weightLabel: selectedWeight,
                    players: matchedAthletes
                  })}
                >
                  {selectedAge?.toLowerCase().includes('kata') ? 'Open Kata Standings' : 'Open Bracket'}
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedAge) {
                      toast.error('Please select or add a category first.')
                      return
                    }
                    setSpotRegCategory(selectedWeight ? `${selectedAge} / ${selectedWeight}` : selectedAge)
                    setOpenSpotReg(true)
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-10 px-4 font-semibold cursor-pointer border-none"
                >
                  Spot Reg
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden lg:col-span-2 text-[#0A1F30] flex flex-col justify-between">
            <div className="flex-1 flex flex-col">
              <CardHeader className="border-b border-gray-100 p-6 flex flex-row items-center justify-between">
                <CardTitle className="text-sm uppercase tracking-wider text-[#0A1F30] font-bold">Qualified Athletes ({participants.length})</CardTitle>
                <div className="flex items-center gap-3">
                  {selectedT?.registration_status === 'closed' ? (
                    <Badge className="bg-red-50 text-red-700 border-red-200 uppercase text-[9px] py-1 px-2.5 font-bold">
                      Registration Closed
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 uppercase text-[9px] py-1 px-2.5 font-bold animate-pulse">
                      Registration Open
                    </Badge>
                  )}
                  {canManage && (
                    <Button
                      onClick={selectedT?.registration_status === 'closed' ? handleReOpenRegistration : handleCloseRegistrationAndDraft}
                      size="xs"
                      className={`h-7 px-3 text-[9px] uppercase font-black tracking-wider rounded-lg border cursor-pointer border-none ${
                        selectedT?.registration_status === 'closed'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-red-650 hover:bg-red-750 text-white'
                      }`}
                    >
                      {selectedT?.registration_status === 'closed' ? 'Re-Open Reg' : 'Close Reg & Draft'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <div className="divide-y divide-gray-100">
                  {participants.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 uppercase text-xs tracking-wider">No athletes registered to this tournament</div>
                  ) : participants.map((p, i) => {
                    const a = p.students
                    if (!a) return null
                    return (
                      <div key={p.id || i} className="flex items-center justify-between p-4 hover:bg-gray-55 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0A1F30]">{a.users?.full_name}</p>
                            <p className="text-[10px] text-gray-550 mt-0.5">
                              {a.branches?.name} · <span className="font-bold text-[#C5A059] bg-[#C5A059]/5 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider">{p.category}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <p className="text-xs font-bold text-[#C5A059] uppercase">{a.belt_levels?.name || 'White'} Belt</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Rank #{a.belt_levels?.order_rank || 1}</p>
                          </div>
                          <button
                            onClick={async () => {
                              const newStatus = p.payment_status === 'paid' ? 'pending' : 'paid'
                              const { error } = await supabase
                                .from('tournament_participants')
                                .update({ payment_status: newStatus })
                                .eq('id', p.id)
                              if (!error) {
                                toast.success(`Payment marked as ${newStatus}`)
                                fetchParticipants()
                              } else {
                                toast.error(`Failed to update payment: ${error.message}`)
                              }
                            }}
                            className="cursor-pointer outline-none"
                          >
                            <Badge className={`rounded font-mono text-[9px] uppercase tracking-wider py-1 px-2 border ${
                              p.payment_status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            }`}>
                              {p.payment_status || 'pending'}
                            </Badge>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </div>
            
            {matchedAthletes.length >= (selectedAge?.toLowerCase().includes('kata') ? 1 : 2) && (
              <div 
                onClick={() => setActiveCat({
                  id: Date.now(),
                  tournamentId: selectedTournament,
                  ageLabel: selectedAge,
                  weightLabel: selectedWeight,
                  players: matchedAthletes
                })}
                className="text-[#C5A059] hover:text-[#C5A059]/80 font-bold text-xs tracking-wider uppercase cursor-pointer hover:underline transition-colors text-center py-4 border-t border-gray-100 bg-gray-50 hover:bg-gray-100"
              >
                {selectedAge?.toLowerCase().includes('kata') ? 'Open Kata Standings Preview >' : 'Open Bracket Preview >'}
              </div>
            )}
          </Card>
        </div>
      ) : (selectedT ? (
          <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden text-[#0A1F30]">
            <CardHeader className="border-b border-gray-100 p-6 flex flex-row items-center justify-between">
              <div>
                <p className="text-[10px] font-mono tracking-widest text-[#C5A059] uppercase font-bold mb-1">Tournament Information</p>
                <CardTitle className="text-xl font-heading font-bold text-[#0A1F30]">{selectedT.title}</CardTitle>
              </div>
              {isRegistered ? (
                <Badge className="rounded-full bg-emerald-500/15 text-emerald-600 border-transparent gap-1 py-1.5 px-3 font-semibold text-xs">
                  <ShieldCheck size={14} className="mr-1" /> Registered
                </Badge>
              ) : (
                <Badge className="rounded-full bg-yellow-500/15 text-yellow-600 border-transparent py-1.5 px-3 font-semibold text-xs">
                  Not Registered
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Event Date</p>
                  <p className="text-sm font-semibold text-[#0A1F30]">
                    {selectedT.event_date ? new Date(selectedT.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Location</p>
                  <p className="text-sm font-semibold text-[#0A1F30]">{selectedT.location || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Host Branch</p>
                  <p className="text-sm font-semibold text-[#C5A059]">{selectedT.branches?.name || 'All Branches'}</p>
                </div>
              </div>

              {selectedT.description && (
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Description</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{selectedT.description}</p>
                </div>
              )}

              <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {isRegistered ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 w-full sm:w-auto">
                    <p className="text-xs text-emerald-800 font-semibold">
                      🎉 You have registered for this tournament!
                    </p>
                    <p className="text-[10px] text-emerald-600 mt-1 uppercase font-bold tracking-wider">
                      Division: {registeredCategory}
                    </p>
                    {selectedT.entry_fee > 0 && (
                      <p className="text-[10px] mt-1.5 uppercase font-bold tracking-wider flex items-center gap-2">
                        <span>Entry Fee: ₹{selectedT.entry_fee}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] border ${
                          isRegisteredPaid 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {isRegisteredPaid ? 'PAID & VERIFIED' : 'PAYMENT PENDING'}
                        </span>
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-gray-500 max-w-md">
                      💡 <strong>Eligibility check:</strong> You must enter your current weight and height to register. You can update these details right during the registration step.
                    </div>
                    {selectedT?.registration_status === 'closed' ? (
                      <Button disabled className="bg-gray-400 text-white rounded-xl font-semibold px-6 py-2">
                        Registration Closed
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => {
                          setRegWeight(student?.weight || '')
                          setRegHeight(student?.height || '')
                          const defaultCat = getStudentCategory(student?.dob, student?.weight)
                          if (selectedT?.tournament_type === 'belt_wise') {
                            setRegAgeCat(belts[0]?.name || 'White Belt')
                            setRegWeightCat('')
                          } else {
                            const [agePart, weightPart] = defaultCat.split(' / ')
                            setRegAgeCat(agePart || 'Senior (18+)')
                            setRegWeightCat(weightPart || '+65kg')
                          }
                          setOpenRegister(true)
                        }}
                        className="bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-xl font-semibold px-6 py-2 cursor-pointer border-none"
                      >
                        Register for Tournament
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
      ) : null)}

      <AnimatePresence>
        {activeCat && (
          selectedAge?.toLowerCase().includes('kata') ? (
            <CategoryKataScores 
              category={activeCat} 
              onClose={() => setActiveCat(null)} 
            />
          ) : (
            <CategoryBracket 
              category={activeCat} 
              onClose={() => setActiveCat(null)} 
              tournamentTitle={selectedT?.title}
            />
          )
        )}
      </AnimatePresence>

      {/* ── Spot Registration Dialog ── */}
      <Dialog open={openSpotReg} onOpenChange={setOpenSpotReg}>
        <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-md p-0 overflow-hidden shadow-xl text-[#0A1F30]">
          <DialogHeader className="p-6 border-b border-gray-100">
            <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">
              Spot Registration: {spotRegCategory}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Search Student Name</label>
              <Input 
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Type name to search (e.g. John)..."
                className="bg-gray-55 border-gray-200 rounded-lg h-10 text-sm focus:border-[#C5A059]"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl p-2 bg-gray-50/50">
              {searchResults.length === 0 ? (
                <p className="text-xs text-gray-400 p-4 text-center">Type at least 2 characters to search students</p>
              ) : (
                searchResults.map(s => (
                  <div key={s.id} className="flex justify-between items-center py-2.5 px-2 hover:bg-white transition-colors rounded-lg">
                    <div>
                      <p className="text-sm font-bold text-[#0A1F30]">{s.users?.full_name}</p>
                      <p className="text-[10px] text-gray-450">{s.branches?.name || 'No Branch'} · {s.belt_levels?.name || 'White'} Belt</p>
                    </div>
                    <Button 
                      onClick={() => handleSpotRegister(s.id)}
                      size="xs"
                      className="bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-lg px-3 py-1 cursor-pointer border-none"
                    >
                      Add Athlete
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setOpenSpotReg(false)} className="rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Tournament Registration Modal for Student ── */}
      <Dialog open={openRegister} onOpenChange={setOpenRegister}>
        <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-md p-0 overflow-hidden shadow-xl text-[#0A1F30]">
          <DialogHeader className="p-6 border-b border-gray-100">
            <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">
              Register for {selectedT?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <div className="p-4 bg-gray-55 border border-gray-150 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Student Name:</span>
                <span className="font-semibold text-[#0A1F30]">{student?.users?.full_name}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Weight (kg) <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  step="0.1" 
                  required
                  value={regWeight}
                  onChange={e => setRegWeight(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 h-10 px-4 rounded-lg text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Height (cm) <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  step="0.1" 
                  required
                  value={regHeight}
                  onChange={e => setRegHeight(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 h-10 px-4 rounded-lg text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10"
                />
              </div>
            </div>

            {selectedT?.tournament_type === 'belt_wise' ? (
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Belt Category</label>
                <select 
                  value={regAgeCat} 
                  onChange={e => setRegAgeCat(e.target.value)}
                  className="w-full bg-gray-55 border border-gray-200 h-10 px-4 rounded-lg text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10 cursor-pointer"
                >
                  {belts.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Division (Age Category)</label>
                  <select 
                    value={regAgeCat} 
                    onChange={e => setRegAgeCat(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 h-10 px-4 rounded-lg text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10 cursor-pointer"
                  >
                    {Object.keys(AGE_CATS).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Classification (Weight Category)</label>
                  <select 
                    value={regWeightCat} 
                    onChange={e => setRegWeightCat(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 h-10 px-4 rounded-lg text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10 cursor-pointer"
                  >
                    {Object.keys(WEIGHT_CATS).map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setOpenRegister(false)} className="flex-1 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-55 cursor-pointer">
                Cancel
              </Button>
              <Button 
                onClick={handleRegisterConfirm}
                disabled={registering}
                className="flex-1 bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-lg h-10 font-semibold cursor-pointer border-none"
              >
                {registering ? <Loader2 className="size-4 animate-spin" /> : "Confirm & Register"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
