import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, HelpCircle, RotateCcw, FastForward, Zap, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import { RhelCommand, HackerTheme } from '../types';
import { cyberAudio } from '../utils/audio';

interface TypingTerminalProps {
  commands: RhelCommand[];
  currentIndex: number;
  onCommandComplete: (command: RhelCommand, stats: { wpm: number; accuracy: number; timeSec: number }) => void;
  onNextCommand: () => void;
  onOpenExplainer: (command: RhelCommand) => void;
  theme: HackerTheme;
  titleBadge?: string;
  isDuelMode?: boolean;
  onKeystrokeProgress?: (currentCmdIdx: number, charIdx: number, wpm: number, accuracy: number, streak: number) => void;
  activeSabotage?: string | null;
}

export const TypingTerminal: React.FC<TypingTerminalProps> = ({
  commands,
  currentIndex,
  onCommandComplete,
  onNextCommand,
  onOpenExplainer,
  theme,
  titleBadge = 'RHCSA WORKSTATION',
  isDuelMode = false,
  onKeystrokeProgress,
  activeSabotage,
}) => {
  const currentCommand = commands[currentIndex] || commands[0];
  const targetText = currentCommand?.command || '';

  const [input, setInput] = useState<string>('');
  const [errorIndex, setErrorIndex] = useState<number | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [totalErrors, setTotalErrors] = useState<number>(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showOutputLog, setShowOutputLog] = useState<boolean>(false);
  const [isCompletedCurrent, setIsCompletedCurrent] = useState<boolean>(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Reset state when command changes
  useEffect(() => {
    setInput('');
    setErrorIndex(null);
    setShowOutputLog(false);
    setIsCompletedCurrent(false);
    setStartTime(null);
    setElapsedSeconds(0);
    if (hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  }, [currentIndex, currentCommand?.id]);

  // Timer loop for active command
  useEffect(() => {
    let interval: any = null;
    if (startTime && !isCompletedCurrent) {
      interval = setInterval(() => {
        setElapsedSeconds((Date.now() - startTime) / 1000);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [startTime, isCompletedCurrent]);

  // Calculate live stats
  const correctCount = input.length;
  const timeMinutes = Math.max(elapsedSeconds / 60, 0.01);
  const liveWpm = startTime ? Math.round((correctCount / 5) / timeMinutes) : 0;
  const liveAccuracy = totalKeystrokes > 0 ? Math.round(((totalKeystrokes - totalErrors) / totalKeystrokes) * 100) : 100;

  // Notify parent of progress (for duels)
  useEffect(() => {
    if (onKeystrokeProgress) {
      onKeystrokeProgress(currentIndex, input.length, liveWpm, liveAccuracy, streak);
    }
  }, [currentIndex, input.length, liveWpm, liveAccuracy, streak, onKeystrokeProgress]);

  // Handle Keystrokes
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Hotkey: F1 opens explainer
    if (e.key === 'F1') {
      e.preventDefault();
      onOpenExplainer(currentCommand);
      return;
    }

    // Hotkey: Tab skips command
    if (e.key === 'Tab') {
      e.preventDefault();
      onNextCommand();
      return;
    }

    // Hotkey: Escape resets current line
    if (e.key === 'Escape') {
      e.preventDefault();
      setInput('');
      setErrorIndex(null);
      setStreak(0);
      return;
    }

    // If currently showing completed output and user presses Enter or Space, proceed
    if (isCompletedCurrent) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNextCommand();
      }
      return;
    }

    // Ignore navigation / modifier keys
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.key === 'CapsLock') {
      return;
    }

    // Handle Backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (input.length > 0) {
        setInput((prev) => prev.slice(0, -1));
        setErrorIndex(null);
      }
      return;
    }

    // Only process single printable characters
    if (e.key.length !== 1) {
      return;
    }

    const typedChar = e.key;
    const expectedChar = targetText[input.length];

    if (!startTime) {
      setStartTime(Date.now());
    }

    setTotalKeystrokes((prev) => prev + 1);

    if (typedChar === expectedChar) {
      // Correct keystroke
      const newInput = input + typedChar;
      setInput(newInput);
      setErrorIndex(null);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);

      // Play audio feedback
      if (newStreak % 10 === 0) {
        cyberAudio.playComboStreak(newStreak);
      } else {
        cyberAudio.playKeyClick();
      }

      // Check if command is fully completed
      if (newInput === targetText) {
        setIsCompletedCurrent(true);
        cyberAudio.playCommandSuccess();
        setShowOutputLog(true);

        const finalStats = {
          wpm: liveWpm || 60,
          accuracy: liveAccuracy,
          timeSec: Math.max(elapsedSeconds, 1),
        };

        onCommandComplete(currentCommand, finalStats);

        // Auto advance after 1.4s delay so user can enjoy simulated output
        setTimeout(() => {
          onNextCommand();
        }, 1400);
      }
    } else {
      // Incorrect keystroke (Typo)
      setErrorIndex(input.length);
      setTotalErrors((prev) => prev + 1);
      setStreak(0);
      cyberAudio.playError();
    }
  }, [input, targetText, isCompletedCurrent, startTime, streak, maxStreak, liveWpm, liveAccuracy, elapsedSeconds, currentCommand, onCommandComplete, onNextCommand, onOpenExplainer]);

  // Keep terminal focused
  const focusTerminal = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  };

  const themeClasses = {
    redhat: {
      accentText: 'text-red-400',
      accentBg: 'bg-red-600',
      borderGlow: 'border-red-500/40 shadow-red-500/10',
      cursorBg: 'bg-red-500',
      typedText: 'text-emerald-400',
    },
    matrix: {
      accentText: 'text-emerald-400',
      accentBg: 'bg-emerald-600',
      borderGlow: 'border-emerald-500/40 shadow-emerald-500/10',
      cursorBg: 'bg-emerald-400',
      typedText: 'text-emerald-400',
    },
    amber: {
      accentText: 'text-amber-400',
      accentBg: 'bg-amber-600',
      borderGlow: 'border-amber-500/40 shadow-amber-500/10',
      cursorBg: 'bg-amber-400',
      typedText: 'text-amber-300',
    },
    cyberpunk: {
      accentText: 'text-cyan-400',
      accentBg: 'bg-cyan-600',
      borderGlow: 'border-cyan-500/40 shadow-cyan-500/10',
      cursorBg: 'bg-cyan-400',
      typedText: 'text-cyan-300',
    },
  }[theme];

  return (
    <div
      ref={terminalRef}
      onClick={focusTerminal}
      className={`w-full max-w-5xl mx-auto rounded-xl bg-[#0a0c13] border ${themeClasses.borderGlow} shadow-2xl overflow-hidden cursor-text transition-all duration-200 ${
        activeSabotage === 'glitch' ? 'animate-pulse skew-x-1 filter hue-rotate-90' : ''
      } ${activeSabotage === 'invert' ? 'invert' : ''}`}
    >
      {/* Hidden input to capture physical keyboard events */}
      <input
        ref={hiddenInputRef}
        type="text"
        className="opacity-0 absolute -z-10 pointer-events-none"
        onKeyDown={handleKeyDown}
        autoFocus
        tabIndex={0}
      />

      {/* Terminal Title Bar */}
      <div className="px-4 py-3 bg-black/80 border-b border-white/10 flex items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Terminal className="w-3.5 h-3.5 text-red-500" />
            <span className="text-slate-300 font-semibold">{titleBadge}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500 hidden sm:inline">bash 5.1.8-rhel9</span>
          </div>
        </div>

        {/* Real-time Telemetry HUD (Strict Anti-Slop, tabular-nums) */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1 text-slate-400">
            <span>WPM:</span>
            <span className="text-white font-bold tabular-nums text-sm">{liveWpm}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <span>ACC:</span>
            <span className="text-white font-bold tabular-nums text-sm">{liveAccuracy}%</span>
          </div>

          {streak > 4 && (
            <div className="flex items-center gap-1 text-amber-400 animate-bounce">
              <Zap className="w-3 h-3" />
              <span className="font-bold tabular-nums">{streak}x</span>
            </div>
          )}

          <div className="text-slate-500 tabular-nums">
            [{currentIndex + 1}/{commands.length}]
          </div>
        </div>
      </div>

      {/* Active Command Metadata & Quick Actions */}
      <div className="px-6 pt-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 bg-slate-900/30">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-1">
            <span className={`${themeClasses.accentText} font-semibold`}>{currentCommand.category}</span>
            <span aria-hidden="true">·</span>
            <span>Diff: {currentCommand.difficulty}</span>
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-200">
            {currentCommand.title}
          </h3>
        </div>

        {/* Action Button: Instant Command Explainer */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenExplainer(currentCommand);
            }}
            className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 hover:text-white text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <HelpCircle className="w-3.5 h-3.5 text-red-400" />
            <span>คำอธิบายคำสั่ง (F1)</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Typing Area */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Terminal Command Line */}
        <div className="bg-black/90 rounded-lg p-5 border border-white/10 font-mono text-base sm:text-xl leading-relaxed tracking-wide select-none shadow-inner overflow-x-auto min-h-[100px] flex items-center">
          <div className="flex flex-wrap items-center">
            {/* Linux Prompt */}
            <span className="text-red-500 font-semibold mr-3 shrink-0 select-none">
              root@rhel9:~#
            </span>

            {/* Character-by-Character interactive stream */}
            <div className="inline flex-wrap font-mono">
              {targetText.split('').map((char, index) => {
                const isTyped = index < input.length;
                const isCurrent = index === input.length;
                const isError = index === errorIndex;

                if (isTyped) {
                  return (
                    <span
                      key={index}
                      className={`${themeClasses.typedText} font-semibold transition-colors`}
                    >
                      {char}
                    </span>
                  );
                }

                if (isCurrent) {
                  return (
                    <span
                      key={index}
                      className={`relative inline-block ${
                        isError
                          ? 'bg-red-600 text-white font-bold animate-ping'
                          : `${themeClasses.cursorBg} text-black font-bold animate-cyber-cursor`
                      } px-0.5 rounded-xs`}
                    >
                      {char === ' ' ? '␣' : char}
                    </span>
                  );
                }

                return (
                  <span key={index} className="text-slate-600">
                    {char}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Real-time simulated execution output after completing command */}
        {showOutputLog && (
          <div className="bg-black/95 rounded-lg p-4 border border-emerald-500/30 font-mono text-xs text-emerald-400 space-y-1.5 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-slate-400 pb-1 border-b border-white/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>COMMAND EXECUTION SUCCESS // EXIT CODE: 0</span>
            </div>
            {currentCommand.mockOutput.map((line, i) => (
              <div key={i} className="text-slate-300 font-mono">
                {line}
              </div>
            ))}
          </div>
        )}

        {/* Typing Controls / Hotkey Hints Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs font-mono text-slate-500 select-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-white/10">F1</kbd>
              <span>ดูคำอธิบาย</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-white/10">Esc</kbd>
              <span>รีเซ็ตบรรทัด</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-white/10">Tab</kbd>
              <span>ข้ามคำสั่ง</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setInput('');
                setErrorIndex(null);
                setStreak(0);
                if (hiddenInputRef.current) hiddenInputRef.current.focus();
              }}
              className="hover:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
            <button
              onClick={onNextCommand}
              className="hover:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <FastForward className="w-3 h-3" />
              <span>Skip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
