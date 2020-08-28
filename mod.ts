import {
  prepare,
} from "https://raw.githubusercontent.com/Denocord/deno-plugin-prepare/528acc01d5c8468ea29db7638957461c498427a0/mod.ts";

export const VERSION = "0.6.0";
export const IS_DEV = true;

interface IDecompressor {
  wasm: boolean;
  res: Uint8Array | null;
  push(buf: Uint8Array, flush?: boolean): void;
  reset(): void;
}

let url = IS_DEV
  ? `${import.meta.url}/../target/release`
  : `https://github.com/Denocord/denoflate/releases/download/v${VERSION}`;
let wasmUrl = IS_DEV ? `${import.meta.url}/..` : url;

const decompressor = await getDecompressor();
export async function getDecompressor(
  FORCE_WASM = false,
): Promise<IDecompressor> {
  let Decompressor: IDecompressor;

  //@ts-ignore
  if (typeof Deno.openPlugin === "function" && !FORCE_WASM) {
    try {
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
    } catch {
      return await getDecompressor(true);
    }

    // @ts-ignore
    const ops = Deno.core.ops();
    const opPush = ops["denoflate::push"];
    const opFlush = ops["denoflate::flush"];
    const opReset = ops["denoflate::reset"];
    Decompressor = new class Decompressor implements IDecompressor {
      res = null;
      wasm = false;

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
    //@ts-ignore
    const wasm = await import(`${wasmUrl}/wasm.js`);
    await wasm.default(wasm.source);

    if (!FORCE_WASM) {
      console.warn(
        "Deno unstable APIs disabled - falling back to WASM-based decompressor",
      );
    }
    const d = new wasm.Decompressor();
    Decompressor = new class Decompressor implements IDecompressor {
      res = null;
      wasm = true;

      push(buf: Uint8Array, flush = false) {
        d.push(buf);
        if (flush) {
          //@ts-ignore
          this.res = d.flush();
        }
      }

      reset() {
        d.reset();
      }
    }();
  }
  return Decompressor;
}

export default decompressor;
