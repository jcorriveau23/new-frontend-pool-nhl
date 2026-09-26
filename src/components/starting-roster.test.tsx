import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Pool, Position } from "@/data/pool/model";
import { NO_INJURIES, renderWithProviders, stubFetch } from "@/test/render";
import {
  poolUser,
  testPlayer,
  testPool,
  testPoolContext,
  testSettings,
} from "@/test/pool-fixtures";

const apiPost = vi.fn();
const sendSocketCommand = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

// The pool context provider fetches the pool, derives its scores and writes to
// Dexie; none of that belongs in a test of the lineup screen.
const contextValue = vi.hoisted(() => ({ current: {} as object }));
const socketValue = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock("@/context/pool-context", async () => {
  const { hasPoolPrivilege } = await import("@/lib/pool-roster");
  return {
    usePoolContext: () => contextValue.current,
    hasPoolPrivilege,
  };
});

vi.mock("@/context/socket-context", () => ({
  useOptionalSocketContext: () => socketValue.current,
  Command: { ModifyRoster: "ModifyRoster" },
}));

vi.mock("@/context/useSessionData", () => ({
  useSession: () => ({ info: { jwt: "a-jwt" } }),
}));

vi.mock("@/context/useUserData", () => ({
  useUser: () => ({ info: { id: "user-a" } }),
}));

