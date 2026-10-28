import React, { useState, useMemo } from 'react';
import { Search, BookOpen, Terminal, HelpCircle, Play, Shield, Layers, Server, Cpu } from 'lucide-react';
import { RhelCommand, CommandCategory, CommandDifficulty } from '../types';
import { RHEL_COMMANDS, CATEGORIES } from '../data/rhelCommands';

interface CommandEncyclopediaProps {
  onOpenExplainer: (cmd: RhelCommand) => void;
  onPracticeCommand: (cmd: RhelCommand) => void;
}

export const CommandEncyclopedia: React.FC<CommandEncyclopediaProps> = ({
  onOpenExplainer,
  onPracticeCommand,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');

  const filteredCommands = useMemo(() => {
    return RHEL_COMMANDS.filter((cmd) => {
      const matchesCategory = selectedCategory === 'ALL' || cmd.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'ALL' || cmd.difficulty === selectedDifficulty;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        cmd.command.toLowerCase().includes(query) ||
        cmd.title.toLowerCase().includes(query) ||
        cmd.summaryTh.toLowerCase().includes(query) ||
        cmd.summaryEn.toLowerCase().includes(query) ||
        cmd.flags.some((f) => f.flag.toLowerCase().includes(query));

      return matchesCategory && matchesDifficulty && matchesSearch;
    });
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Encyclopedia Header */}
      <div className="bg-[#0f111a] border border-white/10 rounded-xl p-6 shadow-lg space-y-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>คลังคำสั่งและคู่มือ RHEL (MAN-PAGE ENCYCLOPEDIA)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            รวมคำสั่ง Red Hat Enterprise Linux พร้อมคำอธิบายและแนวคิดระบบ
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            กดดูคำอธิบายเจาะลึก (Man-Page) ได้ทุกคำสั่ง พร้อมศึกษาวิธีการทำงานของ Flag และข้อควรระวังในระบบ Production
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาคำสั่ง เช่น systemctl, selinux, dnf, firewall, lvm, podman, --permanent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/70 border border-white/15 rounded-lg text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filter Controls (Allowed segmented buttons) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-black/60 rounded-lg border border-white/10 text-xs">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-red-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ทั้งหมด ({RHEL_COMMANDS.length})
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-red-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Difficulty Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-black/60 rounded-lg border border-white/10 text-xs">
            {['ALL', 'Apprentice', 'Sysadmin', 'Kernel Hacker'].map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  selectedDifficulty === diff
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {diff === 'ALL' ? 'ทุกระดับ' : diff}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Commands List Cards */}
      <div className="grid gap-4">
        {filteredCommands.map((cmd) => (
          <div
            key={cmd.id}
            className="bg-[#0f111a] border border-white/10 hover:border-red-500/40 rounded-xl p-5 shadow-md transition-all space-y-4 group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-1">
                  <span className="text-red-400 font-semibold">{cmd.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>ความยาก: {cmd.difficulty}</span>
                  <span aria-hidden="true">·</span>
                  <span>{cmd.flags.length} แฟล็กอธิบาย</span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-red-300 transition-colors">
                  {cmd.title}
                </h3>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                <button
                  onClick={() => onOpenExplainer(cmd)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer border border-white/10"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ดูคำอธิบาย (Man-Page)</span>
                </button>

                <button
                  onClick={() => onPracticeCommand(cmd)}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-red-600/30"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>ฝึกพิมพ์คำสั่งนี้</span>
                </button>
              </div>
            </div>

            {/* Code Box */}
            <div className="bg-black/90 rounded-lg p-3.5 border border-white/5 font-mono text-sm text-red-400 flex items-center gap-2 overflow-x-auto">
              <span className="text-slate-600 select-none">#</span>
              <span className="text-slate-200 font-medium">{cmd.command}</span>
            </div>

            {/* Thai Summary */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {cmd.summaryTh}
            </p>

            {/* Flag preview tags (Clean typography, no pills) */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-slate-500 pt-1 border-t border-white/5">
              <span className="text-slate-400 font-semibold">Flags:</span>
              {cmd.flags.map((f, i) => (
                <span key={i} className="text-cyan-400/90">
                  {f.flag}
                  {i < cmd.flags.length - 1 && <span className="text-slate-600 ml-3">·</span>}
                </span>
              ))}
            </div>
          </div>
        ))}

        {filteredCommands.length === 0 && (
          <div className="bg-[#0f111a] border border-white/10 rounded-xl p-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-white font-semibold">ไม่พบคำสั่งที่ค้นหา</div>
            <p className="text-xs text-slate-400">
              ลองพิมพ์คำค้นหาอื่น เช่น systemctl, podman, lvm, firewall หรือเลือกหมวดหมู่อื่น
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
