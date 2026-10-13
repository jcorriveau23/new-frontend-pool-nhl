import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SurvivorPoolShort, SurvivorState } from "@/data/survivor/model";

/*
The survivor section of the pool list.

It became a client component so it could pin favorites the way the roster list
does, which is what these cover: the order, and that the star is a button of its
own rather than part of the row's link.

Re-imported per test: the favorites store caches its snapshot at module level so
`useSyncExternalStore` keeps seeing one reference, and that cache outlives a
`localStorage.clear()`. A real page load gets a fresh module, which is what this
reproduces.
*/
const load = async () => {
  vi.resetModules();
  return (await import("./survivor-pool-list")).default;
};

const pool = (name: string): SurvivorPoolShort => ({
  name,
  owner: "owner-id",
  status: SurvivorState.InProgress,
  season: 20262027,
  participant_count: 12,
  max_participants: 100,
});

const names = () =>
  screen
    .getAllByRole("link")
    .map((link) => link.textContent)
    .filter((text): text is string => text !== null);

beforeEach(() => {
  window.localStorage.clear();
});

describe("SurvivorPoolList", () => {
  it("lists the season's pools by name", async () => {
    const SurvivorPoolList = await load();
    render(
      <SurvivorPoolList pools={[pool("zeta"), pool("alpha")]} queryString="" />,
    );

    expect(names()).toEqual(["alpha", "zeta"]);
  });

  it("pins a favorite to the top", async () => {
    window.localStorage.setItem(
      "favorite-pools",
      JSON.stringify([{ kind: "survivor", name: "zeta", season: 20262027 }]),
    );

    const SurvivorPoolList = await load();
    render(
      <SurvivorPoolList pools={[pool("alpha"), pool("zeta")]} queryString="" />,
    );

    expect(names()).toEqual(["zeta", "alpha"]);
  });

  it("does not pin a roster pool of the same name", async () => {
    // The two collections are free to hold a pool called "zeta", and starring
    // the roster one says nothing about this list.
    window.localStorage.setItem(
      "favorite-pools",
      JSON.stringify([{ kind: "pool", name: "zeta", season: 20262027 }]),
    );

    const SurvivorPoolList = await load();
    render(
      <SurvivorPoolList pools={[pool("alpha"), pool("zeta")]} queryString="" />,
    );

    expect(names()).toEqual(["alpha", "zeta"]);
  });

  it("stars a pool as a survivor favorite", async () => {
    const SurvivorPoolList = await load();
    render(<SurvivorPoolList pools={[pool("alpha")]} queryString="" />);

    await userEvent.click(
      screen.getByRole("button", {
        name: `AddToFavorites:{"pool":"alpha"}`,
      }),
    );

    expect(JSON.parse(window.localStorage.getItem("favorite-pools")!)).toEqual([
      { kind: "survivor", name: "alpha", season: 20262027 },
    ]);
  });

  it("renders nothing for a season with no survivor pool", async () => {
    const SurvivorPoolList = await load();
    const { container } = render(
      <SurvivorPoolList pools={[]} queryString="" />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
