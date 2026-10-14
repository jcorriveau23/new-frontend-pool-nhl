import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ParticipantAdminList,
  ParticipantAdminRow,
} from "./participant-admin-list";

/*
The participant row both pool types' owner screens are built from.

Worth pinning now that it is shared: the badge it draws says whether the
organiser has to play that spot themselves, and the two screens would otherwise
drift apart again one row at a time.

`useTranslations` is mocked in `vitest.setup.ts` to answer with the key (and its
values appended), so the assertions below read as keys rather than copy.
*/
describe("a participant row", () => {
  it("marks a spot with an account apart from one the organiser runs", () => {
    render(
      <ParticipantAdminList>
        <ParticipantAdminRow name="Raph" isOwned />
        <ParticipantAdminRow name="Francis" isOwned={false} />
      </ParticipantAdminList>,
    );

    expect(screen.getByText("Raph")).toBeInTheDocument();
    expect(screen.getByText("ParticipantHasAccount")).toBeInTheDocument();
    expect(screen.getByText("ParticipantOrganiserRun")).toBeInTheDocument();
  });

  it("says an invitation is standing, with the hint it was filed under", () => {
    render(
      <ParticipantAdminList>
        <ParticipantAdminRow
          name="Francis"
          isOwned={false}
          pendingLink={{ email_hint: "fr***s@example.com" }}
        />
      </ParticipantAdminList>,
    );

    expect(
      screen.getByText('ParticipantLinkPending:{"email":"fr***s@example.com"}'),
    ).toBeInTheDocument();
  });

  it("falls back to a redacted hint when the backend sent none", () => {
    // The survivor schemas hand back the document as it arrived, so a missing
    // hint reaches the row however the type reads.
    render(
      <ParticipantAdminList>
        <ParticipantAdminRow name="Francis" isOwned={false} pendingLink={{}} />
      </ParticipantAdminList>,
    );

    expect(
      screen.getByText('ParticipantLinkPending:{"email":"***"}'),
    ).toBeInTheDocument();
  });

  it("places the owner's controls, and nothing where there are none", () => {
    const { rerender } = render(
      <ParticipantAdminList>
        <ParticipantAdminRow name="Raph" isOwned>
          <button type="button">rename</button>
          <button type="button">link</button>
        </ParticipantAdminRow>
      </ParticipantAdminList>,
    );

    expect(screen.getAllByRole("button")).toHaveLength(2);

    rerender(
      <ParticipantAdminList>
        <ParticipantAdminRow name="Raph" isOwned />
      </ParticipantAdminList>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
