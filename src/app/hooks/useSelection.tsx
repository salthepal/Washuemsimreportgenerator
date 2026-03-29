import { useState, useCallback } from 'react';

interface SelectionHook<T extends string> {
  selected: T[];
  toggle: (id: T) => void;
  selectAll: (ids: T[]) => void;
  deselectAll: () => void;
  isSelected: (id: T) => boolean;
}

export function useSelection<T extends string>(initialSelected: T[] = []): SelectionHook<T> {
  const [selected, setSelected] = useState<T[]>(initialSelected);

  const toggle = useCallback((id: T) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);

  const selectAll = useCallback((ids: T[]) => {
    setSelected(ids);
  }, []);

  const deselectAll = useCallback(() => {
    setSelected([]);
  }, []);

  const isSelected = useCallback((id: T) => {
    return selected.includes(id);
  }, [selected]);

  return { selected, toggle, selectAll, deselectAll, isSelected };
}
