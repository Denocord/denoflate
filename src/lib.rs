use deno_core::plugin_api::{Interface, ZeroCopyBuf, Op};
use inflate::InflateWriter;

use std::io::prelude::*;
static mut DECOMPRESS: Option<DecompressWrapper> = None;


struct DecompressWrapper {
    decompress: Box<InflateWriter<Vec<u8>>>
}

// A hack around the writer not being public
#[allow(dead_code)]
struct InflateWriterWorkAround<W: Write> {
    inflater: inflate::InflateStream,
    pub writer: W
}

impl DecompressWrapper {
    fn new() -> Self {
        Self {
            decompress: Box::new(InflateWriter::from_zlib(Vec::new()))
        }
    }

    fn write(&mut self, data: &[u8]) {
        self.decompress.write(data).unwrap();
    }

    fn finish(&mut self) -> &[u8] {
        let d = self.decompress.as_mut();
        d.flush().unwrap();
        let ifw: &mut Box<InflateWriterWorkAround<Vec<u8>>> = unsafe {
            std::mem::transmute(&mut self.decompress)
        };
        &ifw.writer
    }

    fn clear_buf(&mut self) {
        let ifw: &mut Box<InflateWriterWorkAround<Vec<u8>>> = unsafe {
            std::mem::transmute(&mut self.decompress)
        };
        ifw.writer.clear();
    }
}

#[no_mangle]
pub fn deno_plugin_init(iface: &mut dyn Interface) {
    unsafe {
        DECOMPRESS = Some(DecompressWrapper::new());
    }
    iface.register_op("denoflate::push", push);
    iface.register_op("denoflate::flush", flush);
    iface.register_op("denoflate::reset", reset);
}

fn reset(___: &mut dyn Interface, _: &mut [ZeroCopyBuf]) -> Op {
    unsafe {
        DECOMPRESS = Some(DecompressWrapper::new());
    }

    Op::Sync(Vec::new().into_boxed_slice())
}

fn push(_iface: &mut dyn Interface, data: &mut [ZeroCopyBuf]) -> Op {
    let decompresser = unsafe { DECOMPRESS.as_mut().unwrap() };
    let true_data = &data[0];
    decompresser.write(true_data);
    Op::Sync(Vec::new().into_boxed_slice())
}

fn flush(_iface: &mut dyn Interface, _: &mut [ZeroCopyBuf]) -> Op {
    let decompresser = unsafe { DECOMPRESS.as_mut().unwrap() };
    let buf = decompresser.finish();
    let out: Vec<u8> = Vec::from(buf);
    decompresser.clear_buf();
    Op::Sync(out.into_boxed_slice())
}