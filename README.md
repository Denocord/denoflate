# denoflate [![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https/raw.githubusercontent.com/Denocord/denoflate/master/mod.ts)
A simple library for handling Discord's `zlib-stream` compression, written in Rust.

## How to use
The native plugin loads automatically provided you have unstable APIs enabled and you have given Deno the permission to load native plugins. If not, it will fall back to WASM-based decompression.

```js
import decompressor from "https://raw.githubusercontent.com/Denocord/denoflate/master/mod.ts";

// on receiving of chunked data
decompressor.push(buf);
// on last chunk
decompressor.push(buf, true);
const decompressedBuf = decompressor.res;
```
