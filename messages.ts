import { sendMessage } from "./chat.service.ts";
import { handleMainCommands, isCommand, parseCommand, getCommand, CommandReplyType } from "./commands.ts";
import { MessageEventType, ModeratorData, SubResponseItem } from "./type.ts";

import { config } from "./config.ts";

export async function processTwitchMessage(channel: BroadcastChannel, moderators: Map<string, ModeratorData>, event: MessageEventType, isSub: boolean | SubResponseItem) {
    if (event.channel_points_custom_reward_id !== null) {
      return ;
    }
    let elevated = false;

    const isMod = moderators.has(event.chatter_user_id);
    const isAdmin = event.chatter_user_id === config.broadcaster_id;
  
    if (isMod || isAdmin) {
      elevated = true;
    }

    if (isCommand(event.message.text)) {
      const command = parseCommand(event.message.text);
      
      if (command === null) {
        console.error("[CMD] Error parsing command: ", event.message.text);
        return;
      }

      if (!await handleMainCommands(elevated, command, event)) {
        const resolved = await getCommand(command.name);
        if (!resolved || resolved.value === null) {
          console.error("[CMD] Error resolving command: ", command.name);
        } else {
          switch (resolved.value.type) {
            case CommandReplyType.REPLY: {
              sendMessage(`${resolved.value.data}`, event.message_id);
            } break;
            case CommandReplyType.MENTION: {
              sendMessage(`@${event.chatter_user_name} ${resolved.value.data}`);
            } break;
            case CommandReplyType.NONE: {
              sendMessage(resolved.value.data);
            } break;
          }
          
        }
      }
    } else {
      channel.postMessage({
        ...event,
        isMod,
        isSub,
      });
    }
  }