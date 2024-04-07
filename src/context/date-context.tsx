/*
Module that share the context of the current date, the selected date 
and allow to update the selected date across the whole application.

TODO: there should be a way to hadle the selected date in a url param so that the query related 
to date are being made on the server side
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
  const currentDate = new Date();

  // The default selected date is the current minus 12 hours.
  // We want to display the games pool info of yesterdays before 12PM.
  const [selectedDate, setSelectedDate] = React.useState<Date>(
    new Date(currentDate.getTime() - 12 * 60 * 60 * 1000)
  );

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
