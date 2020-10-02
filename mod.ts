import {
  Plug,
} from "https://deno.land/x/plug@0.2.1/mod.ts";


/**
 * The native plugin version
 */
export const VERSION = "0.6.0";
/**
 * Controls whether to load the development versions of the library
 */
export const IS_DEV = true;

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

interface FinalizerHold {
  resource: number | {
    free(): void;
  };
}

let url = IS_DEV
  ? `${import.meta.url}/../target/release`
  : `https://github.com/Denocord/denoflate/releases/download/v${VERSION}`;
let wasmUrl = IS_DEV ? `${import.meta.url}/..` : url;

//@ts-expect-error
const finalizer = new FinalizationRegistry<FinalizerHold>(held => {
  if (typeof held.resource === "number") {
    Deno.close(held.resource);
  } else {
    held.resource.free();
  }
});

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
    let pluginResource: number;
    try {
      pluginResource = await Plug.prepare({
        name: "denoflate",
        urls: {
          darwin: `${url}/libdenoflate.dylib`,
          linux: `${url}/libdenoflate.so`,
          windows: `${url}/denoflate.dll`,
        },
        policy: IS_DEV ? Plug.CachePolicy.NONE : Plug.CachePolicy.STORE
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
      constructor() {
        finalizer.register(this, {
          resource: pluginResource
        }, this);
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

      free() {
        Deno.close(pluginResource);
        finalizer.unregister(this);
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

      constructor() {
        finalizer.register(this, {
          resource: d
        }, this);
      }

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

      free() {
        d.free();
        finalizer.unregister(this);
      }
    }();
  }
  return Decompressor;
}

/**
 * The default decompression context
 */
export default decompressor;
