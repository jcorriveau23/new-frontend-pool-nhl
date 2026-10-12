/*
Pinning the clock to a wall-clock reading in the pool's timezone.

Every rule about when a move counts from is written in terms of noon in the
pool's zone, not noon wherever the suite happens to run — and CI does not run in
the pool's zone. `vi.setSystemTime(new Date("2026-11-10T12:00:00"))` pins a
different instant on every machine, so a test using it asserts about the runner
as much as about the rule: the same line reads as noon in Montreal locally and
as 07:00 in Montreal on a UTC runner, which falls on the other side of the
cutoff and flips the expected date by a day.

`poolClockAt("2026-11-10", 12)` is that noon, wherever it runs.
*/

import { POOL_TIME_ZONE } from "@/lib/roster-modification";

const poolOffset = (instant: Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: POOL_TIME_ZONE,
    timeZoneName: "longOffset",
  })
    .formatToParts(instant)
    .find((part) => part.type === "timeZoneName")!
    .value.replace("GMT", "");

/*
The instant whose wall clock in the pool's zone reads `date` at `hour`.

The offset is resolved twice because the first lookup has to guess an instant to
resolve it for, and that guess can land on the far side of a daylight-saving
jump; the second is taken from a candidate already within hours of the answer.
*/
export const poolClockAt = (date: string, hour: number): Date => {
  const wall = `${date}T${`${hour}`.padStart(2, "0")}:00:00`;
  const guess = new Date(`${wall}${poolOffset(new Date(`${wall}Z`))}`);

  return new Date(`${wall}${poolOffset(guess)}`);
};
