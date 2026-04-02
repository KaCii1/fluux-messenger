// process.nextTick shim for browserify-era SCRAM-SHA-1 crypto deps
globalThis.process = globalThis.process || {};
process.nextTick = process.nextTick || function (cb) {
  var a = Array.prototype.slice.call(arguments, 1);
  queueMicrotask(function () { cb.apply(null, a); });
};
