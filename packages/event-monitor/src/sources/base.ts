import type { RawEvent } from '../types.js';

export interface EventSource {
  name: string;
  fetchEvents(): Promise<RawEvent[]>;
}
