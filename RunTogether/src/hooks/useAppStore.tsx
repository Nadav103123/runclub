import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Workout, Listing } from '../constants/types';
import { INITIAL_WORKOUTS, INITIAL_LISTINGS, NOTIFICATIONS } from '../data/mockData';
import { MY_USER_ID } from '../constants';

interface AppState {
  workouts: Workout[];
  listings: Listing[];
  following: string[];
  notifications: typeof NOTIFICATIONS;
}

type Action =
  | { type: 'REGISTER'; workoutId: string }
  | { type: 'UNREGISTER'; workoutId: string }
  | { type: 'ADD_WORKOUT'; workout: Workout }
  | { type: 'ADD_LISTING'; listing: Listing }
  | { type: 'TOGGLE_FOLLOW'; groupId: string }
  | { type: 'MARK_NOTIFS_READ' };

const initialState: AppState = {
  workouts: INITIAL_WORKOUTS,
  listings: INITIAL_LISTINGS,
  following: ['g1', 'g5'],
  notifications: NOTIFICATIONS,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'REGISTER':
      return {
        ...state,
        workouts: state.workouts.map((w) =>
          w.id === action.workoutId &&
          !w.registered.includes(MY_USER_ID) &&
          w.registered.length < w.spots
            ? { ...w, registered: [...w.registered, MY_USER_ID] }
            : w
        ),
      };
    case 'UNREGISTER':
      return {
        ...state,
        workouts: state.workouts.map((w) =>
          w.id === action.workoutId
            ? { ...w, registered: w.registered.filter((u) => u !== MY_USER_ID) }
            : w
        ),
      };
    case 'ADD_WORKOUT':
      return { ...state, workouts: [action.workout, ...state.workouts] };
    case 'ADD_LISTING':
      return { ...state, listings: [action.listing, ...state.listings] };
    case 'TOGGLE_FOLLOW':
      return {
        ...state,
        following: state.following.includes(action.groupId)
          ? state.following.filter((id) => id !== action.groupId)
          : [...state.following, action.groupId],
      };
    case 'MARK_NOTIFS_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, unread: false })),
      };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
