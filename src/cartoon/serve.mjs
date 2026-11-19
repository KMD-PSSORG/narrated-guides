/**
 * The local server a film is rendered and watched through. A browser will not
 * load ES modules from `file:`, so the page and this package's modules are
 * served over a port on this machine for as long as a film is being made.
 *
 * It serves one film and this package's own modules, to this machine only,
 * and nothing else: what it may read is an allow-list, not everything minus
 * what looks dangerous.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = path.join(SRC, "cartoon", "page.html");

/** The module under `src/` a request path names, or null when it names anything else. */
const moduleAt = (pathname) => {
  if (!pathname.startsWith("/src/") || !pathname.endsWith(".mjs")) return null;
  let relative;
  try {
    relative = decodeURIComponent(pathname.slice("/src/".length));
  } catch {
    return null;
  }
  const file = path.resolve(SRC, relative);
  if (!file.startsWith(SRC + path.sep)) return null;
  return existsSync(file) && statSync(file).isFile() ? file : null;
};

/**
 * Serves the page at `/`, `data` at `/film.json`, the film's voice at
 * `/voice.mp3` when there is one, and the package's modules under `/src/`.
 * Returns the address and a way to stop.
 */
export const serveFilm = ({ data, voice = null }) =>
  new Promise((resolve, reject) => {
    const send = (response, file, type) => {
      response.writeHead(200, { "content-type": type, "cache-control": "no-store" });
      createReadStream(file).pipe(response);
    };
    const server = createServer((request, response) => {
      const { pathname } = new URL(request.url, "http://127.0.0.1");
      const module = request.method === "GET" ? moduleAt(pathname) : null;
      if (request.method !== "GET") response.writeHead(404).end();
      else if (pathname === "/") send(response, PAGE, "text/html; charset=utf-8");
      else if (pathname === "/film.json") {
        response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
        response.end(JSON.stringify(data));
      } else if (pathname === "/voice.mp3" && voice) send(response, voice, "audio/mpeg");
      else if (module) send(response, module, "text/javascript; charset=utf-8");
      else response.writeHead(404).end();
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((done) => { server.closeAllConnections(); server.close(done); }),
      });
    });
  });
