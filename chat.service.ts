
import { config } from "./config.ts";
import { SessionPayload } from "./type.ts";
import { DB } from "./db.ts";

const fetchAppToken = async () => {
	const response = await fetch("https://id.twitch.tv/oauth2/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			client_id: Deno.env.get("APP_ID")!,
			client_secret: Deno.env.get("APP_SECRET")!,
			grant_type: "client_credentials",
		}),
	});
	if (response.status !== 200) {
		console.error("Error fetching token: ", response.statusText);
		return null;
	}
	const data = await response.json();
	return data;
}

let apptoken = await fetchAppToken();

setInterval(async () => {
	const token = await fetchAppToken();
	if (token) {
		await DB.set(["bot-api-token"], apptoken);
		console.log("[CHAT] Bot AppToken refreshed");
		apptoken = token;
	} else {
		console.error("[CHAT] Error refreshing token");
	}
}, 1000 * 60 * 30); // 30 minutes

export const ChatEventSubSession = {
    session: {} as SessionPayload,
    state: false,
};
export const Colors = [
	"blue",
	"green",
	"orange",
	"purple",
	"primary"
] as const;

export async function sendMessage(message: string, reply?: string ) {
	if (!message) return false;
	if (message.length < 1) return false;

	await fetch("https://api.twitch.tv/helix/chat/messages", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Client-ID": Deno.env.get("APP_ID")!,
			"Authorization": `Bearer ${apptoken.access_token}`,
		},
		body: JSON.stringify({
			"broadcaster_id": config.broadcaster_id,
			"sender_id": config.bot_id,
			"message": message,
			"for_source_only": true,
			"reply_parent_message_id": reply,
		}),
	}).then((res) => res.json()).catch(() => {
		console.error("[CHAT] Error sending message");
		return false;
	});
	return true;
}



export type Color = typeof Colors[number];

export async function sendAnnounce(message: string, color: Color = "blue") {
	await fetch(`https://api.twitch.tv/helix/chat/announcements?broadcaster_id=${config.broadcaster_id}&moderator_id=${config.bot_id}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Client-ID": Deno.env.get("APP_ID")!,
			"Authorization": `Bearer ${apptoken.access_token}`,
		},
		body: JSON.stringify({
			"message": message,
			"color": color,
		}),
	}).then((res) => res.json()).catch(() => {
		console.error("[CHAT] Error sending announcement");
		return false;
	});
	console.debug("[CHAT] Bot Announcement sent ");
	return true;
}
