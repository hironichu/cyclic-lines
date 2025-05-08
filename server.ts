import * as http from "@std/http";
import { config } from "./config.ts";
import { MessageEventType, Token, TwitchEvent } from "./type.ts";
import { DB } from "./db.ts";
import { getCommandList } from "./commands.ts";
import { getModerators } from "./moderations.ts";
import { consumeBuffer, getKey } from "./buffer.ts";
import { redeemReward } from "./rewards.ts";
import { requestToken } from "./auth.ts";

const FULL_UPDATE_INTERVAL = 1_200; // 10 seconds
const FULL_UPDATE_INTERVALEV = 5_200; // 10 seconds

const token = await DB.get<Token>(["api-token"]);

if (!token.value) {
  console.error("[APP] No token found, requesting new token...");
  await requestToken();
} else {
  Deno.env.set("TWITCH_TOKEN", token.value);
}

await import("./chat.service.ts");
await import("./event.service.ts");

console.info("[APP] Loading moderators...");
const mods = await getModerators();
if (mods === null) {
  console.error("[APP] Error getting moderators: ", mods);
} else {
  mods.forEach((mod) => {
    config.moderators.set(mod.user_id, mod);
  });

  console.info("[APP] Moderators loaded: ", config.moderators.size);
}

console.info("[APP] Loading commands...");
const commands = await getCommandList();

console.info("[APP] Commands loaded : ", commands?.length);
console.table(commands!.map((cmd) => {
  return {
    name: cmd.name,
    reply: cmd.data,
  };
}));

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname;
  if (!token.value) {
    console.error("[APP] No token found, closing application...");
    Deno.exit(1);
  }

  if (path.startsWith("/tts")) {
    if (req.method === "GET") {
      const tuid = url.searchParams.get("tuid");
      if (tuid === null) {
        return new Response("Invalid request", { status: 400 });
      }

      if (!getKey(tuid)) {
        return new Response("Tuid not found", { status: 404 });
      }
      const buffer = consumeBuffer(tuid);
      if (buffer === null) {
        return new Response("Tuid not found", { status: 404 });
      }
      if (tuid.startsWith("cheer:")) {
        // const cheerId = tuid.split(":")[1];
        // await redeemReward(true, cheerId);
      } else if (tuid.startsWith("reward:")) {
        const rewardId = tuid.split(":")[1];
        await redeemReward(token.value, true, rewardId);
      } else {
        return new Response("Tuid not valid", { status: 404 });
      }
      //now that it has been confurmed that the tuid is valid, delete it from the DB
      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "audio/wav",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } else {
      return new Response("Invalid request", { status: 400 });
    }
  } else if (path.startsWith("/messages")) {
    let timerId: number | undefined;
    const chatChannel = new BroadcastChannel("chat");
    const body = new ReadableStream({
      async start(controller) {
        controller.enqueue(`retry: 1000\n\n`);

        chatChannel.onmessage = (e) => {
          const updates = [e.data] as MessageEventType[];
          controller.enqueue(`data: ${JSON.stringify(updates)}\n\n`);
        };

        function queueFullUpdate() {
          timerId = undefined;
          try {
            const updates: MessageEventType[] = [];
            controller.enqueue(`data: ${JSON.stringify(updates)}\n\n`);
          } finally {
            timerId = setTimeout(queueFullUpdate, FULL_UPDATE_INTERVAL);
          }
        }

        await queueFullUpdate();
      },
      cancel() {
        chatChannel.close();
        if (typeof timerId === "number") clearInterval(timerId);
      },
    });

    return new Response(body.pipeThrough(new TextEncoderStream()), {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      },
    });
  } else if (path.startsWith("/events")) {
    let timerId: number | undefined;
    const eventChannel = new BroadcastChannel("event");
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(`retry: 5000\n\n`);

        eventChannel.onmessage = (e) => {
          const updates = [e.data];
          controller.enqueue(`data: ${JSON.stringify(updates)}\n\n`);
        };

        function queueFullUpdate() {
          timerId = undefined;
          try {
            const updates: TwitchEvent[] = [];
            controller.enqueue(`data: ${JSON.stringify(updates)}\n\n`);
          } finally {
            timerId = setTimeout(queueFullUpdate, FULL_UPDATE_INTERVALEV);
          }
        }

        queueFullUpdate();
      },
      cancel() {
        // console.log("[EVENTS] Closing stream...");
        eventChannel.close();
        if (typeof timerId === "number") clearInterval(timerId);
      },
    });
    return new Response(body.pipeThrough(new TextEncoderStream()), {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      },
    });
  } else if (path.startsWith("/redirect")) {
    const token = url.searchParams.get("token");
    if (token) {
      await DB.set(["api-token"], token);
    } else {
      console.error("[APP] No token found in redirect URL");
      return new Response("Invalid request", { status: 400 });
    }
    return new Response("Ok", { status: 200 });
  } else {
    try {
      return await http.serveDir(req, {
        showDirListing: true,
        enableCors: true,
        quiet: true,
        fsRoot: config.static_files,
        urlRoot: "",
      });
    } catch {
      return new Response("Internal server error", { status: 500 });
    }
  }
};

Deno.serve({ handler: handler, port: 9090, onListen: () => {} });
