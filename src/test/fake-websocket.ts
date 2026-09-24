/*
A WebSocket the tests drive by hand.

jsdom has no websocket server to talk to, and the draft socket's whole job is
what it does on open, on a frame and on a drop — so the test plays the server:
`open()`, `receive()` and `close()` are what the room would have done.
*/

import { vi } from "vitest";

export class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  // Every socket the code under test opened, in order. A reconnect appends.
  static instances: FakeWebSocket[] = [];

  static get last(): FakeWebSocket {
    const socket = FakeWebSocket.instances.at(-1);
    if (socket === undefined) {
      throw new Error("no websocket was opened");
    }
    return socket;
  }

  static reset() {
    FakeWebSocket.instances = [];
  }

  readyState: number = FakeWebSocket.CONNECTING;
  readonly sent: string[] = [];

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  send = vi.fn((data: string) => {
    if (this.readyState !== FakeWebSocket.OPEN) {
      throw new Error("send on a socket that is not open");
    }
    this.sent.push(data);
  });

  close = vi.fn(() => {
    this.readyState = FakeWebSocket.CLOSED;
  });

  // The room accepted the connection.
  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.(new Event("open"));
  }

  // The room pushed a frame.
  receive(payload: unknown) {
    this.onmessage?.(
      new MessageEvent("message", { data: JSON.stringify(payload) }),
    );
  }

  // The connection dropped.
  drop() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.(new CloseEvent("close"));
  }

  error() {
    this.onerror?.(new Event("error"));
  }

  // The commands sent so far, parsed back into [command, argument] pairs.
  commands(): [string, unknown][] {
    return this.sent.map((frame) => {
      const parsed = JSON.parse(frame);
      const [command] = Object.keys(parsed);
      return [command, parsed[command]];
    });
  }
}
