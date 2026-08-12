import { create } from "zustand";
import { api } from "./api";
import { wsClient } from "./ws";
import { Conversation, Message, User, WSEvent } from "./types";

interface AuthResponse {
  access_token: string;
  user: User;
}

interface StoreState {
  currentUser: User | null;
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  typingByConversation: Record<string, Set<string>>;
  onlineUsers: Set<string>;
  activeConversationId: string | null;

  init: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: {
    phone_number: string;
    username: string;
    password: string;
    display_name: string;
    otp: string;
  }) => Promise<void>;
  logout: () => void;

  loadConversations: () => Promise<void>;
  setActiveConversation: (id: string | null) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, replyTo?: string) => Promise<void>;
  markRead: (messageId: string) => Promise<void>;
  sendTyping: (conversationId: string, isTyping: boolean) => void;

  createDirectConversation: (otherUserId: string) => Promise<Conversation>;
  createGroupConversation: (name: string, participantIds: string[]) => Promise<Conversation>;
}

function upsertConversation(list: Conversation[], updated: Conversation): Conversation[] {
  const idx = list.findIndex((c) => c.id === updated.id);
  const next = idx === -1 ? [updated, ...list] : [...list.slice(0, idx), updated, ...list.slice(idx + 1)];
  return next.sort((a, b) => {
    const at = a.last_message?.created_at ?? "0";
    const bt = b.last_message?.created_at ?? "0";
    return at < bt ? 1 : -1;
  });
}

export const useStore = create<StoreState>((set, get) => ({
  currentUser: null,
  conversations: [],
  messagesByConversation: {},
  typingByConversation: {},
  onlineUsers: new Set(),
  activeConversationId: null,

  init: async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("signal_token");
    if (!token) return;
    try {
      const user = await api<User>("/auth/me");
      set({ currentUser: user });
      wsClient.connect(token);
      wireWsListeners(set, get);
      await get().loadConversations();
    } catch {
      localStorage.removeItem("signal_token");
    }
  },

  login: async (identifier, password) => {
    const res = await api<AuthResponse>("/auth/login", {
      method: "POST",
      body: { identifier, password },
      auth: false,
    });
    localStorage.setItem("signal_token", res.access_token);
    set({ currentUser: res.user });
    wsClient.connect(res.access_token);
    wireWsListeners(set, get);
    await get().loadConversations();
  },

  register: async (data) => {
    const res = await api<AuthResponse>("/auth/register", { method: "POST", body: data, auth: false });
    localStorage.setItem("signal_token", res.access_token);
    set({ currentUser: res.user });
    wsClient.connect(res.access_token);
    wireWsListeners(set, get);
    await get().loadConversations();
  },

  logout: () => {
    localStorage.removeItem("signal_token");
    wsClient.disconnect();
    set({
      currentUser: null,
      conversations: [],
      messagesByConversation: {},
      activeConversationId: null,
    });
  },

  loadConversations: async () => {
    const conversations = await api<Conversation[]>("/conversations");
    set({ conversations });
  },

  setActiveConversation: async (id) => {
    set({ activeConversationId: id });
    if (id && !get().messagesByConversation[id]) {
      await get().loadMessages(id);
    }
  },

  loadMessages: async (conversationId) => {
    const messages = await api<Message[]>(`/conversations/${conversationId}/messages`);
    set((s) => ({
      messagesByConversation: { ...s.messagesByConversation, [conversationId]: messages },
    }));
  },

  sendMessage: async (conversationId, content, replyTo) => {
    const currentUser = get().currentUser;
    if (!currentUser) return;

    // optimistic append
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUser.id,
      content,
      content_type: "text",
      reply_to_message_id: replyTo ?? null,
      created_at: new Date().toISOString(),
      edited_at: null,
      status: "sending",
    };
    set((s) => ({
      messagesByConversation: {
        ...s.messagesByConversation,
        [conversationId]: [...(s.messagesByConversation[conversationId] ?? []), optimistic],
      },
    }));

    const saved = await api<Message>(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: { content, reply_to_message_id: replyTo ?? null },
    });

    set((s) => {
      const list = (s.messagesByConversation[conversationId] ?? []).map((m) => (m.id === tempId ? saved : m));
      return { messagesByConversation: { ...s.messagesByConversation, [conversationId]: list } };
    });
    await get().loadConversations();
  },

  markRead: async (messageId) => {
    await api(`/messages/${messageId}/read`, { method: "POST" });
  },

  sendTyping: (conversationId, isTyping) => {
    wsClient.send({
      type: isTyping ? "typing.start" : "typing.stop",
      payload: { conversation_id: conversationId },
    });
  },

  createDirectConversation: async (otherUserId) => {
    const conv = await api<Conversation>("/conversations", {
      method: "POST",
      body: { type: "direct", participant_ids: [otherUserId] },
    });
    set((s) => ({ conversations: upsertConversation(s.conversations, conv) }));
    return conv;
  },

  createGroupConversation: async (name, participantIds) => {
    const conv = await api<Conversation>("/conversations", {
      method: "POST",
      body: { type: "group", name, participant_ids: participantIds },
    });
    set((s) => ({ conversations: upsertConversation(s.conversations, conv) }));
    return conv;
  },
}));

let wired = false;
function wireWsListeners(set: (fn: (s: StoreState) => Partial<StoreState>) => void, get: () => StoreState) {
  if (wired) return;
  wired = true;

  wsClient.subscribe((event: WSEvent) => {
    switch (event.type) {
      case "message.new": {
        const msg = event.payload;
        set((s) => {
          const existing = s.messagesByConversation[msg.conversation_id] ?? [];
          if (existing.some((m) => m.id === msg.id)) return {};
          return {
            messagesByConversation: {
              ...s.messagesByConversation,
              [msg.conversation_id]: [...existing, msg],
            },
          };
        });
        get().loadConversations();
        if (get().activeConversationId === msg.conversation_id && msg.sender_id !== get().currentUser?.id) {
          get().markRead(msg.id);
        }
        break;
      }
      case "message.read": {
        const { message_id, conversation_id } = event.payload;
        set((s) => {
          const list = (s.messagesByConversation[conversation_id] ?? []).map((m) =>
            m.id === message_id ? { ...m, status: "read" as const } : m
          );
          return { messagesByConversation: { ...s.messagesByConversation, [conversation_id]: list } };
        });
        break;
      }
      case "typing.start":
      case "typing.stop": {
        const { conversation_id, user_id } = event.payload;
        set((s) => {
          const set_ = new Set(s.typingByConversation[conversation_id] ?? []);
          if (event.type === "typing.start") set_.add(user_id);
          else set_.delete(user_id);
          return { typingByConversation: { ...s.typingByConversation, [conversation_id]: set_ } };
        });
        break;
      }
      case "presence.update": {
        const { user_id, is_online } = event.payload;
        set((s) => {
          const online = new Set(s.onlineUsers);
          if (is_online) online.add(user_id);
          else online.delete(user_id);
          return { onlineUsers: online };
        });
        break;
      }
      case "group.member_added":
      case "group.member_removed": {
        get().loadConversations();
        break;
      }
    }
  });
}
