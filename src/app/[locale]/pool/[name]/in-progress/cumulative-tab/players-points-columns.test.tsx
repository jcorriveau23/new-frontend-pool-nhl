import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "@/components/ui/data-table";
import { Player, Pool, Position } from "@/data/pool/model";
import { NO_INJURIES, renderWithProviders, stubFetch } from "@/test/render";
import { testPlayer, testPool, testSettings } from "@/test/pool-fixtures";

import { ReservistColumn } from "./players-points-columns";

const A_RESERVIST = testPlayer(5, "Calle Jarnkrok", Position.F, 2_100_000);

const poolWith = (player: Player): Pool =>
  ({
    ...testPool(),
    context: {
      ...testPool().context!,
      players: { [player.id]: player },
    },
  }) as Pool;

const confirmPlayerRemoval = vi.fn();
const openTradeForPlayer = vi.fn();

// The reservists table, rendered the way the cumulative tab renders it: the row
// menu reads everything it acts on out of `meta.props`.
const renderReservists = (
  props: Record<string, unknown> = {},
  poolInfo: Pool = poolWith(A_RESERVIST),
) =>
  renderWithProviders(
    <DataTable
      data={[A_RESERVIST.id]}
      columns={ReservistColumn}
      initialState={undefined}
      meta={{
        props: {
          poolInfo,
          openTradeForPlayer,
          confirmPlayerRemoval,
          ...props,
        },
        getRowStyles: () => null,
        onRowClick: () => null,
        t: (key: string) => key,
      }}
      title={null}
      tableFooter={null}
    />,
  );

beforeEach(() => {
  stubFetch([NO_INJURIES]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ReservistColumn", () => {
  it("offers the removal to somebody who may manage the roster", async () => {
    const user = userEvent.setup();
    renderReservists({ canManageRoster: true });

    await user.click(screen.getByRole("button", { name: "OpenMenu" }));

    await user.click(await screen.findByText("RemoveFromRoster"));

    // The player, not the id: the confirmation names them and tells a starter
    // apart from a reservist.
    expect(confirmPlayerRemoval).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, name: "Calle Jarnkrok" }),
    );
  });

  it("offers no removal to somebody without the rights", async () => {
    const user = userEvent.setup();
    renderReservists({ canManageRoster: false });

    await user.click(screen.getByRole("button", { name: "OpenMenu" }));

    expect(await screen.findByText("Actions")).toBeInTheDocument();
    expect(screen.queryByText("RemoveFromRoster")).toBeNull();
  });

  it("plots no chart for a reservist, and trades only in a dynasty pool", async () => {
    const user = userEvent.setup();
    renderReservists({ canManageRoster: true });

    await user.click(screen.getByRole("button", { name: "OpenMenu" }));
    await screen.findByText("Actions");

    // A reservist scores nothing to plot, and trades are a dynasty feature.
    expect(screen.queryByText("Chart")).toBeNull();
    expect(screen.queryByText("FileTrade")).toBeNull();
  });

  it("files a trade from the menu in a dynasty pool", async () => {
    const user = userEvent.setup();
    const dynastyPool = {
      ...poolWith(A_RESERVIST),
      settings: testSettings({
        dynasty_settings: {
          next_season_number_players_protected: 8,
          tradable_picks: 3,
          past_season_pool_name: [],
          next_season_pool_name: null,
        },
      }),
    } as Pool;
    renderReservists({ canManageRoster: true }, dynastyPool);

    await user.click(screen.getByRole("button", { name: "OpenMenu" }));
    await user.click(await screen.findByText("FileTrade"));

    expect(openTradeForPlayer).toHaveBeenCalledWith(5);
  });
});
