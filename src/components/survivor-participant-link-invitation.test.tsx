import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ParticipantStatus,
  SurvivorPool,
  SurvivorState,
  WeekStatus,
} from "@/data/survivor/model";
import { hashEmail } from "@/lib/email-hash";

/*
The invitation banner.

What these pin down is who sees it. The pool is readable by everybody in it and
carries the invitation, so the only thing that makes one yours is the hash of
the address you signed in with — get that comparison wrong and every member of
the pool is offered somebody else's spot. The backend refuses them, but the
screen should not be making the offer in the first place.
*/
const acceptSurvivorParticipantLink = vi.fn();
const declineSurvivorParticipantLink = vi.fn();

const signedInEmail = vi.hoisted(() => ({
  current: undefined as string | undefined,
}));

vi.mock("@/context/useSessionData", () => ({
  useSession: () => ({ info: { jwt: "a-jwt" } }),
}));

vi.mock("@/context/useUserData", () => ({
  useUser: () => ({ info: { id: "my-account", email: signedInEmail.current } }),
}));

vi.mock("@/lib/survivor-api", () => ({
  acceptSurvivorParticipantLink: (...args: unknown[]) =>
    acceptSurvivorParticipantLink(...args),
  declineSurvivorParticipantLink: (...args: unknown[]) =>
    declineSurvivorParticipantLink(...args),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const INVITEE = "vincent@example.com";

const poolWith = async (
  links: { participant_id: string; email: string }[],
): Promise<SurvivorPool> => ({
  name: "survivor",
  owner: "owner-id",
  status: SurvivorState.Created,
  settings: {
    assistants: [],
    max_participants: 20,
    strikes_allowed: 0,
    missed_pick_is_strike: true,
    allow_pick_change: true,
    public_picks: false,
    league_team_count: 32,
  },
  participants: [
    {
      id: "spot-id",
      name: "vincent",
      status: ParticipantStatus.Alive,
      strikes: 0,
      eliminated_week: null,
      date_joined: 0,
      is_owned: false,
    },
  ],
  weeks: [
    {
      week: 1,
      pick_date: "2026-10-03",
      status: WeekStatus.Open,
      eligible_team_ids: [],
      settled_at: null,
    },
  ],
  winners: null,
  pending_participant_links: await Promise.all(
    links.map(async ({ participant_id, email }) => ({
      participant_id,
      email_hash: (await hashEmail(email))!,
      email_hint: "vi***t@example.com",
      requested_by: "owner-id",
      date_requested: 0,
    })),
  ),
  date_updated: 0,
  season: 20262027,
  season_start: "2026-09-29",
  season_end: "2027-04-10",
});

// Imported per test so the module picks up the mocks above once they are set.
const renderBanner = async (pool: SurvivorPool) => {
  const Banner = (await import("./survivor-participant-link-invitation"))
    .default;
  const onPoolChange = vi.fn();
  render(<Banner pool={pool} onPoolChange={onPoolChange} />);
  return onPoolChange;
};

const banner = () =>
  screen.queryByRole("button", { name: "AcceptSurvivorLink" });

beforeEach(() => {
  signedInEmail.current = INVITEE;
  acceptSurvivorParticipantLink.mockReset();
  declineSurvivorParticipantLink.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SurvivorParticipantLinkInvitation", () => {
  it("offers the spot to the address it was filed against", async () => {
    await renderBanner(
      await poolWith([{ participant_id: "spot-id", email: INVITEE }]),
    );

    await waitFor(() => expect(banner()).not.toBeNull());
  });

  it("shows nothing to anybody else in the pool", async () => {
    signedInEmail.current = "someone-else@example.com";

    await renderBanner(
      await poolWith([{ participant_id: "spot-id", email: INVITEE }]),
    );

    // Given a tick to resolve the digest, so this is not passing on the render
    // that happens before the hash is known.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(banner()).toBeNull();
  });

  it("shows nothing when nobody is signed in", async () => {
    signedInEmail.current = undefined;

    await renderBanner(
      await poolWith([{ participant_id: "spot-id", email: INVITEE }]),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(banner()).toBeNull();
  });

  it("shows nothing when the pool carries no invitation at all", async () => {
    // A backend older than the flow sends no such field.
    const pool = await poolWith([]);
    await renderBanner({ ...pool, pending_participant_links: undefined });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(banner()).toBeNull();
  });

  it("shows nothing when the invitation names a spot that has left", async () => {
    await renderBanner(
      await poolWith([{ participant_id: "gone", email: INVITEE }]),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(banner()).toBeNull();
  });

  it("declines without reloading, and hands back the pool it got", async () => {
    const pool = await poolWith([
      { participant_id: "spot-id", email: INVITEE },
    ]);
    const declined = { ...pool, pending_participant_links: [] };
    declineSurvivorParticipantLink.mockResolvedValue({
      ok: true,
      data: declined,
    });

    const onPoolChange = await renderBanner(pool);

    await waitFor(() => expect(banner()).not.toBeNull());
    await userEvent.click(
      screen.getByRole("button", { name: "DeclineSurvivorLink" }),
    );

    expect(declineSurvivorParticipantLink).toHaveBeenCalledWith(
      "survivor",
      "spot-id",
      "a-jwt",
    );
    expect(onPoolChange).toHaveBeenCalledWith(declined);
  });

  it("leaves the pool alone when declining fails", async () => {
    declineSurvivorParticipantLink.mockResolvedValue({
      ok: false,
      error: "nope",
    });

    const onPoolChange = await renderBanner(
      await poolWith([{ participant_id: "spot-id", email: INVITEE }]),
    );

    await waitFor(() => expect(banner()).not.toBeNull());
    await userEvent.click(
      screen.getByRole("button", { name: "DeclineSurvivorLink" }),
    );

    expect(onPoolChange).not.toHaveBeenCalled();
    // Still on offer, so it can be retried.
    expect(banner()).not.toBeNull();
  });
});
