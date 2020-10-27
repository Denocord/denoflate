cargo build --release --target wasm32-wasi
wasm-bindgen ./target/wasm32-wasi/release/denoflate.wasm --target web --out-dir pkg 
deno run --allow-read --allow-write ./dist-tools/pack-wasm.ts
