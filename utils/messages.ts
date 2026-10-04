export interface HeartbeatMessage {
  type: 'heartbeat';
  hostname: string;
}

export type Message = HeartbeatMessage;

/** How often an active tab reports it is being used. */
export const HEARTBEAT_MS = 5_000;
/** No mouse/keyboard/scroll for this long = user walked away (unless a video plays). */
export const IDLE_MS = 60_000;
