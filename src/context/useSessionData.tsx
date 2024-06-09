import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

const hankoApi = process.env.NEXT_PUBLIC_HANKO_API_URL || "";

interface HankoSession {
  userID: string;
  jwt: string;
  isValid: boolean;
  loading: boolean;
  error: string | null;
}

interface UserSessionContextType extends HankoSession {
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
  const [sessionState, setSessionState] = useState<HankoSession>({
    userID: "",
    jwt: "",
    isValid: false,
    loading: true,
    error: null,
  });

  const refreshSession = () => {
    import("@teamhanko/hanko-elements").then(({ Hanko }) => {
      const hankoInstance = new Hanko(hankoApi);
      if (hankoInstance) {
        const isValid = hankoInstance.session.isValid();
        const session = hankoInstance.session.get();

        if (isValid && session) {
          const { userID, jwt = "" } = session;
          setSessionState({
            userID,
            jwt,
            isValid,
            loading: false,
            error: null,
          });
        } else {
          setSessionState((prevState) => ({
            ...prevState,
            isValid: false,
            loading: false,
            error: "Invalid session",
          }));
        }
      }
    });
  };

  useEffect(() => {
    refreshSession();
  }, []);

  return (
    <UserSessionContext.Provider value={{ ...sessionState, refreshSession }}>
      {children}
    </UserSessionContext.Provider>
  );
};

export const useSession = (): UserSessionContextType => {
  const context = useContext(UserSessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};
