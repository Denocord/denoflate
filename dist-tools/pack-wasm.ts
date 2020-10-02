// Taken from https://github.com/nestdotland/analyzer/blob/787660cb021617c6f7087ef6b48cf7019ee65b76/wasm/scripts/build.ts
const WASI_BINDGEN_IMPORT =
  `import * as __wbg_star0 from 'wasi_snapshot_preview1';`;

import { encode } from "https://deno.land/std@0.72.0/encoding/base64.ts";
import Terser from "https://jspm.dev/terser@4.8.0";

const name = "denoflate";

const encoder = new TextEncoder();

async function run(msg: string, cmd: string[]) {
  log(msg);

  const process = Deno.run({ cmd });

  if (!(await process.status()).success) {
    err(`${msg} failed`);
  }
}

function log(text: string): void {
  console.log(`[log] ${text}`);
}

function err(text: string): never {
  console.log(`[err] ${text}`);
  return Deno.exit(1);
}

if (!(await Deno.stat("Cargo.toml")).isFile) {
  err(`the build script should be executed in the "${name}" root`);
}

const wasm = await Deno.readFile(`pkg/${name}_bg.wasm`);
const encoded = encode(wasm);
log(
  `encoded wasm using base64, size increase: ${encoded.length -
    wasm.length} bytes`,
);

log("inlining wasm in js");
const source =
  `export const source = Uint8Array.from(atob("${encoded}"), c => c.charCodeAt(0));`;

let init = await Deno.readTextFile(`pkg/${name}.js`);

if (init.startsWith(WASI_BINDGEN_IMPORT)) {
  init = init.replace(
    WASI_BINDGEN_IMPORT,
    `
import Context from "https://deno.land/std@0.72.0/wasi/snapshot_preview1.ts";

const context = new Context({
  args: Deno.args,
  env: Deno.env,
});

const __wbg_star0 = context.exports;
`,
  );
}

log("minifying js");
const output = Terser.minify(`${source}\n${init}`, {
  mangle: { module: true },
  output: {
    preamble: "//deno-fmt-ignore-file",
  },
});

if (output.error) {
  err(`encountered error when minifying: ${output.error}`);
}

const reduction = new Blob([(`${source}\n${init}`)]).size -
  new Blob([output.code]).size;
log(`minified js, size reduction: ${reduction} bytes`);

log(`writing output to file ("wasm.js")`);
await Deno.writeFile("wasm.js", encoder.encode(output.code));

const outputFile = await Deno.stat("wasm.js");
log(
  `output file ("wasm.js"), final size is: ${outputFile.size} bytes`,
);
