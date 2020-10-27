import "https://raw.githubusercontent.com/lodash/lodash/4.17.15-npm/lodash.min.js";
import "https://raw.githubusercontent.com/bestiejs/benchmark.js/master/benchmark.js";
import Decompressor, { getDecompressor } from "../mod.ts";

const suite = new Benchmark.Suite();
const native = Decompressor;
const wasm = await getDecompressor(true);

const payload = await Deno.readFile("./payload0.bin");
for (let i = 0; i < 5; i++ ) {
console.log(`Measuring performance of WASM compressor x${i+1}`);
{
  const now = performance.now();
  wasm.push(payload, true);
  const now2 = performance.now();
  console.log(`Took ${now2 - now} ms to decompress using WASM`);
}
{
  const now = performance.now();
  native.push(payload, true);
  const now2 = performance.now();
  console.log(`Took ${now2 - now} ms to decompress using the native plugin`);
}
wasm.reset();
native.reset();
}

suite.add("WASM", function () {
  wasm.reset();
  wasm.push(payload, true);
})
  .add("native plugin", function () {
    native.reset();
    native.push(payload, true);
  })
  .on("complete", function () {
    console.log(this.map((e) => e.toString()).join("\n"));
  })
  .run();
