import {
  prepare,
} from "https://raw.githubusercontent.com/Denocord/deno-plugin-prepare/master/mod.ts";

export const VERSION = "0.2.0";

interface IDecompressor {
  push(buf: Uint8Array, flush?: boolean): void;
  reset(): void;
}
let Decompressor: IDecompressor;
//@ts-ignore
if (typeof Deno.openPlugin === "function") {
  const IS_DEV = false;
  let url =
    `https://github.com/Denocord/denoflate/releases/download/v${VERSION}`;
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
  const opFlush = ops["denoflate::flush"];
  const opReset = ops["denoflate::reset"];
  Decompressor = new class Decompressor implements IDecompressor {
    res = null;

    constructor() {
      this.reset();
    }

    reset() {
      //@ts-ignore
      Deno.core.dispatch(opReset, new Uint8Array());
    }

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
  const NATIVE_PLUGIN_ERROR = new Error(
    `Native plugin couldn't be loaded because of disabled unstable APIs. Please run Deno with the --unstable flag.`,
  );
  Decompressor = new class Decompressor implements IDecompressor {
    push(_buf: Uint8Array, _flush = false) {
      throw NATIVE_PLUGIN_ERROR;
    }

    reset() {
      throw NATIVE_PLUGIN_ERROR;
    }
  }();
}
export default Decompressor;
