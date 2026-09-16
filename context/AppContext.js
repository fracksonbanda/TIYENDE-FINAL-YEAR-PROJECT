import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext({});

export function AppProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [trafficLayer, setTrafficLayer] = useState(false);
  // tracks whether each promo type has been redeemed this session
  const [promoUsed, setPromoUsed] = useState({ ride: false, food: false });

  const markPromoUsed = (type) => setPromoUsed((prev) => ({ ...prev, [type]: true }));

  return (
    <AppContext.Provider value={{
      darkMode, setDarkMode,
      notifications, setNotifications,
      trafficLayer, setTrafficLayer,
      promoUsed, markPromoUsed,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
