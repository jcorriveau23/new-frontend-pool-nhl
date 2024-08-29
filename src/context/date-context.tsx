"use client";

/*
Module that share the context of the current date, the selected date 
and allow to update the selected date across the whole application.
*/
import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { usePathname, useRouter } from "@/navigation";
import { format } from "date-fns";

export interface DateContextProps {
  selectedDate: string;
  updateDateWithString: (newDate: string) => void;
  updateDate: (newDate: Date) => void;
}

const DateContext = createContext<DateContextProps | undefined>(undefined);

export const useDateContext = (): DateContextProps => {
  const context = useContext(DateContext);
  if (!context) {
    throw new Error("useDateContext must be used within a DateProvider");
  }
  return context;
};

interface DateProviderProps {
  children: ReactNode;
}

export const DateProvider: React.FC<DateProviderProps> = ({ children }) => {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = React.useState<string>("now");
  const pathname = usePathname();

  useEffect(() => {
    // Extract selectedDate from the URL if present
    const url = new URL(window.location.href);
    const selectedDateParam = url.pathname.split("/").find((segment) => {
      return /^\d{4}-\d{2}-\d{2}$/.test(segment); // Matches YYYY-MM-DD
    });

    if (selectedDateParam) {
      setSelectedDate(selectedDateParam);
    }
  }, [pathname]);

  const updateDateWithString = (newDate: string) => {
    setSelectedDate(newDate);
    // router.push(newDate);
  };

  const updateDate = (newDate: Date) => {
    setSelectedDate(format(newDate, "yyyy-MM-dd"));
    // router.push(newDate);
  };

  const contextValue: DateContextProps = {
    selectedDate,
    updateDateWithString,
    updateDate,
  };

  return (
    <DateContext.Provider value={contextValue}>{children}</DateContext.Provider>
  );
};

export const DatePickerContext = () => {
  const { selectedDate, updateDate, updateDateWithString } = useDateContext();

  return (
    <DatePicker
      selectedDate={selectedDate}
      updateDate={updateDate}
      updateDateWithString={updateDateWithString}
    />
  );
};
