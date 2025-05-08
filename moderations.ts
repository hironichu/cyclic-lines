import { config } from "./config.ts";
import { ModeratorData, ModeratorsList } from "./type.ts";

export async function userIsModerator(user_id: string, token: string) {
  //skip checking if bot or broadcaster
  if (user_id === config.bot_id || user_id === config.broadcaster_id) {
    return true;
  }
  const uri =
    `https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${config.broadcaster_id}&user_id=${user_id}&first=1`;
  const res = await fetch(uri, {
    method: "GET",
    headers: {
      "Client-ID": Deno.env.get("APP_ID")!,
      "Authorization": `Bearer ${token}`,
    },
  }).then((res) => res.json()).catch((err) => {
    console.error("Error getting moderators: ", err);
    return null;
  });
  const data = res as { data: { user_id: string; user_login: string }[] };
  if (data.data.length === 1) {
    return true;
  }

  return false;
}
export async function getModerators() : Promise<ModeratorData[] | null> {
  const uri =
    `https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${config.broadcaster_id}&first=100`;
  const token = Deno.env.get("TWITCH_TOKEN");
  const res = await fetch(uri, {
    method: "GET",
    headers: {
      "Client-ID": Deno.env.get("APP_ID")!,
      "Authorization": `Bearer ${token}`,
    },
  }).then((res) => res.json()).catch((err) => {
    console.error("Error getting moderators: ", err);
    return null;
  });
  const data = res as ModeratorsList;
  if (!data) {
    return null;
  }

  return data.data;
}
