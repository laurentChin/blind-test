const listeners = new Map();

function on(name, cb) {
  if (!listeners.has(name)) {
    listeners.set(name, [cb]);
  } else {
    listeners.get(name).push(cb);
  }
}

function emit(name, data) {
  if (!listeners.has(name)) return;
  listeners.get(name).forEach((listener) => listener(data));
}

function off(name, cb) {
  if (!listeners.has(name)) return;
  listeners.set(
    name,
    listeners.get(name).filter((listener) => listener !== cb)
  );
}

const _ioMethods = {
  on,
  off,
  emit,
};

function io() {
  return _ioMethods;
}

export default io;
