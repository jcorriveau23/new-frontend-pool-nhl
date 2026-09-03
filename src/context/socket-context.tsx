/*
Module that manage the socket connection as a context manager to centralize logics between page that needs to have sockets.
(Draft/Pool creation)
*/
import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { usePoolContext } from "./pool-context";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  SocketStatus,
  SocketStatusIndicator,
} from "@/components/socket-status-indicator";
import { useSession } from "./useSessionData";
import { reconnectDelay } from "@/lib/socket-reconnect";

export interface RoomUser {
  id: string;
  name: string;
  email: string | null;
  is_ready: boolean;
}

export interface SocketContextProps {
  roomUsers: Record<string, RoomUser> | null;
  sendSocketCommand: (command: string, arg: string | null) => void;
}

const SocketContext = createContext<SocketContextProps | undefined>(undefined);

export const createSocketCommand = (command: string, arg: string) =>
  `{"${command}": ${arg}}`;

// The room users come back from the backend as a map, whose serialized order
// changes from one update to the next. Rebuilding it in the order already on
// screen keeps everyone in place when a single one of them changes.
const keepRoomUsersOrder = (
  prevUsers: Record<string, RoomUser> | null,
  newUsers: Record<string, RoomUser>,
): Record<string, RoomUser> => {
  const orderedUsers: Record<string, RoomUser> = {};

  for (const userId of Object.keys(prevUsers ?? {})) {
    if (userId in newUsers) {
      orderedUsers[userId] = newUsers[userId];
    }
  }

  for (const userId of Object.keys(newUsers)) {
    if (!(userId in orderedUsers)) {
      orderedUsers[userId] = newUsers[userId];
    }
  }

  return orderedUsers;
};

export enum Command {
  Auth = "Auth",
  JoinRoom = "JoinRoom",
  OnPoolSettingChanges = "OnPoolSettingChanges",
  OnReady = "OnReady",
  AddUser = "AddUser",
  RemoveUser = "RemoveUser",
  StartDraft = "StartDraft",
  DraftPlayer = "DraftPlayer",
  UndoDraftPlayer = "UndoDraftPlayer",
  ModifyRoster = "ModifyRoster",
}

export const useSocketContext = (): SocketContextProps => {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useDateContext must be used within a DateProvider");
  }

  return context;
};

/*
`StartingRoster` renders both on the draft page, inside this provider, and on
the in-progress tab, where there is no room and no socket. It uses this to tell
the two apart: a roster change during the draft goes to the room over the
socket, everywhere else it goes to the REST endpoint.
*/
export const useOptionalSocketContext = (): SocketContextProps | undefined =>
  useContext(SocketContext);

