import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shuffle<T>(array: T[]): T[] {
  return array.sort(() => Math.random() - 0.5);
}

export function randomPick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function randomDuration(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
