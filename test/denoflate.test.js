import * as assert from "https://deno.land/std@0.75.0/testing/asserts.ts";
import Decompressor, { getDecompressor, _setDevRelease } from "../mod.ts";

const payload = await Deno.readFile(new URL("./payload0.bin", import.meta.url));

const IS_WASM = Deno.env.get("COMP_MODE") === "wasm";
const targetString = IS_WASM ? "WASM" : "a native plugin";

const DISCORD_HELLO_DECOMPRESSED = '{"t":null,"s":null,"op":10,"d":{"heartbeat_interval":41250,"_trace":["[\\"gateway-prd-main-sfkf\\",{\\"micros\\":0.0}]"]}}'

_setDevRelease(true);

const decompressor = IS_WASM ? await getDecompressor(true) : Decompressor;
const td = new TextDecoder;

if (!IS_WASM) {
    Deno.test({
        name: "Native plugin loads instead of WASM",
        fn() {
            assert.assert(!decompressor.wasm, "WASM-based decompressor loaded");
        }
    })
} else {
    Deno.test({
        name: "WASM module is loaded instead of native plugin",
        fn() {
            assert.assert(decompressor.wasm, "Native plugin loaded");
        }
    })
}

Deno.test({
    name: `Decompresses payloads using ${targetString}`,
    fn() {
        decompressor.push(payload, true);
        assert.assertStrictEquals(td.decode(decompressor.res), DISCORD_HELLO_DECOMPRESSED, "Possibly corrupted data returned");
    }
})

Deno.test({
    name: `Resetting the compressor works`,
    fn() {
        decompressor.reset();
        decompressor.push(payload, true);
        assert.assertStrictEquals(td.decode(decompressor.res), DISCORD_HELLO_DECOMPRESSED, "Possibly corrupted data returned");
    }
})