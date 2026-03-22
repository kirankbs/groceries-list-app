import { useState, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  // wasOffline is true for exactly one render cycle after coming back online,
  // signalling callers to flush queued mutations.
  const [wasOffline, setWasOffline] = useState(false);
  const prevOnline = useRef(true);

  useEffect(() => {
    // Get the current state immediately
    NetInfo.fetch().then(state => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      prevOnline.current = online;
      setIsOnline(online);
    });

    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected === true && state.isInternetReachable !== false;

      if (!prevOnline.current && online) {
        setWasOffline(true);
      } else {
        setWasOffline(false);
      }

      prevOnline.current = online;
      setIsOnline(online);
    });

    return unsubscribe;
  }, []);

  return { isOnline, wasOffline };
}
