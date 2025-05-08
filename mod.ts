
import * as sass from "npm:sass";
console.info("[BOOT] Compiling Alerts and Main SCSS")

const cpmiled = sass.compile("./scss/index.scss", {
	style: "compressed",
	loadPaths: ["./scss"],
});

const alerts = sass.compile("./scss/alerts.scss", {
	style: "compressed",
	loadPaths: ["./scss"],
});


Deno.writeTextFileSync("./public/css/main.min.css", cpmiled.css as string,{
	create: true,
	mode: 0o666,
});

Deno.writeTextFileSync("./public/css/alerts.min.css", alerts.css as string, {
	create: true,
	mode: 0o666,
});

console.info("[BOOT] Compiled SCSS to CSS")
console.info("[BOOT] Starting server...")
await import ("./server.ts")
