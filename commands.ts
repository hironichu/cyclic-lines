import { sendMessage } from "./chat.service.ts";
import { DB } from "./db.ts";
import { MessageEventType } from "./type.ts";

export type Command = {
    name: string;
    args: string | string[] | null;
    type: CommandReplyType;
};
export enum CommandReplyType {
  REPLY,
  MENTION,
  NONE
}

export type CommandResult = {
    data: string;
    description: string | null;
    type: CommandReplyType;
    args: string[] | null;
}

export type NewCommand = {
  name: string;
  data: string;
  description?: string | null;
  type: CommandReplyType;
  args?: string[];
}

export async function deleteAllCommands() {
  const commands = DB.list<CommandResult>({prefix: ["commands"]});
  if (!commands) return null;
  for await (const command of commands) {
    await DB.delete(command.key);
  }
  return true;
}

export function parseCommand(command: string) : Command | null {
  //get the actual command name
  let commandName = command.split(" ")[0];
  const args = command.slice(commandName.length).trim();
  //remove any special characters from the command name
  commandName = commandName.trim();
  //get the type of reply, by spliting the name with `:` and getting the first part
  let type = CommandReplyType.NONE;
  if (commandName.includes(":")) {
    const split = commandName.split(":");

    commandName = split[0];
    if (split.length < 2) {
      type = CommandReplyType.NONE;
    } else {
      if (split[1] === "m") {
        type = CommandReplyType.MENTION;
      } else if (split[1] === "r") {
        type = CommandReplyType.REPLY;
      }
    }
  }
  commandName = commandName.replace(/[^a-zA-Z0-9]/g, "");

  if (commandName.startsWith("!") || commandName.startsWith("!!")) {
    commandName = commandName.slice(1);
  }
  if (commandName.length === 0) {
    return null;
  }

  return { name: commandName, args, type };
}

export async function getCommand(command: string): Promise<Deno.KvEntryMaybe<CommandResult> | null> {
    const cmd = await DB.get<CommandResult>(["commands", command]);
    if (!cmd) return null;
    return cmd;
}

export function isCommand(command: string) {
  return command.startsWith("!") || command.startsWith("!!");
}


export async function getCommandList() {
  const commands = DB.list<CommandResult>({prefix: ["commands"]});
  if (!commands) return null;
  const commandList: Partial<CommandResult & { name: string}>[] = [];
  for await (const command of commands) {
    const name = command.key[1] as string;
    commandList.push({name, ...command.value});
  }
  return commandList;
}

export async function addCommand(command: Command) {
  if (!command.name || !command.args) return false;
  if (typeof command.name !== "string" || command.name.length === 0) return false;
  
  const res = {
    data: command.args,
    description: null,
    args: null,
    type: command.type,
  } as CommandResult;

  const sets = await DB.set(["commands", command.name], res);
  if (!sets) return false;
  return true;
}

export async function deleteCommand(command: string) {
  if (!command) return false;
  await DB.delete(["commands", command]);
  return true;
}
export async function updateCommand(command: NewCommand) {
  if (!command.name || !command.data) return false;
  if (typeof command.name !== "string" || command.name.length === 0) return false;
  const res = {
    data: command.data,
    description: command.description || null,
    args: command.args || null,
    type: command.type,
  } as CommandResult;
  //check if the command exists
  const cmd = await DB.get<CommandResult>(["commands", command.name]);
  if (!cmd) return false;
  const sets = await DB.set(["commands", command.name], res);
  if (!sets) return false;
  return true;
}


export async function handleMainCommands(
  elevated: boolean,
  command: Command,
  event: MessageEventType,
): Promise<boolean> {
  if (command.name === "addcommand" && elevated) {
    if (!command.args) {
      console.error("[CMD] No command args found: ", command);
      sendMessage("What command do you want to edit dumbass??? LUL", event.message_id);
      return false;
    }
    const newcmd = parseCommand(command.args as string);
    if (!newcmd) {
      sendMessage("To edit a command, specify the argument !editcommand <name> <new value>", event.message_id);
      return false;
    }
    console.info("Command to add : ", newcmd);
    const didAdd = addCommand(newcmd);
    if (!didAdd) {
      console.error("[CMD] Error adding command: ", command);
    } else {
      console.log(`[${event.message_id}] Command added: `, newcmd.name);
      sendMessage(`Command added: ${newcmd.name}`, event.message_id);
      console.table(
        (await getCommandList())!.map((cmd) => {
          return {
            name: cmd.name,
            reply: cmd.data,
          };
        }),
      );
    }
    return true;
  } else if (command.name === "deletecommand" && elevated) {
    const commandToDelete = parseCommand(command.args as string);
    if (commandToDelete === null) {
      console.error("[CMD] No command args found: ", command);
      sendMessage("What command do you want to delete dumbass??? LUL", event.message_id);
      return false;
    }
    const didDelete = deleteCommand(commandToDelete.name);
    if (!didDelete) {
      console.error("[CMD] Error deleting command: ", commandToDelete);
    } else {
      console.log(
        `[${event.message_id}] Command deleted: `,
        commandToDelete.name,
      );
      sendMessage(`Command deleted: ${commandToDelete.name}`, event.message_id);
    }
    return true;
  } else if (command.name === "editcommand" && elevated) {
    const newdata = parseCommand(command.args as string);
    if (!newdata) {
      console.error("[CMD] No command args found: ", command);
      sendMessage("What command do you want to edit dumbass??? LUL", event.message_id);
      return false;
    }
    const getCurrentCommand = await getCommand(newdata.name);

    if (!getCurrentCommand) {
      console.error("[CMD] Error getting command: ", newdata.name);
      sendMessage(`Command not found: ${newdata.name}`, event.message_id);
      return false;
    }

    const didEdit = updateCommand({
      name: newdata.name,
      data: newdata.args as string,
      type: newdata.type,
      args: [],
    });

    if (!didEdit) {
      console.error("[CMD] Error editing command: ", getCurrentCommand);
    } else {
      console.log(
        `[${event.message_id}] Command edited: `,
        newdata.name,
      );
      sendMessage(
        `Command edited: ${newdata.name} : ${newdata.args}`,
        event.message_id,
      );
    }
    return true;
  }
  return false;
}