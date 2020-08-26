#[cfg(not(target_arch = "wasm32"))]
pub mod deno;

#[cfg(target_arch = "wasm32")]
pub mod wasm;