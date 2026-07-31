import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Day, PrismaClient, UserSex } from "../src/lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

// Demo-only: every seeded account's password matches its username.
const hashPassword = (plain: string) => bcrypt.hash(plain, 10);

// Nepali names used for demo seed data.
const maleFirstNames = [
  "Ram", "Shyam", "Hari", "Krishna", "Bikash",
  "Sandeep", "Suresh", "Dipesh", "Anil", "Prakash",
  "Rajesh", "Nabin", "Sagar", "Bibek", "Rohan",
];
const femaleFirstNames = [
  "Sita", "Gita", "Radha", "Puja", "Anita",
  "Sunita", "Kabita", "Manisha", "Sarita", "Nisha",
  "Priya", "Kritika", "Sabina", "Rekha", "Laxmi",
];
const surnames = [
  "Sharma", "Shrestha", "Gurung", "Tamang", "Rai",
  "Limbu", "Thapa", "Basnet", "Karki", "Adhikari",
  "Poudel", "Bhattarai", "Khadka", "Magar", "Chhetri",
  "Yadav", "Maharjan", "Pandey", "Joshi", "Bista",
];
const nepaliCities = [
  "Kathmandu", "Pokhara", "Lalitpur", "Bhaktapur", "Biratnagar",
  "Birgunj", "Dharan", "Butwal", "Hetauda", "Nepalgunj",
  "Itahari", "Dhangadhi", "Janakpur", "Bharatpur", "Damak",
];

