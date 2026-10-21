"use client";

/*
The first step of pool creation: which kind of pool is this going to be.

The two pool types share a name and an owner and nothing else — a roster pool
drafts players and scores them all season, a survivor pool picks one team a week
until you are wrong. Their settings forms have no field in common, so the choice
has to be made before either form can be shown, and it cannot be changed
afterwards without throwing the form away.

Asked as a questionnaire rather than a toggle on the roster form because the
answer decides which form you get, and because most people arriving here have
only ever seen one of the two pool types.
*/

import * as React from "react";
import { useTranslations } from "next-intl";

import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireItem,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire";

/*
The one place the pool kinds are listed.

The union, the choices the root validates against and the check that narrows
the submitted string all come from this, so a third pool kind cannot be added
to one of the three and forgotten in the others.
*/
export const POOL_KINDS = ["roster", "survivor"] as const;

export type PoolKind = (typeof POOL_KINDS)[number];

// The question's field name, used both for the `items` definition the root
// validates against and to read the answer back out of the submitted form.
const FIELD = "poolKind";

const items = [
  {
    choices: POOL_KINDS.map((value) => ({ value })),
    name: FIELD,
    required: true,
  },
] as const;

const isPoolKind = (answer: unknown): answer is PoolKind =>
  POOL_KINDS.includes(answer as PoolKind);

interface Props {
  onSelect: (poolKind: PoolKind) => void;
}

export default function PoolKindQuestionnaire(props: Props) {
  const t = useTranslations();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const answer = new FormData(event.currentTarget).get(FIELD);
    // `required` on the item means the root blocks submit until one of the two
    // choices is checked, so anything else here is not a case to recover from.
    if (isPoolKind(answer)) {
      props.onSelect(answer);
    }
  };

  return (
    <Questionnaire
      className="max-w-lg"
      defaultItem={FIELD}
      items={items}
      shortcuts="numbers"
      onSubmit={onSubmit}
    >
      <QuestionnaireItem name={FIELD} required>
        <QuestionnaireTitle>{t("ChoosePoolKind")}</QuestionnaireTitle>
        <QuestionnaireDescription>
          {t("ChoosePoolKindDescription")}
        </QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="roster">
            <span className="font-medium">{t("PoolKindRoster")}</span>
            <QuestionnaireChoiceDescription>
              {t("PoolKindRosterDescription")}
            </QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
          <QuestionnaireChoice value="survivor">
            <span className="font-medium">{t("PoolKindSurvivor")}</span>
            <QuestionnaireChoiceDescription>
              {t("PoolKindSurvivorDescription")}
            </QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError>{t("PoolKindAnswerRequired")}</QuestionnaireError>
      </QuestionnaireItem>
      <QuestionnaireActions>
        <QuestionnaireSubmit>{t("ContinueToPoolSettings")}</QuestionnaireSubmit>
      </QuestionnaireActions>
    </Questionnaire>
  );
}
