import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDistance = (meters: number) => (meters ? (meters / 1000).toFixed(2) : "0.00");

export const formatDuration = (seconds: number) => {
  if (!seconds) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
};

export const safeArray = (arr: any) => Array.isArray(arr) ? arr : [];
export const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
export const max = (arr: number[]) => arr.length ? Math.max(...arr) : 0;

export const formatStravaSpeed = (mps: number) => (mps ? (mps * 3.6).toFixed(1) : "--");
export const formatFitSpeed = (kmh: number | null | undefined) => kmh !== null && kmh !== undefined ? kmh.toFixed(1) : "--";

export const formatStravaPace = (mps: number) => {
  if (!mps || mps === 0) return "--";
  const minPerKm = 16.6667 / mps;
  const mins = Math.floor(minPerKm);
  const secs = Math.floor((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const smoothAndFilterData = (data: any[], key: string, windowSize: number = 30) => {
  if (!data || !data.length) return [];
  const filtered = data.filter(item => item[key] && item[key] > 0.5);
  return filtered.map((val, idx, arr) => {
    let start = Math.max(0, idx - Math.floor(windowSize / 2));
    let end = Math.min(arr.length, idx + Math.floor(windowSize / 2) + 1);
    let sum = 0;
    let count = 0;
    for (let i = start; i < end; i++) {
      if (arr[i][key] != null) {
        sum += arr[i][key];
        count++;
      }
    }
    return { ...val, [key]: count > 0 ? sum / count : val[key] };
  });
};

import { useState, useEffect } from 'react';

export function useCountdown(expiresAt: string) {
  const calculateTimeLeft = () => Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, timeLeft]);

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, isExpired: timeLeft <= 0 };
}