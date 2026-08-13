import { create } from "zustand";
import { api } from "./api";
import { wsClient } from "./ws";
import {
  Conversation,
  Message,
  User,
  WSEvent,
} from "./types";

interface AuthResponse {
  access_token: string;
  user: User;
}

interface StoreState {
  currentUser: User | null;

  conversations: Conversation[];

  messagesByConversation: Record<
    string,
    Message[]
  >;

  typingByConversation: Record<
    string,
    Set<string>
  >;

  onlineUsers: Set<string>;

  activeConversationId: string | null;

  /*
   * Returns:
   * true  -> valid session restored
   * false -> no valid session
   */
  init: () => Promise<boolean>;

  login: (
    identifier: string,
    password: string
  ) => Promise<void>;

  register: (data: {
    phone_number: string;
    username: string;
    password: string;
    display_name: string;
    otp: string;
  }) => Promise<void>;

  logout: () => void;

  loadConversations: () => Promise<void>;

  setActiveConversation: (
    id: string | null
  ) => Promise<void>;

  loadMessages: (
    conversationId: string
  ) => Promise<void>;

  sendMessage: (
    conversationId: string,
    content: string,
    replyTo?: string
  ) => Promise<void>;

  markRead: (
    messageId: string
  ) => Promise<void>;

  markConversationRead: (
    conversationId: string
  ) => Promise<void>;

  sendTyping: (
    conversationId: string,
    isTyping: boolean
  ) => void;

  createDirectConversation: (
    otherUserId: string
  ) => Promise<Conversation>;

  createGroupConversation: (
    name: string,
    participantIds: string[]
  ) => Promise<Conversation>;
}


/* =========================================================
   Helpers
========================================================= */

function dedupeMessages(
  messages: Message[]
): Message[] {
  const seen = new Set<string>();

  const result: Message[] = [];

  for (const message of messages) {
    if (seen.has(message.id)) {
      continue;
    }

    seen.add(message.id);

    result.push(message);
  }

  return result.sort(
    (a, b) =>
      new Date(
        a.created_at
      ).getTime() -
      new Date(
        b.created_at
      ).getTime()
  );
}


function sortConversations(
  conversations: Conversation[]
): Conversation[] {
  return [...conversations].sort(
    (a, b) => {
      const aTime =
        a.last_message?.created_at ?? "";

      const bTime =
        b.last_message?.created_at ?? "";

      return bTime.localeCompare(aTime);
    }
  );
}


function upsertConversation(
  conversations: Conversation[],
  updated: Conversation
): Conversation[] {
  const index =
    conversations.findIndex(
      (conversation) =>
        conversation.id ===
        updated.id
    );

  if (index === -1) {
    return sortConversations([
      updated,
      ...conversations,
    ]);
  }

  const next = [
    ...conversations,
  ];

  next[index] = updated;

  return sortConversations(next);
}


/*
 * Reconcile optimistic message with the
 * authoritative server message.
 *
 * Handles both:
 *
 * HTTP -> WebSocket
 *
 * and
 *
 * WebSocket -> HTTP
 */
function reconcileMessage(
  messages: Message[],
  temporaryId: string,
  saved: Message
): Message[] {
  /*
   * Remove any existing copy of the
   * authoritative server message.
   */
  const withoutServerDuplicate =
    messages.filter(
      (message) =>
        message.id !== saved.id
    );

  /*
   * Find optimistic message.
   */
  const tempIndex =
    withoutServerDuplicate.findIndex(
      (message) =>
        message.id === temporaryId
    );

  /*
   * Replace optimistic message.
   */
  if (tempIndex !== -1) {
    const next = [
      ...withoutServerDuplicate,
    ];

    next[tempIndex] = saved;

    return dedupeMessages(next);
  }

  /*
   * Server message already exists.
   */
  if (
    withoutServerDuplicate.some(
      (message) =>
        message.id === saved.id
    )
  ) {
    return dedupeMessages(
      withoutServerDuplicate
    );
  }

  /*
   * Otherwise append it.
   */
  return dedupeMessages([
    ...withoutServerDuplicate,
    saved,
  ]);
}


/* =========================================================
   Zustand Store
========================================================= */

