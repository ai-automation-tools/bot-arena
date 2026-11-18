/**
 * @jest-environment node
 *
 * Webhook seats (BA-24): the reply is read with a 64 KB cap, so a broken agent can't fill memory.
 */
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { WEBHOOK_REPLY_LIMIT, webhookBot } from "../agents";
import type { TurnView } from "../view";

let server: Server;
let url: string;
let handler: (res: import("node:http").ServerResponse) => void;

beforeAll(async () => {
  server = createServer((req, res) => {
    req.resume();
    req.on("end", () => handler(res));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

const view = { you: "x", legalMoves: ["b2"], turnTimeoutMs: 5000 } as unknown as TurnView;
const play = () => webhookBot(url)(view, new AbortController().signal);

describe("webhook replies", () => {
  it("plays the move in a normal reply", async () => {
    handler = (res) => res.writeHead(200, { "content-type": "application/json" }).end('{"move":"b2"}');
    await expect(play()).resolves.toBe("b2");
  });

  it("refuses a 10 MB streamed reply once it passes 64 KB", async () => {
    const TEN_MB = 10 * 1024 * 1024;
    let sent = 0;
    const closed = new Promise<void>((resolve) => {
      handler = (res) => {
        res.writeHead(200, { "content-type": "application/json" }); // chunked: no content-length
        const chunk = Buffer.alloc(64 * 1024, 0x20);
        let open = true;
        res.on("close", () => {
          open = false;
          resolve();
        });
        const pump = () => {
          while (open && sent < TEN_MB) {
            sent += chunk.length;
            if (!res.write(chunk)) return void res.once("drain", pump);
          }
          res.end();
        };
        pump();
      };
    });
    await expect(play()).rejects.toThrow(`Webhook reply is over ${WEBHOOK_REPLY_LIMIT / 1024} KB`);
    await closed;
    expect(sent).toBeLessThan(TEN_MB); // the arena hung up instead of reading the rest
  });

  it("refuses a reply whose content-length is over the cap without reading it", async () => {
    handler = (res) => res.writeHead(200, { "content-length": String(WEBHOOK_REPLY_LIMIT + 1) }).end(" ".repeat(WEBHOOK_REPLY_LIMIT + 1));
    await expect(play()).rejects.toThrow("over 64 KB");
  });

  it("explains a reply that isn't JSON", async () => {
    handler = (res) => res.writeHead(200, { "content-type": "text/plain" }).end("b2");
    await expect(play()).rejects.toThrow('Webhook reply must be JSON like { "move": "e4" }');
  });
});
