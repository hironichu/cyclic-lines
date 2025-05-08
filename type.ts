export type TwitchMessage = {
  author: string;
  message: string;
};
export type ParsedTwitchMessage = {
  // author: m.prefix!.nick!,
  // message: m.params[0],
  // color: m.tags?.color ?? "#fff",
  // mod : m.tags?.mod ?? m.prefix!.nick! === "hironichu" ? true : false,
  // sub : m.tags?.subscriber,
  // turbo : m.tags?.turbo,
  // badges : m.tags?.badges ?? false,
  // emotes : m.tags?.emotes ?? false,
  // highlighed : m.tags?.msgId === "highlighted-message",
  // bits : m.tags?.bits ?? false,
  author: string;
  message: string;
  color: string;
  mod: boolean;
  sub: boolean;
  turbo: boolean;
  badges: string | false;
  emotes: string | false;
  highlighed: boolean;
  bits: number | false;
};


export type TwitchEvent = {
  bits?: number;
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  is_anonymous: boolean;
  message?: string;
  user_id: string;
  user_login: string;
  user_name: string;
};
export type SessionPayload = {
  id: string;
};

export type SubResponseItem = {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  gifter_id: string;
  gifter_login: string;
  gifter_name: string;
  is_gift: boolean;
  plan_name: string;
  tier: string;
  user_id: string;
  user_name: string;
  user_login: string;
};

export type SubResponse = {
  data: SubResponseItem[];
};

export type MessageEventType = {
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  source_broadcaster_user_id: string | null;
  source_broadcaster_user_login: string | null;
  source_broadcaster_user_name: string | null;
  chatter_user_id: string;
  chatter_user_login: string;
  chatter_user_name: string;
  message_id: string;
  source_message_id: string | null;
  is_source_only: boolean | null;
  message: {
    text: string;
    fragments: Array<{
      type: string;
      text: string;
      cheermote: string | null;
      emote: string | null;
      mention: string | null;
    }>;
  };
  color: string;
  badges: Array<{
    set_id: string;
    id: string;
    info: string;
  }>;
  source_badges:
    | Array<{
      set_id: string;
      id: string;
      info: string;
    }>
    | null;
  message_type: string;
  cheer: string | null;
  reply: string | null;
  channel_points_custom_reward_id: string | null;
  channel_points_animation_id: string | null;
};

export interface EventSubSession {
  session: SessionPayload;
  state: boolean;
};

export type ResubscriptionEvent = {
  "user_id": string
  "user_login": string,
  "user_name": string,
  "broadcaster_user_id": number,
  "broadcaster_user_login": string,
  "broadcaster_user_name": string,
  "tier": number,
  "message": {
      "text": string,
      "emotes": [
          {
              "begin": number,
              "end": number,
              "id": number
          }
      ]
  },
  "cumulative_months": number,
  "streak_months": number | null, // null if not shared
  "duration_months": number,
}

export interface ModeratorData {
  user_id: string;
  user_login: string
}

export interface ModeratorsList {
  data: Array<ModeratorData>;
}

export interface Metadata {
  message_id: string
  message_type: MessageTypes
  message_timestamp: string
  subscription_type?: string
  subscription_version?: string
}

export enum MessageTypes {
  SessionWelcome = "session_welcome",
  SessionKeepAlive = "session_keepalive",
  Notification = "notification",
  Reconect = "session_reconnect",
  Revocation = "revocation"
}

export interface SubscriptionPayload {
  session?: Session
  subscription?: Subscription
  event?: ResubscriptionEvent
}

export interface NotificationPayload {
  // deno-lint-ignore no-explicit-any
  event: any;
  type: string;
}
export interface Session {
  id: string
  status: string
  connected_at: string
  keepalive_timeout_seconds: number
  reconnect_url: string | null
}

export interface Subscription {
  id: string
  status: string
  type: string
  version: string
  cost: number
  condition: Condition
  transport: Transport
  created_at: string
}
export interface Condition {
  broadcaster_user_id?: string
}

export interface Transport {
  method: string
  session_id: string
}

export interface Event {
  user_id: string
  user_login: string
  user_name: string
  broadcaster_user_id: string
  broadcaster_user_login: string
  broadcaster_user_name: string
  followed_at: string
}

export type EventSub = {
  type: string;
  version: string;
  condition: {
    broadcaster_user_id: string;
  };
  transport: {
    method: "websocket";
    session_id: string;
  };
};

export type Token = string