export const useStore =
  create<StoreState>(
    (set, get) => ({
      currentUser: null,

      conversations: [],

      messagesByConversation: {},

      typingByConversation: {},

      onlineUsers:
        new Set<string>(),

      activeConversationId: null,


      /* ===================================================
         INIT / SESSION RESTORATION
      =================================================== */

      init: async () => {
        if (
          typeof window ===
          "undefined"
        ) {
          return false;
        }

        /*
         * IMPORTANT:
         *
         * We intentionally use localStorage
         * so authentication is persistent and consistent
         * with api.ts and the landing page.
         *
         * localStorage survives refreshes and browser restarts
         * until the user logs out or the token becomes invalid.
         */
        const token =
          localStorage.getItem(
            "signal_token"
          );

        if (!token) {
          return false;
        }

        try {
          /*
           * Only authentication blocks startup.
           */
          const user =
            await api<User>(
              "/auth/me",
              {
                timeout: 10000,
              }
            );

          set({
            currentUser: user,
          });

          /*
           * Register WebSocket listener.
           */
          wireWsListeners(
            set,
            get
          );

          /*
           * Connect WebSocket.
           *
           * This does NOT block rendering.
           */
          wsClient.connect(token);

          /*
           * Load conversations in background.
           *
           * A slow /conversations request must
           * never leave the entire application
           * stuck on Loading.
           */
          get()
            .loadConversations()
            .catch((error) => {
              console.error(
                "Failed to load conversations:",
                error
              );
            });

          return true;

        } catch (error) {
          console.error(
            "Session initialization failed:",
            error
          );

          localStorage.removeItem(
            "signal_token"
          );

          wsClient.disconnect();

          set({
            currentUser: null,

            conversations: [],

            messagesByConversation:
              {},

            typingByConversation:
              {},

            onlineUsers:
              new Set<string>(),

            activeConversationId:
              null,
          });

          return false;
        }
      },


      /* ===================================================
         LOGIN
      =================================================== */

      login: async (
        identifier,
        password
      ) => {
        const response =
          await api<AuthResponse>(
            "/auth/login",
            {
              method: "POST",

              body: {
                identifier,
                password,
              },

              auth: false,

              timeout: 10000,
            }
          );

        /*
         * IMPORTANT:
         *
         * Use localStorage for persistent authentication.
         *
         * Refresh:
         *   stays logged in
         *
         * Close tab/browser:
         *   session disappears
         */
        localStorage.setItem(
          "signal_token",
          response.access_token
        );

        /*
         * Immediately authenticate the
         * application.
         */
        set({
          currentUser:
            response.user,

          conversations: [],

          messagesByConversation:
            {},

          typingByConversation:
            {},

          onlineUsers:
            new Set<string>(),

          activeConversationId:
            null,
        });

        wireWsListeners(
          set,
          get
        );

        wsClient.connect(
          response.access_token
        );

        /*
         * Load conversations in background.
         */
        get()
          .loadConversations()
          .catch((error) => {
            console.error(
              "Failed to load conversations after login:",
              error
            );
          });
      },


      /* ===================================================
         REGISTER
      =================================================== */

      register: async (
        data
      ) => {
        const response =
          await api<AuthResponse>(
            "/auth/register",
            {
              method: "POST",

              body: data,

              auth: false,

              timeout: 10000,
            }
          );

        /*
         * Persistent authentication.
         */
        localStorage.setItem(
          "signal_token",
          response.access_token
        );

        set({
          currentUser:
            response.user,

          conversations: [],

          messagesByConversation:
            {},

          typingByConversation:
            {},

          onlineUsers:
            new Set<string>(),

          activeConversationId:
            null,
        });

        wireWsListeners(
          set,
          get
        );

        wsClient.connect(
          response.access_token
        );

        /*
         * Background conversation loading.
         */
        get()
          .loadConversations()
          .catch((error) => {
            console.error(
              "Failed to load conversations after registration:",
              error
            );
          });
      },


      /* ===================================================
         LOGOUT
      =================================================== */

      logout: () => {
        /*
         * Destroy session immediately.
         */
        localStorage.removeItem(
          "signal_token"
        );

        /*
         * Stop WebSocket reconnect attempts.
         */
        wsClient.disconnect();

        /*
         * Clear all user-specific state.
         */
        set({
          currentUser: null,

          conversations: [],

          messagesByConversation:
            {},

          typingByConversation:
            {},

          onlineUsers:
            new Set<string>(),

          activeConversationId:
            null,
        });
      },


      /* ===================================================
         LOAD CONVERSATIONS
      =================================================== */

      loadConversations:
        async () => {
          try {
            const conversations =
              await api<
                Conversation[]
              >(
                "/conversations",
                {
                  timeout: 10000,
                }
              );

            /*
             * Don't update state if the user
             * logged out while the request
             * was in flight.
             */
            if (
              !get().currentUser
            ) {
              return;
            }

            set({
              conversations:
                sortConversations(
                  conversations
                ),
            });

          } catch (error) {
            console.error(
              "Failed to load conversations:",
              error
            );

            /*
             * Keep existing state if this was
             * only a temporary network failure.
             */
          }
        },


      /* ===================================================
         ACTIVE CONVERSATION
      =================================================== */

      setActiveConversation:
        async (id) => {
          /*
           * Update immediately.
           */
          set({
            activeConversationId:
              id,
          });

          if (!id) {
            return;
          }

          /*
           * Load messages only if necessary.
           */
          if (
            !get()
              .messagesByConversation[id]
          ) {
            try {
              await get().loadMessages(
                id
              );
            } catch (error) {
              console.error(
                "Failed to load messages:",
                error
              );

              return;
            }
          }

          /*
           * Clear unread badge immediately.
           */
          set((state) => ({
            conversations:
              state.conversations.map(
                (conversation) =>
                  conversation.id === id
                    ? {
                        ...conversation,
                        unread_count: 0,
                      }
                    : conversation
              ),
          }));

          /*
           * Persist read state.
           */
          await get()
            .markConversationRead(id)
            .catch((error) => {
              console.error(
                "Failed to mark conversation as read:",
                error
              );
            });
        },


      /* ===================================================
         LOAD MESSAGES
      =================================================== */

      loadMessages:
        async (
          conversationId
        ) => {
          const messages =
            await api<Message[]>(
              `/conversations/${conversationId}/messages`,
              {
                timeout: 10000,
              }
            );

          /*
           * Merge instead of blindly replacing.
           *
           * A WebSocket event could have arrived
           * while this request was in flight.
           */
          set((state) => {
            const existing =
              state
                .messagesByConversation[
                  conversationId
                ] ?? [];

            return {
              messagesByConversation: {
                ...state.messagesByConversation,

                [conversationId]:
                  dedupeMessages([
                    ...messages,
                    ...existing,
                  ]),
              },
            };
          });
        },


      /* ===================================================
         SEND MESSAGE
      =================================================== */

      sendMessage:
        async (
          conversationId,
          content,
          replyTo
        ) => {
          const currentUser =
            get().currentUser;

          if (!currentUser) {
            return;
          }

          const trimmed =
            content.trim();

          if (!trimmed) {
            return;
          }

          /*
           * Unique optimistic ID.
           */
          const temporaryId =
            `temp-${crypto.randomUUID()}`;

          const optimistic:
            Message = {
              id: temporaryId,

              conversation_id:
                conversationId,

              sender_id:
                currentUser.id,

              content: trimmed,

              content_type: "text",

              reply_to_message_id:
                replyTo ?? null,

              created_at:
                new Date().toISOString(),

              edited_at: null,

              status: "sending",
            };


          /*
           * Add optimistic message.
           */
          set((state) => {
            const existing =
              state
                .messagesByConversation[
                  conversationId
                ] ?? [];

            return {
              messagesByConversation: {
                ...state.messagesByConversation,

                [conversationId]:
                  dedupeMessages([
                    ...existing,
                    optimistic,
                  ]),
              },
            };
          });


          try {
            /*
             * Send to backend.
             */
            const saved =
              await api<Message>(
                `/conversations/${conversationId}/messages`,
                {
                  method: "POST",

                  body: {
                    content: trimmed,

                    reply_to_message_id:
                      replyTo ?? null,
                  },

                  timeout: 10000,
                }
              );


            /*
             * Replace optimistic message
             * with authoritative server message.
             */
            set((state) => {
              const existing =
                state
                  .messagesByConversation[
                    conversationId
                  ] ?? [];

              return {
                messagesByConversation: {
                  ...state.messagesByConversation,

                  [conversationId]:
                    reconcileMessage(
                      existing,
                      temporaryId,
                      saved
                    ),
                },
              };
            });


            /*
             * Refresh conversation preview
             * in background.
             */
            get()
              .loadConversations()
              .catch((error) => {
                console.error(
                  "Failed to refresh conversations:",
                  error
                );
              });

          } catch (error) {
            /*
             * Remove failed optimistic message.
             */
            set((state) => {
              const existing =
                state
                  .messagesByConversation[
                    conversationId
                  ] ?? [];

              return {
                messagesByConversation: {
                  ...state.messagesByConversation,

                  [conversationId]:
                    existing.filter(
                      (message) =>
                        message.id !==
                        temporaryId
                    ),
                },
              };
            });

            throw error;
          }
        },


      /* ===================================================
         MARK MESSAGE READ
      =================================================== */

      markRead:
        async (
          messageId
        ) => {
          try {
            await api(
              `/messages/${messageId}/read`,
              {
                method: "POST",

                timeout: 10000,
              }
            );

            let conversationId:
              | string
              | null = null;

            /*
             * Find conversation containing
             * the message.
             */
            for (
              const [
                id,
                messages,
              ] of Object.entries(
                get()
                  .messagesByConversation
              )
            ) {
              if (
                messages.some(
                  (message) =>
                    message.id ===
                    messageId
                )
              ) {
                conversationId =
                  id;

                break;
              }
            }

            if (
              !conversationId
            ) {
              return;
            }

            /*
             * Update local state.
             */
            set((state) => ({
              messagesByConversation: {
                ...state.messagesByConversation,

                [conversationId!]:
                  (
                    state
                      .messagesByConversation[
                        conversationId!
                      ] ?? []
                  ).map(
                    (message) =>
                      message.id ===
                      messageId
                        ? {
                            ...message,
                            status:
                              "read",
                          }
                        : message
                  ),
              },

              conversations:
                state.conversations.map(
                  (conversation) =>
                    conversation.id ===
                    conversationId
                      ? {
                          ...conversation,
                          unread_count:
                            0,
                        }
                      : conversation
                ),
            }));

          } catch (error) {
            console.error(
              "Failed to mark message as read:",
              error
            );
          }
        },


      /* ===================================================
         MARK CONVERSATION READ
      =================================================== */

      markConversationRead:
        async (
          conversationId
        ) => {
          const currentUser =
            get().currentUser;

          if (!currentUser) {
            return;
          }

          const messages =
            get()
              .messagesByConversation[
                conversationId
              ] ?? [];

          /*
           * Find newest incoming message.
           */
          const lastIncoming =
            [...messages]
              .reverse()
              .find(
                (message) =>
                  message.sender_id !==
                    currentUser.id &&
                  message.content_type !==
                    "system"
              );

          if (!lastIncoming) {
            return;
          }

          await get().markRead(
            lastIncoming.id
          );
        },


      /* ===================================================
         TYPING
      =================================================== */

      sendTyping:
        (
          conversationId,
          isTyping
        ) => {
          wsClient.send({
            type: isTyping
              ? "typing.start"
              : "typing.stop",

            payload: {
              conversation_id:
                conversationId,
            },
          });
        },


      /* ===================================================
         DIRECT CONVERSATION
      =================================================== */

      createDirectConversation:
        async (
          otherUserId
        ) => {
          const conversation =
            await api<Conversation>(
              "/conversations",
              {
                method: "POST",

                body: {
                  type: "direct",

                  participant_ids: [
                    otherUserId,
                  ],
                },

                timeout: 10000,
              }
            );

          set((state) => ({
            conversations:
              upsertConversation(
                state.conversations,
                conversation
              ),
          }));

          return conversation;
        },


      /* ===================================================
         GROUP CONVERSATION
      =================================================== */

      createGroupConversation:
        async (
          name,
          participantIds
        ) => {
          const conversation =
            await api<Conversation>(
              "/conversations",
              {
                method: "POST",

                body: {
                  type: "group",

                  name,

                  participant_ids:
                    participantIds,
                },

                timeout: 10000,
              }
            );

          set((state) => ({
            conversations:
              upsertConversation(
                state.conversations,
                conversation
              ),
          }));

          return conversation;
        },
    })
  );


