/*
TODO: Created Pool Status displaying pool settings and the list of pooler.
Poolers can join the room and user info will be displayed here. The owner
of the pool is allowed to update pool settings and kick people out of the
room.
*/

import { useSession } from "@/context/useSessionData";

import { usePoolContext } from "@/context/pool-context";
import * as React from "react";
import { PoolSettings } from "@/data/pool/model";
import { Checkbox } from "@/components/ui/checkbox";

interface RoomUser {
  id: string;
  email: string | null;
  is_ready: boolean;
}

export default function CreatedPool() {
  const [socket, setSocket] = React.useState<WebSocket | null>(null);
  const { jwt } = useSession();
  const [roomUsers, setRoomUsers] = React.useState<Record<
    string,
    RoomUser
  > | null>(null);
  const { poolInfo, updatePoolInfo } = usePoolContext();
  const [poolSettingsUpdate, setPoolSettingsUpdate] =
    React.useState<PoolSettings | null>(null);

  const createSocketCommand = (command: string, arg: string) =>
    `{"${command}": ${arg}}`;

  React.useEffect(() => {
    if (!jwt || !poolInfo.name) return;

    console.log(jwt);
    const socketTmp = new WebSocket(
      `wss://${window.location.host}/api-rust/ws/${jwt}`
    );

    // Receiving message from the socket server.
    socketTmp.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        if (response.Pool) {
          // This is a pool update
          console.log("update pool");
          updatePoolInfo(response.Pool.pool);
        } else if (response.Users) {
          console.log("update users");
          setRoomUsers(response.Users.room_users);
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
        alert(event.data);
      }
    };

    socketTmp.onopen = () => {
      console.log("join room");
      socketTmp.send(
        createSocketCommand("JoinRoom", `{"pool_name": "${poolInfo.name}"}`)
      );
    };

    socketTmp.onerror = (error) => {
      console.error("WebSocket error:", error);
      alert(error);
    };

    setSocket(socketTmp);

    return () => {
      if (socketTmp.readyState === WebSocket.OPEN) {
        console.log("leave room");
        socketTmp.send(createSocketCommand("LeaveRoom", ""));
      }
      console.log("close socket");
      socketTmp.close();
    };
  }, []);

  const updatePoolSettings = () => {
    if (socket && poolSettingsUpdate) {
      const newPoolSettings = { ...poolInfo.settings, ...poolSettingsUpdate };
      socket.send(
        createSocketCommand(
          "OnPoolSettingChanges",
          `{"pool_settings": ${JSON.stringify(newPoolSettings)}}`
        )
      );
    }
  };

  const onReady = () => {
    console.log("on ready!");
    socket?.send('"OnReady"');
  };

  const startDraft = () => {
    socket?.send('"StartDraft"');
  };

  const renderUser = (roomUser: RoomUser) => (
    <div key={roomUser.id}>
      <h1>{roomUser.id}</h1>
      <h1>{roomUser.email}</h1>
      <h1>{roomUser.is_ready}</h1>
      <Checkbox
        id="is-ready"
        defaultChecked={roomUser.is_ready}
        onCheckedChange={(checkedState) =>
          // @ts-ignore
          onReady(checkedState)
        }
      />
    </div>
  );

  return (
    <div className="items-center text-center">
      {roomUsers
        ? Object.keys(roomUsers).map((userId) => renderUser(roomUsers[userId]))
        : null}
    </div>
  );
}
