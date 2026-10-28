import React, { useState, useEffect, useRef } from 'react';
import { Swords, Users, Bot, Copy, Check, Play, RefreshCw, Zap, ShieldAlert, Award, ArrowRight } from 'lucide-react';
import { DuelPlayer, DuelRoomState, RhelCommand, HackerTheme } from '../types';
import { RHEL_COMMANDS } from '../data/rhelCommands';
import { duelSync, generateRoomCode, getDuelCommands, AI_BOT_PROFILES, AIBotProfile, DuelMessage } from '../utils/duelSync';
import { TypingTerminal } from './TypingTerminal';
import { cyberAudio } from '../utils/audio';
import confetti from 'canvas-confetti';

interface DuelLobbyProps {
  onOpenExplainer: (cmd: RhelCommand) => void;
  theme: HackerTheme;
  initialRoomCode?: string;
}

export const DuelLobby: React.FC<DuelLobbyProps> = ({
  onOpenExplainer,
  theme,
  initialRoomCode,
}) => {
  // Player Profile
  const [playerId] = useState<string>(() => 'player_' + Math.random().toString(36).substring(2, 9));
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('rhel_duel_username') || 'Sysadmin_' + Math.floor(100 + Math.random() * 900);
  });

  // Mode Selection: 'ONLINE_ROOM' | 'BOT_DUEL' | 'SPLIT_LOCAL'
  const [duelSubMode, setDuelSubMode] = useState<'ONLINE_ROOM' | 'BOT_DUEL'>('ONLINE_ROOM');

  // Room State
  const [roomCodeInput, setRoomCodeInput] = useState<string>(initialRoomCode || '');
  const [currentRoom, setCurrentRoom] = useState<DuelRoomState | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Active Race state
  const [commands, setCommands] = useState<RhelCommand[]>([]);
  const [activeCmdIndex, setActiveCmdIndex] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [winner, setWinner] = useState<DuelPlayer | null>(null);
  const [sabotageAlert, setSabotageAlert] = useState<string | null>(null);

  // Bot Rival state
  const [selectedBot, setSelectedBot] = useState<AIBotProfile>(AI_BOT_PROFILES[1]); // Default RHCSA 75 WPM
  const [botProgress, setBotProgress] = useState<DuelPlayer>({
    id: selectedBot.id,
    name: selectedBot.name,
    avatar: selectedBot.avatar,
    currentCmdIndex: 0,
    totalCommands: 4,
    currentCharIndex: 0,
    wpm: selectedBot.targetWpm,
    accuracy: 98,
    streak: 0,
    isFinished: false,
  });

  const botIntervalRef = useRef<any>(null);

  // Save username to storage
  const handleUpdateName = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('rhel_duel_username', name);
  };

  // Sync listener for cross-tab / multiplayer room updates
  useEffect(() => {
    const unsubscribe = duelSync.subscribe((msg: DuelMessage) => {
      if (currentRoom && msg.roomId === currentRoom.roomId) {
        if (msg.type === 'PLAYER_JOINED') {
          setCurrentRoom(msg.payload.room);
        } else if (msg.type === 'PLAYER_PROGRESS') {
          setCurrentRoom((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              players: {
                ...prev.players,
                [msg.payload.player.id]: msg.payload.player,
              },
            };
          });
        } else if (msg.type === 'START_COUNTDOWN') {
          setCountdown(msg.payload.countdown || 3);
          cyberAudio.playComboStreak(5);
        } else if (msg.type === 'START_RACE') {
          setCountdown(null);
          setCurrentRoom((prev) => (prev ? { ...prev, status: 'RACING' } : null));
          setActiveCmdIndex(0);
          setWinner(null);
        } else if (msg.type === 'PLAYER_FINISHED') {
          if (!winner) {
            setWinner(msg.payload.winner);
            cyberAudio.playVictory();
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          }
        } else if (msg.type === 'SABOTAGE' && msg.payload.targetPlayerId === playerId) {
          setSabotageAlert(msg.payload.sabotageType);
          cyberAudio.playError();
          setTimeout(() => setSabotageAlert(null), 2500);
        } else if (msg.type === 'RESET_ROOM') {
          setWinner(null);
          setActiveCmdIndex(0);
          setCountdown(null);
          setCurrentRoom(msg.payload.room);
        }
      }
    });

    return () => unsubscribe();
  }, [currentRoom, playerId, winner]);

  // Handle auto-join from URL parameter
  useEffect(() => {
    if (initialRoomCode && !currentRoom) {
      handleJoinRoom(initialRoomCode);
    }
  }, [initialRoomCode]);

  // Handle Countdown timer
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        if (countdown === 1) {
          setCountdown(0);
          if (isHost && currentRoom) {
            duelSync.send({
              type: 'START_RACE',
              roomId: currentRoom.roomId,
              senderId: playerId,
              payload: { startTime: Date.now() },
            });
            setCurrentRoom((prev) => (prev ? { ...prev, status: 'RACING' } : null));
          }
        } else {
          setCountdown(countdown - 1);
          cyberAudio.playComboStreak(countdown * 3);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, isHost, currentRoom, playerId]);

  // AI Bot Duel Loop
  useEffect(() => {
    if (duelSubMode === 'BOT_DUEL' && currentRoom?.status === 'RACING' && !winner) {
      // Calculate typing speed intervals based on bot target WPM
      // WPM = (chars / 5) / min -> chars per second = (WPM * 5) / 60
      const charsPerSec = (selectedBot.targetWpm * 5) / 60;
      const intervalMs = Math.max(1000 / charsPerSec, 80);

      botIntervalRef.current = setInterval(() => {
        setBotProgress((prev) => {
          if (prev.isFinished || commands.length === 0) return prev;

          const currentTargetCmd = commands[prev.currentCmdIndex];
          if (!currentTargetCmd) return prev;

          const nextCharIdx = prev.currentCharIndex + 1;

          if (nextCharIdx >= currentTargetCmd.command.length) {
            // Completed current command
            const nextCmdIdx = prev.currentCmdIndex + 1;
            if (nextCmdIdx >= commands.length) {
              // Bot finished race!
              clearInterval(botIntervalRef.current);
              const finishedBot = {
                ...prev,
                currentCmdIndex: commands.length,
                currentCharIndex: 0,
                isFinished: true,
                finishTimeMs: Date.now(),
              };
              if (!winner) {
                setWinner(finishedBot);
                cyberAudio.playError();
              }
              return finishedBot;
            }
            return {
              ...prev,
              currentCmdIndex: nextCmdIdx,
              currentCharIndex: 0,
              streak: prev.streak + 5,
            };
          }

          return {
            ...prev,
            currentCharIndex: nextCharIdx,
          };
        });
      }, intervalMs);
    }

    return () => {
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
    };
  }, [duelSubMode, currentRoom?.status, winner, commands, selectedBot]);

  // Create Room action
  const handleCreateRoom = () => {
    const code = generateRoomCode();
    const duelCmds = getDuelCommands(4);
    setCommands(duelCmds);

    const hostPlayer: DuelPlayer = {
      id: playerId,
      name: playerName,
      avatar: '👑',
      currentCmdIndex: 0,
      totalCommands: duelCmds.length,
      currentCharIndex: 0,
      wpm: 0,
      accuracy: 100,
      streak: 0,
      isFinished: false,
    };

    const newRoom: DuelRoomState = {
      roomId: code,
      commandIds: duelCmds.map((c) => c.id),
      status: 'WAITING',
      countdown: 3,
      players: {
        [playerId]: hostPlayer,
      },
    };

    duelSync.saveRoom(newRoom);
    setCurrentRoom(newRoom);
    setIsHost(true);

    duelSync.send({
      type: 'PLAYER_JOINED',
      roomId: code,
      senderId: playerId,
      payload: { room: newRoom },
    });
  };

  // Join Room action
  const handleJoinRoom = (codeToJoin?: string) => {
    const targetCode = (codeToJoin || roomCodeInput).trim().toUpperCase();
    if (!targetCode) return;

    let room = duelSync.getRoom(targetCode);

    const duelCmds = room
      ? room.commandIds.map((id) => RHEL_COMMANDS.find((c) => c.id === id)!).filter(Boolean)
      : getDuelCommands(4);

    setCommands(duelCmds);

    const joiningPlayer: DuelPlayer = {
      id: playerId,
      name: playerName,
      avatar: '⚡',
      currentCmdIndex: 0,
      totalCommands: duelCmds.length,
      currentCharIndex: 0,
      wpm: 0,
      accuracy: 100,
      streak: 0,
      isFinished: false,
    };

    if (!room) {
      room = {
        roomId: targetCode,
        commandIds: duelCmds.map((c) => c.id),
        status: 'WAITING',
        countdown: 3,
        players: {
          [playerId]: joiningPlayer,
        },
      };
    } else {
      room.players[playerId] = joiningPlayer;
    }

    duelSync.saveRoom(room);
    setCurrentRoom(room);
    setIsHost(false);

    duelSync.send({
      type: 'PLAYER_JOINED',
      roomId: targetCode,
      senderId: playerId,
      payload: { room, player: joiningPlayer },
    });
  };

  // Start Duel Countdown (Host only)
  const handleStartCountdown = () => {
    if (!currentRoom) return;

    duelSync.send({
      type: 'START_COUNTDOWN',
      roomId: currentRoom.roomId,
      senderId: playerId,
      payload: { countdown: 3 },
    });

    setCountdown(3);
    cyberAudio.playComboStreak(3);
  };

  // Start Bot Duel
  const handleStartBotDuel = () => {
    const duelCmds = getDuelCommands(4);
    setCommands(duelCmds);
    setActiveCmdIndex(0);
    setWinner(null);

    const humanPlayer: DuelPlayer = {
      id: playerId,
      name: playerName,
      avatar: '👑',
      currentCmdIndex: 0,
      totalCommands: duelCmds.length,
      currentCharIndex: 0,
      wpm: 0,
      accuracy: 100,
      streak: 0,
      isFinished: false,
    };

    const initialBotPlayer: DuelPlayer = {
      id: selectedBot.id,
      name: selectedBot.name,
      avatar: selectedBot.avatar,
      currentCmdIndex: 0,
      totalCommands: duelCmds.length,
      currentCharIndex: 0,
      wpm: selectedBot.targetWpm,
      accuracy: 99,
      streak: 0,
      isFinished: false,
    };

    setBotProgress(initialBotPlayer);

    const room: DuelRoomState = {
      roomId: 'LOCAL_BOT_' + Math.floor(100 + Math.random() * 900),
      commandIds: duelCmds.map((c) => c.id),
      status: 'COUNTDOWN',
      countdown: 3,
      players: {
        [playerId]: humanPlayer,
        [selectedBot.id]: initialBotPlayer,
      },
    };

    setCurrentRoom(room);
    setCountdown(3);
  };

  // Copy shareable Room Link
  const handleCopyLink = () => {
    if (!currentRoom) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${currentRoom.roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Progress update from typing terminal
  const handleKeystrokeProgress = (cmdIdx: number, charIdx: number, wpm: number, accuracy: number, streak: number) => {
    if (!currentRoom) return;

    const updatedPlayer: DuelPlayer = {
      id: playerId,
      name: playerName,
      avatar: isHost ? '👑' : '⚡',
      currentCmdIndex: cmdIdx,
      totalCommands: commands.length,
      currentCharIndex: charIdx,
      wpm,
      accuracy,
      streak,
      isFinished: cmdIdx >= commands.length,
    };

    duelSync.send({
      type: 'PLAYER_PROGRESS',
      roomId: currentRoom.roomId,
      senderId: playerId,
      payload: { player: updatedPlayer },
    });

    setCurrentRoom((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        players: {
          ...prev.players,
          [playerId]: updatedPlayer,
        },
      };
    });
  };

  // Player completed command
  const handleCommandComplete = (cmd: RhelCommand, stats: { wpm: number; accuracy: number; timeSec: number }) => {
    const nextIdx = activeCmdIndex + 1;
    if (nextIdx >= commands.length) {
      // Completed all commands!
      const winningPlayer: DuelPlayer = {
        id: playerId,
        name: playerName,
        avatar: isHost ? '👑' : '⚡',
        currentCmdIndex: commands.length,
        totalCommands: commands.length,
        currentCharIndex: 0,
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        streak: 10,
        isFinished: true,
        finishTimeMs: Date.now(),
      };

      if (!winner && currentRoom) {
        setWinner(winningPlayer);
        cyberAudio.playVictory();
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });

        duelSync.send({
          type: 'PLAYER_FINISHED',
          roomId: currentRoom.roomId,
          senderId: playerId,
          payload: { winner: winningPlayer },
        });
      }
    }
  };

  // Trigger Sabotage attack on opponent
  const handleSendSabotage = () => {
    if (!currentRoom) return;
    const opponent = Object.values(currentRoom.players).find((p) => p.id !== playerId);
    if (!opponent) return;

    duelSync.send({
      type: 'SABOTAGE',
      roomId: currentRoom.roomId,
      senderId: playerId,
      payload: { targetPlayerId: opponent.id, sabotageType: 'glitch' },
    });

    cyberAudio.playCommandSuccess();
  };

  // Reset Duel Room
  const handleRestartDuel = () => {
    const duelCmds = getDuelCommands(4);
    setCommands(duelCmds);
    setActiveCmdIndex(0);
    setWinner(null);

    if (currentRoom) {
      const resetRoom: DuelRoomState = {
        ...currentRoom,
        commandIds: duelCmds.map((c) => c.id),
        status: 'WAITING',
      };
      duelSync.send({
        type: 'RESET_ROOM',
        roomId: currentRoom.roomId,
        senderId: playerId,
        payload: { room: resetRoom },
      });
      setCurrentRoom(resetRoom);
    }
  };

  // Opponent player calculation
  const playerList = currentRoom ? Object.values(currentRoom.players) : [];
  const myPlayer = playerList.find((p) => p.id === playerId);
  const opponentPlayer = duelSubMode === 'BOT_DUEL'
    ? botProgress
    : playerList.find((p) => p.id !== playerId);

  // Calculate Progress Percentages
  const getProgressPercent = (player?: DuelPlayer) => {
    if (!player || commands.length === 0) return 0;
    if (player.isFinished) return 100;
    const currentCmd = commands[player.currentCmdIndex];
    const charProgress = currentCmd ? player.currentCharIndex / currentCmd.command.length : 0;
    const totalProg = (player.currentCmdIndex + charProgress) / commands.length;
    return Math.min(Math.round(totalProg * 100), 99);
  };

  const myProgressPct = getProgressPercent(myPlayer);
  const oppProgressPct = getProgressPercent(opponentPlayer);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Duel Header & Mode Switcher */}
      <div className="bg-[#0f111a] border border-white/10 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-red-400 mb-1">
            <Swords className="w-3.5 h-3.5" />
            <span>โหมดประลองความเร็ว (1v1 RHEL SPEED DUEL)</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            ประลองพิมพ์คำสั่ง RHEL 9 แบบเรียลไทม์
          </h2>
        </div>

        {/* Sub-mode selector */}
        <div className="flex items-center gap-1 p-1 bg-black/60 rounded-lg border border-white/10">
          <button
            onClick={() => {
              setDuelSubMode('ONLINE_ROOM');
              setCurrentRoom(null);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              duelSubMode === 'ONLINE_ROOM'
                ? 'bg-red-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>ห้องแข่งกับเพื่อน (Online Room)</span>
          </button>
          <button
            onClick={() => {
              setDuelSubMode('BOT_DUEL');
              setCurrentRoom(null);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              duelSubMode === 'BOT_DUEL'
                ? 'bg-red-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>แข่งกับ AI Red Hat Ghost</span>
          </button>
        </div>
      </div>

      {/* ONLINE ROOM CREATION & JOINING LOBBY (When NOT in active race) */}
      {duelSubMode === 'ONLINE_ROOM' && (!currentRoom || currentRoom.status === 'WAITING') && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Room Card */}
          <div className="bg-[#0f111a] border border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">สร้างห้องประลองใหม่</h3>
                <p className="text-xs text-slate-400">สร้างรหัสห้องและแชร์ลิงก์ให้เพื่อนเข้ามาร่วมแข่ง</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400">ชื่อแฮกเกอร์ของคุณ (Sysadmin Name):</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => handleUpdateName(e.target.value)}
                maxLength={20}
                className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-lg text-sm text-white font-mono focus:border-red-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleCreateRoom}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>สร้างห้องประลอง (Host Room)</span>
            </button>
          </div>

          {/* Join Existing Room Card */}
          <div className="bg-[#0f111a] border border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">เข้าร่วมห้องเพื่อน</h3>
                <p className="text-xs text-slate-400">กรอกรหัสห้อง (เช่น RHEL-842) เพื่อประลองความเร็ว</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400">รหัสห้องประลอง (Room Code):</label>
              <input
                type="text"
                placeholder="เช่น RHEL-902"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={10}
                className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-lg text-sm text-white font-mono uppercase focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <button
              onClick={() => handleJoinRoom()}
              disabled={!roomCodeInput.trim()}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded-lg border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>เข้าร่วมห้อง (Join Room)</span>
            </button>
          </div>
        </div>
      )}

      {/* WAITING ROOM LOBBY (When room created and waiting for start) */}
      {duelSubMode === 'ONLINE_ROOM' && currentRoom && currentRoom.status === 'WAITING' && (
        <div className="bg-[#0f111a] border border-red-500/30 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="text-xs text-slate-400 font-mono">ห้องประลอง (Room ID):</div>
              <div className="text-2xl font-bold font-mono text-red-500 tracking-wider">
                {currentRoom.roomId}
              </div>
            </div>

            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-black/60 hover:bg-black/90 border border-white/15 text-slate-200 hover:text-white rounded-lg text-xs font-mono transition-colors flex items-center gap-2 cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'คัดลอกลิงก์สำเร็จ!' : 'คัดลอกลิงก์ชวนเพื่อน (Share Link)'}</span>
            </button>
          </div>

          {/* Connected Players list */}
          <div>
            <div className="text-xs font-mono text-slate-400 mb-3">ผู้เข้าร่วมการประลอง ({playerList.length} คน):</div>
            <div className="grid sm:grid-cols-2 gap-3">
              {playerList.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3.5 bg-black/50 border border-white/10 rounded-lg"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{player.avatar}</span>
                    <span className="font-mono text-sm text-white font-semibold">{player.name}</span>
                    {player.id === playerId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800/40">คุณ</span>
                    )}
                  </div>
                  <span className="text-xs text-emerald-400 font-mono">พร้อมประลอง</span>
                </div>
              ))}

              {playerList.length < 2 && (
                <div className="flex items-center justify-center p-3.5 bg-black/20 border border-dashed border-white/10 rounded-lg text-xs text-slate-500 font-mono">
                  กำลังรอเพื่อนเข้าร่วมห้อง... (เปิดอีกแท็บหรือส่งลิงก์ให้เพื่อน)
                </div>
              )}
            </div>
          </div>

          {/* Host Start CTA */}
          <div className="pt-2 flex justify-end">
            {isHost ? (
              <button
                onClick={handleStartCountdown}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>เริ่มการแข่งขัน (Start Countdown)</span>
              </button>
            ) : (
              <div className="text-xs text-slate-400 font-mono py-2">
                กำลังรอ Host เริ่มการแข่งขัน...
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOT DUEL SETUP (Select Bot difficulty level) */}
      {duelSubMode === 'BOT_DUEL' && (!currentRoom || currentRoom.status === 'WAITING') && (
        <div className="bg-[#0f111a] border border-white/10 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">เลือกระดับความยากของ AI Red Hat Ghost</h3>
              <p className="text-xs text-slate-400">ฝึกซ้อมความเร็วแข่งกับระบบจำลองที่มีอัตราการพิมพ์เหมือนมนุษย์จริง</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {AI_BOT_PROFILES.map((bot) => (
              <div
                key={bot.id}
                onClick={() => setSelectedBot(bot)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedBot.id === bot.id
                    ? 'bg-red-950/30 border-red-500 shadow-md'
                    : 'bg-black/40 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{bot.avatar}</span>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{bot.name}</h4>
                    <p className="text-xs text-slate-400">{bot.title}</p>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-red-400 tabular-nums">{bot.targetWpm} WPM</div>
                  <div className="text-[10px] text-slate-500">Acc {Math.round(bot.accuracyRate * 100)}%</div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleStartBotDuel}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>เริ่มแข่งกับ {selectedBot.name}</span>
            </button>
          </div>
        </div>
      )}

      {/* COUNTDOWN OVERLAY */}
      {countdown !== null && countdown > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="text-center space-y-4 animate-in zoom-in-75 duration-200">
            <div className="text-xs font-mono uppercase tracking-widest text-red-400">
              COMMENCING RHEL SPEED DUEL
            </div>
            <div className="text-8xl font-black font-mono text-white animate-pulse">
              {countdown}
            </div>
            <div className="text-sm font-mono text-slate-400">
              เตรียมพร้อมพิมพ์คำสั่ง Linux ให้ไวที่สุด!
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE DUEL RACE TRACK (Live Visual Competitor Progress) */}
      {currentRoom && currentRoom.status === 'RACING' && (
        <div className="space-y-6">
          {/* Dual Progress Bars */}
          <div className="bg-[#0f111a] border border-white/15 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-white/10">
              <span className="flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-red-500" />
                <span className="text-white font-semibold">LIVE RACE MONITOR</span>
              </span>
              <span>
                {myProgressPct > oppProgressPct ? (
                  <span className="text-emerald-400 font-bold">คุณกำลังนำอยู่! ({myProgressPct - oppProgressPct}%)</span>
                ) : myProgressPct < oppProgressPct ? (
                  <span className="text-red-400 font-bold">คู่แข่งกำลังนำอยู่! ({oppProgressPct - myProgressPct}%)</span>
                ) : (
                  <span className="text-slate-400">สูสีกันมาก!</span>
                )}
              </span>
            </div>

            {/* Player 1 Track (You) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white font-semibold flex items-center gap-1.5">
                  <span>{myPlayer?.avatar || '👑'}</span>
                  <span>{myPlayer?.name || playerName} (You)</span>
                </span>
                <span className="text-slate-400 tabular-nums">
                  {myPlayer?.wpm || 0} WPM · Cmd {Math.min(activeCmdIndex + 1, commands.length)}/{commands.length}
                </span>
              </div>
              <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  className="h-full bg-linear-to-r from-red-600 to-emerald-400 rounded-full transition-all duration-150"
                  style={{ width: `${myProgressPct}%` }}
                />
              </div>
            </div>

            {/* Player 2 Track (Friend or Bot) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <span>{opponentPlayer?.avatar || '⚡'}</span>
                  <span>{opponentPlayer?.name || 'Rival'}</span>
                </span>
                <span className="text-slate-400 tabular-nums">
                  {opponentPlayer?.wpm || 0} WPM · Cmd {Math.min((opponentPlayer?.currentCmdIndex || 0) + 1, commands.length)}/{commands.length}
                </span>
              </div>
              <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  className="h-full bg-linear-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-150"
                  style={{ width: `${oppProgressPct}%` }}
                />
              </div>
            </div>

            {/* Optional Cyber Sabotage Action if streak >= 10 */}
            {(myPlayer?.streak || 0) >= 10 && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSendSabotage}
                  className="px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600 border border-amber-500/50 text-amber-300 hover:text-white rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>ยิง Sabotage Glitch ใส่คู่แข่ง (10x Streak Perk)</span>
                </button>
              </div>
            )}
          </div>

          {/* Typing Terminal for the active player */}
          {commands.length > 0 && (
            <TypingTerminal
              commands={commands}
              currentIndex={activeCmdIndex}
              onCommandComplete={handleCommandComplete}
              onNextCommand={() => {
                if (activeCmdIndex + 1 < commands.length) {
                  setActiveCmdIndex(activeCmdIndex + 1);
                }
              }}
              onOpenExplainer={onOpenExplainer}
              theme={theme}
              titleBadge={`DUEL ROOM: ${currentRoom.roomId}`}
              isDuelMode={true}
              onKeystrokeProgress={handleKeystrokeProgress}
              activeSabotage={sabotageAlert}
            />
          )}
        </div>
      )}

      {/* VICTORY / RESULTS MODAL FOR DUEL */}
      {winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0f111a] border border-white/15 rounded-xl p-6 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <div className="text-xs font-mono text-red-400 uppercase tracking-widest mb-1">
                DUEL CHAMPION
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {winner.id === playerId ? '🎉 ยินดีด้วย! คุณเป็นผู้ชนะ!' : `⚡ ${winner.name} เข้าเส้นชัยก่อน!`}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {winner.id === playerId
                  ? 'ความเร็วและความแม่นยำของคุณระดับ Red Hat Kernel Master!'
                  : 'ฝึกฝนอีกนิดแล้วท้าประลองใหม่อีกรอบ!'}
              </p>
            </div>

            <div className="p-4 bg-black/60 rounded-lg border border-white/10 font-mono text-sm space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>ผู้ชนะ:</span>
                <span className="text-white font-bold">{winner.name}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>ความเร็วสูงสุด (WPM):</span>
                <span className="text-emerald-400 font-bold tabular-nums">{winner.wpm} WPM</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>ความแม่นยำ (Accuracy):</span>
                <span className="text-cyan-400 font-bold tabular-nums">{winner.accuracy}%</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleRestartDuel}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>ประลองใหม่อีกรอบ</span>
              </button>
              <button
                onClick={() => {
                  setCurrentRoom(null);
                  setWinner(null);
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                ออกจากห้อง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
