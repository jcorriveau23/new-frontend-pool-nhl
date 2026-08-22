/*
Module that manage the socket connection as a context manager to centralize logics between page that needs to have sockets.
(Draft/Pool creation)
*/
import { Signal } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

export enum Command {
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

enum SocketStatus {
  Connecting = "Connecting",
  Opened = "Connected",
  Closing = "Closing",
  Closed = "Closed",
}

const SOCKET_STATUS_TO_COLOR: Record<SocketStatus, string> = {
  [SocketStatus.Connecting]: "yellow",
  [SocketStatus.Opened]: "green",
  [SocketStatus.Closing]: "orange",
  [SocketStatus.Closed]: "red",
};

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
    null
  );
  const [socketStatus, setSocketStatus] = useState<SocketStatus>(
    SocketStatus.Connecting
  );
  const session = useSession();

  const { poolInfo, updatePoolInfo, applyDraftDelta } = usePoolContext();
  const t = useTranslations();
  const socketProtocol =
    window.location.protocol === "https:" ? "wss:" : "ws:";
  const socketUrl = `${socketProtocol}//${window.location.host}/api-rust/ws/${
    typeof jwt === "string" && jwt !== "" ? jwt : "unauthenticated"
  }`;
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  // Set on unmount so an in-flight close does not schedule a reconnect for a
  // provider that is already gone.
  const teardownRef = useRef(false);
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

    setSocketStatus(SocketStatus.Connecting);
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
            setRoomUsers(response.Users.room_users);
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
        socket.send(
          createSocketCommand(
            Command.JoinRoom,
            `{"pool_name": "${poolInfo.name}", "number_poolers": ${poolInfo.settings.number_poolers}}`
          )
        );
        toast(t("RoomJoined", { poolName: poolInfo.name }), { duration: 2000 });
        setSocketStatus(SocketStatus.Opened);
      };

      socket.onclose = () => {
        setSocketStatus(SocketStatus.Closed);

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
      t,
    ]
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

    window.addEventListener("online", reconnectNow);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      teardownRef.current = true;
      clearReconnectTimer();
      window.removeEventListener("online", reconnectNow);
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

  const renderSocketConnection = (socketStatus: SocketStatus) => (
    <div className="fixed bottom-4 left-4 z-50">
      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>
          <Signal color={SOCKET_STATUS_TO_COLOR[socketStatus]} />
        </PopoverTrigger>
        <PopoverContent>
          <div className="text-sm font-medium">
            {t("WebSocketConnection", { socketStatus: t(socketStatus) })}
          </div>
          <div className="mt-3">
            {socketStatus === SocketStatus.Closed ? (
              <Button onClick={() => onSocketReconnect()}>
                {t("Reconnect")}
              </Button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  const contextValue: SocketContextProps = {
    sendSocketCommand,
    roomUsers,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {renderSocketConnection(socketStatus)}
      {children}
    </SocketContext.Provider>
  );
};
