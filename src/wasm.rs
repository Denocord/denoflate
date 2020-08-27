use std::io::prelude::*;

use wasm_bindgen::prelude::*;
use inflate::InflateWriter;

#[wasm_bindgen]
pub struct Decompressor {
    inflate: InflateWriter<Vec<u8>>
}

#[wasm_bindgen]
impl Decompressor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inflate: InflateWriter::from_zlib(vec![])
        }
    }

    pub fn reset(&mut self) {
        self.inflate = InflateWriter::from_zlib(vec![]);
    }

    pub fn push(&mut self, data: Vec<u8>) {
        self.inflate.write(&data).unwrap();
    }

    pub fn flush(&mut self) -> Vec<u8> {
        self.inflate.finish_mut().unwrap()
    }
}
