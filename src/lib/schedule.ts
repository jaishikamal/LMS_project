import { Day, Prisma } from "./generated/prisma/client";
import prisma from "./prisma";

export type ScheduleEvent = {
  title: string;
  allDay: false;
  start: Date;
  end: Date;
};

const dayOffset: Record<Day, number> = {
  [Day.MONDAY]: 0,
  [Day.TUESDAY]: 1,
  [Day.WEDNESDAY]: 2,
  [Day.THURSDAY]: 3,
  [Day.FRIDAY]: 4,
};

/** Monday 00:00 of the week containing `reference`. */
const startOfWeek = (reference: Date) => {
  const monday = new Date(reference);
  // getDay(): 0 = Sunday, so shift so Monday becomes the first day.
  monday.setDate(reference.getDate() - ((reference.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

/**
 * Lessons store a weekday (`day`) plus a start/end timestamp whose date part
 * is meaningless -- only the time of day matters. This projects each lesson
 * onto the matching weekday of the current week so react-big-calendar's
 * work-week view has something to render.
 */
export const getScheduleEvents = async (
  where: Prisma.LessonWhereInput
): Promise<ScheduleEvent[]> => {
  const lessons = await prisma.lesson.findMany({
    where,
    select: {
      day: true,
      startTime: true,
      endTime: true,
      subject: { select: { name: true } },
      class: { select: { name: true } },
    },
  });

  const monday = startOfWeek(new Date());

  return lessons.map((lesson) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() + dayOffset[lesson.day]);
    start.setHours(
      lesson.startTime.getHours(),
      lesson.startTime.getMinutes(),
      0,
      0
    );

    const end = new Date(start);
    end.setHours(lesson.endTime.getHours(), lesson.endTime.getMinutes(), 0, 0);

    return {
      title: `${lesson.subject.name} (${lesson.class.name})`,
      allDay: false as const,
      start,
      end,
    };
  });
};
