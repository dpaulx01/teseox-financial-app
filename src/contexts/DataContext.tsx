import React, { createContext, useContext, ReactNode } from 'react';
import { FinancialData } from '../types';

interface DataContextType {
  data: FinancialData | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode; data: FinancialData | null }> = ({ children, data }) => {
  return (
    <DataContext.Provider value={{ data }}>
      {children}
    </DataContext.Provider>
  );
};

export const useFinancialData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useFinancialData must be used within a DataProvider');
  }
  return { 
    data: context.data,
    financialData: context.data 
  };
};