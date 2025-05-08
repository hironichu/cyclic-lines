import { config } from "./config.ts";

export async function redeemReward(
  token: string,
  completed: boolean,
  rewardId: string,
) {
  return await fetch(
    `${config.redemption_uri}?broadcaster_id=${config.broadcaster_id}&id=${rewardId}&reward_id=${config.rewards.tts.id}`,
    {
      method: "PATCH",
      headers: {
        "Client-ID": Deno.env.get("APP_ID")!,
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: completed ? "FULFILLED" : "CANCELED",
      }),
    },
  ).catch((err) => {
    console.error("[REWARDS] Error fulfilling reward: ", err);
    return null;
  }).finally(() => {
    console.log("[REWARDS] Fulfilling reward: ", rewardId);
  });
}
