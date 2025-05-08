import { ModeratorData } from "./type.ts";

if (!Deno.env.has("APP_SECRET") || !Deno.env.has("APP_ID")) {
  console.error("APP_SECRET or APP_ID not found in .env file");
  Deno.exit(1);
}

if (!Deno.env.has("ELEVENLABS_API_KEY") || !Deno.env.has("BROADCASTER_ID")) {
  console.error("ELEVENLABS_API_KEY or BROADCASTER_ID not found in .env file");
  Deno.exit(1);
}

export const config = {
  redemption_uri:"https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions",
  rewards_uri: "https://api.twitch.tv/helix/channel_points/custom_rewards",
  subscription_uri: "https://api.twitch.tv/helix/eventsub/subscriptions",
  subapi_uri: "https://api.twitch.tv/helix/subscriptions",
  event_sub_uri: "wss://eventsub.wss.twitch.tv/ws",
  oauth_uri: "https://id.twitch.tv/oauth2/token",

  voices: {
    "elevenlabs": [
      {
        id: "Pu4OBG4H4NW628nfJmtm",
        model: "eleven_turbo_v2_5",
        name: "Basile",
        prefix: "!basile",
      },
      {
        id: "FNOttooGMYDRXmqkQ0Fz",
        model: "eleven_turbo_v2_5",
        name: "Martin-Dupont",
        prefix: "!martin",
      },
    ],
  },
  rewards: {
    tts: {
      id: "eebbe2c6-9aa8-4fbc-9731-672f2bb2eaa0",
    },
  },
  broadcaster_id: Deno.env.get("BROADCASTER_ID") ?? "86763229",
  bot_id: Deno.env.get("TWITCH_BOT_ID") ?? "123848316",
  redirectURL: "http://localhost:9091/redirect",
  scopes: [
    "channel:manage:redemptions",
    "channel:read:redemptions",
    "channel:moderate",
    "analytics:read:extensions",
    "channel:read:subscriptions",
    "channel:read:redemptions",
    "channel:bot",
    "user:read:follows",
    "channel:moderate",
    "channel:manage:predictions",
    "moderator:read:followers",
    "bits:read+moderator:read:chatters",
    "channel:read:predictions",
    "user:read:chat",
    "user:write:chat",
    "channel:manage:moderators",
  ],
  state:"c3ab8aa609ea11e793ae92361f002671",
  static_files: `${Deno.cwd()}/public`,
  appId: Deno.env.get("APP_ID")!,
  moderators: new Map<string, ModeratorData>(),
} as const;

export type Config = typeof config;
