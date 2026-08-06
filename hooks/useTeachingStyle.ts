'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TeachingStyle,
  TeachingStyleId,
  DEFAULT_TEACHING_STYLE_ID,
  TEACHING_STYLE_STORAGE_KEY,
  getTeachingStyle,
  TEACHING_STYLES_LIST,
} from '@/lib/teachingStyles';

interface UseTeachingStyleReturn {
  personality: TeachingStyle;
  teachingStyleId: TeachingStyleId;
  setTeachingStyle: (id: TeachingStyleId) => void;
  allTeachingStyles: TeachingStyle[];
  isLoaded: boolean;
}

/**
 * Hook to read and update the user's selected teaching style.
 * Persists to localStorage and syncs across components.
 */
export function useTeachingStyle(): UseTeachingStyleReturn {
  const [teachingStyleId, setTeachingStyleId] = useState<TeachingStyleId>(DEFAULT_TEACHING_STYLE_ID);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TEACHING_STYLE_STORAGE_KEY) as TeachingStyleId | null;
      if (stored && getTeachingStyle(stored).id === stored) {
        setTeachingStyleId(stored);
      }
    } catch {
      // localStorage not available (SSR)
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const setTeachingStyle = useCallback((id: TeachingStyleId) => {
    setTeachingStyleId(id);
    try {
      localStorage.setItem(TEACHING_STYLE_STORAGE_KEY, id);
      // Dispatch storage event so other tabs/components can sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: TEACHING_STYLE_STORAGE_KEY,
        newValue: id,
      }));
    } catch {
      // localStorage not available
    }
  }, []);

  // Listen for cross-tab / cross-component storage updates
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === TEACHING_STYLE_STORAGE_KEY && e.newValue) {
        const newId = e.newValue as TeachingStyleId;
        if (getTeachingStyle(newId).id === newId) {
          setTeachingStyleId(newId);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    personality: getTeachingStyle(teachingStyleId),
    teachingStyleId,
    setTeachingStyle,
    allTeachingStyles: TEACHING_STYLES_LIST,
    isLoaded,
  };
}
