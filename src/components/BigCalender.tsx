"use client";
import {
  CalendarProps,
  momentLocalizer,
  View,
  Views,
} from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import dynamic from "next/dynamic";
import { ComponentType } from "react";
import { useState } from "react";

export type CalendarEvent = {
  title: string;
  allDay: boolean;
  start: Date;
  end: Date;
};

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

const BigCalendar = ({ events }: { events: CalendarEvent[] }) => {
  const [view, setView] = useState<View>(Views.WORK_WEEK);

  const handleOnChangeView = (selectedView: View) => {
    setView(selectedView);
  };

  // Clamp the visible time range to school hours on whatever day the
  // calendar is currently showing (only the time part is used).
  const dayStart = new Date();
  dayStart.setHours(8, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(17, 0, 0, 0);

  return (
    <Calendar
      localizer={localizer}
      events={events}
      startAccessor="start"
      endAccessor="end"
      views={["work_week", "day"]}
      view={view}
      style={{ height: "98%" }}
      onView={handleOnChangeView}
      min={dayStart}
      max={dayEnd}
    />
  );
};

export default BigCalendar;
