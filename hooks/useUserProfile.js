import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { watchUserProfile } from '../services/profileService';

export default function useUserProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!!auth.currentUser);
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    return watchUserProfile(user.uid, (nextProfile) => {
      setProfile(nextProfile);
      setLoading(false);
    }, (err) => {
      setError(err);
      setLoading(false);
    });
  }, []);

  return { profile, loading, error };
}
