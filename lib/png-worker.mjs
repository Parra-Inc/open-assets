import { parentPort } from "worker_threads";
import { samePngPixels } from "./png.mjs";

const view = (u) => Buffer.from(u.buffer, u.byteOffset, u.byteLength);

parentPort.on("message", ({ id, a, b }) => {
  parentPort.postMessage({ id, same: samePngPixels(view(a), view(b)) });
});
