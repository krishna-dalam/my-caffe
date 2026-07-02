import type { CafeStatus } from "@my-caffe/shared";

export const formatDateTime = (isoDate: string): string =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));

export const statusLabel = (status: CafeStatus): string => status.charAt(0).toUpperCase() + status.slice(1);

export const copyToClipboard = async (value: string): Promise<void> => {
  await navigator.clipboard.writeText(value);
};

export const openPrintWindow = (url: string): void => {
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  popup?.focus();
};

