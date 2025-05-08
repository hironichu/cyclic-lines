import { ElevenLabsClient } from "npm:elevenlabs";
import stream from "node:stream";
import { config } from "./config.ts";
import { isCommand, parseCommand } from "./commands.ts";
const elevenlabs = new ElevenLabsClient();

export function parseTTSMessage(modelName: string) {
	if (modelName === "") return config.voices.elevenlabs[0];
	const models = config.voices.elevenlabs.find((m) => m.prefix === `!${modelName}`);
	if (models) {
		return models;
	} else {
		return config.voices.elevenlabs[0];
	}
}

export async function tts(text: string): Promise<{buf: ArrayBuffer, text: string} | null> {
	try {
		if (text.length < 4) return null;
		if (text.length > 600) return null;
		if (text.includes("https://") || text.includes("http://")) return null;

		// deno-lint-ignore no-control-regex
		text = text.replace(/[^\x00-\x7F]/g, "");
		let voice;
		if (isCommand(text)) {
			const res = parseCommand(text);
			if (res === null) {
				voice = config.voices.elevenlabs[0];
			} else {
				voice = parseTTSMessage(res.name);
				text = text.slice(res.name.length + 1).trim();
				if (text.length < 1) return null;
			}
		} else {
			voice = config.voices.elevenlabs[0];
		}

		const data: stream.Readable = await elevenlabs.textToSpeech.convert(voice.id, {
			output_format: "mp3_44100_128",
			text: text,
			model_id: voice.model
		});

		const buf = await new Response(data).arrayBuffer();
		if (buf.byteLength < 1) {
			console.error("[TTS] Error generating TTS: ", text);
			return null;
		}
		return {buf, text};
	} catch {
		console.error("[TTS] Error generating TTS: ", text);
		return null;
	}
}