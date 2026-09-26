import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Pool, Position, Trade, TradeStatus } from "@/data/pool/model";
import { NO_INJURIES, renderWithProviders, stubFetch } from "@/test/render";
import {
  testPlayer,
  testPool,
  testPoolContext,
  testSettings,
} from "@/test/pool-fixtures";

const apiPost = vi.fn();
const sendSocketCommand = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

const contextValue = vi.hoisted(() => ({ current: {} as object }));
const socketValue = vi.hoisted(() => ({ current: undefined as unknown }));
const sessionValue = vi.hoisted(() => ({
  current: { jwt: "a-jwt" } as unknown,
}));

vi.mock("@/context/pool-context", async () => {
  const { hasPoolPrivilege } = await import("@/lib/pool-roster");
  return { usePoolContext: () => contextValue.current, hasPoolPrivilege };
});

vi.mock("@/context/socket-context", () => ({
  useOptionalSocketContext: () => socketValue.current,
  Command: { CreateTrade: "CreateTrade", UpdateTrade: "UpdateTrade" },
}));

vi.mock("@/context/useSessionData", () => ({
  useSession: () => ({ info: sessionValue.current }),
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

import CreateTradeDialog from "@/components/create-trade-dialog";

// A pool whose owner is the signed in user, so they may trade for both teams.
const tradePool = (overrides: Partial<Pool> = {}): Pool =>
  testPool({
    owner: "user-a",
    settings: testSettings({ salary_cap: 80_000_000 }),
    context: {
      ...testPool().context!,
      players: {
        "1": testPlayer(1, "Auston Matthews", Position.F, 13_250_000),
        "2": testPlayer(2, "John Tavares", Position.F, 11_000_000),
        "3": testPlayer(3, "Morgan Rielly", Position.D, 7_500_000),
        "4": testPlayer(4, "Joseph Woll", Position.G, 3_000_000),
        "5": testPlayer(5, "Calle Jarnkrok", Position.F, 2_100_000),
        "6": testPlayer(6, "William Nylander", Position.F, 11_500_000),
      },
      pooler_roster: {
        "user-a": {
          chosen_forwards: [1, 2],
          chosen_defenders: [3],
          chosen_goalies: [4],
          chosen_reservists: [5],
        },
        "user-b": {
          chosen_forwards: [6],
          chosen_defenders: [],
          chosen_goalies: [],
          chosen_reservists: [],
        },
      },
    },
    ...overrides,
  });

/*
A player's name appears twice once selected: in the list of what each pooler
holds, and again in the summary of the trade being built. Only the first sits
in a label with a checkbox, which is the one a test clicks.
*/
const playerCheckbox = (name: string) => {
  const label = screen
    .getAllByText(name)
    .map((element) => element.closest("label"))
    .find((element): element is HTMLLabelElement => element !== null);

  if (label === undefined) {
    throw new Error(`no selectable player named ${name}`);
  }
  return within(label).getByRole("checkbox");
};

const renderDialog = (
  props: Partial<React.ComponentProps<typeof CreateTradeDialog>> = {},
  pool: Pool = tradePool(),
) => {
  contextValue.current = testPoolContext(pool);
  const onOpenChange = vi.fn();

  return {
    onOpenChange,
    ...renderWithProviders(
      <CreateTradeDialog open onOpenChange={onOpenChange} {...props} />,
    ),
  };
};

beforeEach(() => {
  stubFetch([NO_INJURIES]);
  socketValue.current = undefined;
  sessionValue.current = { jwt: "a-jwt" };
  apiPost.mockResolvedValue({ ok: true, data: tradePool() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("CreateTradeDialog", () => {
  it("opens on the two teams, with nothing selected yet", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: "FileTrade" }),
    ).toBeInTheDocument();
    expect(playerCheckbox("Auston Matthews")).not.toBeChecked();
    expect(playerCheckbox("William Nylander")).not.toBeChecked();
    // Nothing to trade yet, so the dialog cannot be submitted.
    expect(screen.getByRole("button", { name: "FileTrade" })).toBeDisabled();
  });

  it("opens with the player it was handed on the owning pooler's side", () => {
    renderDialog({ initialAsset: { poolerId: "user-b", playerId: 6 } });

    expect(playerCheckbox("William Nylander")).toBeChecked();
    expect(playerCheckbox("Auston Matthews")).not.toBeChecked();
  });

  it("files the trade that was built", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(playerCheckbox("Auston Matthews"));
    await user.click(playerCheckbox("William Nylander"));
    await user.click(screen.getByRole("button", { name: "FileTrade" }));

    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    const [path, body] = apiPost.mock.calls[0];
    expect(path).toBe("/create-trade");
    expect(body).toMatchObject({
      pool_name: "my-pool",
      trade: {
        proposed_by: "user-a",
        ask_to: "user-b",
        from_items: { players: [1] },
        to_items: { players: [6] },
        status: TradeStatus.Open,
        id: 0,
      },
    });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it("sends the trade to the room while a draft is running", async () => {
    const user = userEvent.setup();
    socketValue.current = { sendSocketCommand };
    renderDialog();

    await user.click(playerCheckbox("Auston Matthews"));
    await user.click(screen.getByRole("button", { name: "FileTrade" }));

    await waitFor(() => expect(sendSocketCommand).toHaveBeenCalled());
    expect(sendSocketCommand.mock.calls[0][0]).toBe("CreateTrade");
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("updates the trade it was opened on instead of filing another", async () => {
    const user = userEvent.setup();
    const editingTrade: Trade = {
      id: 12,
      proposed_by: "user-a",
      ask_to: "user-b",
      from_items: { players: [2], picks: [] },
      to_items: { players: [6], picks: [] },
      date_created: 0,
      status: TradeStatus.Open,
      effective_date: null,
      draft_pick_index: null,
    } as Trade;
    renderDialog({ editingTrade });

    expect(screen.getByText("EditTrade")).toBeInTheDocument();
    expect(playerCheckbox("John Tavares")).toBeChecked();
    expect(playerCheckbox("William Nylander")).toBeChecked();

    await user.click(screen.getByRole("button", { name: "SaveTrade" }));

    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    const [path, body] = apiPost.mock.calls[0];
    expect(path).toBe("/update-trade");
    expect(body).toMatchObject({ trade_id: 12, trade: { id: 12 } });
  });

  it("reports a trade the backend refused", async () => {
    const user = userEvent.setup();
    apiPost.mockResolvedValue({ ok: false, error: "pool is final" });
    renderDialog();

    await user.click(playerCheckbox("Auston Matthews"));
    await user.click(screen.getByRole("button", { name: "FileTrade" }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("lets a visitor build a trade but not file it", () => {
    sessionValue.current = null;
    renderDialog();

    expect(screen.getByText("TradeSimulationOnly")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "FileTrade" })).toBeDisabled();
  });
});
