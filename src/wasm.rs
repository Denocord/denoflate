use std::io::prelude::*;

use flate2::write::ZlibDecoder;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Decompressor {
    inflate: ZlibDecoder<Vec<u8>>,
}

#[wasm_bindgen]
impl Decompressor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inflate: ZlibDecoder::new(vec![]),
        }
    }

    pub fn reset(&mut self) {
        self.inflate = ZlibDecoder::new(vec![]);
    }

    pub fn push(&mut self, data: Vec<u8>) {
        self.inflate.write(&data).unwrap();
    }

    pub fn flush(&mut self) -> Vec<u8> {
        self.inflate.flush().unwrap();
        std::mem::replace(self.inflate.get_mut(), vec![])
    }
}
