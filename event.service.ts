//TODO : Move the event stuff here

import { requestToken } from "./auth.ts";
import { storeBuffer } from "./buffer.ts";
import { channels } from "./channels.ts";
import { sendAnnounce, sendMessage } from "./chat.service.ts";
import { config } from "./config.ts";
import { DB } from "./db.ts";
import { processTwitchMessage } from "./messages.ts";
import { redeemReward } from "./rewards.ts";
import { tts } from "./tts.service.ts";
import {
  MessageEventType,
  ModeratorData,
  NotificationPayload,
  SessionPayload,
  SubscriptionPayload,
} from "./type.ts";
import { checkUserSub } from "./users.ts";
import { getSubs, subscribeToAllEvents } from "./util/eventSubs.ts";

export const EventSubSession = {
  session: {} as SessionPayload,
  state: false,
};

export async function handleNotifcation(
  token: string,
  channel: BroadcastChannel,
  type: string,
  payload: NotificationPayload,
  moderators: Map<string, ModeratorData>,
) {
  switch (type) {
    case "channel.subscribe":
      {
        channel.postMessage({
          type: "sub",
          data: payload.event,
        });
      }
      break;
    case "channel.subscription.gift":
      {
        //Should do funnny stuff here
      }
      break;
    case "channel.subscription.message":
      {
        const data = payload as SubscriptionPayload;
        const event = data.event!;
        const sub = data.subscription!;
        const message = event.message;
        if (message === null) {
          return;
        }

        console.info(
          `[TTS] ${payload.event.user_name} : ${message}`,
        );
        const result = await tts(event.message.text);
        if (result === null) {
          console.error("[EVENTSUB] SubTTS: Error in TTS, skipping...");
        } else {
          storeBuffer(sub.id, result.buf);
          event.message.text = result.text;
          channel.postMessage({
            type: "subscription",
            data: payload.event,
            attachment: {
              TUID: sub.id,
            },
          });
        }
      }
      break;
    case "channel.cheer":
      {
        const uid = "cheer:" + payload.event.id;
        const is_subbed = await checkUserSub(token, payload.event.user_id);
        if (payload.event.message !== null) {
          let message = payload.event.message;
          //if they cheer more than 200 bits we dont cut
          if (payload.event.bits <= 250 && is_subbed === false) {
            message = message.slice(0, 200) + "...";
          } else if (payload.event.bits > 250 && is_subbed === false) {
            message = message.slice(0, 500) + "...";
          } else if (is_subbed) {
            message = payload.event.message;
          }

          console.info(
            `[CHEER] ${payload.event.user_name} ${
              is_subbed ? "(subscriber)" : ""
            } : ${message}`,
          );

          const result = await tts(payload.event.message);
          if (result === null) {
            console.error("[EVENTSUB] CheerTTS: Error in TTS, skipping...");
            await redeemReward(token, false, payload.event.id);
          } else {
            storeBuffer(uid, result.buf);
            payload.event.message = result.text;
            channel.postMessage({
              type: "cheer",
              data: payload.event,
              attachment: {
                TUID: uid,
              },
            });
          }
        } else {
          channel.postMessage({
            type: "cheer",
            data: payload.event,
          });
        }
      }
      break;
    case "channel.follow":
      {
        channel.postMessage({
          type: "follow",
          data: payload.event,
        });
        sendMessage(
          "Thank you for the follow pookie " + payload.event.user_name,
        );
      }
      break;
    case "channel.channel_points_custom_reward_redemption.add":
      {
        const uid = "reward:" + payload.event.id;
        if (
          payload.event.reward.id === config.rewards.tts.id
        ) {
          const is_subbed = await checkUserSub(token, payload.event.user_id);
          let message = payload.event.user_input;

          if (
            payload.event.user_input.length >= 200 && is_subbed === false
          ) {
            message = message.slice(0, 200) + "...";
          } else if (is_subbed) {
            message = payload.event.user_input;
          }

          console.info(
            `[TTS] ${payload.event.user_name} ${
              is_subbed ? "(subscriber)" : ""
            } : ${message}`,
          );

          const result = await tts(payload.event.user_input);

          if (result === null) {
            console.error("[EVENTSUB] RewardTTS: Error in TTS, skipping...");
            await redeemReward(token, false, payload.event.id);
          } else {
            storeBuffer(uid, result.buf);
            payload.event.user_input = result.text;
            channel.postMessage({
              type: "reward",
              data: payload.event,
              attachment: {
                TUID: uid,
              },
            });
          }
        }
      }
      break;
    case "channel.chat.message":
      {
        const event = payload.event as MessageEventType;
        const is_subbed = await checkUserSub(token, event.chatter_user_id);
        await processTwitchMessage(
          channels.chat!,
          moderators,
          event,
          is_subbed,
        );
      }
      break;
    case "channel.ad_break.begin":
      {
        sendAnnounce(
          `An ad break is starting, i would appreciate it if you could support the stream by watching the ads!`,
        );
      }
      break;
    default:
      {
        console.debug("[EVENT] Got an unknown event: ", type);
      }
      break;
  }
}

