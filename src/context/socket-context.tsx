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
import { toast } from "@/hooks/use-toast";
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

  const { poolInfo, updatePoolInfo } = usePoolContext();
  const t = useTranslations();

  const socketUrl = `wss://${window.location.host}/api-rust/ws/${
    typeof jwt === "string" && jwt !== "" ? jwt : "unauthenticated"
  }`;
  const socketRef = useRef<WebSocket | null>(null);

  const sendSocketCommand = (command: string, arg: string | null) => {
    console.log(`send command ${command}`);
    if (!socketRef.current) {
      toast({
        variant: "destructive",
        title: t("SocketNotConnected"),
        duration: 5000,
      });
      return;
    }

    if (session.info === null || session.info.isValid === false) {
      toast({
        variant: "destructive",
        title: t("UserNotConnected"),
        duration: 5000,
      });
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
          } else if (response.Users) {
            setRoomUsers(response.Users.room_users);
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
          toast({
            variant: "destructive",
            title: event.data,
            duration: 2000,
          });
        }
      };

      socket.onopen = () => {
        socket.send(
          createSocketCommand(
            Command.JoinRoom,
            `{"pool_name": "${poolInfo.name}", "number_poolers": ${poolInfo.settings.number_poolers}}`
          )
        );
        toast({
          title: t("RoomJoined", { poolName: poolInfo.name }),
          duration: 2000,
        });
        setSocketStatus(SocketStatus.Opened);
      };

      socket.onclose = () => {
        setSocketStatus(SocketStatus.Closed);

        toast({
          title: t("ConnectionClosed", { poolName: poolInfo.name }),
          duration: 2000,
        });
      };

      socket.onerror = (error) => {
        toast({
          variant: "destructive",
          title: `WebSocket error`,
          duration: 2000,
        });
      };
    },
    [updatePoolInfo, poolInfo.name, t]
  );

  useEffect(() => {
    if (
      !socketRef.current ||
      socketRef.current.readyState === WebSocket.CLOSED
    ) {
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;
      setupWebSocket(socket);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        toast({
          title: t("RoomLeft", { poolName: poolInfo.name }),
          duration: 2000,
        });
      }
    };
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
        <PopoverTrigger asChild>
          <Button variant="outline">
            <Signal color={SOCKET_STATUS_TO_COLOR[socketStatus]} />
          </Button>
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
