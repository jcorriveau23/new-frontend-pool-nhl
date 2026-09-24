import { act, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FakeWebSocket } from "@/test/fake-websocket";
import { testPool, testPoolContext } from "@/test/pool-fixtures";

const applyPoolBroadcast = vi.fn();
const applyDraftDelta = vi.fn();
const resyncPoolInfo = vi.fn();
const toast = vi.fn();
const toastError = vi.fn();

const sessionValue = vi.hoisted(() => ({
  current: { jwt: "a-jwt", isValid: true } as unknown,
}));

vi.mock("@/context/pool-context", () => ({
  usePoolContext: () => ({
    ...testPoolContextValue(),
    applyPoolBroadcast,
    applyDraftDelta,
    resyncPoolInfo,
  }),
}));

vi.mock("@/context/useSessionData", () => ({
  useSession: () => ({ info: sessionValue.current }),
}));

vi.mock("sonner", () => ({
  toast: Object.assign((...args: unknown[]) => toast(...args), {
    error: (...args: unknown[]) => toastError(...args),
    success: vi.fn(),
  }),
}));

function testPoolContextValue() {
  return testPoolContext(testPool());
}

import {
  SocketProvider,
  useSocketContext,
  Command,
} from "@/context/socket-context";

// Reads the context from inside the provider, which is the only way to reach
// the room users and the command sender.
function RoomView() {
  const { roomUsers, sendSocketCommand } = useSocketContext();

  return (
    <div>
      <ul aria-label="room">
        {Object.values(roomUsers ?? {}).map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
      <button onClick={() => sendSocketCommand(Command.StartDraft, null)}>
        start
      </button>
    </div>
  );
}

const renderSocket = (jwt: string | null = "a-jwt") =>
  render(
    <SocketProvider jwt={jwt}>
      <RoomView />
    </SocketProvider>,
  );

beforeEach(() => {
  FakeWebSocket.reset();
  sessionValue.current = { jwt: "a-jwt", isValid: true };
  vi.stubGlobal("WebSocket", FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("SocketProvider", () => {
  it("opens a socket, authenticates and joins the pool's room", async () => {
    renderSocket();

    expect(FakeWebSocket.last.url).toContain("/api-rust/ws");

    await act(async () => FakeWebSocket.last.open());

    const commands = FakeWebSocket.last.commands();
    expect(commands.map(([name]) => name)).toEqual(["Auth", "JoinRoom"]);
    expect(commands[0][1]).toEqual({ token: "a-jwt" });
    expect(commands[1][1]).toMatchObject({ pool_name: "my-pool" });
  });

  it("joins the room without authenticating when there is no session", async () => {
    renderSocket(null);

    await act(async () => FakeWebSocket.last.open());

    expect(FakeWebSocket.last.commands().map(([name]) => name)).toEqual([
      "JoinRoom",
    ]);
  });

  it("shows the room users a frame brings in", async () => {
    renderSocket();
    await act(async () => FakeWebSocket.last.open());

    await act(async () =>
      FakeWebSocket.last.receive({
        Users: {
          room_users: {
            "user-a": {
              id: "user-a",
              name: "Alice",
              email: null,
              is_ready: true,
            },
          },
        },
      }),
    );

    expect(await screen.findByText("Alice")).toBeInTheDocument();
  });

  it("applies a pool the room broadcasts", async () => {
    const pool = testPool({ nb_trade: 3 });
    renderSocket();
    await act(async () => FakeWebSocket.last.open());

    await act(async () => FakeWebSocket.last.receive({ Pool: { pool } }));

    expect(applyPoolBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ nb_trade: 3 }),
    );
  });

  it("ignores a broadcast whose pool is malformed", async () => {
    renderSocket();
    await act(async () => FakeWebSocket.last.open());

    await act(async () =>
      FakeWebSocket.last.receive({ Pool: { pool: { name: "my-pool" } } }),
    );

    expect(applyPoolBroadcast).not.toHaveBeenCalled();
  });

  it("applies a draft pick delta", async () => {
    renderSocket();
    await act(async () => FakeWebSocket.last.open());

    await act(async () =>
      FakeWebSocket.last.receive({
        PlayerDrafted: { participant_id: "user-a", pick_count: 1 },
      }),
    );

    expect(applyDraftDelta).toHaveBeenCalledWith(
      expect.objectContaining({ PlayerDrafted: expect.anything() }),
    );
    expect(applyPoolBroadcast).not.toHaveBeenCalled();
  });

  it("reconnects after a drop, and resynchronises the pool it missed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderSocket();
    await act(async () => FakeWebSocket.last.open());
    expect(FakeWebSocket.instances).toHaveLength(1);

    await act(async () => FakeWebSocket.last.drop());
    // The backoff starts at a second; nothing reconnects before it elapses.
    expect(FakeWebSocket.instances).toHaveLength(1);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(2));

    await act(async () => FakeWebSocket.last.open());
    // The room replays nothing on JoinRoom, so the pool is refetched whole.
    expect(resyncPoolInfo).toHaveBeenCalledTimes(1);
  });

  it("refuses to send a command while the socket is not open", async () => {
    renderSocket();

    screen.getByRole("button", { name: "start" }).click();

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(FakeWebSocket.last.sent).toHaveLength(0);
  });

  it("refuses to send a command for a session that is not valid", async () => {
    sessionValue.current = { jwt: "a-jwt", isValid: false };
    renderSocket();
    await act(async () => FakeWebSocket.last.open());

    await act(async () => {
      screen.getByRole("button", { name: "start" }).click();
    });

    expect(toastError).toHaveBeenCalled();
    // Auth and JoinRoom went out on open; the command itself did not.
    expect(FakeWebSocket.last.commands().map(([name]) => name)).toEqual([
      "Auth",
      "JoinRoom",
    ]);
  });

  it("sends a command once the socket is open", async () => {
    renderSocket();
    await act(async () => FakeWebSocket.last.open());

    await act(async () => {
      screen.getByRole("button", { name: "start" }).click();
    });

    expect(FakeWebSocket.last.sent.at(-1)).toBe('"StartDraft"');
  });
});
