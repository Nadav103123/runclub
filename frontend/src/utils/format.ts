import dayjs from "dayjs";

export function fmtDate(iso: string) {
  return dayjs(iso).format("ddd, MMM D");
}
export function fmtTime(iso: string) {
  return dayjs(iso).format("h:mm A");
}
export function fmtDateTime(iso: string) {
  return dayjs(iso).format("ddd, MMM D · h:mm A");
}
export function dayKey(iso: string) {
  return dayjs(iso).format("YYYY-MM-DD");
}
export function relativeDay(iso: string) {
  const d = dayjs(iso);
  const today = dayjs();
  const diff = d.startOf("day").diff(today.startOf("day"), "day");
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff < 7) return d.format("dddd");
  return d.format("MMM D");
}
