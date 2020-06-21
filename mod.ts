import {
  prepare,
} from "https://deno.land/x/plugin_prepare/mod.ts";

interface IDecompressor {
    push(buf: Uint8Array, flush?: boolean): void;
}
let Decompressor: IDecompressor;
if (typeof Deno.openPlugin === "function") {
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
      windows: `${url}/denoflate.dll`,
    },
  });

  // @ts-ignore
  const ops = Deno.core.ops();
  const opPush = ops["denoflate::push"];
  const opFlush = ops["denoflate::push_flush"];
  Decompressor = new class Decompressor implements IDecompressor {
    res = null;

    push(buf: Uint8Array, flush = false) {
      //@ts-ignore
      Deno.core.dispatch(opPush, buf);
      if (flush) {
        //@ts-ignore
        this.res = Deno.core.dispatch(opFlush, new Uint8Array());
      }
    }
  }();
} else {
  Decompressor = new class Decompressor implements IDecompressor {
    push(_buf: Uint8Array, _flush = false) {
      throw new Error(
        `Native plugin couldn't be loaded because of disabled unstable APIs. Please run Deno with the --unstable flag.`,
      );
    }
  }();
}
export default Decompressor;