vi.mock("@/lib/client-api", () => ({
  apiPost: (...args: unknown[]) => apiPost(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

import StartingRoster from "@/components/starting-roster";

const SAVED_ROSTER = {
  user: poolUser("user-a", "Alice"),
  forwards: [
    testPlayer(1, "Auston Matthews", Position.F, 13_250_000),
    testPlayer(2, "John Tavares", Position.F, 11_000_000),
  ],
  defense: [testPlayer(3, "Morgan Rielly", Position.D, 7_500_000)],
  goalies: [testPlayer(4, "Joseph Woll", Position.G, 3_000_000)],
  reservists: [testPlayer(5, "Calle Jarnkrok", Position.F, 2_100_000)],
};

/*
A row of the player search dialog. The row itself is a div carrying
role="button" — it embeds a link to the player page, which cannot live inside
a real button — and the salary chip nested in it is named after the player too,
so the row is picked out by the aria-disabled only it carries.
*/
const searchResultRow = async (name: RegExp) => {
  const candidates = await screen.findAllByRole("button", { name });
  const row = candidates.find((candidate) =>
    candidate.hasAttribute("aria-disabled"),
  );
  if (row === undefined) {
    throw new Error(`no search result row matching ${name}`);
  }
  return row;
};

const renderRoster = (
  overrides: {
    pool?: Pool;
    context?: object;
    teamSalaryCap?: number | null;
    roster?: typeof SAVED_ROSTER;
  } = {},
) => {
  const poolInfo = overrides.pool ?? testPool();
  contextValue.current = testPoolContext(poolInfo, overrides.context ?? {});

  return renderWithProviders(
    <StartingRoster
      userRoster={overrides.roster ?? SAVED_ROSTER}
      teamSalaryCap={overrides.teamSalaryCap ?? null}
    />,
  );
};

beforeEach(() => {
  stubFetch([NO_INJURIES]);
  socketValue.current = undefined;
  apiPost.mockResolvedValue({ ok: true, data: testPool() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("StartingRoster", () => {
  it("lists the starters and the bench", () => {
    renderRoster();

    expect(screen.getByText("Auston Matthews")).toBeInTheDocument();
    expect(screen.getByText("Calle Jarnkrok")).toBeInTheDocument();
    expect(screen.getByText("LineupUpToDate")).toBeInTheDocument();
  });

  it("counts a player sent to the bench as an unsaved change", async () => {
    const user = userEvent.setup();
    renderRoster();

    await user.click(
      screen.getByRole("button", {
        name: 'MoveToReserves:{"playerName":"Auston Matthews"}',
      }),
    );

    expect(
      await screen.findByText('UnsavedLineupChanges:{"count":1}'),
    ).toBeInTheDocument();
  });

  it("saves the rearranged lineup to the backend", async () => {
    const user = userEvent.setup();
    renderRoster();

    await user.click(
      screen.getByRole("button", {
        name: 'MoveToReserves:{"playerName":"John Tavares"}',
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: 'MoveToLineup:{"playerName":"Calle Jarnkrok"}',
      }),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    const [path, body] = apiPost.mock.calls[0];
    expect(path).toBe("/modify-roster");
    expect(body).toMatchObject({
      pool_name: "my-pool",
      roster_modified_user_id: "user-a",
      forw_list: [1, 5],
      reserv_list: [2],
      def_list: [3],
      goal_list: [4],
    });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it("sends the change to the draft room instead when one is open", async () => {
    const user = userEvent.setup();
    socketValue.current = { sendSocketCommand };
    renderRoster();

    await user.click(
      screen.getByRole("button", {
        name: 'MoveToReserves:{"playerName":"John Tavares"}',
      }),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(sendSocketCommand).toHaveBeenCalled());
    const [command, payload] = sendSocketCommand.mock.calls[0];
    expect(command).toBe("ModifyRoster");
    expect(JSON.parse(payload as string).reserv_list).toEqual([5, 2]);
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("reports a failed save and keeps the edits on screen", async () => {
    const user = userEvent.setup();
    apiPost.mockResolvedValue({ ok: false, error: "roster is locked" });
    renderRoster();

    await user.click(
      screen.getByRole("button", {
        name: 'MoveToReserves:{"playerName":"John Tavares"}',
      }),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(
      screen.getByText('UnsavedLineupChanges:{"count":1}'),
    ).toBeInTheDocument();
  });

  it("refuses to save a lineup that goes over the cap", async () => {
    const user = userEvent.setup();
    const cap = 35_000_000;
    const pool = testPool({ settings: testSettings({ salary_cap: cap }) });
    // Starters cost 34.75M of the 35M cap, and the bench holds a forward who
    // costs more than the one he would come in for.
    const roster = {
      ...SAVED_ROSTER,
      reservists: [testPlayer(5, "Calle Jarnkrok", Position.F, 12_000_000)],
    };
    renderRoster({ pool, teamSalaryCap: cap, roster });

    expect(screen.getByText("LineupUpToDate")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: 'MoveToReserves:{"playerName":"John Tavares"}',
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: 'MoveToLineup:{"playerName":"Calle Jarnkrok"}',
      }),
    );

    // 35.75M against a 35M cap: the same check the backend would fail on.
    expect(await screen.findByText(/LineupOverSalaryCap/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("resets the lineup back to what was saved", async () => {
    const user = userEvent.setup();
    renderRoster();

    await user.click(
      screen.getByRole("button", {
        name: 'MoveToReserves:{"playerName":"Auston Matthews"}',
      }),
    );
    await screen.findByText('UnsavedLineupChanges:{"count":1}');

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(await screen.findByText("LineupUpToDate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  it("puts a player nobody holds on the bench", async () => {
    const user = userEvent.setup();
    stubFetch([
      NO_INJURIES,
      {
        match: "/api/players/search",
        json: [testPlayer(9, "Matias Maccelli", Position.F, 900_000)],
      },
    ]);
    renderRoster();

    await user.click(screen.getByRole("button", { name: /AddPlayer/ }));
    await user.type(screen.getByRole("searchbox"), "mac");
    await user.click(await searchResultRow(/Maccelli/));

    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    const [path, body] = apiPost.mock.calls[0];
    expect(path).toBe("/add-player");
    expect(body).toMatchObject({
      pool_name: "my-pool",
      added_player_user_id: "user-a",
      player: { id: 9 },
    });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it("flags a player somebody in the pool already holds", async () => {
    const user = userEvent.setup();
    stubFetch([
      NO_INJURIES,
      {
        match: "/api/players/search",
        json: [testPlayer(9, "Matias Maccelli", Position.F, 900_000)],
      },
    ]);
    renderRoster({ context: { playersOwner: { 9: "Bob" } } });

    await user.click(screen.getByRole("button", { name: /AddPlayer/ }));
    await user.type(screen.getByRole("searchbox"), "mac");

    const row = await searchResultRow(/Maccelli/);
    expect(row).toHaveAttribute("aria-disabled", "true");
    await user.click(row);

    // Refused on the spot rather than sent for the backend to turn down.
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("removes a starter from the roster once the removal is confirmed", async () => {
    const user = userEvent.setup();
    renderRoster();

    await user.click(
      screen.getByRole("button", {
        name: 'RemovePlayerFromRoster:{"playerName":"Auston Matthews"}',
      }),
    );

    // The lineup is left a player short, which the confirmation says.
    expect(
      await screen.findByText(/RemoveStarterConfirmationWarning/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    const [path, body] = apiPost.mock.calls[0];
    expect(path).toBe("/remove-player");
    expect(body).toMatchObject({
      pool_name: "my-pool",
      removed_player_user_id: "user-a",
      player_id: 1,
    });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it("removes a reservist without warning about the lineup", async () => {
    const user = userEvent.setup();
    renderRoster();

    await user.click(
      screen.getByRole("button", {
        name: 'RemovePlayerFromRoster:{"playerName":"Calle Jarnkrok"}',
      }),
    );

    expect(
      await screen.findByText(/RemovePlayerConfirmationTitle/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/RemoveStarterConfirmationWarning/)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    expect(apiPost.mock.calls[0][1]).toMatchObject({ player_id: 5 });
  });

  it("keeps the removal out of reach while the lineup holds unsaved edits", async () => {
    const user = userEvent.setup();
    renderRoster();

    await user.click(
      screen.getByRole("button", {
        name: 'MoveToReserves:{"playerName":"Auston Matthews"}',
      }),
    );
    await screen.findByText('UnsavedLineupChanges:{"count":1}');

    // The removal applies to the saved roster, and the pool coming back would
    // throw the arrangement on screen away.
    expect(
      screen.getByRole("button", {
        name: 'RemovePlayerFromRoster:{"playerName":"Auston Matthews"}',
      }),
    ).toBeDisabled();
  });

  it("offers no removal to somebody without rights on the pool", () => {
    // user-a neither owns this roster nor the pool.
    const pool = testPool({ owner: "user-c" });
    const roster = { ...SAVED_ROSTER, user: poolUser("user-b", "Bob") };
    renderRoster({ pool, roster });

    expect(
      screen.queryByRole("button", {
        name: 'RemovePlayerFromRoster:{"playerName":"Auston Matthews"}',
      }),
    ).toBeNull();
  });

  it("fills a free lineup spot on a day the lineup is otherwise locked", async () => {
    const user = userEvent.setup();
    // A running season with no modification date left: saving a rearranged
    // lineup would be refused, so the free spot is filled through fill-spot.
    const pool = testPool({ season_start: "2025-10-07" });
    const roster = {
      ...SAVED_ROSTER,
      forwards: [SAVED_ROSTER.forwards[0]],
    };
    renderRoster({ pool, roster });

    expect(screen.getByText("LineupLocked")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: 'FillSpotWith:{"playerName":"Calle Jarnkrok"}',
      }),
    );

    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    const [path, body] = apiPost.mock.calls[0];
    expect(path).toBe("/fill-spot");
    expect(body).toMatchObject({
      pool_name: "my-pool",
      filled_spot_user_id: "user-a",
      player_id: 5,
    });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it("offers no fill-spot while the lineup can simply be saved", () => {
    // The modification window is open before the season starts, so moving the
    // reservist up and saving is the way in and the shortcut stays hidden.
    const roster = { ...SAVED_ROSTER, forwards: [SAVED_ROSTER.forwards[0]] };
    renderRoster({ roster });

    expect(screen.getByText("LineupChangesAllowed")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: 'FillSpotWith:{"playerName":"Calle Jarnkrok"}',
      }),
    ).toBeNull();
  });

  it("lets somebody with no rights rearrange a roster but never save it", async () => {
    const user = userEvent.setup();
    // The signed in user is user-a, who neither owns this roster nor the pool.
    const pool = testPool({ owner: "user-c" });
    const roster = { ...SAVED_ROSTER, user: poolUser("user-b", "Bob") };
    renderRoster({ pool, roster });

    expect(screen.getByText("SimulationMode")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();

    await user.click(
      screen.getByRole("button", {
        name: 'MoveToReserves:{"playerName":"Auston Matthews"}',
      }),
    );

    // Rearranging still works, it simply cannot be filed.
    expect(await screen.findByText("SimulationModeHint")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });
});
