import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Player, Position } from "@/data/pool/model";
import { WaiverClaim } from "@/hooks/use-waiver-claim";
import { testPlayer, testPool, testPoolContext } from "@/test/pool-fixtures";

const searchDialogProps = vi.fn();

vi.mock("@/context/pool-context", () => ({
  usePoolContext: () => testPoolContext(testPool()),
}));

// The search itself is exercised through the lineup screen; what matters here
// is how the claim is wired into it.
vi.mock("@/components/search-players", () => ({
  default: (props: object) => {
    searchDialogProps(props);
    return null;
  },
}));

import WaiverClaimDialog from "@/components/waiver-claim-dialog";

const DROPPED: Player = testPlayer(2, "John Tavares", Position.F);

const waiverClaim = (overrides: Partial<WaiverClaim> = {}): WaiverClaim => ({
  budget: {} as WaiverClaim["budget"],
  canClaim: true,
  blockedReason: null,
  playerToDrop: null,
  setPlayerToDrop: vi.fn(),
  isClaiming: false,
  backdateRange: {
    defaultDate: "2026-10-04",
    earliestDate: "2026-09-29",
    latestDate: "2026-10-04",
    canBackdate: true,
  },
  effectiveDate: "2026-10-04",
  setEffectiveDate: vi.fn(),
  canBackdate: false,
  replacementUnavailableReason: vi.fn(),
  claim: vi.fn(),
  ...overrides,
});

const renderedProps = () => searchDialogProps.mock.lastCall![0];

afterEach(() => {
  vi.clearAllMocks();
});

describe("WaiverClaimDialog", () => {
  it("stays closed until a player is placed on waivers", () => {
    render(<WaiverClaimDialog claim={waiverClaim()} />);

    expect(renderedProps()).toMatchObject({
      open: false,
      label: "PickReplacement",
      currentSeason: 20262027,
    });
  });

  it("opens on the player being dropped and names him", () => {
    render(
      <WaiverClaimDialog claim={waiverClaim({ playerToDrop: DROPPED })} />,
    );

    expect(renderedProps()).toMatchObject({
      open: true,
      label: 'PickReplacementFor:{"playerName":"John Tavares"}',
    });
  });

  it("hands the pick and the availability check to the claim", () => {
    const claim = waiverClaim({ playerToDrop: DROPPED });
    render(<WaiverClaimDialog claim={claim} />);

    expect(renderedProps().onPlayerSelect).toBe(claim.claim);
    expect(renderedProps().unavailableReason).toBe(
      claim.replacementUnavailableReason,
    );
  });

  it("offers the day the claim counts from to whoever may pick it", () => {
    // Picking a result files the claim, so the date has to sit above the
    // search rather than in a footer there is no room for.
    const allowed = waiverClaim({ playerToDrop: DROPPED, canBackdate: true });
    render(<WaiverClaimDialog claim={allowed} />);
    expect(renderedProps().beforeSearch).not.toBeNull();

    const refused = waiverClaim({ playerToDrop: DROPPED, canBackdate: false });
    render(<WaiverClaimDialog claim={refused} />);
    expect(renderedProps().beforeSearch).toBeNull();
  });

  it("drops the pending claim when closed", () => {
    const claim = waiverClaim({ playerToDrop: DROPPED });
    render(<WaiverClaimDialog claim={claim} />);

    renderedProps().onOpenChange(true);
    expect(claim.setPlayerToDrop).not.toHaveBeenCalled();

    renderedProps().onOpenChange(false);
    expect(claim.setPlayerToDrop).toHaveBeenCalledWith(null);
  });
});
