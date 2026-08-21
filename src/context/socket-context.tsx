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

export interface RoomUser {
  id: string;
  name: string;
  email: string | null;
  is_ready: boolean;
}

export interface SocketContextProps {
  socket: WebSocket;
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

  const sendSocketCommand = (command: string, arg: string | null) => {
    console.info(`send command ${command}`);
    if (!socketRef.current) {
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

        toast(t("ConnectionClosed", { poolName: poolInfo.name }), { duration: 2000 });
      };

      socket.onerror = (error) => {
        console.error("WebSocket error", error);
        toast.error(`WebSocket error`, { duration: 2000 });
      };
    },
    [
      updatePoolInfo,
      applyDraftDelta,
      poolInfo.name,
      poolInfo.settings.number_poolers,
      t,
    ]
  );

  useEffect(() => {
    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;
    setupWebSocket(socket);

    return () => {
      // Detach the handlers before closing so this deliberate close (unmount
      // or React strict-mode dev remount) does not trigger error/close toasts.
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.close();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
    // Connect once per mount. `setupWebSocket` and `socketUrl` change whenever
    // the pool object does, and listing them would tear down and re-open the
    // socket on every pool update — including the ones the socket delivers.
    // Reconnecting is done explicitly through `onSocketReconnect`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSocketReconnect = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    const newSocket = new WebSocket(socketUrl);
    socketRef.current = newSocket;
    setupWebSocket(newSocket);
    setSocketStatus(SocketStatus.Connecting);
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
    socket: socketRef.current!,
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
