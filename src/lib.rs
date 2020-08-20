use deno_core::plugin_api::{Interface, ZeroCopyBuf, Op};
use inflate::InflateWriter;

use std::io::prelude::*;
static mut DECOMPRESS: Option<InflateWriter<Vec<u8>>> = None;

#[no_mangle]
pub fn deno_plugin_init(iface: &mut dyn Interface) {
    unsafe {
        DECOMPRESS = Some(InflateWriter::from_zlib(Vec::new()));
    }
    
    iface.register_op("denoflate::push", push);
    iface.register_op("denoflate::flush", flush);
    iface.register_op("denoflate::reset", reset);
}

fn reset(___: &mut dyn Interface, _: &mut [ZeroCopyBuf]) -> Op {
    unsafe {
        DECOMPRESS = Some(InflateWriter::from_zlib(Vec::new()));
    }

    Op::Sync(Vec::new().into_boxed_slice())
}

fn push(_iface: &mut dyn Interface, data: &mut [ZeroCopyBuf]) -> Op {
    let decompresser = unsafe { DECOMPRESS.as_mut().unwrap() };
    let true_data = &data[0];
    decompresser.write(true_data).unwrap();
    Op::Sync(Vec::new().into_boxed_slice())
}

fn flush(_iface: &mut dyn Interface, _: &mut [ZeroCopyBuf]) -> Op {
    let decompresser = unsafe { DECOMPRESS.as_mut().unwrap() };
    let buf = decompresser.finish_mut().unwrap();
    Op::Sync(buf.into_boxed_slice())
}