interface SocketProviderProps {
  children: ReactNode;
  jwt: string | null | undefined;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  jwt,
}) => {
  const [roomUsers, setRoomUsers] = useState<Record<string, RoomUser> | null>(
    null,
  );
  const [socketStatus, setSocketStatus] = useState<SocketStatus>(
    SocketStatus.Connecting,
  );
  // When the pending retry is due, so the indicator can count it down instead
  // of leaving the user staring at a dead socket with no idea anything is
  // still being attempted.
  const [nextRetryAt, setNextRetryAt] = useState<number | null>(null);
  // Assumed true until an effect can read `navigator`, which keeps the first
  // client render identical to the server's.
  const [isOnline, setIsOnline] = useState(true);
  const session = useSession();

  const { poolInfo, updatePoolInfo, applyDraftDelta, resyncPoolInfo } =
    usePoolContext();
  const t = useTranslations();
  const socketProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const socketUrl = `${socketProtocol}//${window.location.host}/api-rust/ws`;
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  // Set on unmount so an in-flight close does not schedule a reconnect for a
  // provider that is already gone.
  const teardownRef = useRef(false);
  // Whether a socket of this provider has already been open once, which is what
  // tells a reconnect from the first connection. `reconnectAttemptRef` cannot:
  // the paths that reconnect immediately (back online, tab visible again, the
  // manual button) reset it to zero before connecting, and those are exactly
  // the drops long enough to have missed something.
  const hasConnectedRef = useRef(false);
  // `connect` and `setupWebSocket` reference each other (a close schedules a
  // reconnect, which reconnects and re-attaches the handlers). Going through
  // refs breaks the cycle and keeps both out of each other's dependency lists.
  const connectRef = useRef<() => void>(() => {});
  const setupWebSocketRef = useRef<(socket: WebSocket) => void>(() => {});
  const socketUrlRef = useRef(socketUrl);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (teardownRef.current || reconnectTimerRef.current !== null) {
      return;
    }
    // Nothing is being watched in a hidden tab, and the visibilitychange
    // listener below reconnects the moment it comes back — so a backgrounded
    // phone stops retrying instead of waking the radio every 30 seconds.
    if (document.visibilityState === "hidden") {
      return;
    }

    const delay = reconnectDelay(reconnectAttemptRef.current);
    reconnectAttemptRef.current += 1;
    setNextRetryAt(Date.now() + delay);
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connectRef.current();
    }, delay);
  }, []);

  const detachHandlers = (socket: WebSocket) => {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.onerror = null;
  };

  const connect = useCallback(() => {
    clearReconnectTimer();

    const existing = socketRef.current;
    if (existing) {
      // Detach before closing: this close is deliberate, and left attached it
      // would count as a failure and schedule a second, competing reconnect.
      detachHandlers(existing);
      existing.close();
    }

    // No retry is outstanding once this attempt starts, whether it came from
    // the backoff timer or from the manual button.
    setNextRetryAt(null);
    setSocketStatus(
      hasConnectedRef.current
        ? SocketStatus.Reconnecting
        : SocketStatus.Connecting,
    );
    const socket = new WebSocket(socketUrlRef.current);
    socketRef.current = socket;
    setupWebSocketRef.current(socket);
  }, [clearReconnectTimer]);

  const sendSocketCommand = (command: string, arg: string | null) => {
    // `send()` throws on a socket that is still CONNECTING or already CLOSED,
    // which is exactly the window a reconnect runs in — so the readyState is
    // what decides, not the mere presence of a ref.
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      toast.error(t("SocketNotConnected"), { duration: 5000 });
      return;
    }

    if (session.info === null || session.info.isValid === false) {
      toast.error(t("UserNotConnected"), { duration: 5000 });
      return;
    }

    if (arg === null) {
      socketRef.current.send(`"${command}"`);
      return;
    }

    socketRef.current.send(createSocketCommand(command, arg));
  };

  const setupWebSocket = useCallback(
    (socket: WebSocket) => {
      socket.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          if (response.Pool) {
            // This is a pool update
            updatePoolInfo(response.Pool.pool);
          } else if (
            response.PlayerDrafted ||
            response.DraftPickUndone ||
            response.RosterModified
          ) {
            // Draft picks send only what they changed instead of the whole
            // pool, which would be tens of kilobytes per pick per socket.
            applyDraftDelta(response);
          } else if (response.Users) {
            setRoomUsers((prevUsers) =>
              keepRoomUsersOrder(prevUsers, response.Users.room_users),
            );
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
          toast.error(event.data, { duration: 2000 });
        }
      };

      socket.onopen = () => {
        // Reaching OPEN ends the streak, so the next unexpected drop starts
        // its backoff from one second again rather than from the cap.
        reconnectAttemptRef.current = 0;

        if (typeof jwt === "string" && jwt !== "") {
          socket.send(
            createSocketCommand(Command.Auth, JSON.stringify({ token: jwt })),
          );
        }

        socket.send(
          createSocketCommand(
            Command.JoinRoom,
            `{"pool_name": "${poolInfo.name}", "number_poolers": ${poolInfo.settings.number_poolers}}`,
          ),
        );

        // Whatever the room did while this socket was down was broadcast to
        // the sockets that were connected, and JoinRoom replays none of it —
        // it only republishes the user list. Without this the board keeps
        // rendering the pool as it was before the drop until a later pick
        // happens not to fit and trips the delta resync.
        if (hasConnectedRef.current) {
          resyncPoolInfo();
        }
        hasConnectedRef.current = true;
        toast(t("RoomJoined", { poolName: poolInfo.name }), { duration: 2000 });
        setNextRetryAt(null);
        setSocketStatus(SocketStatus.Connected);
      };

      socket.onclose = () => {
        // A drop is never reported as a resting state: the provider always has
        // a way back from here, so the indicator says so.
        setSocketStatus(
          hasConnectedRef.current
            ? SocketStatus.Reconnecting
            : SocketStatus.Connecting,
        );

        // Only the first drop of a streak is announced. The retries are silent,
        // so a flapping connection reports itself through the status indicator
        // instead of burying the draft in toasts.
        if (reconnectAttemptRef.current === 0) {
          toast(t("ConnectionClosed", { poolName: poolInfo.name }), {
            duration: 2000,
          });
        }

        scheduleReconnect();
      };

      // An error is always followed by a close, which is where the reconnect
      // is scheduled — so this only has to report, and only for the first
      // failure of a streak.
      socket.onerror = (error) => {
        if (reconnectAttemptRef.current === 0) {
          console.error("WebSocket error", error);
        }
      };
    },
    [
      updatePoolInfo,
      applyDraftDelta,
      poolInfo.name,
      poolInfo.settings.number_poolers,
      scheduleReconnect,
      resyncPoolInfo,
      jwt,
      t,
    ],
  );

  // `connect` reaches the current handlers through these, so a reconnect that
  // fires minutes into a draft re-joins with the pool name and pooler count as
  // they are now, not as they were when the socket first opened.
  //
  // Declared above the connecting effect on purpose: effects run in source
  // order, so these are populated before the first connect() reads them, and
  // refreshed after every later render. Assigning during render instead would
  // mutate on renders React goes on to discard.
  useEffect(() => {
    setupWebSocketRef.current = setupWebSocket;
    connectRef.current = connect;
    socketUrlRef.current = socketUrl;
  });

  useEffect(() => {
    teardownRef.current = false;
    setIsOnline(navigator.onLine);
    connect();

    // A backoff timer is not the only way back. These two cover the cases that
    // actually strand a draft: the laptop that slept through a proxy's idle
    // timeout, and the phone that changed networks. Both reconnect at once
    // rather than waiting out whatever delay the streak had reached.
    const reconnectNow = () => {
      if (teardownRef.current) {
        return;
      }
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        return;
      }
      reconnectAttemptRef.current = 0;
      connectRef.current();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reconnectNow();
      }
    };

    // Tracked as well as acted on: a socket that cannot come back because the
    // device has no network is a different message to the user than one that
    // is being retried.
    const onOnline = () => {
      setIsOnline(true);
      reconnectNow();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      teardownRef.current = true;
      clearReconnectTimer();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibilityChange);

      const socket = socketRef.current;
      if (socket) {
        // Detach before closing so this deliberate close (unmount, or a React
        // strict-mode dev remount) neither toasts nor schedules a reconnect.
        detachHandlers(socket);
        socket.close();
        socketRef.current = null;
      }
    };
  }, [connect, clearReconnectTimer]);

  // The manual escape hatch, for when the automatic retries have backed off to
  // the cap and the user would rather not wait out the delay.
  const onSocketReconnect = () => {
    reconnectAttemptRef.current = 0;
    connect();
  };

  // A socket that is down because the device has no network is reported as
  // such rather than as an endless retry, since only the user can fix it.
  const displayStatus =
    !isOnline && socketStatus !== SocketStatus.Connected
      ? SocketStatus.Offline
      : socketStatus;

  const contextValue: SocketContextProps = {
    sendSocketCommand,
    roomUsers,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      <SocketStatusIndicator
        status={displayStatus}
        nextRetryAt={nextRetryAt}
        onReconnect={onSocketReconnect}
      />
      {children}
    </SocketContext.Provider>
  );
};