let WebSocketTwitch = new WebSocket(config.event_sub_uri);
const token = Deno.env.get("TWITCH_TOKEN");
if (!token) {
    console.error("[APP] Error getting token: ", token);
    Deno.exit(1);
}
WebSocketTwitch.onopen = function () {
  console.info("[NOTIFICATIONS] EventSub WS is open now.");
  channels.chat = new BroadcastChannel("chat");
  channels.event = new BroadcastChannel("event");
};

WebSocketTwitch.onmessage = async (event) => {
  if (!token) {
    console.error("[EVENTSUB] No token found, closing application...");
    Deno.exit(1);
  }
  if (!channels.event || !channels.chat) {
    console.error("[EVENTSUB] Channels not found, closing application...");
    Deno.exit(1);
  }
  const message = JSON.parse(event.data);
  switch (message.metadata.message_type) {
    case "session_welcome":
      {
        if (EventSubSession.state) {
          console.log(
            "[EVENTSUB] Session Welcome message WS is connected now.",
          );
          return;
        }
        EventSubSession.session = message.payload.session;
        EventSubSession.state = true;

        let subs = await getSubs(config.appId, token as string);
        if (subs === false) {
          console.warn("[APP] Token expired, requesting new token...");
          await DB.delete(["api-token"]);
          await requestToken();
          subs = await getSubs(config.appId, token as string);
        }
        // console.log("Got subs: ", Number(subs.total));
        if (subs.total === 0) {
          console.log("[EVENTSUB] No subs found, creating subs now");

          await subscribeToAllEvents(token, EventSubSession);
        } else {
          //remove any event that isnt using the same session_id
          for (const sub of subs.data) {
            if (sub.transport.session_id !== EventSubSession.session!.id) {
              const res = await fetch(
                `${config.subscription_uri}?id=${sub.id}`,
                {
                  method: "DELETE",
                  headers: {
                    "Client-ID": config.appId,
                    "Authorization": `Bearer ${token}`,
                  },
                },
              );
              if (res.status !== 204) {
                console.error(
                  "[EVENTSUB] Error deleting sub: ",
                  res.status,
                  res.statusText,
                );
              }
            }
          }
          const subbed = subs.data.filter(
            (sub: { status: string; transport: { session_id: string } }) => {
              return sub.status === "enabled" &&
                sub.transport.session_id === EventSubSession.session!.id;
            },
          );

          if (subbed.length === 0) {
            await subscribeToAllEvents(token, EventSubSession);
          }
        }
      }
      break;
    case "notification":
      {
        const type = message.metadata.subscription_type;
        const payload = message.payload;
        handleNotifcation(
          token,
          channels.event,
          type,
          payload,
          config.moderators,
        );
      }
      break;
    case "revocation":
      {
        console.debug("Got a revocation message");
        console.debug(message);
      }
      break;
    case "session_keepalive":
      {
        // console.log("Twitch Pong");
        //send a pong message
      }
      break;
    default:
      {
        console.debug("Got a default message ");
        console.debug(message);
      }
      break;
  }
};

WebSocketTwitch.onclose = function (event) {
  console.log("[EventSub] WS is closed ", event.reason);
  if (channels.chat) {
    channels.chat.close();
  }
  if (channels.event) {
    channels.event.close();
  }
  EventSubSession.state = false;
  EventSubSession.session = {} as SessionPayload;
  console.log("[EventSub] WS is closed, trying to reconnect...");

  setTimeout(async () => {
    try {
      WebSocketTwitch = new WebSocket(config.event_sub_uri);
      await new Promise((resolve) => {
        if (WebSocketTwitch.readyState === WebSocket.OPEN) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    } catch {
      console.error("[EVENTSUB] Error creating WebSocket...");
    }
    console.log("[EVENTSUB] Trying to reconnect to EventSub WS...");
  }, 5000);
};
