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
    hanko
      ?.getUser()
      .then((user) => {
        setUserState({
          id: user.user_id,
          email: user.emails?.[0]?.address,
          isValid: true,
        });
      })
      .catch((error: unknown) => {
        console.error(`An error occured during refresh user: ${error}`);
        setUserState({ id: "", email: "", isValid: false });
      });
  };

  useEffect(() => setHanko(new Hanko(hankoApi)), []);

  useEffect(() => {
    refreshUser();
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
