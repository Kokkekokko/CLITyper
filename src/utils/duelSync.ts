import { DuelPlayer, DuelRoomState, RhelCommand } from '../types';
import { RHEL_COMMANDS } from '../data/rhelCommands';

export type SabotageType = 'glitch' | 'invert' | 'kernel_panic';

export interface DuelMessage {
  type: 'PLAYER_JOINED' | 'PLAYER_PROGRESS' | 'START_COUNTDOWN' | 'START_RACE' | 'PLAYER_FINISHED' | 'SABOTAGE' | 'RESET_ROOM';
  roomId: string;
  senderId: string;
  payload: any;
  timestamp: number;
}

const CHANNEL_NAME = 'rhel_cyber_duel_sync_channel';

class DuelSyncService {
  private channel: BroadcastChannel | null = null;
  private messageListeners: Array<(msg: DuelMessage) => void> = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          this.notifyListeners(event.data);
        };
      } catch {
        this.channel = null;
      }
    }

    // Storage event fallback for cross-tab sync if BroadcastChannel has limitations
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'rhel_duel_last_msg' && e.newValue) {
          try {
            const data: DuelMessage = JSON.parse(e.newValue);
            this.notifyListeners(data);
          } catch {
            // parse error
          }
        }
      });
    }
  }

  public subscribe(callback: (msg: DuelMessage) => void): () => void {
    this.messageListeners.push(callback);
    return () => {
      this.messageListeners = this.messageListeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(msg: DuelMessage) {
    this.messageListeners.forEach((listener) => {
      try {
        listener(msg);
      } catch (err) {
        console.error('Error handling duel message', err);
      }
    });
  }

  public send(msg: Omit<DuelMessage, 'timestamp'>) {
    const fullMsg: DuelMessage = {
      ...msg,
      timestamp: Date.now(),
    };

    if (this.channel) {
      try {
        this.channel.postMessage(fullMsg);
      } catch {
        // channel error
      }
    }

    // Also write to localStorage for fallback
    try {
      localStorage.setItem('rhel_duel_last_msg', JSON.stringify(fullMsg));
    } catch {
      // storage error
    }

    // Update room storage cache
    this.updateLocalRoomCache(fullMsg);
  }

  // Update room data in localStorage
  private updateLocalRoomCache(msg: DuelMessage) {
    try {
      const roomKey = `rhel_duel_room_${msg.roomId}`;
      const existing = localStorage.getItem(roomKey);
      let room: DuelRoomState | null = existing ? JSON.parse(existing) : null;

      if (!room && msg.type === 'PLAYER_JOINED') {
        room = msg.payload.room;
      }

      if (room) {
        if (msg.type === 'PLAYER_PROGRESS' || msg.type === 'PLAYER_JOINED' || msg.type === 'PLAYER_FINISHED') {
          const player: DuelPlayer = msg.payload.player;
          if (player) {
            room.players[player.id] = player;
          }
        } else if (msg.type === 'START_COUNTDOWN') {
          room.status = 'COUNTDOWN';
          room.countdown = msg.payload.countdown || 3;
        } else if (msg.type === 'START_RACE') {
          room.status = 'RACING';
          room.startTime = msg.payload.startTime || Date.now();
        } else if (msg.type === 'RESET_ROOM') {
          room.status = 'WAITING';
          room.startTime = undefined;
          Object.keys(room.players).forEach((pid) => {
            room!.players[pid].currentCmdIndex = 0;
            room!.players[pid].currentCharIndex = 0;
            room!.players[pid].isFinished = false;
            room!.players[pid].finishTimeMs = undefined;
            room!.players[pid].streak = 0;
            room!.players[pid].activeSabotage = null;
          });
        }
        localStorage.setItem(roomKey, JSON.stringify(room));
      }
    } catch {
      // ignore cache error
    }
  }

  public getRoom(roomId: string): DuelRoomState | null {
    try {
      const existing = localStorage.getItem(`rhel_duel_room_${roomId}`);
      if (existing) {
        return JSON.parse(existing);
      }
    } catch {
      // ignore
    }
    return null;
  }

  public saveRoom(room: DuelRoomState) {
    try {
      localStorage.setItem(`rhel_duel_room_${room.roomId}`, JSON.stringify(room));
    } catch {
      // ignore
    }
  }
}

export const duelSync = new DuelSyncService();

// Helper to generate a random 4-char Room Code (e.g. RHEL-492)
export function generateRoomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  const l1 = letters.charAt(Math.floor(Math.random() * letters.length));
  const l2 = letters.charAt(Math.floor(Math.random() * letters.length));
  const n1 = nums.charAt(Math.floor(Math.random() * nums.length));
  const n2 = nums.charAt(Math.floor(Math.random() * nums.length));
  return `RHEL-${l1}${l2}${n1}${n2}`;
}

// Select a curated set of commands for a duel
export function getDuelCommands(count: number = 4): RhelCommand[] {
  // Pick diverse commands across categories
  const shuffled = [...RHEL_COMMANDS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// AI Bot ghost simulator for single-player practice duel
export interface AIBotProfile {
  id: string;
  name: string;
  title: string;
  targetWpm: number;
  accuracyRate: number;
  avatar: string;
}

export const AI_BOT_PROFILES: AIBotProfile[] = [
  {
    id: 'bot_novice',
    name: 'Junior Sysadmin',
    title: 'Junior Admin (Level 1)',
    targetWpm: 45,
    accuracyRate: 0.94,
    avatar: '🟢',
  },
  {
    id: 'bot_rhcsa',
    name: 'RHCSA_Certified_Bot',
    title: 'Red Hat Certified (Level 2)',
    targetWpm: 75,
    accuracyRate: 0.98,
    avatar: '🔴',
  },
  {
    id: 'bot_redteam',
    name: 'RedTeam_Ghost',
    title: 'Red Team Infiltrator (Level 3)',
    targetWpm: 105,
    accuracyRate: 0.99,
    avatar: '⚡',
  },
  {
    id: 'bot_kernel',
    name: 'Root_Daemon_Kernel',
    title: 'Linux Kernel God (Level 4)',
    targetWpm: 135,
    accuracyRate: 0.995,
    avatar: '💀',
  },
];