async function main() {
  // ADMIN
  await prisma.admin.create({
    data: {
      id: "admin1",
      username: "admin1",
      password: await hashPassword("admin1"),
    },
  });
  await prisma.admin.create({
    data: {
      id: "admin2",
      username: "admin2",
      password: await hashPassword("admin2"),
    },
  });

  // GRADE
  for (let i = 1; i <= 6; i++) {
    await prisma.grade.create({
      data: {
        level: i,
      },
    });
  }

  // CLASS
  for (let i = 1; i <= 6; i++) {
    await prisma.class.create({
      data: {
        name: `${i}A`,
        gradeId: i,
        capacity: Math.floor(Math.random() * (20 - 15 + 1)) + 15,
      },
    });
  }

  // SUBJECT
  const subjectData = [
    { name: "Mathematics" },
    { name: "Science" },
    { name: "English" },
    { name: "History" },
    { name: "Geography" },
    { name: "Physics" },
    { name: "Chemistry" },
    { name: "Biology" },
    { name: "Computer Science" },
    { name: "Art" },
  ];

  for (const subject of subjectData) {
    await prisma.subject.create({ data: subject });
  }

  // TEACHER
  for (let i = 1; i <= 15; i++) {
    const isMale = i % 2 === 0;
    const firstName = isMale
      ? maleFirstNames[(i - 1) % maleFirstNames.length]
      : femaleFirstNames[(i - 1) % femaleFirstNames.length];
    const surname = surnames[(i - 1) % surnames.length];
    await prisma.teacher.create({
      data: {
        id: `teacher${i}`, // Unique ID for the teacher
        username: `teacher${i}`,
        password: await hashPassword(`teacher${i}`),
        name: firstName,
        surname,
        email: `teacher${i}@example.com`,
        phone: `123-456-789${i}`,
        address: nepaliCities[(i - 1) % nepaliCities.length],
        bloodType: "A+",
        sex: isMale ? UserSex.MALE : UserSex.FEMALE,
        subjects: { connect: [{ id: (i % 10) + 1 }] },
        classes: { connect: [{ id: (i % 6) + 1 }] },
        birthday: new Date(new Date().setFullYear(new Date().getFullYear() - 30)),
      },
    });
  }

  // LESSON
  // Only the time-of-day part of startTime/endTime is meaningful (the weekday
  // lives in `day`), so give each lesson a fixed 45-minute period inside
  // school hours. Using "now + N hours" here would push lessons outside the
  // calendar's visible 8:00-17:00 range depending on when the seed ran.
  const lessonDays = Object.keys(Day) as (keyof typeof Day)[];
  for (let i = 1; i <= 30; i++) {
    // Periods at 08:00, 09:00, ... 14:00, then wrap around.
    const periodHour = 8 + (i % 7);
    const startTime = new Date(2026, 0, 1, periodHour, 0, 0, 0);
    const endTime = new Date(2026, 0, 1, periodHour, 45, 0, 0);

    await prisma.lesson.create({
      data: {
        name: `Lesson${i}`,
        day: Day[lessonDays[i % lessonDays.length]],
        startTime,
        endTime,
        subjectId: (i % 10) + 1,
        classId: (i % 6) + 1,
        teacherId: `teacher${(i % 15) + 1}`,
      },
    });
  }

  // PARENT
  for (let i = 1; i <= 25; i++) {
    const isMale = i % 2 === 0;
    const firstName = isMale
      ? maleFirstNames[(i - 1) % maleFirstNames.length]
      : femaleFirstNames[(i - 1) % femaleFirstNames.length];
    const surname = surnames[(i - 1) % surnames.length];
    await prisma.parent.create({
      data: {
        id: `parentId${i}`,
        username: `parentId${i}`,
        password: await hashPassword(`parentId${i}`),
        name: firstName,
        surname,
        email: `parent${i}@example.com`,
        phone: `123-456-789${i}`,
        address: nepaliCities[(i - 1) % nepaliCities.length],
      },
    });
  }

  // STUDENT
  for (let i = 1; i <= 50; i++) {
    const isMale = i % 2 === 0;
    const firstName = isMale
      ? maleFirstNames[(i - 1) % maleFirstNames.length]
      : femaleFirstNames[(i - 1) % femaleFirstNames.length];
    const surname = surnames[(i - 1) % surnames.length];
    await prisma.student.create({
      data: {
        id: `student${i}`,
        username: `student${i}`,
        password: await hashPassword(`student${i}`),
        name: firstName,
        surname,
        email: `student${i}@example.com`,
        phone: `987-654-321${i}`,
        address: nepaliCities[(i - 1) % nepaliCities.length],
        bloodType: "O-",
        sex: isMale ? UserSex.MALE : UserSex.FEMALE,
        parentId: `parentId${Math.ceil(i / 2) % 25 || 25}`,
        gradeId: (i % 6) + 1,
        classId: (i % 6) + 1,
        birthday: new Date(new Date().setFullYear(new Date().getFullYear() - 10)),
      },
    });
  }

  // EXAM
  for (let i = 1; i <= 10; i++) {
    await prisma.exam.create({
      data: {
        title: `Exam ${i}`,
        startTime: new Date(new Date().setHours(new Date().getHours() + 1)),
        endTime: new Date(new Date().setHours(new Date().getHours() + 2)),
        lessonId: (i % 30) + 1,
      },
    });
  }

  // ASSIGNMENT
  for (let i = 1; i <= 10; i++) {
    await prisma.assignment.create({
      data: {
        title: `Assignment ${i}`,
        startDate: new Date(new Date().setHours(new Date().getHours() + 1)),
        dueDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        lessonId: (i % 30) + 1,
      },
    });
  }

  // RESULT
  for (let i = 1; i <= 10; i++) {
    await prisma.result.create({
      data: {
        score: 90,
        studentId: `student${i}`,
        ...(i <= 5 ? { examId: i } : { assignmentId: i - 5 }),
      },
    });
  }

  // ATTENDANCE
  for (let i = 1; i <= 10; i++) {
    await prisma.attendance.create({
      data: {
        date: new Date(),
        present: true,
        studentId: `student${i}`,
        lessonId: (i % 30) + 1,
      },
    });
  }

  // EVENT
  // Spread across the coming days so the dashboard's "upcoming events" panel
  // keeps showing data instead of going stale an hour after seeding.
  for (let i = 1; i <= 5; i++) {
    const start = new Date();
    start.setDate(start.getDate() + i);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 2);

    await prisma.event.create({
      data: {
        title: `Event ${i}`,
        description: `Description for Event ${i}`,
        startTime: start,
        endTime: end,
        classId: (i % 5) + 1,
      },
    });
  }

  // ANNOUNCEMENT
  for (let i = 1; i <= 5; i++) {
    await prisma.announcement.create({
      data: {
        title: `Announcement ${i}`,
        description: `Description for Announcement ${i}`,
        date: new Date(),
        classId: (i % 5) + 1,
      },
    });
  }

  console.log("Seeding completed successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });