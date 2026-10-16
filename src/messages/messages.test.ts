/*
What holds the two message files to each other.

The app is bilingual and nothing in the types says so: a key added to `en.json`
and forgotten in `fr.json` compiles, builds, deploys, and shows the key itself
to every French user of the page that reads it. Same for a placeholder renamed
on one side — `{pool}` in one file and `{poule}` in the other renders the
literal `{pool}` rather than the pool's name.

Both are the kind of mistake you make while adding a screen's worth of labels,
which is why this is a test and not a convention.
*/
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import en from "./en.json";
import fr from "./fr.json";

type MessageTree = { [key: string]: string | MessageTree };

/*
next-intl lets a message file nest namespaces, and one of them does
(`PenaltyType`). Flattened to the dotted keys a translator actually reaches, so
the checks below cover a nested namespace the same as a top level label.
*/
const flatten = (tree: MessageTree, prefix = ""): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>((flat, [key, value]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string"
      ? { ...flat, [name]: value }
      : { ...flat, ...flatten(value, name) };
  }, {});

const messages = {
  en: flatten(en as MessageTree),
  fr: flatten(fr as MessageTree),
};

/*
The values a message interpolates.

Only the arguments at the top level of the message, which means tracking brace
depth rather than matching `{word`: the bodies of a `{count, plural, one {...}
other {...}}` are braces too, and their wording is the part that is supposed to
differ between the two files.
*/
const placeholdersOf = (message: string): string => {
  const names = new Set<string>();
  let depth = 0;

  for (let i = 0; i < message.length; i += 1) {
    if (message[i] === "}") {
      depth -= 1;
      continue;
    }
    if (message[i] !== "{") {
      continue;
    }
    if (depth === 0) {
      const name = /^\s*(\w+)/.exec(message.slice(i + 1));
      if (name) {
        names.add(name[1]);
      }
    }
    depth += 1;
  }

  return [...names].sort().join(",");
};

/*
Keys where the two files legitimately take different values.

A language that pluralizes where the other does not needs the count, and the
other does not — which is better translation, not a mistake. The call site
passes both either way. Kept as a list of named exceptions rather than as a
weaker rule, so the check stays sharp for every key added from here.
*/
const PLURALIZES_IN_ONE_LOCALE_ONLY = ["StartDraftHintNotReady"];

describe("the message files", () => {
  it("carry the same keys", () => {
    const onlyInEn = Object.keys(messages.en).filter(
      (key) => !(key in messages.fr),
    );
    const onlyInFr = Object.keys(messages.fr).filter(
      (key) => !(key in messages.en),
    );

    expect({ onlyInEn, onlyInFr }).toEqual({ onlyInEn: [], onlyInFr: [] });
  });

  it("interpolate the same values under each key", () => {
    const mismatched = Object.keys(messages.en)
      .filter((key) => key in messages.fr)
      .filter((key) => !PLURALIZES_IN_ONE_LOCALE_ONLY.includes(key))
      .filter(
        (key) =>
          placeholdersOf(messages.en[key]) !== placeholdersOf(messages.fr[key]),
      );

    expect(mismatched).toEqual([]);
  });

  it.each(["en", "fr"] as const)("has nothing blank in %s", (locale) => {
    const blank = Object.entries(messages[locale])
      .filter(([, message]) => message.trim() === "")
      .map(([key]) => key);

    expect(blank).toEqual([]);
  });
});

/*
The other direction: a label the code asks for that no message file defines.

Only the keys written as literals — plenty are looked up through a record, and
a dynamic key cannot be checked from here. That is fine, because the literals
are where the typos are: a key reached through a record is written once, and
the compiler reads the record.
*/
describe("every message the code names", () => {
  const sourceFiles = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return sourceFiles(full);
      }
      return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
        ? [full]
        : [];
    });

  it("is defined in both locales", () => {
    const src = path.resolve(import.meta.dirname, "..");
    const missing = new Set<string>();

    for (const file of sourceFiles(src)) {
      const code = fs.readFileSync(file, "utf8");
      for (const [, key] of code.matchAll(/\bt\(\s*"([A-Za-z][\w.]*)"/g)) {
        if (!(key in messages.en) || !(key in messages.fr)) {
          missing.add(`${path.relative(src, file)}: ${key}`);
        }
      }
    }

    expect([...missing]).toEqual([]);
  });
});
