import assert from "node:assert/strict";
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
});
