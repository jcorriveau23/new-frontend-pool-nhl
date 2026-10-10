/*
Browser calls to the survivor endpoints.

Every one of them goes through here so the path, the parsing and the error shape
are written once. The result is the same discriminated `ApiResult` the rest of
the app's backend calls use: a failed request is an expected outcome (a stale
session, a date locked while the screen was open, the backend down) that the UI
reports with a toast.

Note what is *not* here: nothing derives a pick's legality or a participant's
fate. Those come from the backend, which reads the league's own scoreboard —
a client that could decide them could decide its own win.
*/

import {
  SurvivorPickOptions,
  SurvivorPickView,
  SurvivorPool,
  SurvivorPoolShort,
  SurvivorSettings,
  SurvivorStandings,
} from "@/data/survivor/model";
import {
  MALFORMED_SURVIVOR_POOL,
  parseSurvivorPickOptions,
  parseSurvivorPool,
  parseSurvivorStandings,
} from "@/data/survivor/schema";
import { ApiResult, apiGet, apiPost } from "@/lib/client-api";

// The [name] segment reaches the page still percent-encoded, the same way it
// does for the roster pool, so it is interpolated as-is: running it through
// encodeURIComponent would double-encode it and the backend would look up a
// pool literally named "my%20pool".
const poolPath = (name: string) => `/survivor/${name}`;

/*
Run a parse over a successful response.

A backend that renamed a field would otherwise reach a render as the type it was
cast to and fail somewhere deep inside it.
*/
function checked<T>(
  result: ApiResult<unknown>,
  parse: (value: unknown) => T | null,
): ApiResult<T> {
  if (!result.ok) {
    return result;
  }
  const parsed = parse(result.data);
  return parsed === null
    ? { ok: false, error: MALFORMED_SURVIVOR_POOL }
    : { ok: true, data: parsed };
}

export async function fetchSurvivorPool(
  name: string,
): Promise<ApiResult<SurvivorPool>> {
  return checked(await apiGet(poolPath(name)), parseSurvivorPool);
}

export function fetchSurvivorPools(
  season: number | string,
): Promise<ApiResult<SurvivorPoolShort[]>> {
  return apiGet<SurvivorPoolShort[]>(`/survivor-pools/${season}`);
}

export async function fetchSurvivorStandings(
  name: string,
): Promise<ApiResult<SurvivorStandings>> {
  return checked(
    await apiGet(`${poolPath(name)}/standings`),
    parseSurvivorStandings,
  );
}

/*
What this participant may pick for a date.

Authenticated because the answer differs per participant: what is left open to
them depends on the teams they have already spent.
*/
export async function fetchPickOptions(
  name: string,
  week: number,
  jwt: string | null | undefined,
  // Whose screen to build. Omitted means the caller's own; only the owner and
  // the assistants may name somebody else.
  participantId?: string,
): Promise<ApiResult<SurvivorPickOptions>> {
  const query =
    participantId === undefined
      ? ""
      : `?participant_id=${encodeURIComponent(participantId)}`;

  // A GET, but it carries the bearer token, so it goes through apiPost's
  // sibling rather than apiGet — which sends none.
  return checked(
    await authedGet(`${poolPath(name)}/pick-options/${week}${query}`, jwt),
    parseSurvivorPickOptions,
  );
}

/*
A date's picks.

Answers with nothing but the caller's own while the date is still open — the
backend decides that, not this module.
*/
export function fetchWeekPicks(
  name: string,
  week: number,
  jwt: string | null | undefined,
): Promise<ApiResult<SurvivorPickView[]>> {
  return authedGet<SurvivorPickView[]>(`${poolPath(name)}/picks/${week}`, jwt);
}

export function fetchMyPicks(
  name: string,
  jwt: string | null | undefined,
): Promise<ApiResult<SurvivorPickView[]>> {
  return authedGet<SurvivorPickView[]>(`${poolPath(name)}/my-picks`, jwt);
}

