use deno_core::plugin_api::{Interface, ZeroCopyBuf, Op};
use inflate::InflateWriter;

use std::io::prelude::*;
use std::sync::Mutex;

thread_local! {
    static DECOMPRESS: Mutex<InflateWriter<Vec<u8>>> = 
        Mutex::new(InflateWriter::from_zlib(vec![]));
}

#[no_mangle]
pub fn deno_plugin_init(iface: &mut dyn Interface) {
    iface.register_op("denoflate::push", push);
    iface.register_op("denoflate::flush", flush);
    iface.register_op("denoflate::reset", reset);
}

fn reset(_: &mut dyn Interface, _: &mut [ZeroCopyBuf]) -> Op {
    DECOMPRESS.with(|d| d.lock().unwrap().reset());
    Op::Sync(Vec::new().into_boxed_slice())
}

fn push(_: &mut dyn Interface, data: &mut [ZeroCopyBuf]) -> Op {
    let true_data = &data[0];
    DECOMPRESS.with(|d| d.lock().unwrap().write(true_data).unwrap());
    Op::Sync(Vec::new().into_boxed_slice())
}

fn flush(_: &mut dyn Interface, _: &mut [ZeroCopyBuf]) -> Op {
    let buf = DECOMPRESS.with(|d|
        d.lock().unwrap().finish_mut().unwrap());
    Op::Sync(buf.into_boxed_slice())
}