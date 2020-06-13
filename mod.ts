import {
    prepare
} from "https://deno.land/x/plugin_prepare/mod.ts";


const IS_DEV = true;
let url = "https://github.com/Denocord/denoflate/releases/download/v0.1.0";
if (IS_DEV) url = `${import.meta.url}/../target/release`;
await prepare({
    name: "denoflate",
    printLog: false,
    checkCache: true,
    urls: {
        darwin: `${url}/libdenoflate.dylib`,
        linux: `${url}/libdenoflate.so`,
        windows: `${url}/denoflate.dll`
    }
});


// @ts-ignore
const ops = Deno.core.ops();
const opPush = ops["denoflate::push"];
const opFlush = ops["denoflate::push_flush"];

export default new class Decompressor {
    res = null;

    push(buf: Uint8Array, flush = false) {
        //@ts-ignore
        Deno.core.dispatch(opPush, buf);
        if (flush) {
            //@ts-ignore
            this.res = Deno.core.dispatch(opFlush, new Uint8Array);
        }
    }
}