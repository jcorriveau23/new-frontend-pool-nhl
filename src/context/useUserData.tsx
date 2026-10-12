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
import { sessionUserFromToken } from "@/lib/session-token";

export interface HankoUser {
  id: string;
  email: string | undefined;
  isValid: boolean;
}

interface UserContextType {
  refreshUser: () => void;
  info: HankoUser | null;
  // Whether the session has been looked at yet — see the same field on
  // `useSession`, which carries the longer note.
  isResolved: boolean;
}

const SIGNED_OUT: HankoUser = { id: "", email: "", isValid: false };

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [userState, setUserState] = useState<HankoUser | null>(null);

  /*
  Only re-render when the answer actually changed.

  The token and the server's confirmation of it normally say the same thing, so
  without this the confirmation landing would re-render the whole app with
  identical data — and a screen whose effects depend on the user id would
  refetch for nothing.
  */
  const setUser = useCallback((next: HankoUser) => {
    setUserState((current) =>
      current !== null &&
      current.id === next.id &&
      current.email === next.email &&
      current.isValid === next.isValid
        ? current
        : next,
    );
  }, []);

  // Who the stored token says we are. Synchronous, so it is the answer the
  // first paint gets.
  const readToken = useCallback(() => {
    const user = sessionUserFromToken(getHanko().getSessionToken());
    setUser(
      user === null
        ? SIGNED_OUT
        : { id: user.id, email: user.email, isValid: true },
    );
    return user;
  }, [setUser]);

  const refreshUser = useCallback(() => {
    const fromToken = readToken();

    /*
    The server's word on the same session, which only matters when it
    disagrees with the token — a session revoked on another device, say.

    validateSession() is used instead of getUser() because getUser() relies on
    the GET /users/{id} endpoint which no longer exists on the Hanko API,
    making it fail even with a valid session. The session claims contain the
    user id (subject) and email.
    */
    getHanko()
      .validateSession()
      .then((session) => {
        if (session.is_valid) {
          setUser({
            id: session.claims?.subject ?? session.user_id ?? "",
            email: session.claims?.email?.address,
            isValid: true,
          });
        } else {
          setUser(SIGNED_OUT);
        }
      })
      .catch((error: unknown) => {
        console.error(`An error occured during refresh user: ${error}`);
        // A call that failed on the network says nothing about whether the
        // session is good, so a readable token stands rather than signing
        // somebody out because their connection dropped.
        if (fromToken === null) {
          setUser(SIGNED_OUT);
        }
      });
  }, [readToken, setUser]);

  // A layout effect, so the user is known before the first paint rather than
  // one frame into it.
  useIsomorphicLayoutEffect(() => {
    refreshUser();

    // Hanko session events are broadcast to every Hanko instance, so the
    // provider stays in sync with logins/logouts triggered elsewhere.
    const hanko = getHanko();
    const cleanups = [
      hanko.onSessionCreated(() => refreshUser()),
      hanko.onSessionExpired(() => setUser(SIGNED_OUT)),
      hanko.onUserLoggedOut(() => setUser(SIGNED_OUT)),
    ];

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [refreshUser, setUser]);

  // Memoised because consumers put the whole context object in effect
  // dependency lists.
  const value = useMemo(
    () => ({
      info: userState,
      isResolved: userState !== null,
      refreshUser,
    }),
    [userState, refreshUser],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export { UserProvider, useUser };
