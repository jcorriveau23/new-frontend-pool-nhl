import { UserData } from "@/data/user/model";
import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from "react";
import Cookies from "js-cookie";
import { LoginResponse } from "@/data/user/response";
import {
  FbResponse,
  getFacebookLoginStatus,
  initFacebookSdk,
} from "@/lib/facebook-sdk";

// Create a Context object
const UserContext = createContext<UserContextProps | undefined>(undefined);

export interface UserContextProps {
  user: UserData | null;
  connectUser: (newUser: LoginResponse) => void;
  disconnectUser: () => void;
}

export const useUserContext = (): UserContextProps => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useDateContext must be used within a DateProvider");
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

// UserProvider component
export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  // State to hold user data
  const [user, setUser] = useState<UserData | null>(null);
  const [fbAuthResponse, setFbAuthResponse] = useState<FbResponse | null>(null);

  // Effect to load user data from localStorage on component mount
  useEffect(() => {
    const userData = localStorage.getItem("persist-account");

    initFacebookSdk().then(() => {
      getFacebookLoginStatus().then((response) => {
        if (response !== null) {
          setFbAuthResponse(response);
        }
      });
    });

    if (userData) {
      // You might want to decode the token and extract user data here
      // For simplicity, I'm assuming the token directly contains user data
      setUser(JSON.parse(userData));
    }
  }, []);

  // Function to update user data and persist it in localStorage
  const updateUser = (loginResponse: LoginResponse) => {
    setUser(loginResponse.user);

    Cookies.set(`auth-${loginResponse.user._id}`, loginResponse.token);
    localStorage.setItem("persist-account", JSON.stringify(loginResponse.user));
  };

  const disconnectUser = () => {
    if (!user) {
      return;
    }

    Cookies.remove(`auth-${user._id}`);
    localStorage.removeItem("persist-account");
    setUser(null);
  };

  const contextValue: UserContextProps = {
    user,
    connectUser: updateUser,
    disconnectUser,
  };

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
};
