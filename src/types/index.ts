export type CommandDifficulty = 'Apprentice' | 'Sysadmin' | 'Kernel Hacker';

export type CommandCategory =
  | 'RHCSA Essentials'
  | 'SELinux & Hardening'
  | 'Firewalld & Network'
  | 'LVM & Storage'
  | 'Podman Containers'
  | 'Kernel & Performance';

export interface CommandFlag {
  flag: string;
  explanationTh: string;
  explanationEn: string;
}

export interface RhelCommand {
  id: string;
  command: string;
  category: CommandCategory;
  difficulty: CommandDifficulty;
  title: string;
  summaryTh: string;
  summaryEn: string;
  flags: CommandFlag[];
  sysadminTip: string;
  mockOutput: string[];
  manPage: {
    synopsis: string;
    descriptionTh: string;
    descriptionEn: string;
    commonUseCases: string[];
  };
}

export interface KeystrokeEvent {
  char: string;
  timestamp: number;
  isCorrect: boolean;
  expectedChar: string;
}

export interface DuelPlayer {
  id: string;
  name: string;
  avatar: string;
  currentCmdIndex: number;
  totalCommands: number;
  currentCharIndex: number;
  wpm: number;
  accuracy: number;
  streak: number;
  isFinished: boolean;
  finishTimeMs?: number;
  activeSabotage?: string | null;
}

export interface DuelRoomState {
  roomId: string;
  commandIds: string[];
  status: 'WAITING' | 'COUNTDOWN' | 'RACING' | 'FINISHED';
  countdown: number;
  players: Record<string, DuelPlayer>;
  startTime?: number;
}

export type HackerTheme = 'redhat' | 'matrix' | 'amber' | 'cyberpunk';
