import {
  prepare,
} from "https://raw.githubusercontent.com/Denocord/deno-plugin-prepare/cca952397e77ea28e7b896e69f06ad6f778eb83d/mod.ts";

/**
 * The native plugin version
 */
export const VERSION = "0.6.0";
/**
 * Controls whether to load the development versions of the library
 */
export const IS_DEV = false;

/**
 * Represents a decompressor
 */
interface IDecompressor {
  /**
   * Determines whether the WASM-based decompressor is loaded
   */
  wasm: boolean;
  /**
   * Decompressed output
   */
  res: Uint8Array | null;
  /**
   * Pushes binary data into the decompressor
   * @param buf The compressed data
   * @param flush Determines whether to flush data to the decompressor
   */
  push(buf: Uint8Array, flush?: boolean): void;
  /**
   * Resets the decompression context
   */
  reset(): void;
}

let url = IS_DEV
  ? `${import.meta.url}/../target/release`
  : `https://github.com/Denocord/denoflate/releases/download/v${VERSION}`;
let wasmUrl = IS_DEV ? `${import.meta.url}/..` : url;

const decompressor = await getDecompressor();

/**
 * Creates a decompressor
 * @param FORCE_WASM Determines whether to force WASM-based decompressor. If unset or falsy, this is determined based on whether the native plugin can be loaded or not.
 */
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
      console.warn(
        "Loading native plugin failed - falling back to WASM-based decompressor",
      );
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

/**
 * The default decompression context
 */
export default decompressor;
