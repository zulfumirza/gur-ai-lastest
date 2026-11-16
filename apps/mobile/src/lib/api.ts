import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';
import { getDeviceId } from './device';
import { SSEParser, type GurEvent } from './sse';
import type { Mode } from './modes';

export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:8787';

export type Effort = 'low' | 'medium' | 'high';

export interface ModelInfo {
  id: string;
  name: string;
  tagline: string;
  reasoning: boolean;
  poweredBy: string;
  available: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function fetchModels(): Promise<{ default: string; models: ModelInfo[] }> {
  const res = await fetch(`${API_URL}/v1/models`);
  if (!res.ok) throw new Error('Model listesi alınamadı');
  return res.json();
}

async function readError(res: { json(): Promise<unknown> }): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? 'Bir şeyler ters gitti';
  } catch {
    return 'Bir şeyler ters gitti';
  }
}

/** Yanıtı SSE olarak akıtır; her olay için `onEvent` çağrılır. */
export async function streamChat(
  args: { model: string; messages: ChatMessage[]; effort: Effort; mode: Mode },
  onEvent: (e: GurEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/v1/chat`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
      'x-gur-device': await getDeviceId(),
    },
    body: JSON.stringify(args),
    signal,
  });
  if (!res.ok) throw new Error(await readError(res));
  if (!res.body) throw new Error('Akış desteklenmiyor');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = new SSEParser();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const e of parser.push(decoder.decode(value, { stream: true }))) onEvent(e);
  }
}
