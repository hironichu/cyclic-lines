import { config } from "./config.ts";
import { SubResponse, SubResponseItem } from "./type.ts";

export async function checkUserSub(
    token: string,
    user_id: string,
  ): Promise<boolean | SubResponseItem> {
    const uri = config.subapi_uri +
      `?broadcaster_id=${config.broadcaster_id}&user_id=${user_id}`;
    const res = await fetch(uri, {
      method: "GET",
      headers: {
        "Client-ID": Deno.env.get("APP_ID")!,
        "Authorization": `Bearer ${token}`,
      },
    }).then((res) => res.json()).catch((err) => {
      console.error("Error getting user sub: ", err);
      return null;
    }) as SubResponse;
    if (res === null) {
      return false;
    }
    if (res.data.length === 0) {
      return false;
    }
    if (res.data.length > 1) {
      console.error("More than one sub found for user: ", user_id);
      return false;
    }
    if (res.data[0].user_id !== user_id) {
      return false;
    }
  
    return res.data[0] as SubResponseItem;
  }
  