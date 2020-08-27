use std::io::prelude::*;
use std::cell::RefCell;

use deno_core::plugin_api::{Interface, ZeroCopyBuf, Op};
use inflate::InflateWriter;

thread_local! {
    static DECOMPRESS: RefCell<InflateWriter<Vec<u8>>> = 
        RefCell::new(InflateWriter::from_zlib(vec![]));
}

#[no_mangle]
pub fn deno_plugin_init(iface: &mut dyn Interface) {
    iface.register_op("denoflate::push", push);
    iface.register_op("denoflate::flush", flush);
    iface.register_op("denoflate::reset", reset);
}

fn reset(_: &mut dyn Interface, _: &mut [ZeroCopyBuf]) -> Op {
    DECOMPRESS.with(|d| d.replace(InflateWriter::from_zlib(vec![])));
    Op::Sync(vec![].into_boxed_slice())
}

fn push(_: &mut dyn Interface, data: &mut [ZeroCopyBuf]) -> Op {
    DECOMPRESS.with(|d| d.borrow_mut().write(&data[0]).unwrap());
    Op::Sync(vec![].into_boxed_slice())
}

fn flush(_: &mut dyn Interface, _: &mut [ZeroCopyBuf]) -> Op {
    let buf = DECOMPRESS.with(|d| d.borrow_mut().finish_mut().unwrap());
    Op::Sync(buf.into_boxed_slice())
}
