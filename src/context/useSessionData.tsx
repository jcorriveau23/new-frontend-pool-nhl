import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import { getHankoApi } from "@/lib/env-variables";

const hankoApi = getHankoApi();

interface HankoSession {
  jwt: string;
  isValid: boolean;
}

interface UserSessionContextType {
  info: HankoSession | null;
  refreshSession: () => void;
}

const UserSessionContext = createContext<UserSessionContextType | undefined>(
  undefined
);

interface UserSessionProviderProps {
  children: ReactNode;
}

export const UserSessionProvider: React.FC<UserSessionProviderProps> = ({
  children,
}) => {
  const [sessionState, setSessionState] = useState<HankoSession | null>(null);

  const refreshSession = () => {
    import("@teamhanko/hanko-elements").then(({ Hanko }) => {
      const hankoInstance = new Hanko(hankoApi);
      if (hankoInstance) {
        const jwt = hankoInstance.getSessionToken();

        if (jwt) {
          setSessionState({
            jwt,
            isValid: true,
          });
        } else {
          setSessionState(() => ({
            jwt: "",
            isValid: false,
          }));
        }
      }
    });
  };

  useEffect(() => {
    refreshSession();
  }, []);

  return (
    <UserSessionContext.Provider value={{ info: sessionState, refreshSession }}>
      {children}
    </UserSessionContext.Provider>
  );
};

export const useSession = (): UserSessionContextType => {
  const context = useContext(UserSessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider.");
  }
  return context;
};
