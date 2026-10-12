/*
The app's one Hanko instance.

There used to be three — one in each of the two providers and one in the auth
screen — which meant three load paths and three different moments at which the
session became known. A screen that branches on the token and on the user id
then re-laid itself out once per instance as each caught up.

Built on first use rather than at import time: the constructor reaches for the
browser, so it cannot run while this module is being evaluated on the server.
*/

import { Hanko } from "@teamhanko/hanko-elements";

import { getHankoApi } from "@/lib/env-variables";

let instance: Hanko | null = null;

export function getHanko(): Hanko {
  instance ??= new Hanko(getHankoApi());
  return instance;
}
