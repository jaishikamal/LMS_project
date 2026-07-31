"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import "react-calendar/dist/Calendar.css";

// react-calendar renders tile attributes (aria-labels, the "now" class) derived
// from the current date, using the runtime's timezone and locale. The server and
// the browser disagree on those, which produces a hydration mismatch. Rendering
// it client-only sidesteps the problem entirely.
const Calendar = dynamic(() => import("react-calendar"), {
  ssr: false,
  loading: () => <div className="h-[300px]" />,
});

type ValuePiece = Date | null;

type Value = ValuePiece | [ValuePiece, ValuePiece];

export type CalendarEventItem = {
  id: number;
  title: string;
  time: string;
  description: string;
};

/** Local YYYY-MM-DD, so the date isn't shifted by toISOString()'s UTC conversion. */
const toDateParam = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const EventCalendar = ({ events }: { events: CalendarEventItem[] }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  // Set after mount rather than in the initialiser, so the date comes from the
  // browser instead of being baked into the server HTML.
  const [value, setValue] = useState<Value>(null);

  useEffect(() => {
    setValue(dateParam ? new Date(`${dateParam}T00:00:00`) : new Date());
  }, [dateParam]);

  const handleChange = (next: Value) => {
    setValue(next);

    // Only a single-date selection maps onto the `date` query param.
    const selected = Array.isArray(next) ? next[0] : next;
    if (!(selected instanceof Date)) return;

    const params = new URLSearchParams(searchParams);
    params.set("date", toDateParam(selected));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="bg-white p-4 rounded-md">
      <Calendar onChange={handleChange} value={value} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold my-4">Events</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      <div className="flex flex-col gap-4">
        {events.length === 0 && (
          <p className="text-sm text-gray-400">No events on this day.</p>
        )}
        {events.map((event) => (
          <div
            className="p-5 rounded-md border-2 border-gray-100 border-t-4 odd:border-t-kamal-sky
            even:border-t-kamal-purple"
            key={event.id}
          >
            <div className="flex items-center justify-between">
              <h1 className="font-semibold text-gray-600">{event.title}</h1>
              <span className="text-gray-300 text-xs">{event.time}</span>
            </div>
            <p className="mt-2 text-gray-400 text-sm">{event.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventCalendar;
