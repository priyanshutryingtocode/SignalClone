export interface User {
  id: string;
  phone_number: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_online: boolean;
  last_seen_at: string;
}

export interface ContactOut {
  id: string;
  nickname: string | null;
  user: User;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  content_type: "text" | "system";
  reply_to_message_id: string | null;
  created_at: string;
  edited_at: string | null;
  status: "sending" | "sent" | "delivered" | "read";
}

export interface Participant {
  user: User;
  role: "member" | "admin";
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string | null;
  avatar_url: string | null;
  participants: Participant[];
  last_message: Message | null;
  unread_count: number;
}

export type WSEvent =
  | {
      type: "message.new";
      payload: Message;
    }
  | {
      type: "message.delivered";
      payload: {
        message_id: string;
        conversation_id: string;
        user_ids: string[];
      };
    }
  | {
      type: "message.read";
      payload: {
        message_id: string;
        user_id: string;
        conversation_id: string;
      };
    }
  | {
      type: "typing.start";
      payload: {
        conversation_id: string;
        user_id: string;
      };
    }
  | {
      type: "typing.stop";
      payload: {
        conversation_id: string;
        user_id: string;
      };
    }
  | {
      type: "presence.update";
      payload: {
        user_id: string;
        is_online: boolean;
        last_seen_at: string;
      };
    }
  | {
      type: "group.member_added";
      payload: {
        conversation_id: string;
        user_id: string;
      };
    }
  | {
      type: "group.member_removed";
      payload: {
        conversation_id: string;
        user_id: string;
      };
    };