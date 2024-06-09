import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

const hankoApi = process.env.NEXT_PUBLIC_HANKO_API_URL || "";

interface HankoUser {
  id: string;
  email: string;
  loading: boolean;
  error: string | null;
}

interface UserContextType extends HankoUser {
  refreshUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [userState, setUserState] = useState<HankoUser>({
    id: "",
    email: "",
    loading: true,
    error: null,
  });

  const refreshUser = () => {
    import("@teamhanko/hanko-elements").then(({ Hanko }) => {
      const hankoInstance = new Hanko(hankoApi);

      hankoInstance?.user
        .getCurrent()
        .then(({ id, email }) => {
          setUserState({ id, email, loading: false, error: null });
        })
        .catch((error) => {
          setUserState((prevState) => ({
            ...prevState,
            loading: false,
            error,
          }));
        });
    });
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <UserContext.Provider value={{ ...userState, refreshUser }}>
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
