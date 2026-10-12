import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";

import { getHanko } from "@/context/hanko";
import { useIsomorphicLayoutEffect } from "@/hooks/use-isomorphic-layout-effect";

interface HankoSession {
  jwt: string;
  isValid: boolean;
}

interface UserSessionContextType {
  info: HankoSession | null;
  /*
  Whether the stored session has been looked at yet.

  `info` being null means "not read yet", which is not the same thing as
  signed out. A screen that treats the two alike renders as a visitor and then
  takes it back, so anything that would show a signed-out state waits on this
  instead.
  */
  isResolved: boolean;
  refreshSession: () => void;
}

const UserSessionContext = createContext<UserSessionContextType | undefined>(
  undefined,
);

interface UserSessionProviderProps {
  children: ReactNode;
}

export const UserSessionProvider: React.FC<UserSessionProviderProps> = ({
  children,
}) => {
  const [sessionState, setSessionState] = useState<HankoSession | null>(null);

  /*
  Reading the token is synchronous — it is in the browser already. This used to
  sit behind a dynamic `import("@teamhanko/hanko-elements")`, which is why the
  token arrived a chunk-load after the rest of the page and every request that
  needed it had to wait.
  */
  const refreshSession = useCallback(() => {
    const jwt = getHanko().getSessionToken();
    setSessionState({ jwt: jwt ?? "", isValid: Boolean(jwt) });
  }, []);

  // A layout effect, so the session is in place before the first paint rather
  // than one frame into it.
  useIsomorphicLayoutEffect(() => {
    refreshSession();

    // Hanko broadcasts these to every instance, so a login or a logout from
    // anywhere in the app lands here without the caller having to say so.
    const hanko = getHanko();
    const cleanups = [
      hanko.onSessionCreated(() => refreshSession()),
      hanko.onSessionExpired(() => setSessionState({ jwt: "", isValid: false })),
      hanko.onUserLoggedOut(() => setSessionState({ jwt: "", isValid: false })),
    ];

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [refreshSession]);

  // Memoised because consumers put the whole context object in effect
  // dependency lists.
  const value = useMemo(
    () => ({
      info: sessionState,
      isResolved: sessionState !== null,
      refreshSession,
    }),
    [sessionState, refreshSession],
  );

  return (
    <UserSessionContext.Provider value={value}>
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
