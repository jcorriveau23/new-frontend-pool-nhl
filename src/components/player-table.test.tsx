import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Player, Position } from "@/data/pool/model";
import PlayersTable from "@/components/player-table";
import { NO_INJURIES, renderWithProviders, stubFetch } from "@/test/render";
import { routerMock } from "../../vitest.setup";

const player = (id: number, name: string, overrides: Partial<Player> = {}) =>
  ({
    id,
    name,
    team: 10,
    position: Position.F,
    game_played: 20,
    goals: 10,
    assists: 15,
    points: 25,
    points_per_game: 1.25,
    age: 24,
    salary_cap: 5_000_000,
    contract_expiration_season: 20272028,
    ...overrides,
  }) as Player;

const props = {
  sortField: "points",
  skip: 0,
  limit: 2,
  considerOnlyProtected: false,
  pushUrl: "/players",
  playersOwner: null,
  protectedPlayers: null,
  onPlayerSelect: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
  routerMock.push.mockClear();
});

describe("PlayersTable", () => {
  it("lists the players the route answers with", async () => {
    stubFetch([
      NO_INJURIES,
      {
        match: "/api/players?",
        json: [player(1, "Auston Matthews"), player(2, "Mitch Marner")],
      },
    ]);

    renderWithProviders(<PlayersTable {...props} />);

    expect(await screen.findByText("Auston Matthews")).toBeInTheDocument();
    expect(screen.getByText("Mitch Marner")).toBeInTheDocument();
  });

  it("asks for the positions and the page it was given", async () => {
    const stub = stubFetch([
      NO_INJURIES,
      { match: "/api/players?", json: [player(1, "Auston Matthews")] },
    ]);

    renderWithProviders(<PlayersTable {...props} />);
    await screen.findByText("Auston Matthews");

    const [url] = stub.callsMatching("/api/players?");
    expect(url).toContain("positions=F&positions=D");
    expect(url).toContain("sort=points");
    expect(url).toContain("limit=2");
  });

  it("says so when the read fails", async () => {
    stubFetch([NO_INJURIES, { match: "/api/players?", status: 502 }]);

    renderWithProviders(<PlayersTable {...props} />);

    expect(await screen.findByText("ErrorTitle")).toBeInTheDocument();
  });

  it("sorts on a column header, and pushes it to the url", async () => {
    const user = userEvent.setup();
    stubFetch([
      NO_INJURIES,
      { match: "/api/players?", json: [player(1, "Auston Matthews")] },
    ]);

    renderWithProviders(<PlayersTable {...props} skip={200} />);
    await screen.findByText("Auston Matthews");

    await user.click(screen.getByRole("button", { name: /^G$/ }));

    await waitFor(() => expect(routerMock.push).toHaveBeenCalled());
    const pushed = routerMock.push.mock.calls.at(-1)?.[0] as string;
    expect(pushed).toContain("sortField=goals");
    // A new column starts descending, and sends the table back to page one.
    expect(pushed).toContain("descendingOrder=true");
    expect(pushed).toContain("skip=0");
  });

  it("marks a player another pooler already holds", async () => {
    stubFetch([
      NO_INJURIES,
      { match: "/api/players?", json: [player(1, "Auston Matthews")] },
    ]);

    renderWithProviders(
      <PlayersTable {...props} playersOwner={{ "1": "Bob" }} />,
    );

    expect(
      await screen.findByText('TakenBy:{"poolerName":"Bob"}'),
    ).toBeInTheDocument();
  });

  it("waits for enough characters before searching by name", async () => {
    const user = userEvent.setup();
    const stub = stubFetch([
      NO_INJURIES,
      { match: "/api/players/search", json: [player(3, "Connor McDavid")] },
      { match: "/api/players?", json: [player(1, "Auston Matthews")] },
    ]);

    renderWithProviders(<PlayersTable {...props} />);
    await screen.findByText("Auston Matthews");

    await user.type(screen.getByLabelText("PlayerSearch"), "mc");

    expect(
      await screen.findByText('SearchMinimumCharacters:{"count":3}'),
    ).toBeInTheDocument();
    expect(stub.callsMatching("/api/players/search")).toHaveLength(0);

    await user.type(screen.getByLabelText("PlayerSearch"), "d");

    expect(await screen.findByText("Connor McDavid")).toBeInTheDocument();
    expect(stub.callsMatching("name=mcd")).toHaveLength(1);
    // The list the search replaced is gone, not merged into the results.
    expect(screen.queryByText("Auston Matthews")).not.toBeInTheDocument();
  });

  it("clears a search back to the list", async () => {
    const user = userEvent.setup();
    stubFetch([
      NO_INJURIES,
      { match: "/api/players/search", json: [player(3, "Connor McDavid")] },
      { match: "/api/players?", json: [player(1, "Auston Matthews")] },
    ]);

    renderWithProviders(<PlayersTable {...props} />);
    await screen.findByText("Auston Matthews");

    await user.type(screen.getByLabelText("PlayerSearch"), "mcd");
    await screen.findByText("Connor McDavid");

    await user.click(screen.getByRole("button", { name: "ClearSearch" }));

    expect(await screen.findByText("Auston Matthews")).toBeInTheDocument();
  });

  it("pages forward from a full page, and not past a short one", async () => {
    const user = userEvent.setup();
    stubFetch([
      NO_INJURIES,
      {
        match: "/api/players?",
        json: [player(1, "Auston Matthews"), player(2, "Mitch Marner")],
      },
    ]);

    renderWithProviders(<PlayersTable {...props} />);
    await screen.findByText("Auston Matthews");

    // A page as long as the limit may have more behind it; page one has
    // nothing before it.
    expect(screen.getByRole("button", { name: /Previous/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Next/ }));

    await waitFor(() => expect(routerMock.push).toHaveBeenCalled());
    expect(routerMock.push.mock.calls.at(-1)?.[0]).toContain("skip=2");
  });

  it("shows the goalie columns when the filter is on goalies", async () => {
    const user = userEvent.setup();
    stubFetch([
      NO_INJURIES,
      {
        match: "/api/players?",
        json: [player(9, "Joseph Woll", { position: Position.G })],
      },
    ]);

    renderWithProviders(<PlayersTable {...props} />);
    await screen.findByText("Joseph Woll");

    const table = screen.getByRole("table");
    expect(within(table).queryByText("PTS")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByText("Goalies"));

    await waitFor(() => expect(routerMock.push).toHaveBeenCalled());
    // Goalie stats share no column with the skaters, so the sorted column
    // moves to the goalie default rather than staying on points.
    expect(routerMock.push.mock.calls.at(-1)?.[0]).toContain("sortField=wins");
  });
});
