
export enum TestPhase {
  READY = 'READY',
  PINGING = 'PINGING',
  DOWNLOAD = 'DOWNLOAD',
  UPLOAD = 'UPLOAD',
  COMPLETE = 'COMPLETE'
}

export interface SpeedResults {
  download: number; // Mbps
  upload: number; // Mbps
  ping: number; // ms
  jitter: number; // ms
  timestamp: number;
}
