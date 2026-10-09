/**
 * Serves ProcureFlow 365 from site/, the manuscripts from video/manuscripts/
 * (the Behind the scenes page reads them) and the finished videos from
 * video/published/.
 *
 *   node server.mjs [port]   default 4417
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] ?? process.env.PORT ?? 4417);

const mounts = [
  ["/manuscripts/", path.join(root, "video/manuscripts")],
  ["/videos/", path.join(root, "video/published")],
  ["/", path.join(root, "site")],
];

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".md": "text/markdown; charset=utf-8",
  ".mp4": "video/mp4",
  ".srt": "text/plain; charset=utf-8",
  ".vtt": "text/vtt; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

const resolve = (url) => {
  const pathname = decodeURIComponent(new URL(url, "http://x").pathname);
  for (const [prefix, dir] of mounts) {
    if (!pathname.startsWith(prefix)) continue;
    const file = path.join(dir, pathname.slice(prefix.length) || "index.html");
    if (!file.startsWith(dir)) return null;
    return existsSync(file) && statSync(file).isFile() ? file : null;
  }
  return null;
};

createServer((req, res) => {
  const file = resolve(req.url);
  if (!file) {
    res.writeHead(404, { "content-type": "text/plain" });
    return res.end("Not found. Have you tried submitting a requisition for it?");
  }
  const size = statSync(file).size;
  const type = TYPES[path.extname(file)] ?? "application/octet-stream";
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = Number(range[1] || 0);
    const end = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, {
      "content-type": type,
      "content-range": `bytes ${start}-${end}/${size}`,
      "accept-ranges": "bytes",
      "content-length": end - start + 1,
    });
    return createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { "content-type": type, "content-length": size, "cache-control": "no-store" });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`ProcureFlow 365 on http://localhost:${port}`));
