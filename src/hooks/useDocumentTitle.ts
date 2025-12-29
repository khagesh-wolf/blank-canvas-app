import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

export const useDocumentTitle = () => {
  const settings = useStore((state) => state.settings);

  useEffect(() => {
    const name = settings.restaurantName || 'Sajilo Orders';
    const subName = settings.restaurantSubName;
    
    document.title = subName ? `${name} - ${subName}` : name;
  }, [settings.restaurantName, settings.restaurantSubName]);
};
