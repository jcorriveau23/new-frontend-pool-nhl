/*
Module that manage the socket connection as a context manager to centralize logics between page that needs to have sockets.
(Draft/Pool creation)
*/
import { Card, CardHeader } from "@/components/ui/card";
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

export interface RoomUser {
  id: string;
  email: string | null;
  is_ready: boolean;
}

export interface SocketContextProps {
  socket: WebSocket;
  roomUsers: Record<string, RoomUser> | null;
}

const SocketContext = createContext<SocketContextProps | undefined>(undefined);

export const createSocketCommand = (command: string, arg: string) =>
  `{"${command}": ${arg}}`;

export enum Command {
  JoinRoom = "JoinRoom",
  OnPoolSettingChanges = "OnPoolSettingChanges",
  OnReady = "OnReady",
  StartDraft = "StartDraft",
}

enum SocketStatus {
  Connecting = 0,
  Opened = 1,
  Closing = 2,
  Closed = 3,
}

const SOCKET_STATUS_TO_COLOR: Record<SocketStatus, string> = {
  [SocketStatus.Connecting]: "bg-yellow-500",
  [SocketStatus.Opened]: "bg-green-500",
  [SocketStatus.Closing]: "bg-orange-500",
  [SocketStatus.Closed]: "bg-red-500",
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
  jwt: string | null;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  jwt,
}) => {
  const [roomUsers, setRoomUsers] = React.useState<Record<
    string,
    RoomUser
  > | null>(null);
  const [socketStatus, setSocketStatus] = React.useState<SocketStatus>(
    SocketStatus.Connecting
  );

  const { poolInfo, updatePoolInfo } = usePoolContext();
  const t = useTranslations();

  const socketUrl = `wss://192.168.0.75/api-rust/ws/${jwt}`;

  const socketRef = useRef<WebSocket>(new WebSocket(socketUrl));

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
            title: t("FailedToParseWebSocketMessage", { error: event.data }),
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
    const socket = socketRef.current;
    setupWebSocket(socket);

    return () => {
      socket.close();
      toast({
        title: t("RoomLeft", { poolName: poolInfo.name }),
        duration: 2000,
      });
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
    <Card className="w-full max-w-sm">
      <CardHeader className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div>
            <Signal className="h-4 w-4" />
          </div>
          <div className="text-sm font-medium">{t("WebSocketConnection")}</div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${SOCKET_STATUS_TO_COLOR[socketStatus]}`}
          />
          <div className="text-sm">
            {socketStatus === SocketStatus.Opened
              ? t("Connected")
              : t("Disconnected")}
          </div>
          <div>
            {socketStatus === SocketStatus.Closed ? (
              <Button onClick={() => onSocketReconnect()}>
                {t("Reconnect")}
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
    </Card>
  );

  const contextValue: SocketContextProps = {
    socket: socketRef.current,
    roomUsers,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {renderSocketConnection(socketStatus)}
      {children}
    </SocketContext.Provider>
  );
};
