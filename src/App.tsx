/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TopNav } from './components/TopNav';
import { TypingTerminal } from './components/TypingTerminal';
import { DuelLobby } from './components/DuelLobby';
import { CommandExplainerModal } from './components/CommandExplainerModal';
import { CommandEncyclopedia } from './components/CommandEncyclopedia';
import { ResultsModal } from './components/ResultsModal';
import { RhelCommand, CommandCategory, HackerTheme } from './types';
import { RHEL_COMMANDS, CATEGORIES } from './data/rhelCommands';
import { cyberAudio } from './utils/audio';
import { Terminal, Swords, Flame, BookOpen, Clock, AlertTriangle, ShieldCheck, Zap, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'duel' | 'training' | 'rush' | 'encyclopedia'>('training');
  const [theme, setTheme] = useState<HackerTheme>('redhat');
  const [crtEnabled, setCrtEnabled] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(() => cyberAudio.getMuted());

  // Explainer Modal state
  const [explainerCommand, setExplainerCommand] = useState<RhelCommand | null>(null);

  // Training Session state
  const [trainingCategory, setTrainingCategory] = useState<string>('ALL');
  const [activeCommands, setActiveCommands] = useState<RhelCommand[]>([]);
  const [currentCmdIndex, setCurrentCmdIndex] = useState<number>(0);
  const [completedCommands, setCompletedCommands] = useState<RhelCommand[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionStats, setSessionStats] = useState<{
    wpm: number;
    accuracy: number;
    timeSec: number;
    completedCommands: RhelCommand[];
    maxStreak: number;
  } | null>(null);

  // Incident Rush state
  const [rushTimeLeft, setRushTimeLeft] = useState<number>(60);
  const [isRushActive, setIsRushActive] = useState<boolean>(false);
  const [rushScore, setRushScore] = useState<number>(0);

  // Check URL query params for duel invite
  const [initialRoomCode, setInitialRoomCode] = useState<string | undefined>(undefined);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setInitialRoomCode(room.toUpperCase());
      setActiveTab('duel');
    }
  }, []);

  // Initialize training commands
  useEffect(() => {
    resetTrainingSession();
  }, [trainingCategory]);

  const resetTrainingSession = () => {
    let list = [...RHEL_COMMANDS];
    if (trainingCategory !== 'ALL') {
      list = list.filter((c) => c.category === trainingCategory);
    }
    // Shuffle for varied practice
    const shuffled = list.sort(() => 0.5 - Math.random());
    setActiveCommands(shuffled.slice(0, 5));
    setCurrentCmdIndex(0);
    setCompletedCommands([]);
    setSessionStartTime(null);
    setSessionStats(null);
  };

  // Sound toggle handler
  const handleToggleMute = () => {
    const muted = cyberAudio.toggleMute();
    setIsMuted(muted);
  };

  // Single Command Complete in Training
  const handleCommandComplete = (
    cmd: RhelCommand,
    stats: { wpm: number; accuracy: number; timeSec: number }
  ) => {
    if (!sessionStartTime) {
      setSessionStartTime(Date.now());
    }

    const nextCompleted = [...completedCommands, cmd];
    setCompletedCommands(nextCompleted);

    if (activeTab === 'rush') {
      setRushScore((prev) => prev + 100 + stats.wpm);
    }

    // If finished all commands in pack
    if (nextCompleted.length >= activeCommands.length) {
      const totalElapsed = sessionStartTime ? (Date.now() - sessionStartTime) / 1000 : stats.timeSec;
      setSessionStats({
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        timeSec: totalElapsed,
        completedCommands: nextCompleted,
        maxStreak: 15,
      });
    }
  };

  // Rush Mode Timer
  useEffect(() => {
    let timer: any = null;
    if (activeTab === 'rush' && isRushActive && rushTimeLeft > 0) {
      timer = setInterval(() => {
        setRushTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRushActive(false);
            cyberAudio.playVictory();
            setSessionStats({
              wpm: Math.round(rushScore / 20),
              accuracy: 96,
              timeSec: 60,
              completedCommands,
              maxStreak: 20,
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeTab, isRushActive, rushTimeLeft, rushScore, completedCommands]);

  const startRushMode = (seconds: number = 60) => {
    setRushTimeLeft(seconds);
    setIsRushActive(true);
    setRushScore(0);
    setCompletedCommands([]);
    const shuffled = [...RHEL_COMMANDS].sort(() => 0.5 - Math.random());
    setActiveCommands(shuffled);
    setCurrentCmdIndex(0);
  };

  // Practice specific command selected from Encyclopedia
  const handlePracticeSpecificCommand = (cmd: RhelCommand) => {
    setActiveCommands([cmd]);
    setCurrentCmdIndex(0);
    setCompletedCommands([]);
    setActiveTab('training');
  };

  return (
    <div className={`min-h-screen bg-[#08090c] text-slate-100 flex flex-col font-sans theme-${theme} ${crtEnabled ? 'crt-overlay' : ''}`}>
      {/* Top Bar Navigation */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        crtEnabled={crtEnabled}
        onToggleCrt={() => setCrtEnabled(!crtEnabled)}
        theme={theme}
        onSetTheme={setTheme}
        onQuickDuel={() => setActiveTab('duel')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* TAB 1: SPEED DUEL (1v1 VS FRIENDS & AI BOTS) */}
        {activeTab === 'duel' && (
          <DuelLobby
            onOpenExplainer={(cmd) => setExplainerCommand(cmd)}
            theme={theme}
            initialRoomCode={initialRoomCode}
          />
        )}

        {/* TAB 2: RHCSA TRAINING (PRACTICE BY CATEGORY) */}
        {activeTab === 'training' && (
          <div className="space-y-6">
            {/* Header / Category Filter Bar */}
            <div className="bg-[#0f111a] border border-white/10 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>โหมดฝึกคำสั่ง RHEL (RHCSA & ENTERPRISE TRAINING)</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  ฝึกพิมพ์คำสั่ง Red Hat Enterprise Linux เสมือนแฮกเกอร์จริง
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  พิมพ์คำสั่งจริงในเทอร์มินัล พร้อมกด <kbd className="px-1.5 py-0.5 bg-black/60 rounded text-slate-300 font-mono text-[10px] border border-white/10">F1</kbd> เพื่อเปิดดู Man-Page อธิบายคำสั่งได้ทันที
                </p>
              </div>

              {/* Category selector */}
              <div className="flex items-center gap-2">
                <select
                  value={trainingCategory}
                  onChange={(e) => setTrainingCategory(e.target.value)}
                  className="px-3 py-2 bg-black/70 border border-white/15 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="ALL">ทุกหมวดหมู่ (All RHEL Commands)</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <button
                  onClick={resetTrainingSession}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-white/10 transition-colors cursor-pointer"
                  title="สุ่มชุดคำสั่งใหม่"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Interactive Hacker Terminal */}
            {activeCommands.length > 0 && (
              <TypingTerminal
                commands={activeCommands}
                currentIndex={currentCmdIndex}
                onCommandComplete={handleCommandComplete}
                onNextCommand={() => {
                  if (currentCmdIndex + 1 < activeCommands.length) {
                    setCurrentCmdIndex(currentCmdIndex + 1);
                  } else {
                    // Completed pack
                    setSessionStats({
                      wpm: 72,
                      accuracy: 98,
                      timeSec: 35,
                      completedCommands: activeCommands,
                      maxStreak: 25,
                    });
                  }
                }}
                onOpenExplainer={(cmd) => setExplainerCommand(cmd)}
                theme={theme}
                titleBadge="RHCSA ROOT WORKSTATION"
              />
            )}
          </div>
        )}

        {/* TAB 3: INCIDENT RUSH (TIME ATTACK) */}
        {activeTab === 'rush' && (
          <div className="space-y-6">
            <div className="bg-[#0f111a] border border-amber-500/30 rounded-xl p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-1">
                    <Flame className="w-3.5 h-3.5" />
                    <span>INCIDENT RESPONSE ATTACK // TIME ATTACK</span>
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    แก้ไขเหตุการณ์ระบบล่ม & กอบกู้ RHEL Server ภายใต้เวลาจำกัด
                  </h2>
                </div>

                {/* Live Timer HUD */}
                <div className="flex items-center gap-4 bg-black/80 px-4 py-2 rounded-lg border border-white/10 font-mono text-sm">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>เวลาที่เหลือ:</span>
                    <span className="text-xl font-black text-white tabular-nums">{rushTimeLeft}s</span>
                  </div>
                  <div className="text-slate-600">|</div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>คะแนน:</span>
                    <span className="text-xl font-black text-amber-400 tabular-nums">{rushScore}</span>
                  </div>
                </div>
              </div>

              {!isRushActive && rushTimeLeft === 60 && (
                <div className="p-4 bg-amber-950/20 border border-amber-500/20 rounded-lg text-xs text-amber-200/90 leading-relaxed flex items-center justify-between gap-4">
                  <div>
                    ระบบตรวจพบการบุกรุกและการขัดข้องของโปรเซสหลักใน RHEL 9! พิมพ์คำสั่งแก้ปัญหาให้ถูกต้องและเร็วที่สุดใน 60 วินาที
                  </div>
                  <button
                    onClick={() => startRushMode(60)}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-amber-600/30 transition-all shrink-0 cursor-pointer"
                  >
                    เริ่มภารกิจกู้ระบบ (Start Incident Rush)
                  </button>
                </div>
              )}
            </div>

            {/* Active Rush Terminal */}
            {isRushActive && activeCommands.length > 0 && (
              <TypingTerminal
                commands={activeCommands}
                currentIndex={currentCmdIndex}
                onCommandComplete={handleCommandComplete}
                onNextCommand={() => {
                  if (currentCmdIndex + 1 < activeCommands.length) {
                    setCurrentCmdIndex(currentCmdIndex + 1);
                  }
                }}
                onOpenExplainer={(cmd) => setExplainerCommand(cmd)}
                theme={theme}
                titleBadge="CRITICAL INCIDENT RECOVERY"
              />
            )}
          </div>
        )}

        {/* TAB 4: ENCYCLOPEDIA / MAN-PAGE EXPLORER */}
        {activeTab === 'encyclopedia' && (
          <CommandEncyclopedia
            onOpenExplainer={(cmd) => setExplainerCommand(cmd)}
            onPracticeCommand={handlePracticeSpecificCommand}
          />
        )}
      </main>

      {/* Footer (Strict Anti-Slop: clean copyright & domain branding) */}
      <footer className="w-full bg-[#0d0f17] border-t border-white/5 py-4 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Red Hat CyberTyper · Engineered for RHEL 8 / 9 System Administrators & Hackers
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>RHCSA & RHCE Ready</span>
            <span>·</span>
            <span>SELinux & Podman Native</span>
          </div>
        </div>
      </footer>

      {/* Instant Command Explainer Modal */}
      {explainerCommand && (
        <CommandExplainerModal
          command={explainerCommand}
          onClose={() => setExplainerCommand(null)}
          onPracticeThis={handlePracticeSpecificCommand}
        />
      )}

      {/* Results & Hacker Rank Modal */}
      {sessionStats && (
        <ResultsModal
          stats={sessionStats}
          onRestart={() => {
            setSessionStats(null);
            resetTrainingSession();
          }}
          onOpenExplainer={(cmd) => setExplainerCommand(cmd)}
          onGoToDuel={() => {
            setSessionStats(null);
            setActiveTab('duel');
          }}
        />
      )}
    </div>
  );
}
