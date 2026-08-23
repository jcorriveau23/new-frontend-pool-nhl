/*
Backoff schedule for the draft room WebSocket.

A draft runs for hours, so a dropped connection has to come back on its own.
The server pings the socket every 20 seconds, which both keeps it under any
sane proxy idle timeout and closes it once the client stops answering — so the
drops this schedule recovers from are real ones (network change, backend
restart) rather than idle sockets being reaped. The browser exposes no
protocol-level ping of its own, so reconnecting stays the only recovery the
client can drive by itself.

Kept apart from the provider so the schedule can be tested without a DOM.
*/

export const RECONNECT_BASE_DELAY_MS = 1_000;
export const RECONNECT_MAX_DELAY_MS = 30_000;

/*
Delay before retry number `attempt` (0 for the first retry after a drop).

The ceiling doubles per consecutive failure and then holds, so a backend that
stays down is polled every half minute rather than every second. The delay is
drawn from the top half of that window instead of being taken flat: every
client in a room drops together when the backend restarts, and identical
delays would bring them all back on the same tick.
*/
export function reconnectDelay(
  attempt: number,
  random: () => number = Math.random
): number {
  const ceiling = Math.min(
    RECONNECT_BASE_DELAY_MS * 2 ** attempt,
    RECONNECT_MAX_DELAY_MS
  );

  return ceiling / 2 + random() * (ceiling / 2);
}
