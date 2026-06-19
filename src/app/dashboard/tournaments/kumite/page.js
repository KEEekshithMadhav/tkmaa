"use client"
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, ChevronUp, ChevronDown, RotateCcw, Loader2, Save, ChevronLeft, Maximize2, Minimize2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

function KumiteScoringContent() {
  const searchParams = useSearchParams()
  const matchId = searchParams.get('matchId')
  const aoParam = searchParams.get('ao') || 'AO'
  const akaParam = searchParams.get('aka') || 'AKA'

  const [matchData, setMatchData] = useState(null)
  const [aoName, setAoName] = useState(aoParam)
  const [akaName, setAkaName] = useState(akaParam)
  const [aoDojo, setAoDojo] = useState('')
  const [akaDojo, setAkaDojo] = useState('')

  // Scores per technique
  const [aoYuko, setAoYuko] = useState(0)
  const [aoWazaAri, setAoWazaAri] = useState(0)
  const [aoIppon, setAoIppon] = useState(0)
  const [aoBonus, setAoBonus] = useState(0)
  const [akaYuko, setAkaYuko] = useState(0)
  const [akaWazaAri, setAkaWazaAri] = useState(0)
  const [akaIppon, setAkaIppon] = useState(0)
  const [akaBonus, setAkaBonus] = useState(0)

  const aoScore = aoYuko + aoWazaAri * 2 + aoIppon * 3 + aoBonus
  const akaScore = akaYuko + akaWazaAri * 2 + akaIppon * 3 + akaBonus

  // Senshu
  const [senshu, setSenshu] = useState(null) // 'ao' | 'aka' | null

  // Penalties — cumulative arrays
  const [aoC1, setAoC1] = useState([])
  const [aoC2, setAoC2] = useState([])
  const [akaC1, setAkaC1] = useState([])
  const [akaC2, setAkaC2] = useState([])

  // Timer
  const [duration, setDuration] = useState(90)
  const [timeLeft, setTimeLeft] = useState(90)
  const [isRunning, setIsRunning] = useState(false)
  const [kdMode, setKdMode] = useState(false)
  const timerRef = useRef(null)

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Winner overlay
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false)
  const [hanteiWinner, setHanteiWinner] = useState(null)

  const isAoDisqualified = aoC1.includes('H') || aoC2.includes('H')
  const isAkaDisqualified = akaC1.includes('H') || akaC2.includes('H')

  // Load match
  useEffect(() => {
    async function loadMatch() {
      if (!matchId) return
      const { data } = await supabase
        .from('tournament_matches')
        .select(`*, ao:ao_id(id, users(full_name), branches(name)), aka:aka_id(id, users(full_name), branches(name))`)
        .eq('id', matchId)
        .maybeSingle()
      if (data) {
        setMatchData(data)
        if (data.ao?.users?.full_name) setAoName(data.ao.users.full_name)
        if (data.aka?.users?.full_name) setAkaName(data.aka.users.full_name)
        setAoDojo(data.ao?.branches?.name || '')
        setAkaDojo(data.aka?.branches?.name || '')
        setAoYuko(data.ao_yuko_count || 0)
        setAoWazaAri(data.ao_waza_ari_count || 0)
        setAoIppon(data.ao_ippon_count || 0)
        setAoBonus(data.ao_bonus_points || 0)
        setAkaYuko(data.aka_yuko_count || 0)
        setAkaWazaAri(data.aka_waza_ari_count || 0)
        setAkaIppon(data.aka_ippon_count || 0)
        setAkaBonus(data.aka_bonus_points || 0)
        setAoC1(data.ao_c1_penalties || [])
        setAoC2(data.ao_c2_penalties || [])
        setAkaC1(data.aka_c1_penalties || [])
        setAkaC2(data.aka_c2_penalties || [])
        setSenshu(data.senshu)
        if (data.match_duration) { setDuration(data.match_duration); setTimeLeft(data.match_duration) }
      }
    }
    loadMatch()
  }, [matchId])

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false)
            playBuzzer()
            setShowWinnerOverlay(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isRunning])

  // Auto DQ
  useEffect(() => {
    if (isAoDisqualified || isAkaDisqualified) {
      setIsRunning(false)
      setShowWinnerOverlay(true)
    }
  }, [isAoDisqualified, isAkaDisqualified])

  // Auto senshu
  useEffect(() => {
    if (senshu === null) {
      if (aoScore > 0 && akaScore === 0) setSenshu('ao')
      else if (akaScore > 0 && aoScore === 0) setSenshu('aka')
    }
  }, [aoScore, akaScore, senshu])

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === 'INPUT') return
      switch (e.key) {
        case ' ': e.preventDefault(); setIsRunning(r => !r); break
        case 'q': setAoYuko(y => y + 1); break
        case 'w': setAoWazaAri(w => w + 1); break
        case 'e': setAoIppon(i => i + 1); break
        case 'a': setAoYuko(y => Math.max(0, y - 1)); break
        case 's': setAoWazaAri(w => Math.max(0, w - 1)); break
        case 'd': setAoIppon(i => Math.max(0, i - 1)); break
        case 'p': setAkaYuko(y => y + 1); break
        case 'o': setAkaWazaAri(w => w + 1); break
        case 'i': setAkaIppon(i => i + 1); break
        case 'l': setAkaYuko(y => Math.max(0, y - 1)); break
        case 'k': setAkaWazaAri(w => Math.max(0, w - 1)); break
        case 'j': setAkaIppon(i => Math.max(0, i - 1)); break
        case 'b': playBuzzer(); break
        default: break
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const playBuzzer = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.connect(g); g.connect(ctx.destination)
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(110, ctx.currentTime)
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleReset = () => {
    if (!confirm('Reset all scores, penalties, and timer?')) return
    setIsRunning(false); setTimeLeft(duration)
    setAoYuko(0); setAoWazaAri(0); setAoIppon(0); setAoBonus(0)
    setAkaYuko(0); setAkaWazaAri(0); setAkaIppon(0); setAkaBonus(0)
    setSenshu(null); setAoC1([]); setAoC2([]); setAkaC1([]); setAkaC2([])
    setHanteiWinner(null); setShowWinnerOverlay(false)
  }

  const PENALTY_LABELS = ['1C', '2C', '3C', 'HC', 'H']

  const togglePenalty = (side, penalty) => {
    const idx = PENALTY_LABELS.indexOf(penalty)
    const setter = side === 'ao' ? setAoC1 : setAkaC1
    const current = side === 'ao' ? aoC1 : akaC1
    const isActive = current.includes(penalty)
    setter(isActive ? PENALTY_LABELS.slice(0, idx) : PENALTY_LABELS.slice(0, idx + 1))
  }

  const getPenaltyCount = (list) => list.length

  const getWinner = () => {
    if (isAoDisqualified && !isAkaDisqualified) return 'aka'
    if (isAkaDisqualified && !isAoDisqualified) return 'ao'
    if (aoScore > akaScore) return 'ao'
    if (akaScore > aoScore) return 'aka'
    if (senshu === 'ao') return 'ao'
    if (senshu === 'aka') return 'aka'
    return null
  }

  const finalWinner = getWinner() || hanteiWinner

  const advanceWinner = async (match, winnerId) => {
    const nextRound = match.round + 1
    const nextMatchNum = Math.floor(match.match_number / 2)
    const slot = match.match_number % 2 === 0 ? 'ao_id' : 'aka_id'
    const { data: nextMatch } = await supabase.from('tournament_matches').select('*')
      .eq('tournament_id', match.tournament_id).eq('category', match.category)
      .eq('round', nextRound).eq('match_number', nextMatchNum).maybeSingle()
    if (!nextMatch) return
    const updateData = { [slot]: winnerId }
    const otherSlot = slot === 'ao_id' ? 'aka' : 'ao'
    if (nextMatch[`${otherSlot}_penalties`]?.is_bye) {
      updateData.winner_id = winnerId; updateData.status = 'completed'
    }
    await supabase.from('tournament_matches').update(updateData).eq('id', nextMatch.id)
    if (updateData.winner_id) { nextMatch[slot] = winnerId; await advanceWinner(nextMatch, winnerId) }
  }

  const handleSaveAndSync = async () => {
    const toastId = toast.loading('Syncing match to registry...')
    try {
      if (!matchData) { toast.error('No match loaded.', { id: toastId }); return }
      const winnerSide = finalWinner
      if (!winnerSide) { toast.error('No winner determined. Use Hantei.', { id: toastId }); return }
      const winnerId = winnerSide === 'ao' ? matchData.ao_id : matchData.aka_id

      const isAoDq = aoC1.includes('H')
      const isAkaDq = akaC1.includes('H')
      const winMethod = (isAoDq || isAkaDq) 
        ? 'disqualification'
        : hanteiWinner 
          ? 'referee_decision' 
          : (aoScore === akaScore && senshu ? 'senshu' : 'score')

      const { error } = await supabase.from('tournament_matches').update({
        ao_score: aoScore,
        aka_score: akaScore,
        winner_id: winnerId,
        status: 'completed',

        // Detailed technique counts
        ao_yuko_count: aoYuko,
        ao_waza_ari_count: aoWazaAri,
        ao_ippon_count: aoIppon,
        ao_bonus_points: aoBonus,

        aka_yuko_count: akaYuko,
        aka_waza_ari_count: akaWazaAri,
        aka_ippon_count: akaIppon,
        aka_bonus_points: akaBonus,

        // Senshu
        senshu,
        ao_senshu: senshu === 'ao',
        aka_senshu: senshu === 'aka',

        // Penalties
        ao_penalty_c1: aoC1.includes('1C'),
        ao_penalty_c2: aoC1.includes('2C'),
        ao_penalty_c3: aoC1.includes('3C'),
        ao_penalty_hc: aoC1.includes('HC'),
        ao_penalty_h: aoC1.includes('H'),

        aka_penalty_c1: akaC1.includes('1C'),
        aka_penalty_c2: akaC1.includes('2C'),
        aka_penalty_c3: akaC1.includes('3C'),
        aka_penalty_hc: akaC1.includes('HC'),
        aka_penalty_h: akaC1.includes('H'),

        ao_c1_penalties: aoC1,
        aka_c1_penalties: akaC1,

        // Match statistics
        match_duration: duration - timeLeft,
        winner_corner: winnerSide,
        win_method: winMethod,
        result_timestamp: new Date().toISOString()
      }).eq('id', matchId)

      if (error) throw error
      if (winnerId) await advanceWinner(matchData, winnerId)
      toast.success('Match synced!', { id: toastId })
      setTimeout(() => window.close(), 1000)
    } catch (err) {
      toast.error('Sync failed: ' + err.message, { id: toastId })
    }
  }

  // Penalty button row
  const PenaltyRow = ({ side, list }) => (
    <div className="flex items-center gap-1">
      {PENALTY_LABELS.map((lbl, i) => {
        const active = list.includes(lbl)
        return (
          <button
            key={lbl}
            onClick={() => togglePenalty(side, lbl)}
            className="flex flex-col items-center gap-0.5 cursor-pointer group"
          >
            <span className={`text-[9px] font-black font-mono ${active ? 'text-white' : 'text-white/50'}`}>{lbl}</span>
            <span className={`w-4 h-3 border border-white/30 rounded-sm transition-colors ${
              active ? (lbl === 'H' ? 'bg-orange-400' : 'bg-yellow-300') : 'bg-white/10 group-hover:bg-white/20'
            }`} />
          </button>
        )
      })}
    </div>
  )

  // Score button
  const ScoreBtn = ({ label, onClick, color }) => (
    <button
      onClick={onClick}
      className={`
        w-full py-2 px-3 rounded border font-bold text-sm tracking-wide cursor-pointer
        transition-all active:scale-95 select-none
        ${color === 'blue'
          ? 'bg-blue-100/20 hover:bg-blue-100/40 border-blue-200/40 text-white'
          : 'bg-red-100/20 hover:bg-red-100/40 border-red-200/40 text-white'
        }
      `}
    >
      {label}
    </button>
  )

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden select-none font-sans bg-gray-900">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-white/10 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { if (confirm('Leave scoreboard?')) window.close() }}
            className="flex items-center gap-1 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <span className="text-[#C5A059] font-black text-xs uppercase tracking-widest font-mono">
            Kumite WKF · Electronic Scoreboard
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-bold uppercase tracking-wider cursor-pointer transition-all border border-white/10"
          >
            <RotateCcw size={12} /> Reset
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded cursor-pointer border border-white/10 transition-all"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={() => setShowWinnerOverlay(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
          >
            <Save size={12} /> Finish Match
          </button>
        </div>
      </div>

      {/* Main scoreboard — exactly like WKF hardware board */}
      <div className="flex-1 grid grid-cols-[1fr_280px_1fr] overflow-hidden">

        {/* ── AO (BLUE) LEFT PANEL ── */}
        <div className="bg-blue-600 flex flex-col relative overflow-hidden">
          {/* Subtle pattern */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }}
          />

          <div className="relative flex flex-col h-full p-4 gap-3">
            {/* Name */}
            <div className="text-center">
              <div className="text-blue-200 text-[10px] font-black uppercase tracking-[0.3em] mb-0.5">Ao (青)</div>
              <h2 className="text-white text-2xl font-black uppercase tracking-wider truncate leading-tight">{aoName}</h2>
              {aoDojo && <div className="text-blue-200/70 text-[10px] font-semibold mt-0.5 truncate">{aoDojo}</div>}
            </div>

            {/* Score technique buttons */}
            <div className="flex flex-col gap-2">
              <ScoreBtn label="Ippon" onClick={() => { setAoIppon(i => i + 1) }} color="blue" />
              <ScoreBtn label="Waza-ari" onClick={() => { setAoWazaAri(w => w + 1) }} color="blue" />
              <ScoreBtn label="Yuko" onClick={() => { setAoYuko(y => y + 1) }} color="blue" />
            </div>

            {/* Technique counters */}
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {[
                { label: 'Ippon', val: aoIppon, dec: () => setAoIppon(v => Math.max(0, v - 1)) },
                { label: 'Waza', val: aoWazaAri, dec: () => setAoWazaAri(v => Math.max(0, v - 1)) },
                { label: 'Yuko', val: aoYuko, dec: () => setAoYuko(v => Math.max(0, v - 1)) },
              ].map(({ label, val, dec }) => (
                <div key={label} className="bg-blue-800/50 rounded-lg p-1.5 border border-blue-400/20">
                  <div className="text-[9px] text-blue-200 font-bold uppercase mb-0.5">{label}</div>
                  <div className="text-white font-black text-lg font-mono leading-none">{val}</div>
                  <button onClick={dec} className="text-blue-300 hover:text-white text-[9px] font-bold cursor-pointer transition-colors">-1</button>
                </div>
              ))}
            </div>

            {/* Senshu */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSenshu(s => s === 'ao' ? null : 'ao')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded border font-bold text-xs uppercase tracking-wider cursor-pointer transition-all ${
                  senshu === 'ao'
                    ? 'bg-yellow-400 text-blue-900 border-yellow-300 shadow-lg'
                    : 'bg-blue-800/40 text-blue-200 border-blue-400/20 hover:bg-blue-700/50'
                }`}
              >
                <span className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center ${senshu === 'ao' ? 'border-blue-900 bg-blue-900' : 'border-blue-300'}`}>
                  {senshu === 'ao' && <span className="w-1.5 h-1.5 bg-yellow-400 rounded-sm" />}
                </span>
                Senshu
              </button>
              {isAoDisqualified && (
                <span className="px-2 py-1 bg-orange-500 text-white rounded text-[9px] font-black uppercase tracking-widest">HANSOKU</span>
              )}
            </div>

            {/* -1 penalty button */}
            <button
              onClick={() => togglePenalty('ao', aoC1.length < PENALTY_LABELS.length ? PENALTY_LABELS[aoC1.length] : 'H')}
              className="w-20 py-1.5 bg-blue-800/60 hover:bg-blue-700/60 border border-blue-400/30 text-white font-black text-sm rounded cursor-pointer transition-all"
            >
              -1
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Penalty row */}
            <div className="bg-blue-900/60 rounded-lg p-2 border border-blue-400/20">
              <div className="text-[9px] text-blue-300 font-black uppercase tracking-widest mb-1.5 text-center">Penalty</div>
              <div className="flex justify-center">
                <PenaltyRow side="ao" list={aoC1} />
              </div>
            </div>
          </div>
        </div>

        {/* ── CENTER TIMER PANEL ── */}
        <div className="bg-gray-100 flex flex-col items-center justify-between py-4 px-3 border-x-2 border-gray-300 shadow-2xl z-10">
          {/* Header label */}
          <div className="text-center w-full">
            <div className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Kumite WKF</div>
          </div>

          {/* Start / KD Timer buttons */}
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={() => setIsRunning(r => !r)}
              className={`w-full py-2.5 rounded-lg font-black text-sm uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isRunning ? 'Pause' : 'Start'}
            </button>

            <button
              onClick={() => { setKdMode(k => !k); setIsRunning(false); setTimeLeft(kdMode ? duration : 30) }}
              className={`w-full py-2 rounded-lg font-black text-[11px] uppercase tracking-wider cursor-pointer transition-all border-2 ${
                kdMode
                  ? 'bg-orange-500 text-white border-orange-400'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              KD Timer
            </button>
          </div>

          {/* Timer display with up/down arrows */}
          <div className="flex items-center gap-1">
            <div
              className={`text-6xl font-black font-mono tracking-wider leading-none transition-all ${
                isRunning ? 'text-gray-800' : (timeLeft <= 30 ? 'text-red-600 animate-pulse' : 'text-gray-600')
              }`}
            >
              {formatTime(timeLeft)}
            </div>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => { setIsRunning(false); setTimeLeft(t => Math.min(t + 10, 999)) }}
                className="p-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 cursor-pointer transition-colors"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={() => { setIsRunning(false); setTimeLeft(t => Math.max(0, t - 10)) }}
                className="p-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 cursor-pointer transition-colors"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Duration presets */}
          <div className="flex gap-1 w-full">
            {[60, 90, 120, 180].map(s => (
              <button
                key={s}
                onClick={() => { setIsRunning(false); setDuration(s); setTimeLeft(s) }}
                className={`flex-1 py-1.5 rounded text-[10px] font-black cursor-pointer transition-all border ${
                  duration === s
                    ? 'bg-gray-700 text-white border-gray-700'
                    : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                }`}
              >
                {s < 60 ? `${s}s` : `${s/60}m`}
              </button>
            ))}
          </div>

          {/* BIG SCORES */}
          <div className="flex items-center justify-center gap-6">
            <motion.div
              key={aoScore}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-[90px] font-black font-mono leading-none text-blue-600"
            >
              {aoScore}
            </motion.div>
            <div className="text-gray-300 text-3xl font-black">·</div>
            <motion.div
              key={akaScore + 1000}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-[90px] font-black font-mono leading-none text-red-600"
            >
              {akaScore}
            </motion.div>
          </div>

          {/* Penalty label */}
          <div className="text-center">
            <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Penalty</span>
          </div>

          {/* Buzzer button */}
          <button
            onClick={playBuzzer}
            className="w-full py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors border border-gray-600"
          >
            🔔 Buzzer (B)
          </button>
        </div>

        {/* ── AKA (RED) RIGHT PANEL ── */}
        <div className="bg-red-700 flex flex-col relative overflow-hidden">
          {/* Subtle pattern */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }}
          />

          <div className="relative flex flex-col h-full p-4 gap-3">
            {/* Name */}
            <div className="text-center">
              <div className="text-red-200 text-[10px] font-black uppercase tracking-[0.3em] mb-0.5">Aka (赤)</div>
              <h2 className="text-white text-2xl font-black uppercase tracking-wider truncate leading-tight">{akaName}</h2>
              {akaDojo && <div className="text-red-200/70 text-[10px] font-semibold mt-0.5 truncate">{akaDojo}</div>}
            </div>

            {/* Score technique buttons */}
            <div className="flex flex-col gap-2">
              <ScoreBtn label="Ippon" onClick={() => { setAkaIppon(i => i + 1) }} color="red" />
              <ScoreBtn label="Waza-ari" onClick={() => { setAkaWazaAri(w => w + 1) }} color="red" />
              <ScoreBtn label="Yuko" onClick={() => { setAkaYuko(y => y + 1) }} color="red" />
            </div>

            {/* Technique counters */}
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {[
                { label: 'Ippon', val: akaIppon, dec: () => setAkaIppon(v => Math.max(0, v - 1)) },
                { label: 'Waza', val: akaWazaAri, dec: () => setAkaWazaAri(v => Math.max(0, v - 1)) },
                { label: 'Yuko', val: akaYuko, dec: () => setAkaYuko(v => Math.max(0, v - 1)) },
              ].map(({ label, val, dec }) => (
                <div key={label} className="bg-red-900/50 rounded-lg p-1.5 border border-red-400/20">
                  <div className="text-[9px] text-red-200 font-bold uppercase mb-0.5">{label}</div>
                  <div className="text-white font-black text-lg font-mono leading-none">{val}</div>
                  <button onClick={dec} className="text-red-300 hover:text-white text-[9px] font-bold cursor-pointer transition-colors">-1</button>
                </div>
              ))}
            </div>

            {/* Senshu */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSenshu(s => s === 'aka' ? null : 'aka')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded border font-bold text-xs uppercase tracking-wider cursor-pointer transition-all ${
                  senshu === 'aka'
                    ? 'bg-yellow-400 text-red-900 border-yellow-300 shadow-lg'
                    : 'bg-red-900/40 text-red-200 border-red-400/20 hover:bg-red-800/50'
                }`}
              >
                <span className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center ${senshu === 'aka' ? 'border-red-900 bg-red-900' : 'border-red-300'}`}>
                  {senshu === 'aka' && <span className="w-1.5 h-1.5 bg-yellow-400 rounded-sm" />}
                </span>
                Senshu
              </button>
              {isAkaDisqualified && (
                <span className="px-2 py-1 bg-orange-500 text-white rounded text-[9px] font-black uppercase tracking-widest">HANSOKU</span>
              )}
            </div>

            {/* -1 penalty button */}
            <button
              onClick={() => togglePenalty('aka', akaC1.length < PENALTY_LABELS.length ? PENALTY_LABELS[akaC1.length] : 'H')}
              className="w-20 py-1.5 bg-red-900/60 hover:bg-red-800/60 border border-red-400/30 text-white font-black text-sm rounded cursor-pointer transition-all"
            >
              -1
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Penalty row */}
            <div className="bg-red-900/60 rounded-lg p-2 border border-red-400/20">
              <div className="text-[9px] text-red-300 font-black uppercase tracking-widest mb-1.5 text-center">Penalty</div>
              <div className="flex justify-center">
                <PenaltyRow side="aka" list={akaC1} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Winner overlay ── */}
      <AnimatePresence>
        {showWinnerOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <div className="bg-gradient-to-b from-gray-900 to-black border border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl">
              <div className="text-center mb-6 space-y-1">
                <Trophy size={48} className="mx-auto text-amber-400 animate-bounce" />
                <h2 className="text-amber-400 text-[10px] font-black uppercase tracking-[0.4em]">Match Concluded</h2>
                <h1 className="text-3xl font-black text-white uppercase tracking-wider">Winner</h1>
              </div>

              {!finalWinner ? (
                <div className="text-center space-y-4 mb-6">
                  <p className="text-amber-400 font-bold">DRAW — Select winner via Hantei</p>
                  <div className="flex gap-4 justify-center">
                    <button onClick={() => setHanteiWinner('ao')} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl cursor-pointer transition-all">
                      AO Winner
                    </button>
                    <button onClick={() => setHanteiWinner('aka')} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl cursor-pointer transition-all">
                      AKA Winner
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`rounded-2xl p-6 text-center mb-6 border ${finalWinner === 'ao' ? 'bg-blue-600/20 border-blue-500/40' : 'bg-red-600/20 border-red-500/40'}`}>
                  <span className={`text-xs font-black uppercase tracking-widest ${finalWinner === 'ao' ? 'text-blue-400' : 'text-red-400'}`}>
                    {finalWinner === 'ao' ? 'AO (青) Winner' : 'AKA (赤) Winner'}
                  </span>
                  <h2 className="text-4xl font-black text-white uppercase mt-2">{finalWinner === 'ao' ? aoName : akaName}</h2>
                  <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-blue-400 font-bold block">AO Score</span>
                      <span className="text-white text-2xl font-black">{aoScore}</span>
                      <div className="text-gray-400 text-[10px]">{aoYuko}Y · {aoWazaAri}W · {aoIppon}I</div>
                    </div>
                    <div>
                      <span className="text-red-400 font-bold block">AKA Score</span>
                      <span className="text-white text-2xl font-black">{akaScore}</span>
                      <div className="text-gray-400 text-[10px]">{akaYuko}Y · {akaWazaAri}W · {akaIppon}I</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowWinnerOverlay(false)}
                  className="flex-1 py-3 border border-white/15 text-gray-300 hover:bg-white/5 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer transition-all"
                >
                  Back to Scoring
                </button>
                <button
                  onClick={handleSaveAndSync}
                  disabled={!finalWinner}
                  className="flex-1 py-3 bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirm & Sync Registry
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function KumiteScoringPage() {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen bg-gray-900 flex flex-col items-center justify-center gap-4 text-white">
        <Loader2 className="animate-spin text-[#C5A059]" size={36} />
        <span className="text-xs uppercase font-mono tracking-widest text-gray-500">Loading scoring module...</span>
      </div>
    }>
      <KumiteScoringContent />
    </Suspense>
  )
}
