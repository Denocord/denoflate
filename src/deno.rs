use std::cell::RefCell;
use std::io::prelude::*;

use deno_core::plugin_api::{Interface, Op, ZeroCopyBuf};
use flate2::write::ZlibDecoder;

thread_local! {
    static DECOMPRESS: RefCell<ZlibDecoder<Vec<u8>>> =
        RefCell::new(ZlibDecoder::new(vec![]));
}

#[no_mangle]
pub fn deno_plugin_init(iface: &mut dyn Interface) {
    iface.register_op("denoflate::push", push);
    iface.register_op("denoflate::flush", flush);
    iface.register_op("denoflate::reset", reset);
}

fn reset(_: &mut dyn Interface, _: &mut [ZeroCopyBuf]) -> Op {
    DECOMPRESS.with(|d| d.replace(ZlibDecoder::new(vec![])));
    Op::Sync(vec![].into_boxed_slice())
}

fn push(_: &mut dyn Interface, data: &mut [ZeroCopyBuf]) -> Op {
    DECOMPRESS.with(|d| d.borrow_mut().write(&data[0]).unwrap());
    Op::Sync(vec![].into_boxed_slice())
}

fn flush(_: &mut dyn Interface, _: &mut [ZeroCopyBuf]) -> Op {
    let buf = DECOMPRESS.with(|d| {
        let mut writer = d.borrow_mut();
        writer.flush().unwrap();
        let buf = writer.get_mut();
        let cloned_buf = buf.clone();
        buf.clear();
        cloned_buf
    });
    Op::Sync(buf.into_boxed_slice())
}
