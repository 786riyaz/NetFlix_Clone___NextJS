"use client";
import { useEffect, useState } from "react";

export type Toast = { id: number; message: string; kind: "info" | "success" | "error" };

type Listener = (toasts: Toast[]) => void;
let toasts: Toast[] = [];
let listeners: Listener[] = [];
let nextId = 1;

function emit() {
  listeners.forEach((l) => l(toasts));
}

export function pushToast(message: string, kind: Toast["kind"] = "info", duration = 3200) {
  const id = nextId++;
  toasts = [...toasts, { id, message, kind }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, duration);
}

export function useToasts(): Toast[] {
  const [state, setState] = useState<Toast[]>(toasts);
  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter((l) => l !== setState);
    };
  }, []);
  return state;
}
