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

interface RoomUser {}

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

  const create_socket_command = (command: string, arg: string) =>
    `{"${command}": ${arg}}`;

  React.useEffect(() => {
    const socket_tmp = new WebSocket(
      `wss://${window.location.host}/api-rust/ws/${jwt}`
    );

    // Receiving message from the socket server.
    socket_tmp.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        if (response.Pool) {
          // This is a pool update
          updatePoolInfo(response.Pool.pool);
        } else if (response.Users) {
          setRoomUsers(response.Users.room_users);
        }
      } catch (e) {
        alert(event.data);
      }
    };
    socket_tmp.onopen = () =>
      socket_tmp.send(
        create_socket_command("JoinRoom", `{"pool_name": "${poolInfo.name}"}`)
      );

    setSocket(socket_tmp);

    return () => {
      socket_tmp.send('"LeaveRoom"');
      socket_tmp.close();
    };
  }, []);

  const update_pool_settings = () => {
    const newPoolSettings = { ...poolInfo.settings, ...poolSettingsUpdate };
    socket?.send(
      create_socket_command(
        "OnPoolSettingChanges",
        `{"pool_settings": ${JSON.stringify(newPoolSettings)}}`
      )
    );
  };

  const on_ready = () => {
    socket?.send('"OnReady"');
  };

  const start_draft = () => {
    socket?.send('"StartDraft"');
  };

  const renderUser = (roomUser: RoomUser) => (
    <div>
      <h1></h1>
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
