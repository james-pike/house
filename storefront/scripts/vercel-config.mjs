import { writeFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const outputDir = ".vercel/output";
const funcDir = join(outputDir, "functions/_qwik-city.func");

// Install undici in the function directory
const funcNodeModules = join(funcDir, "node_modules");
if (!existsSync(funcNodeModules)) {
  mkdirSync(funcNodeModules, { recursive: true });
}

// Copy undici from project node_modules
if (existsSync("node_modules/undici")) {
  cpSync("node_modules/undici", join(funcNodeModules, "undici"), { recursive: true });
}

// Write output config.json
writeFileSync(
  join(outputDir, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/.*", dest: "/_qwik-city" },
      ],
    },
    null,
    2
  )
);

// Write function config
writeFileSync(
  join(funcDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "entry.vercel-edge.js",
      launcherType: "Nodejs",
    },
    null,
    2
  )
);

console.log("Vercel output config written successfully");
