//clear the KV
const DB = await Deno.openKv();
await DB.delete(["api-token"]);