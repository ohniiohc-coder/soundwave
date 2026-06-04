import { create } from "zustand";

type DMView = "inbox" | "new-message" | "chat";

interface DMPanelState {
  isOpen: boolean;
  view: DMView;
  selectedUserId: string | null;
  toggle: () => void;
  open: (userId?: string) => void;
  close: () => void;
  goToInbox: () => void;
  openChat: (userId: string) => void;
  openNewMessage: () => void;
}

export const useDMPanelStore = create<DMPanelState>((set, get) => ({
  isOpen: false,
  view: "inbox",
  selectedUserId: null,
  toggle: () => {
    const { isOpen } = get();
    set(isOpen ? { isOpen: false } : { isOpen: true, view: "inbox" });
  },
  open: (userId?: string) =>
    set(userId
      ? { isOpen: true, view: "chat", selectedUserId: userId }
      : { isOpen: true, view: "inbox" }
    ),
  close: () => set({ isOpen: false }),
  goToInbox: () => set({ view: "inbox", selectedUserId: null }),
  openChat: (userId: string) => set({ isOpen: true, view: "chat", selectedUserId: userId }),
  openNewMessage: () => set({ view: "new-message" }),
}));
