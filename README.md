# denoflate
A simple library for handling Discord's `zlib-stream` compression, written in Rust.

## How to use
First, in order to use denoflate, you must enable the `--unstable` flag when running Deno. Else, on pushing, the library will error out. 
```js
import Decompressor from "https://raw.githubusercontent.com/Denocord/denoflate/master/mod.ts";

// on receiving of chunked data
Decompressor.push(buf, false);
// on last chunk
Decompressor.push(buf, true);
const decompressedBuf = Decompressor.buf;
```