export function createSurvivorPool(
  body: {
    pool_name: string;
    settings: SurvivorSettings;
    participant_name: string;
  },
  jwt: string | null | undefined,
): Promise<ApiResult<SurvivorPool>> {
  return apiPost<SurvivorPool>("/create-survivor-pool", body, jwt);
}

export function deleteSurvivorPool(
  poolName: string,
  jwt: string | null | undefined,
): Promise<ApiResult<null>> {
  return apiPost<null>("/delete-survivor-pool", { pool_name: poolName }, jwt);
}

export function updateSurvivorSettings(
  poolName: string,
  settings: SurvivorSettings,
  jwt: string | null | undefined,
): Promise<ApiResult<SurvivorPool>> {
  return apiPost<SurvivorPool>(
    "/update-survivor-settings",
    { pool_name: poolName, settings },
    jwt,
  );
}

export function joinSurvivorPool(
  poolName: string,
  participantName: string,
  jwt: string | null | undefined,
): Promise<ApiResult<SurvivorPool>> {
  return apiPost<SurvivorPool>(
    "/join-survivor-pool",
    { pool_name: poolName, participant_name: participantName },
    jwt,
  );
}

export function leaveSurvivorPool(
  poolName: string,
  participantId: string,
  jwt: string | null | undefined,
): Promise<ApiResult<SurvivorPool>> {
  return apiPost<SurvivorPool>(
    "/leave-survivor-pool",
    { pool_name: poolName, participant_id: participantId },
    jwt,
  );
}

/*
Name the team you are backing.

Answers with the pick screen as it now stands, so the caller does not re-derive
what is left open to them — the backend already knows.
*/
export function makeSurvivorPick(
  poolName: string,
  week: number,
  teamId: number,
  jwt: string | null | undefined,
  // Whose pick to file. Omitted means the caller's own, which is what a
  // participant sends; the owner and the assistants may name anybody, which is
  // the only way a managed spot gets played.
  participantId?: string,
): Promise<ApiResult<SurvivorPickOptions>> {
  return apiPost<SurvivorPickOptions>(
    "/survivor-pick",
    {
      pool_name: poolName,
      week,
      team_id: teamId,
      ...(participantId === undefined ? {} : { participant_id: participantId }),
    },
    jwt,
  );
}

/*
Add a spot the organiser keeps on somebody's behalf.

No id is sent: the backend generates one, so a pool cannot be attached to an
account the organiser merely names.
*/
export function addSurvivorParticipant(
  poolName: string,
  participantName: string,
  jwt: string | null | undefined,
): Promise<ApiResult<SurvivorPool>> {
  return apiPost<SurvivorPool>(
    "/add-survivor-participant",
    { pool_name: poolName, participant_name: participantName },
    jwt,
  );
}

export function lockSurvivorWeek(
  poolName: string,
  week: number,
  jwt: string | null | undefined,
): Promise<ApiResult<SurvivorPool>> {
  return apiPost<SurvivorPool>(
    "/lock-survivor-week",
    { pool_name: poolName, week },
    jwt,
  );
}

export function settleSurvivorWeek(
  poolName: string,
  week: number,
  jwt: string | null | undefined,
): Promise<ApiResult<SurvivorPool>> {
  return apiPost<SurvivorPool>(
    "/settle-survivor-week",
    { pool_name: poolName, week },
    jwt,
  );
}

/*
An authenticated GET.

`apiGet` sends no bearer token, and three of these endpoints answer per
participant, so they need one. Written here rather than added to client-api
because these are the only callers.
*/
async function authedGet<T>(
  path: string,
  jwt: string | null | undefined,
): Promise<ApiResult<T>> {
  if (!jwt) {
    return { ok: false, error: "unauthenticated" };
  }

  try {
    const res = await fetch(`/api-rust${path}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: text.length > 0 ? text : `${res.status} ${res.statusText}`,
      };
    }

    const text = await res.text();
    if (text.length === 0) {
      return { ok: true, data: null as T };
    }
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    // fetch only rejects on network-level failures (offline, DNS), which would
    // otherwise surface as an unhandled rejection.
    return { ok: false, error: "the server could not be reached" };
  }
}
