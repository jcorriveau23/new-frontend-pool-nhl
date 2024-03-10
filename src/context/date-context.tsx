/*
Module that share the context of the current date, the selected date 
and allow to update the selected date across the whole application.
*/
import React, { createContext, useContext, ReactNode } from "react";

export interface DateContextProps {
  currentDate: Date;
  selectedDate: Date;
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
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const currentDate = new Date();

  const updateDate = (newDate: Date) => {
    setSelectedDate(newDate);
  };

  const contextValue: DateContextProps = {
    currentDate,
    selectedDate,
    updateDate,
  };

  return (
    <DateContext.Provider value={contextValue}>{children}</DateContext.Provider>
  );
};
