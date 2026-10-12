import { useEffect, useLayoutEffect } from "react";

/*
`useLayoutEffect`, except on the server, where React warns that it does
nothing.

Used where state has to be in place before the browser paints rather than one
frame after it — reading the stored session, in practice. `useEffect` would
let the signed-out frame reach the screen first.
*/
export const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
