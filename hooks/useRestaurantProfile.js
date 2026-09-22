import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { watchRestaurantProfile } from '../services/restaurantService';

export default function useRestaurantProfile() {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(!!auth.currentUser);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setRestaurant(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    return watchRestaurantProfile(user.uid, (next) => {
      setRestaurant(next);
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  return { restaurant, loading, isStore: restaurant?.businessType === 'store' };
}
