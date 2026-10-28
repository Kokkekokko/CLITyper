import React from 'react';
import { X, BookOpen, Terminal, Check, Copy, Shield, Lightbulb, ExternalLink } from 'lucide-react';
import { RhelCommand } from '../types';

interface CommandExplainerModalProps {
  command: RhelCommand | null;
  onClose: () => void;
  onPracticeThis?: (cmd: RhelCommand) => void;
}

export const CommandExplainerModal: React.FC<CommandExplainerModalProps> = ({
  command,
  onClose,
  onPracticeThis,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!command) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(command.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-[#0f111a] border border-white/15 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Window Header Bar */}
        <div className="px-5 py-3.5 bg-black/60 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <BookOpen className="w-3.5 h-3.5 text-red-400" />
              <span>RHEL MANUAL // man {command.command.split(' ')[0]}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-200">
          {/* Command Hero Title */}
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5 font-mono">
              <span className="text-red-400 font-semibold">{command.category}</span>
              <span aria-hidden="true">·</span>
              <span>Level: {command.difficulty}</span>
              <span aria-hidden="true">·</span>
              <span>RHEL 8 / 9 Native</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {command.title}
            </h2>
          </div>

          {/* Code Execution Box with Copy */}
          <div className="relative group bg-black/80 border border-red-500/30 rounded-lg p-4 font-mono text-sm sm:text-base text-red-400 shadow-inner">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-slate-500 select-none">root@rhel9:~#</span>
                <span className="text-white font-semibold">{command.command}</span>
              </div>
              <button
                onClick={handleCopy}
                className="shrink-0 p-2 text-xs font-mono rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                title="คัดลอกคำสั่ง"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Thai & English Explanations */}
          <div className="space-y-3">
            <div className="bg-slate-900/60 border border-white/10 rounded-lg p-4">
              <h3 className="text-xs uppercase font-mono text-red-400 mb-1 tracking-wider">คำอธิบายภาษาไทย (Thai Description)</h3>
              <p className="text-sm leading-relaxed text-slate-200">
                {command.summaryTh}
              </p>
            </div>

            <div className="bg-slate-900/40 border border-white/5 rounded-lg p-3">
              <h3 className="text-xs uppercase font-mono text-slate-400 mb-1 tracking-wider">English Summary</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                {command.summaryEn}
              </p>
            </div>
          </div>

          {/* Flags & Parameter Breakdown */}
          {command.flags.length > 0 && (
            <div>
              <h3 className="text-xs uppercase font-mono text-slate-400 mb-3 tracking-wider flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>โครงสร้างคำสั่งและแฟล็ก (Command Flags Breakdown)</span>
              </h3>
              <div className="grid gap-2">
                {command.flags.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-3 rounded-lg bg-black/40 border border-white/5 hover:border-cyan-500/30 transition-colors"
                  >
                    <div className="font-mono text-xs sm:text-sm font-bold text-cyan-400 sm:w-44 shrink-0 px-2 py-1 bg-cyan-950/40 rounded border border-cyan-800/30">
                      {item.flag}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-300">
                      <p>{item.explanationTh}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.explanationEn}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sysadmin Pro-Tip / Security Warning */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-4 flex gap-3 text-amber-200">
            <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold">
                Red Hat Sysadmin Pro-Tip & Exam Insights
              </h4>
              <p className="text-xs sm:text-sm text-amber-200/90 leading-relaxed">
                {command.sysadminTip}
              </p>
            </div>
          </div>

          {/* Simulated Linux Execution Output */}
          <div>
            <h3 className="text-xs uppercase font-mono text-slate-400 mb-2 tracking-wider flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>ผลลัพธ์จำลองบน RHEL Terminal (Simulated Output)</span>
            </h3>
            <div className="bg-black border border-white/10 rounded-lg p-3.5 font-mono text-xs text-emerald-400/90 space-y-1 overflow-x-auto">
              <div className="text-slate-500"># Executing command on RHEL 9.4 (Plow)...</div>
              {command.mockOutput.map((line, i) => (
                <div key={i} className="whitespace-pre">{line}</div>
              ))}
            </div>
          </div>

          {/* Man Page Synopsis */}
          <div className="bg-slate-900/30 border border-white/5 rounded-lg p-3 font-mono text-xs text-slate-400">
            <div className="text-slate-300 font-semibold mb-1">SYNOPSIS:</div>
            <div className="text-slate-200">{command.manPage.synopsis}</div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-black/60 border-t border-white/10 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-mono hidden sm:block">
            กด Esc เพื่อปิดหน้าต่าง
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>

            {onPracticeThis && (
              <button
                onClick={() => {
                  onPracticeThis(command);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-lg shadow-red-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>ฝึกพิมพ์คำสั่งนี้ทันที</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
