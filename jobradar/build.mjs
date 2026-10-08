// Baut dist/jobradar.html: page.src.html mit eingebetteter engine.js.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const dir = new URL(".", import.meta.url);
const engine = readFileSync(new URL("engine.js", dir), "utf8").replace(/^export /gm, "");
const page = readFileSync(new URL("page.src.html", dir), "utf8");
if (!page.includes("/*__ENGINE__*/")) throw new Error("Platzhalter fehlt");
mkdirSync(new URL("dist/", dir), { recursive: true });
writeFileSync(new URL("dist/jobradar.html", dir), page.replace("/*__ENGINE__*/", () => engine));
console.log("dist/jobradar.html gebaut");
