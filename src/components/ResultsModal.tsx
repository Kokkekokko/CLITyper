import React, { useEffect, useState } from 'react';
import { Award, Zap, CheckCircle2, RotateCcw, Share2, Copy, Check, Terminal, ExternalLink, HelpCircle } from 'lucide-react';
import { RhelCommand } from '../types';
import confetti from 'canvas-confetti';

interface ResultsModalProps {
  stats: {
    wpm: number;
    accuracy: number;
    timeSec: number;
    completedCommands: RhelCommand[];
    maxStreak: number;
  };
  onRestart: () => void;
  onOpenExplainer: (cmd: RhelCommand) => void;
  onGoToDuel: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  stats,
  onRestart,
  onOpenExplainer,
  onGoToDuel,
}) => {
  const [copiedChallenge, setCopiedChallenge] = useState(false);

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  // Determine Hacker Rank
  let rankTitle = 'Script Kiddie // User Level';
  let rankColor = 'text-slate-400';
  let rankDesc = 'เริ่มต้นก้าวแรกสู่โลก Linux ฝึกฝนคำสั่งบ่อยๆ เพื่อความเร็วที่เสถียรขึ้น!';

  if (stats.wpm >= 100 && stats.accuracy >= 95) {
    rankTitle = 'Cyber Ghost // Kernel God 🕶️';
    rankColor = 'text-emerald-400';
    rankDesc = 'ความเร็วระดับปีศาจ! คุณพิมพ์คำสั่งระบบปฏิบัติการได้ไวและแม่นยำดั่งเชื่อมต่อตรงกับเคอร์เนล';
  } else if (stats.wpm >= 70 && stats.accuracy >= 90) {
    rankTitle = 'Senior Red Hat Architect // RHCE Elite 🔴';
    rankColor = 'text-red-400';
    rankDesc = 'ความชำนาญระดับสูงมาก พร้อมรับมือกับงาน Incident องค์กรได้อย่างสบาย';
  } else if (stats.wpm >= 45) {
    rankTitle = 'Junior Sysadmin // RHCSA Candidate ⚡';
    rankColor = 'text-amber-400';
    rankDesc = 'ความเร็วพร้อมสำหรับการสอบ RHCSA และดูแลเซิร์ฟเวอร์ RHEL ขั้นพื้นฐาน!';
  }

  const handleShareChallenge = () => {
    const text = `💻 ผมทำสถิติ Red Hat CyberTyper ได้ ${stats.wpm} WPM (ความแม่นยำ ${stats.accuracy}%)! คุณกล้ามาท้าประลองความเร็วพิมพ์คำสั่ง RHEL กับผมไหม? เข้าเล่นได้ที่: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopiedChallenge(true);
    setTimeout(() => setCopiedChallenge(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[#0f111a] border border-white/15 rounded-xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Badge */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 shadow-lg shadow-red-600/20">
            <Award className="w-7 h-7" />
          </div>
          <div className="text-xs font-mono uppercase tracking-widest text-slate-400">
            SESSION COMPLETE // HACKER ASSESSMENT
          </div>
          <h2 className={`text-2xl font-bold tracking-tight ${rankColor}`}>
            {rankTitle}
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {rankDesc}
          </p>
        </div>

        {/* 4-Stat Grid (Strict anti-slop, tabular figures) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/60 rounded-xl p-4 border border-white/10 font-mono">
          <div className="text-center p-2">
            <div className="text-xs text-slate-500 mb-1">ความเร็ว (WPM)</div>
            <div className="text-2xl font-black text-white tabular-nums">{stats.wpm}</div>
            <div className="text-[10px] text-slate-500">Words / Min</div>
          </div>

          <div className="text-center p-2">
            <div className="text-xs text-slate-500 mb-1">ความแม่นยำ</div>
            <div className="text-2xl font-black text-emerald-400 tabular-nums">{stats.accuracy}%</div>
            <div className="text-[10px] text-slate-500">Accuracy</div>
          </div>

          <div className="text-center p-2">
            <div className="text-xs text-slate-500 mb-1">เวลารวม</div>
            <div className="text-2xl font-black text-cyan-400 tabular-nums">{Math.round(stats.timeSec)}s</div>
            <div className="text-[10px] text-slate-500">Duration</div>
          </div>

          <div className="text-center p-2">
            <div className="text-xs text-slate-500 mb-1">Max Combo</div>
            <div className="text-2xl font-black text-amber-400 tabular-nums">{stats.maxStreak}x</div>
            <div className="text-[10px] text-slate-500">Keystrokes</div>
          </div>
        </div>

        {/* Completed Commands Review */}
        <div>
          <div className="text-xs font-mono text-slate-400 mb-2">
            คำสั่งที่ฝึกพิมพ์เสร็จสิ้น ({stats.completedCommands.length} คำสั่ง) — กดเพื่อทบทวน Man-Page:
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {stats.completedCommands.map((cmd) => (
              <div
                key={cmd.id}
                onClick={() => onOpenExplainer(cmd)}
                className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/5 hover:border-white/20 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2 overflow-x-auto">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-mono text-xs text-slate-300 font-medium group-hover:text-white">
                    {cmd.command}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0 font-mono">
                  <span className="hidden sm:inline text-[11px]">{cmd.category}</span>
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            onClick={handleShareChallenge}
            className="w-full sm:w-auto px-4 py-2.5 bg-black/60 hover:bg-black/90 border border-white/15 text-slate-200 hover:text-white rounded-lg text-xs font-mono transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {copiedChallenge ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedChallenge ? 'คัดลอกข้อความท้าทายแล้ว!' : 'คัดลอกสถิติไปท้าเพื่อน'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onRestart}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>พิมพ์รอบใหม่</span>
            </button>

            <button
              onClick={onGoToDuel}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>ไปประลอง 1v1</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
