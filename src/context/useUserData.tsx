import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import { getHankoApi } from "@/lib/env-variables";

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

  const refreshUser = () => {
    import("@teamhanko/hanko-elements").then(({ Hanko }) => {
      const hankoInstance = new Hanko(hankoApi);

      hankoInstance?.user
        .getCurrent()
        .then(({ id, email }) => {
          setUserState({ id, email, isValid: true });
        })
        .catch((error: unknown) => {
          console.error(`An error occured during refresh user: ${error}`);
          setUserState({ id: "", email: "", isValid: false });
        });
    });
  };

  useEffect(() => {
    refreshUser();
  }, []);

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
