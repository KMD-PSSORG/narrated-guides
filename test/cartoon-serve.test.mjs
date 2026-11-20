import assert from "node:assert/strict";
import { request } from "node:http";
import { after, before, describe, it } from "node:test";
import { serveFilm } from "../src/cartoon/serve.mjs";

describe("serveFilm", () => {
  let server;
  before(async () => { server = await serveFilm({ data: { fps: 30 } }); });
  after(() => server.close());
  const get = (path, init) => fetch(server.url + path, init);

  it("listens on this machine only", () => assert.match(server.url, /^http:\/\/127\.0\.0\.1:\d+$/));

  it("serves the film's data and the package's modules", async () => {
    assert.deepEqual(await (await get("/film.json")).json(), { fps: 30 });
    const module = await get("/src/cartoon/morph.mjs");
    assert.equal(module.status, 200);
    assert.match(module.headers.get("content-type"), /javascript/);
  });

  it("serves nothing outside the package's modules", async () => {
    for (const path of ["/src/../package.json", "/src/%2e%2e/package.json", "/src/cartoon/../../package.json", "/package.json", "/src/cartoon/page.html", "/voice.mp3"]) {
      assert.equal((await get(path)).status, 404, path);
    }
  });

  it("only answers reads", async () => {
    assert.equal((await get("/film.json", { method: "POST" })).status, 404);
  });

  it("refuses a path it cannot even read, and carries on serving", async () => {
    // Sent as written: fetch would tidy these paths before they left.
    const port = Number(new URL(server.url).port);
    const raw = (path) =>
      new Promise((resolve, reject) => {
        request({ host: "127.0.0.1", port, path }, (response) => { response.resume(); resolve(response.statusCode); }).on("error", reject).end();
      });
    assert.equal(await raw("//"), 404);
    assert.equal(await raw("//["), 404);
    assert.equal((await get("/film.json")).status, 200);
  });
});
