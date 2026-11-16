import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { fetchModels, streamChat, type Effort, type ModelInfo } from '@/lib/api';
import * as store from '@/lib/db';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning: string;
  thoughtMs: number | null;
  model: string | null;
  error: string | null;
  createdAt: number;
}

interface ChatState {
  ready: boolean;
  models: ModelInfo[];
  model: string;
  effort: Effort;
  conversations: store.ConversationRow[];
  messages: Record<string, Message[]>;
  streaming: { conversationId: string; messageId: string; phase: 'thinking' | 'writing' } | null;
  init(): Promise<void>;
  setModel(id: string): void;
  setEffort(e: Effort): void;
  openConversation(id: string): Promise<void>;
  /** Mesajı gönderir ve sohbet kimliğini hemen döndürür; yanıt arka planda akar. */
  send(text: string, conversationId?: string): string;
  stop(): void;
  /** Son yanıtı silip aynı soruyu yeniden gönderir. */
  retry(conversationId: string): void;
  remove(id: string): Promise<void>;
}

const FALLBACK_MODELS: ModelInfo[] = [
  { id: 'gur-meridian', name: 'Gur Meridian', tagline: 'En yetenekli', reasoning: true, poweredBy: '', available: true },
];

let controller: AbortController | null = null;

const toMessage = (r: store.MessageRow): Message => ({
  id: r.id,
  role: r.role,
  content: r.content,
  reasoning: r.reasoning ?? '',
  thoughtMs: r.thought_ms,
  model: r.model,
  error: r.error,
  createdAt: r.created_at,
});

const makeTitle = (text: string) => {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 42 ? `${t.slice(0, 40)}…` : t || 'Yeni sohbet';
};

export const useChat = create<ChatState>((set, get) => ({
  ready: false,
  models: FALLBACK_MODELS,
  model: 'gur-meridian',
  effort: 'medium',
  conversations: [],
  messages: {},
  streaming: null,

  async init() {
    const [models, conversations] = await Promise.allSettled([fetchModels(), store.listConversations()]);
    set({
      ready: true,
      ...(models.status === 'fulfilled'
        ? { models: models.value.models, model: models.value.default }
        : {}),
      conversations: conversations.status === 'fulfilled' ? conversations.value : [],
    });
  },

  setModel: (id) => set({ model: id }),
  setEffort: (effort) => set({ effort }),

  async openConversation(id) {
    if (get().messages[id]) return;
    const rows = await store.getMessages(id);
    set((s) => ({ messages: { ...s.messages, [id]: rows.map(toMessage) } }));
  },

  send(text, conversationId) {
    const content = text.trim();
    if (!content || get().streaming) return conversationId ?? '';
    const convId = conversationId ?? Crypto.randomUUID();
    const now = Date.now();
    const { model, effort } = get();
    const prior = get().messages[convId] ?? [];

    const user: Message = { id: Crypto.randomUUID(), role: 'user', content, reasoning: '', thoughtMs: null, model: null, error: null, createdAt: now };
    const reply: Message = { id: Crypto.randomUUID(), role: 'assistant', content: '', reasoning: '', thoughtMs: null, model, error: null, createdAt: now + 1 };

    const conv: store.ConversationRow = {
      id: convId,
      title: prior.length ? get().conversations.find((c) => c.id === convId)?.title ?? makeTitle(content) : makeTitle(content),
      model,
      updated_at: now,
    };
    set((s) => ({
      messages: { ...s.messages, [convId]: [...prior, user, reply] },
      conversations: [conv, ...s.conversations.filter((c) => c.id !== convId)],
      streaming: { conversationId: convId, messageId: reply.id, phase: 'thinking' },
    }));
    void (async () => {
    await store.upsertConversation(conv).catch(() => {});
    await store.saveMessage({ ...user, conversation_id: convId, reasoning: null, thought_ms: null, model: null, error: null, created_at: user.createdAt }).catch(() => {});

    const patch = (fn: (m: Message) => Message) =>
      set((s) => ({
        messages: {
          ...s.messages,
          [convId]: (s.messages[convId] ?? []).map((m) => (m.id === reply.id ? fn(m) : m)),
        },
      }));

    controller = new AbortController();
    const started = Date.now();
    let firstText: number | null = null;

    // Bağlamı makul tut: son 40 mesaj, hatalı yanıtlar hariç.
    const history = [...prior, user]
      .filter((m) => !m.error && m.content)
      .slice(-40)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      await streamChat(
        { model, messages: history, effort },
        (e) => {
          if (e.type === 'reasoning') patch((m) => ({ ...m, reasoning: m.reasoning + e.t }));
          else if (e.type === 'delta') {
            if (firstText === null) {
              firstText = Date.now();
              set((s) => (s.streaming ? { streaming: { ...s.streaming, phase: 'writing' } } : {}));
            }
            patch((m) => ({ ...m, content: m.content + e.t }));
          } else if (e.type === 'error') patch((m) => ({ ...m, error: e.message }));
        },
        controller.signal,
      );
    } catch (err) {
      const aborted = controller?.signal.aborted;
      patch((m) => ({ ...m, error: aborted ? null : err instanceof Error ? err.message : 'Bağlantı hatası' }));
    } finally {
      const thought = firstText !== null ? firstText - started : null;
      patch((m) => ({ ...m, thoughtMs: m.reasoning ? thought : null }));
      const final = get().messages[convId]?.find((m) => m.id === reply.id);
      if (final) {
        await store.saveMessage({
          id: final.id, conversation_id: convId, role: 'assistant', content: final.content,
          reasoning: final.reasoning || null, thought_ms: final.thoughtMs, model: final.model,
          error: final.error, created_at: final.createdAt,
        }).catch(() => {});
      }
      controller = null;
      set({ streaming: null });
    }
    })();
    return convId;
  },

  stop() {
    controller?.abort();
  },

  retry(conversationId) {
    if (get().streaming) return;
    const list = get().messages[conversationId] ?? [];
    const lastUser = [...list].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    const drop = list.filter((m) => m.createdAt >= lastUser.createdAt).map((m) => m.id);
    set((s) => ({ messages: { ...s.messages, [conversationId]: list.filter((m) => !drop.includes(m.id)) } }));
    void store.deleteMessages(drop).catch(() => {});
    get().send(lastUser.content, conversationId);
  },

  async remove(id) {
    await store.deleteConversation(id);
    set((s) => {
      const { [id]: _, ...rest } = s.messages;
      return { conversations: s.conversations.filter((c) => c.id !== id), messages: rest };
    });
  },
}));
