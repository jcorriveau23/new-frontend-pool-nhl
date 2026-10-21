/*
The pool kind question that opens pool creation.

Worth a test for two reasons. The answer decides which of two settings forms
the page renders, and the two forms share no field — picking the wrong one is
not a cosmetic bug. And the question is built on `@shadcn/react`'s questionnaire
primitive, which owns the validation and the submit button's enabled state, so
these cases also say what the app is relying on that primitive to do.

Driven off `POOL_KINDS` rather than off a list written out again here, so a
third pool kind added to that list fails this file until it has a choice to
click and a label to read, instead of going untested.
*/

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import PoolKindQuestionnaire, {
  POOL_KINDS,
  type PoolKind,
} from "@/components/pool-kind-questionnaire";

/*
The message key naming the choice, which under test renders as the key itself.
The convention is the one the component follows, so a kind whose label does not
follow it is a failure here rather than a blank choice in the running app.
*/
const labelOf = (kind: PoolKind) =>
  `PoolKind${kind[0].toUpperCase()}${kind.slice(1)}`;

const choice = (kind: PoolKind) =>
  screen.getByRole("radio", { name: new RegExp(labelOf(kind)) });

const submit = () =>
  screen.getByRole("button", { name: "ContinueToPoolSettings" });

describe("the pool kind questionnaire", () => {
  it("offers every pool kind", () => {
    renderWithProviders(<PoolKindQuestionnaire onSelect={vi.fn()} />);

    for (const kind of POOL_KINDS) {
      expect(choice(kind)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("radio")).toHaveLength(POOL_KINDS.length);
  });

  it.each(POOL_KINDS)("reports %s when it is picked", async (kind) => {
    const onSelect = vi.fn();
    renderWithProviders(<PoolKindQuestionnaire onSelect={onSelect} />);

    await userEvent.click(choice(kind));
    await userEvent.click(submit());

    expect(onSelect).toHaveBeenCalledExactlyOnceWith(kind);
  });

  /*
  The question is required, and nothing downstream can run without an answer:
  the page would have no form to render.

  Asserting the error as well as the silence, because the silence alone passes
  whether or not the question is marked required — the submit handler ignores a
  null answer either way. The error is what says the primitive is doing the
  blocking, and that the message it shows is this app's translated one and not
  the primitive's hardcoded English fallback.
  */
  it("asks for an answer instead of reporting a pool kind", async () => {
    const onSelect = vi.fn();
    renderWithProviders(<PoolKindQuestionnaire onSelect={onSelect} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await userEvent.click(submit());

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "PoolKindAnswerRequired",
    );
  });

  // Only one pool can be created at a time, so the second pick replaces the
  // first rather than adding to it.
  it("reports only the pool kind picked last", async () => {
    const onSelect = vi.fn();
    renderWithProviders(<PoolKindQuestionnaire onSelect={onSelect} />);

    for (const kind of POOL_KINDS) {
      await userEvent.click(choice(kind));
    }
    await userEvent.click(submit());

    expect(onSelect).toHaveBeenCalledExactlyOnceWith(
      POOL_KINDS[POOL_KINDS.length - 1],
    );
  });
});
