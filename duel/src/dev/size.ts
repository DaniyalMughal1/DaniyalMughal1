// Dev: where do the bytes go?
import { readFileSync } from "fs";
const svg = readFileSync(process.argv[2], "utf8");
const re = /<g data-layer="(\w+)">/g;
let m: RegExpExecArray | null;
const starts: [string, number][] = [];
while ((m = re.exec(svg))) starts.push([m[1], m.index]);
starts.push(["end", svg.length]);
for (let i = 0; i < starts.length - 1; i++) console.log(starts[i][0].padEnd(8), ((starts[i + 1][1] - starts[i][1]) / 1024).toFixed(0), "KB");
const defs = svg.indexOf("</defs>") - svg.indexOf("<defs>");
console.log("defs    ", (defs / 1024).toFixed(0), "KB");
