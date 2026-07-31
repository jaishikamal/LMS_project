"use client";
import {
  CalendarProps,
  momentLocalizer,
  View,
  Views,
} from "react-big-calendar";
import moment from "moment";
import { calendarEvents } from "@/lib/data";
import "react-big-calendar/lib/css/react-big-calendar.css";
import dynamic from "next/dynamic";
import { ComponentType } from "react";
import { useState } from "react";

type CalendarEvent = (typeof calendarEvents)[number];

// react-big-calendar formats its date headers and time gutter through moment,
// which resolves the timezone and locale of whatever runtime renders it. The
// server and browser disagree, so render it client-only to avoid a hydration
// mismatch. The cast restores the event generic that `dynamic` erases.
const Calendar = dynamic(
  () => import("react-big-calendar").then((mod) => mod.Calendar),
  {
    ssr: false,
    loading: () => <div className="h-full" />,
  }
) as ComponentType<CalendarProps<CalendarEvent>>;

const localizer = momentLocalizer(moment);

const BigCalendar = () => {
  const [view, setView] = useState<View>(Views.WORK_WEEK);

  const handleOnChangeView = (selectedView: View) => {
    setView(selectedView);
  };

  return (
    <Calendar
      localizer={localizer}
      events={calendarEvents}
      startAccessor="start"
      endAccessor="end"
      views={["work_week", "day"]}
      view={view}
      style={{ height: "98%" }}
      onView={handleOnChangeView}
      min={new Date(2026, 1, 0, 8, 0, 0)}
      max={new Date(2026, 1, 0, 17, 0, 0)}
    />
  );
};

export default BigCalendar;
