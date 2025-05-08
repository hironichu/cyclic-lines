import { config } from "../config.ts";
import { EventSubSession } from "../type.ts";
type Event = {
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
export const EventSubs = new Map<
  string,
  (id: string, subid: string) => Event
>();

EventSubs.set("channel.follow", (id: string, subid: string) => {
  return {
    "type": "channel.follow",
    "version": "2",
    "condition": {
      "broadcaster_user_id": subid,
      "moderator_user_id": subid,
    },
    "transport": {
      "method": "websocket",
      "session_id": id,
    },
  } as Event;
});

EventSubs.set("channel.subscribe", (id: string, subid: string) => {
  return {
    "type": "channel.subscribe",
    "version": "1",
    "condition": {
      "broadcaster_user_id": subid,
    },
    "transport": {
      "method": "websocket",
      "session_id": id,
    },
  } as Event;
});

EventSubs.set("channel.cheer", (id: string, subid: string) => {
  return {
    "type": "channel.cheer",
    "version": "1",
    "condition": {
      "broadcaster_user_id": subid,
    },
    "transport": {
      "method": "websocket",
      "session_id": id,
    },
  } as Event;
});
EventSubs.set("channel.raid", (id: string, subid: string) => {
  return {
    "type": "channel.raid",
    "version": "1",
    "condition": {
      "broadcaster_user_id": subid,
    },
    "transport": {
      "method": "websocket",
      "session_id": id,
    },
  } as Event;
});

EventSubs.set("channel.chat.message", (id: string, subid: string) => {
  return {
    "type": "channel.chat.message",
    "version": "1",
    "condition": {
      "broadcaster_user_id": subid,
      "user_id": subid,
    },
    "transport": {
      "method": "websocket",
      "session_id": id,
    },
  } as Event;
});

EventSubs.set(
  "channel.channel_points_custom_reward_redemption.add",
  (id: string, subid: string) => {
    return {
      "type": "channel.channel_points_custom_reward_redemption.add",
      "version": "1",
      "condition": {
        "broadcaster_user_id": subid,
      },
      "transport": {
        "method": "websocket",
        "session_id": id,
      },
    } as Event;
  },
);
EventSubs.set(
  "channel.channel_points_custom_reward_redemption.update",
  (id: string, subid: string) => {
    return {
      "type": "channel.channel_points_custom_reward_redemption.update",
      "version": "1",
      "condition": {
        "broadcaster_user_id": subid,
      },
      "transport": {
        "method": "websocket",
        "session_id": id,
      },
    } as Event;
  },
);

function jsonSafe(data: object) {
  try {
    return JSON.stringify(data);
  } catch (e) {
    console.error("Error stringifying JSON: ", e);
    return "{}";
  }
}

export const SubToEvent = async (token: string, eventName: string, info: {
  broadcaster_user_id: string;
  session_id: string;
}) => {
  console.info("[EVENTSUB] Subscribing to event:", eventName);
  if (!EventSubs.has(eventName)) {
    console.error("Event not found: ", eventName);
    return;
  }
  const event = EventSubs.get(eventName)!;
  let error = false;
  const eventReq = await fetch(config.subscription_uri, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-ID": Deno.env.get("APP_ID")!,
      "Authorization": `Bearer ${token}`,
    },
    body: jsonSafe(event(info.session_id, info.broadcaster_user_id)),
  }).then((res) => res.json()).catch((err) => {
    console.error("Error subscribing to event: ", err);
    error = true;
  });

  if (error) {
    console.error("Error subscribing to event: ", eventReq);
    return;
  }

  return eventReq;
};

///Get all the event subscriptions
export const getSubs = async (
  appID: string,
  token: string,
// deno-lint-ignore no-explicit-any
): Promise<false | any> => {
  const data = await fetch(
    config.subscription_uri,
    {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Client-Id": appID,
      },
    },
  );
  if (data.status === 401) {
    return false;
  }
  return await data.json();
};

export async function subscribeToAllEvents(token: string, session: EventSubSession) {
  await SubToEvent(
    token,
    "channel.subscribe",
    {
      broadcaster_user_id: config.broadcaster_id,
      session_id: session.session!.id,
    },
  );
  await SubToEvent(
    token,
    "channel.cheer",
    {
      broadcaster_user_id: config.broadcaster_id,
      session_id: session.session!.id,
    },
  );
  await SubToEvent(
    token,
    "channel.follow",
    {
      broadcaster_user_id: config.broadcaster_id,
      session_id: session.session!.id,
    },
  );
  await SubToEvent(
    token,
    "channel.channel_points_custom_reward_redemption.add",
    {
      broadcaster_user_id: config.broadcaster_id,
      session_id: session.session!.id,
    },
  );
  await SubToEvent(
    token,
    "channel.chat.message",
    {
      broadcaster_user_id: config.broadcaster_id,
      session_id: session.session!.id,
    },
  );
}
