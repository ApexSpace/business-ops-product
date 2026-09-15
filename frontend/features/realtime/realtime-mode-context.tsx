"use client";



import {

  createContext,

  useContext,

  useMemo,

  useState,

  type ReactNode,

} from "react";

import type { RealtimeClientMode } from "@/features/realtime/transport/realtime-client";



export type RealtimeConnectionState = "connecting" | "live" | "degraded";



type RealtimeModeContextValue = {

  mode: RealtimeClientMode;

  connectionState: RealtimeConnectionState;

  setMode: (mode: RealtimeClientMode) => void;

  setConnectionState: (state: RealtimeConnectionState) => void;

};



const RealtimeModeContext = createContext<RealtimeModeContextValue | null>(

  null,

);



export function RealtimeModeProvider({ children }: { children: ReactNode }) {

  const [mode, setMode] = useState<RealtimeClientMode>("polling-only");

  const [connectionState, setConnectionState] =

    useState<RealtimeConnectionState>("connecting");

  const value = useMemo(

    () => ({ mode, connectionState, setMode, setConnectionState }),

    [mode, connectionState],

  );



  return (

    <RealtimeModeContext.Provider value={value}>

      {children}

    </RealtimeModeContext.Provider>

  );

}



export function useRealtimeMode(): RealtimeClientMode {

  return useContext(RealtimeModeContext)?.mode ?? "polling-only";

}



export function useRealtimeConnectionState(): RealtimeConnectionState {

  return useContext(RealtimeModeContext)?.connectionState ?? "connecting";

}



export function useRealtimeModeController():

  | RealtimeModeContextValue

  | null {

  return useContext(RealtimeModeContext);

}



/** Stable setter for hooks — avoids reconnecting when `mode` changes. */

export function useRealtimeModeSetter(): (mode: RealtimeClientMode) => void {

  const context = useContext(RealtimeModeContext);

  return context?.setMode ?? (() => undefined);

}



export function useRealtimeConnectionStateSetter(): (

  state: RealtimeConnectionState,

) => void {

  const context = useContext(RealtimeModeContext);

  return context?.setConnectionState ?? (() => undefined);

}

