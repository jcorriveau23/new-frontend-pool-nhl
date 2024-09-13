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
    userID: "cf1b44fd-e7a2-471e-8602-4cded1a58e8e",
    jwt: "eyJhbGciOiJSUzI1NiIsImtpZCI6ImRhZmE1ODdhLTBhNzktNDFkMi05ZTk5LTQ1MDgxNDQ2M2YyZiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiaG9ja2V5cG9vbC5saXZlIl0sImVtYWlsIjp7ImFkZHJlc3MiOiJqY29ycml2ZWF1MjNAZ21haWwuY29tIiwiaXNfcHJpbWFyeSI6dHJ1ZSwiaXNfdmVyaWZpZWQiOnRydWV9LCJleHAiOjE3MjgzMDA3NjQsImlhdCI6MTcyNTcwODc2NCwic3ViIjoiY2YxYjQ0ZmQtZTdhMi00NzFlLTg2MDItNGNkZWQxYTU4ZThlIn0.jPGuqF9UqLbRgnqI0MgLDeuczjDERWujTrOOL0WrVqVXOzAw7nq4p1HXh75OB1gerjFMBoK6uksRFkT54SpQbWgtmQ6OqtS0Z6UXEjBybwuoxSwnd7zuehjH4_GJ_Jk7udJ_1V9d7jIJPHA9PWY_KcDkn2nmtdWLW7WpK5qhcMHwhc58SqOQfXJDZFlU4A2eGmBNa5QN8Y2zvvqD_MBlgwr6k-3w20zjFiC1Wnj7p9clEwQ_ROmkEs-6SFLC59DbbvXR_77m47XDQhLRWLhPQTM6u6Z1Rhg4qZTjSu9uz5Fo1_bWqfvwKN_ZzXP5bjeuzWekcLonc60uwubMeDwBQ-Y1zUQPOeta5pyUqQP7qxXLdB91kU2tsBVwf8QSx3gaiIV1fBZC1yKQ4le2iqSPLbfkxnO2eb470sfX0KhRHC9XrbO1w_DkUgL-E41vzyeiDK8pAssBBtWCcVemZOEL7nxpCneHhX9_le4v5xt4PfpmbMGMafbhe7syk1V_vN4ltOdSorMJ6oRfsvGm7PzOC5__Da4Shlt_NLBypCVSUHit2UD-f3FQk5nqQAjCJrxXuqtVIEDfXDFd8eJc5pIbgqMh6kxM9eLowh-s44KHkhqC4rueufs_Vj8OXjIYss5WEogMdkijhbrkrxY3JL2w85qHfnz-nGkPjPqbCD9GLhM",
    isValid: true,
    loading: false,
    error: null,
  });

  const refreshSession = () => {
    import("@teamhanko/hanko-elements").then(({ Hanko }) => {
      const hankoInstance = new Hanko(hankoApi);
      if (hankoInstance) {
        const isValid = hankoInstance.session.isValid();
        const session = hankoInstance.session.get();

        if (isValid && session) {
          // const { userID, jwt = "" } = session;
          // setSessionState({
          //   userID,
          //   jwt,
          //   isValid,
          //   loading: false,
          //   error: null,
          // });
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
