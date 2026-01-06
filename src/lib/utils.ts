import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getOntarioTime(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return formatter.format(now);
}

export function formatDateInOntario(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return formatter.format(dateObj);
}

export function formatDateTimeInOntario(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return formatter.format(dateObj);
}
