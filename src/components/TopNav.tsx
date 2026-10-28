import React from 'react';
import { Terminal, Volume2, VolumeX, Sparkles, MonitorCheck, Swords, BookOpen, Flame } from 'lucide-react';
import { HackerTheme } from '../types';

interface TopNavProps {
  activeTab: 'duel' | 'training' | 'rush' | 'encyclopedia';
  setActiveTab: (tab: 'duel' | 'training' | 'rush' | 'encyclopedia') => void;
  isMuted: boolean;
  onToggleMute: () => void;
  crtEnabled: boolean;
  onToggleCrt: () => void;
  theme: HackerTheme;
  onSetTheme: (theme: HackerTheme) => void;
  onQuickDuel: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  isMuted,
  onToggleMute,
  crtEnabled,
  onToggleCrt,
  theme,
  onSetTheme,
  onQuickDuel,
}) => {
  return (
    <header className="w-full bg-[#0d0f17]/95 backdrop-blur-md border-b border-white/10 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (1 line, single element) */}
        <div 
          onClick={() => setActiveTab('duel')} 
          className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0 group select-none"
        >
          <div className="w-8 h-8 rounded-md bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 group-hover:scale-105 transition-transform">
            <Terminal className="w-4 h-4" />
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-red-400 transition-colors">
            Red Hat <span className="text-red-500 font-mono">CyberTyper</span>
          </span>
        </div>

        {/* Zone 2: Navigation Links (4-5 single-line clean items) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('duel')}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
              activeTab === 'duel'
                ? 'text-white border-b-2 border-red-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            <Swords className="w-4 h-4 text-red-500" />
            <span>Speed Duel (1v1)</span>
          </button>

          <button
            onClick={() => setActiveTab('training')}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
              activeTab === 'training'
                ? 'text-white border-b-2 border-red-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>RHCSA Training</span>
          </button>

          <button
            onClick={() => setActiveTab('rush')}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
              activeTab === 'rush'
                ? 'text-white border-b-2 border-red-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Incident Rush</span>
          </button>

          <button
            onClick={() => setActiveTab('encyclopedia')}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
              activeTab === 'encyclopedia'
                ? 'text-white border-b-2 border-red-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>RHEL Man-Pages</span>
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action + Quick Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* CRT Scanline Toggle */}
          <button
            onClick={onToggleCrt}
            title={crtEnabled ? 'Disable CRT Scanlines' : 'Enable CRT Scanlines'}
            className={`p-2 rounded-md border text-xs transition-colors cursor-pointer ${
              crtEnabled
                ? 'bg-red-500/10 border-red-500/50 text-red-400'
                : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <MonitorCheck className="w-4 h-4" />
          </button>

          {/* Audio Synthesizer Toggle */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Mechanical Sound' : 'Mute Mechanical Sound'}
            className={`p-2 rounded-md border text-xs transition-colors cursor-pointer ${
              !isMuted
                ? 'bg-slate-800 border-white/20 text-emerald-400'
                : 'bg-slate-900 border-white/10 text-slate-500 hover:text-slate-400'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Theme Switcher */}
          <div className="hidden lg:flex items-center bg-slate-900/80 border border-white/10 rounded-md p-0.5">
            <button
              onClick={() => onSetTheme('redhat')}
              title="Red Hat Theme"
              className={`px-2 py-1 text-xs rounded transition-colors ${
                theme === 'redhat' ? 'bg-red-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              RHEL
            </button>
            <button
              onClick={() => onSetTheme('matrix')}
              title="Matrix Theme"
              className={`px-2 py-1 text-xs rounded transition-colors ${
                theme === 'matrix' ? 'bg-emerald-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Matrix
            </button>
            <button
              onClick={() => onSetTheme('amber')}
              title="Amber CRT Theme"
              className={`px-2 py-1 text-xs rounded transition-colors ${
                theme === 'amber' ? 'bg-amber-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Amber
            </button>
          </div>

          {/* Primary CTA Button */}
          <button
            onClick={onQuickDuel}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-md shadow-lg shadow-red-600/30 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>เริ่มประลอง 1v1</span>
          </button>
        </div>
      </div>
    </header>
  );
};
