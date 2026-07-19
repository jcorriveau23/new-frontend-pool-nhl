import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import { getHankoApi } from "@/lib/env-variables";
import { Hanko } from "@teamhanko/hanko-elements";

const hankoApi = getHankoApi();

export interface HankoUser {
  id: string;
  email: string | undefined;
  isValid: boolean;
}

interface UserContextType {
  refreshUser: () => void;
  info: HankoUser | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [userState, setUserState] = useState<HankoUser | null>(null);
  const [hanko, setHanko] = useState<Hanko>();

  const refreshUser = () => {
    // validateSession() is used instead of getUser() because getUser() relies
    // on the GET /users/{id} endpoint which no longer exists on the Hanko API,
    // making it fail even with a valid session. The session claims contain the
    // user id (subject) and email.
    hanko
      ?.validateSession()
      .then((session) => {
        if (session.is_valid) {
          setUserState({
            id: session.claims?.subject ?? session.user_id ?? "",
            email: session.claims?.email?.address,
            isValid: true,
          });
        } else {
          setUserState({ id: "", email: "", isValid: false });
        }
      })
      .catch((error: unknown) => {
        console.error(`An error occured during refresh user: ${error}`);
        setUserState({ id: "", email: "", isValid: false });
      });
  };

  useEffect(() => setHanko(new Hanko(hankoApi)), []);

  useEffect(() => {
    if (!hanko) {
      return;
    }

    refreshUser();

    // Hanko session events are broadcast to every Hanko instance, so the
    // provider stays in sync with logins/logouts triggered elsewhere.
    const cleanups = [
      hanko.onSessionCreated(() => refreshUser()),
      hanko.onSessionExpired(() =>
        setUserState({ id: "", email: "", isValid: false })
      ),
      hanko.onUserLoggedOut(() =>
        setUserState({ id: "", email: "", isValid: false })
      ),
    ];

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [hanko]);

  return (
    <UserContext.Provider value={{ info: userState, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
};

const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export { UserProvider, useUser };
