import { create } from 'zustand';

interface MapPendingStore {
  isPendingMode: boolean;
  setIsPendingMode: (val: boolean) => void;
  clearHandler: (() => void) | null;
  registerClearHandler: (handler: (() => void) | null) => void;
  triggerClear: () => void;
}

export const useMapPendingStore = create<MapPendingStore>((set, get) => ({
  isPendingMode: false,
  setIsPendingMode: (val) => set({ isPendingMode: val }),
  clearHandler: null,
  registerClearHandler: (handler) => set({ clearHandler: handler }),
  triggerClear: () => {
    get().clearHandler?.();
  },
}));
