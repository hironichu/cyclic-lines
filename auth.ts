import { config } from "./config.ts";
import { DB } from "./db.ts";
import { Token } from "./type.ts";
import * as systemopen from "jsr:@lambdalisue/systemopen";

const ConnectURL =
  `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${
    Deno.env.get("APP_ID")
  }&redirect_uri=${config.redirectURL}&scope=${
    config.scopes.join(" ")
  }&state=${config.state}`;

export async function requestToken() {
    await systemopen.systemopen(ConnectURL);
  
    const dirlistener = async (req: Request) => {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");
      if (code) {
        const AuthTwitch = await fetch(config.oauth_uri, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: Deno.env.get("APP_ID")!,
            client_secret: Deno.env.get("APP_SECRET")!,
            code: code,
            grant_type: "authorization_code",
            redirect_uri: "http://localhost:9090/redirect",
          }),
        });
  
        const AuthTwitchJson = await AuthTwitch.json();
        await DB.set(["api-token"], AuthTwitchJson.access_token);
        Deno.env.set("TWITCH_TOKEN", AuthTwitchJson.access_token!);
        return new Response(
          ` <script>window.close();</script> Thank you, you can now close this window if this was not done automatically.
          `,
          {
            headers: {
              "content-type": "text/html; charset=UTF-8",
            },
          },
        );
      } else {
        return new Response(
          `Invalid URL`,
          {
            status: 400,
            headers: {
              "content-type": "text/html; charset=UTF-8",
            },
          },
        );
      }
    };
    const listener = Deno.serve({
      handler: dirlistener,
      port: 9091,
      onListen: () => {},
    });
    listener.unref();
  
    await new Promise((resolve, _) => {
      const interval = setInterval(async () => {
        const token = await DB.get<Token>(["api-token"]);
        if (token.value) {
          console.log("[APP] Token found in DB, closing listener...");
          Deno.env.set("TWITCH_TOKEN", token.value );
          listener.shutdown();
          clearInterval(interval);
          resolve(undefined);
        }
      }, 1000);
    });
  }