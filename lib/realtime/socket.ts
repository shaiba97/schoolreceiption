"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;
let connectPromise: Promise<Socket> | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "https://schoolbackend-7n8a.onrender.com";
    socketInstance = io(socketUrl, {
      auth: { token: "" },
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socketInstance;
}

export async function initializeSocket(ticket: string): Promise<Socket> {
  const socket = getSocket();
  if (socket.connected) return socket;

  if (connectPromise) return connectPromise;

  socket.auth = { token: ticket };
  socket.connect();

  connectPromise = new Promise<Socket>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Socket connection timeout")), 10000);
    socket.on("connect", () => {
      clearTimeout(timeout);
      connectPromise = null;
      resolve(socket);
    });
    socket.on("connect_error", (err) => {
      clearTimeout(timeout);
      connectPromise = null;
      reject(err);
    });
  });

  return connectPromise;
}

export function useRealtimeEvent<T = unknown>(eventName: string, handler: (data: T) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const wrapperRef = useRef<((data: T) => void) | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const wrapper = (data: T) => handlerRef.current(data);
    wrapperRef.current = wrapper;

    socket.on(eventName, wrapper);

    return () => {
      if (wrapperRef.current) {
        socket.off(eventName, wrapperRef.current);
        wrapperRef.current = null;
      }
    };
  }, [eventName]);
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    connectPromise = null;
  }
}