/* =========================================================
   WebSocket Event Handling
========================================================= */

let wired = false;


function wireWsListeners(
  set: (
    updater: (
      state: StoreState
    ) => Partial<StoreState>
  ) => void,

  get: () => StoreState
) {
  /*
   * Prevent multiple subscriptions.
   *
   * This is especially important with:
   *
   * - Next.js Fast Refresh
   * - login
   * - logout
   * - reconnect
   */
  if (wired) {
    return;
  }

  wired = true;


  wsClient.subscribe(
    (event: WSEvent) => {
      switch (event.type) {

        /* ===============================================
           NEW MESSAGE
        =============================================== */

        case "message.new": {
          const message =
            event.payload;

          set((state) => {
            const existing =
              state
                .messagesByConversation[
                  message.conversation_id
                ] ?? [];

            /*
             * Never insert the same server message
             * twice.
             */
            if (
              existing.some(
                (item) =>
                  item.id ===
                  message.id
              )
            ) {
              return {};
            }


            /*
             * If the backend broadcasts the sender's
             * own message, reconcile it with the
             * optimistic temp message.
             */
            const currentUser =
              state.currentUser;

            if (
              currentUser &&
              message.sender_id ===
                currentUser.id
            ) {
              const optimisticIndex =
                existing.findIndex(
                  (item) =>
                    item.id.startsWith(
                      "temp-"
                    ) &&
                    item.sender_id ===
                      message.sender_id &&
                    item.content ===
                      message.content &&
                    item.reply_to_message_id ===
                      message.reply_to_message_id
                );

              if (
                optimisticIndex !==
                -1
              ) {
                const updated = [
                  ...existing,
                ];

                updated[
                  optimisticIndex
                ] = message;

                return {
                  messagesByConversation: {
                    ...state.messagesByConversation,

                    [message.conversation_id]:
                      dedupeMessages(
                        updated
                      ),
                  },
                };
              }
            }


            /*
             * Normal incoming message.
             */
            return {
              messagesByConversation: {
                ...state.messagesByConversation,

                [message.conversation_id]:
                  dedupeMessages([
                    ...existing,
                    message,
                  ]),
              },
            };
          });


          /*
           * If the conversation is currently open,
           * automatically mark incoming messages as read.
           */
          if (
            get()
              .activeConversationId ===
              message.conversation_id &&
            message.sender_id !==
              get()
                .currentUser?.id
          ) {
            get()
              .markRead(
                message.id
              )
              .catch((error) => {
                console.error(
                  "Failed to mark incoming message as read:",
                  error
                );
              });
          }

          break;
        }


        /* ===============================================
           MESSAGE READ
        =============================================== */

        case "message.read": {
          const {
            message_id,
            conversation_id,
          } = event.payload;

          set((state) => {
            const messages =
              state
                .messagesByConversation[
                  conversation_id
                ] ?? [];

            return {
              messagesByConversation: {
                ...state.messagesByConversation,

                [conversation_id]:
                  messages.map(
                    (message) =>
                      message.id ===
                      message_id
                        ? {
                            ...message,
                            status:
                              "read",
                          }
                        : message
                  ),
              },
            };
          });

          break;
        }


        /* ===============================================
           TYPING START / STOP
        =============================================== */

        case "typing.start":
        case "typing.stop": {
          const {
            conversation_id,
            user_id,
          } = event.payload;

          set((state) => {
            const users =
              new Set(
                state
                  .typingByConversation[
                    conversation_id
                  ] ?? []
              );

            if (
              event.type ===
              "typing.start"
            ) {
              users.add(user_id);
            } else {
              users.delete(user_id);
            }

            return {
              typingByConversation: {
                ...state.typingByConversation,

                [conversation_id]:
                  users,
              },
            };
          });

          break;
        }


        /* ===============================================
           PRESENCE
        =============================================== */

        case "presence.update": {
          const {
            user_id,
            is_online,
          } = event.payload;

          set((state) => {
            const online =
              new Set(
                state.onlineUsers
              );

            if (is_online) {
              online.add(user_id);
            } else {
              online.delete(user_id);
            }

            return {
              onlineUsers:
                online,
            };
          });

          break;
        }


        /* ===============================================
           GROUP MEMBERSHIP
        =============================================== */

        case "group.member_added":
        case "group.member_removed": {
          /*
           * Background refresh.
           */
          get()
            .loadConversations()
            .catch((error) => {
              console.error(
                "Failed to refresh conversations after group change:",
                error
              );
            });

          break;
        }
      }
    }
  );
}