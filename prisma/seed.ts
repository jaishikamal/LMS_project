import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserSex } from "../src/lib/generated/prisma/client";

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

  // CLASS SUBJECT (one teacher teaches one subject to one class)
  // 4 subjects per class, subject ids 1-4, so ClassSubject ids 1-24 with
  // class c occupying ids ((c-1)*4+1 .. c*4). Later seed blocks rely on this
  // ordering to map a student's class to one of its ClassSubjects.
  const SUBJECTS_PER_CLASS = 4;
  for (let classId = 1; classId <= 6; classId++) {
    for (let subjectId = 1; subjectId <= SUBJECTS_PER_CLASS; subjectId++) {
      await prisma.classSubject.create({
        data: {
          subjectId,
          classId,
          teacherId: `teacher${((classId + subjectId) % 15) + 1}`,
        },
      });
    }
  }

  // EXAM
  for (let i = 1; i <= 10; i++) {
    await prisma.exam.create({
      data: {
        title: `Exam ${i}`,
        startTime: new Date(new Date().setHours(new Date().getHours() + 1)),
        endTime: new Date(new Date().setHours(new Date().getHours() + 2)),
        classSubjectId: (i % 24) + 1,
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
        classSubjectId: (i % 24) + 1,
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

  // ATTENDANCE (per student per subject per date)
  for (let i = 1; i <= 10; i++) {
    const classId = (i % 6) + 1;
    const classSubjectId = (classId - 1) * SUBJECTS_PER_CLASS + 1 + (i % SUBJECTS_PER_CLASS);
    await prisma.attendance.create({
      data: {
        date: new Date(),
        present: true,
        studentId: `student${i}`,
        classSubjectId,
      },
    });
  }
  // GUARDIAN (emergency contacts for a few students)
  const guardianRelationships = ["Father", "Mother", "Uncle", "Aunt", "Grandparent"];
  for (let i = 1; i <= 10; i++) {
    const guardianCount = i % 2 === 0 ? 2 : 1;
    for (let g = 0; g < guardianCount; g++) {
      const relationship =
        guardianRelationships[(i + g) % guardianRelationships.length];
      await prisma.guardian.create({
        data: {
          name: `${surnames[(i + g) % surnames.length]} Family`,
          relationship,
          phone: `981-234-567${i}${g}`,
          email: `guardian${i}${g}@example.com`,
          isPrimary: g === 0,
          studentId: `student${i}`,
        },
      });
    }
  }

  // STAFF (non-teaching, admin-managed)
  const staffRoles = [
    { role: "Accountant", department: "Finance" },
    { role: "Librarian", department: "Library" },
    { role: "Nurse", department: "Health" },
    { role: "Groundskeeper", department: "Facilities" },
    { role: "Receptionist", department: "Administration" },
    { role: "Lab Assistant", department: "Science Lab" },
    { role: "IT Support", department: "IT" },
    { role: "Bus Driver", department: "Transport" },
  ];
  const staffIds: string[] = [];
  for (let i = 0; i < staffRoles.length; i++) {
    const staffRole = staffRoles[i];
    const firstName = i % 2 === 0
      ? maleFirstNames[i % maleFirstNames.length]
      : femaleFirstNames[i % femaleFirstNames.length];
    const surname = surnames[i % surnames.length];
    const id = `staff${i + 1}`;
    staffIds.push(id);
    await prisma.staff.create({
      data: {
        id,
        name: firstName,
        surname,
        email: `staff${i + 1}@example.com`,
        phone: `555-010-00${i + 1}`,
        address: nepaliCities[i % nepaliCities.length],
        role: staffRole.role,
        department: staffRole.department,
        joinDate: new Date(new Date().setFullYear(new Date().getFullYear() - 3)),
        birthday: new Date(new Date().setFullYear(new Date().getFullYear() - 35)),
        sex: i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE,
      },
    });
  }

  // STAFF ATTENDANCE (the last 3 working days)
  for (let i = 0; i < staffIds.length; i++) {
    for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
      const entryDate = new Date();
      entryDate.setDate(entryDate.getDate() - dayOffset);
      const isAbsent = (i + dayOffset) % 5 === 0;
      await prisma.staffAttendance.create({
        data: {
          staffId: staffIds[i],
          date: entryDate,
          present: !isAbsent,
          status: isAbsent ? "Absent" : "Present",
        },
      });
    }
  }

  // STAFF PERFORMANCE (one review per staff member)
  for (let i = 0; i < staffIds.length; i++) {
    const rating = (i % 5) + 1;
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() - 10);
    await prisma.staffPerformance.create({
      data: {
        staffId: staffIds[i],
        reviewDate,
        rating,
        comments: `Consistently reliable. Recommended for the next appraisal cycle.`,
      },
    });
  }

  // FINANCE: fee items (Tuition is class-specific, others school-wide)
  const feeDefs = [
    { name: "Tuition", amount: 3000, classId: null as number | null },
    { name: "Exam Fee", amount: 500, classId: null },
    { name: "Library Fee", amount: 400, classId: null },
    { name: "Lab Fee", amount: 600, classId: null },
    { name: "Sports Fee", amount: 350, classId: null },
    { name: "Transport Fee", amount: 800, classId: 1 },
  ];
  const feeIds: number[] = [];
  for (const fee of feeDefs) {
    const created = await prisma.feeItem.create({ data: fee });
    feeIds.push(created.id);
  }

  // FINANCE: invoices for the first 20 students
  const invoiceIds: number[] = [];
  for (let i = 1; i <= 20; i++) {
    const feeIndex = (i - 1) % feeIds.length;
    const amount = feeDefs[feeIndex].amount;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (i % 15));
    const created = await prisma.invoice.create({
      data: {
        invoiceNo: `INV-2026-${String(i).padStart(3, "0")}`,
        studentId: `student${i}`,
        feeItemId: feeIds[feeIndex],
        amount,
        dueDate,
        status: i % 4 === 0 ? "Paid" : i % 4 === 2 ? "Partial" : "Unpaid",
      },
    });
    invoiceIds.push(created.id);
  }

  // FINANCE: payments (fully clear the "Paid" invoices, half the "Partial" ones)
  const methods = ["Cash", "Bank Transfer", "Card", "Mobile"];
  for (let i = 1; i <= 20; i++) {
    const invoiceId = invoiceIds[i - 1];
    const amount = feeDefs[(i - 1) % feeIds.length].amount;
    if (i % 4 === 0) {
      await prisma.payment.create({
        data: {
          invoiceId,
          amount,
          method: methods[i % methods.length],
          date: new Date(new Date().getTime() - 5 * 86400000),
          reference: `PAY-2026-${String(i).padStart(3, "0")}`,
        },
      });
    } else if (i % 4 === 2) {
      await prisma.payment.create({
        data: {
          invoiceId,
          amount: Math.round(amount / 2),
          method: methods[i % methods.length],
          date: new Date(new Date().getTime() - 3 * 86400000),
          reference: `PAY-2026-${String(i).padStart(3, "0")}`,
        },
      });
    }
  }

  // FINANCE: salary records for a few staff and teachers this month
  const thisMonth = new Date();
  const salaryRecipients = [
    { recipientType: "Staff", staffId: "staff1", teacherId: null, amount: 40000 },
    { recipientType: "Staff", staffId: "staff3", teacherId: null, amount: 30000 },
    { recipientType: "Staff", staffId: "staff5", teacherId: null, amount: 25000 },
    { recipientType: "Teacher", staffId: null, teacherId: "teacher1", amount: 50000 },
    { recipientType: "Teacher", staffId: null, teacherId: "teacher3", amount: 50000 },
    { recipientType: "Teacher", staffId: null, teacherId: "teacher7", amount: 50000 },
  ];
  for (let i = 0; i < salaryRecipients.length; i++) {
    const r = salaryRecipients[i];
    await prisma.salaryRecord.create({
      data: {
        recipientType: r.recipientType,
        staffId: r.staffId,
        teacherId: r.teacherId,
        month: new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1),
        amount: r.amount,
        paid: i % 2 === 0,
        paidDate: i % 2 === 0 ? new Date() : null,
        notes: "Monthly salary",
      },
    });
  }

  // FINANCE: expenses
  const expenseDefs = [
    { title: "Electricity bill", category: "Utilities", amount: 15000 },
    { title: "Stationery", category: "Supplies", amount: 5000 },
    { title: "Laboratory chemicals", category: "Lab", amount: 12000 },
    { title: "Library books", category: "Library", amount: 20000 },
    { title: "Bus maintenance", category: "Transport", amount: 8000 },
    { title: "Sports equipment", category: "Sports", amount: 6000 },
  ];
  for (let i = 0; i < expenseDefs.length; i++) {
    const expense = expenseDefs[i];
    const expenseDate = new Date();
    expenseDate.setDate(expenseDate.getDate() - (i * 3 + 1));
    await prisma.expense.create({
      data: {
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        date: expenseDate,
        notes: `Expense entry ${i + 1}`,
      },
    });
  }

  // COMMUNICATION: notifications broadcast per role
  const notifications = [
    { title: "Mid-term exams start next week", message: "Mid-term examinations begin Monday. All students should bring their hall tickets.", role: "student" },
    { title: "Parent-teacher meeting", message: "The parent-teacher meeting is scheduled for Friday at 10:00 AM in the main hall.", role: "parent" },
    { title: "Staff meeting reminder", message: "All staff are required to attend the monthly meeting on Thursday at 3:00 PM.", role: "teacher" },
    { title: "Finance report due", message: "Monthly finance reports are due by the end of the month.", role: "admin" },
    { title: "School closed on Saturday", message: "The school will be closed this Saturday for a maintenance day.", role: "student" },
  ];
  for (const item of notifications) {
    const created = await prisma.notification.create({
      data: {
        title: item.title,
        message: item.message,
        role: item.role,
        createdAt: new Date(new Date().getTime() - 2 * 86400000),
      },
    });
    // A few students already read their notifications.
    if (item.role === "student") {
      await prisma.notificationRead.create({
        data: { notificationId: created.id, userId: "student1" },
      });
    }
  }

  // COMMUNICATION: a few sample messages
  const sampleMessages = [
    {
      senderId: "admin1",
      senderRole: "admin",
      recipientId: "teacher1",
      recipientRole: "teacher",
      subject: "Welcome",
      body: "Welcome to the school. Please submit your syllabus for the term by Friday.",
      daysAgo: 4,
    },
    {
      senderId: "teacher1",
      senderRole: "teacher",
      recipientId: "student1",
      recipientRole: "student",
      subject: "Homework submission",
      body: "Please submit the mathematics homework by tomorrow.",
      daysAgo: 2,
    },
    {
      senderId: "admin1",
      senderRole: "admin",
      recipientId: "parentId1",
      recipientRole: "parent",
      subject: "School trip notice",
      body: "There is a school trip planned for next month. Permission slips are available at the office.",
      daysAgo: 3,
    },
  ];
  for (const message of sampleMessages) {
    await prisma.message.create({
      data: {
        senderId: message.senderId,
        senderRole: message.senderRole,
        recipientId: message.recipientId,
        recipientRole: message.recipientRole,
        subject: message.subject,
        body: message.body,
        sentAt: new Date(new Date().getTime() - message.daysAgo * 86400000),
      },
    });
  }

  // INVENTORY: items across the three categories
  const inventoryDefs = [
    { name: "Maths Textbook Grade 7", category: "Books", quantity: 30, location: "Library Shelf A" },
    { name: "Science Textbook Grade 7", category: "Books", quantity: 28, location: "Library Shelf A" },
    { name: "English Reader", category: "Books", quantity: 3, location: "Library Shelf B" },
    { name: "Graph Paper (pack)", category: "Supplies", quantity: 50, location: "Store Room 1" },
    { name: "Whiteboard Markers (box)", category: "Supplies", quantity: 4, location: "Store Room 1" },
    { name: "Chalk (box)", category: "Supplies", quantity: 20, location: "Store Room 1" },
    { name: "Microscope", category: "Equipment", quantity: 8, location: "Science Lab" },
    { name: "Projector", category: "Equipment", quantity: 6, location: "Media Room" },
    { name: "Football", category: "Equipment", quantity: 12, location: "Sports Room" },
    { name: "Badminton Racket", category: "Equipment", quantity: 5, location: "Sports Room" },
  ];
  const inventoryItemIds: number[] = [];
  for (const item of inventoryDefs) {
    const created = await prisma.inventoryItem.create({
      data: {
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        location: item.location,
        description: `Stock item for ${item.category.toLowerCase()}.`,
      },
    });
    inventoryItemIds.push(created.id);
  }

  // INVENTORY: issue/return records (some returned, one overdue)
  const issueDefs = [
    { itemIndex: 0, borrowerType: "Student", borrowerName: "Ram Sharma", daysAgo: 10, dueIn: 10, returned: false },
    { itemIndex: 6, borrowerType: "Teacher", borrowerName: "Sita Shrestha", daysAgo: 20, dueIn: -5, returned: false },
    { itemIndex: 1, borrowerType: "Student", borrowerName: "Gita Gurung", daysAgo: 15, dueIn: 0, returned: true },
    { itemIndex: 4, borrowerType: "Staff", borrowerName: "Hari Tamang", daysAgo: 8, dueIn: 12, returned: true },
  ];
  for (let i = 0; i < issueDefs.length; i++) {
    const issue = issueDefs[i];
    const issuedDate = new Date(new Date().getTime() - issue.daysAgo * 86400000);
    const dueDate = new Date(new Date().getTime() + issue.dueIn * 86400000);
    await prisma.inventoryIssue.create({
      data: {
        itemId: inventoryItemIds[issue.itemIndex],
        borrowerType: issue.borrowerType,
        borrowerName: issue.borrowerName,
        issuedDate,
        dueDate,
        returnedDate: issue.returned ? new Date(new Date().getTime() - 2 * 86400000) : null,
        notes: issue.returned ? "Returned in good condition." : "Track on return.",
      },
    });
  }

  // PERIOD (8 school periods, Mon-Fri)
  const periodTimes = [
    { name: "Period 1", start: 8, startMin: 0, end: 8, endMin: 45 },
    { name: "Period 2", start: 8, startMin: 45, end: 9, endMin: 30 },
    { name: "Period 3", start: 9, startMin: 30, end: 10, endMin: 15 },
    { name: "Period 4", start: 10, startMin: 15, end: 11, endMin: 0 },
    { name: "Period 5", start: 11, startMin: 0, end: 11, endMin: 45 },
    { name: "Period 6", start: 12, startMin: 30, end: 13, endMin: 15 },
    { name: "Period 7", start: 13, startMin: 15, end: 14, endMin: 0 },
    { name: "Period 8", start: 14, startMin: 0, end: 14, endMin: 45 },
  ];
  const periodIds: number[] = [];
  for (let i = 0; i < periodTimes.length; i++) {
    const t = periodTimes[i];
    const anchor = new Date();
    const startTime = new Date(anchor);
    startTime.setHours(t.start, t.startMin, 0, 0);
    const endTime = new Date(anchor);
    endTime.setHours(t.end, t.endMin, 0, 0);
    const period = await prisma.period.create({
      data: {
        name: t.name,
        startTime,
        endTime,
        order: i + 1,
      },
    });
    periodIds.push(period.id);
  }

  // TIMETABLE SLOTS (a few subjects per class across the week). Class c owns
  // ClassSubject ids ((c-1)*4+1 .. c*4); cycle those over the grid.
  for (let classId = 1; classId <= 6; classId++) {
    const firstSubjectId = (classId - 1) * SUBJECTS_PER_CLASS + 1;
    for (let day = 1; day <= 5; day++) {
      for (let slot = 0; slot < 5; slot++) {
        const classSubjectId = firstSubjectId + ((day + slot) % SUBJECTS_PER_CLASS);
        await prisma.timetableSlot.create({
          data: {
            classId,
            dayOfWeek: day,
            periodId: periodIds[slot],
            classSubjectId,
          },
        });
      }
    }
  }

  // LESSON (lesson plans for a handful of class subjects)
  const lessonPlans = [
    { title: "Introduction to Algebra", topic: "Linear equations", objectives: "Solve simple linear equations" },
    { title: "Plant Cells", topic: "Cell structure", objectives: "Identify parts of a plant cell" },
    { title: "Essay Writing", topic: "Paragraph structure", objectives: "Write a coherent paragraph" },
    { title: "The Maurya Empire", topic: "Ancient India", objectives: "Summarise key events" },
    { title: "Weather and Climate", topic: "Atmosphere", objectives: "Differentiate weather from climate" },
    { title: "Newtons Laws", topic: "Forces", objectives: "State the three laws" },
  ];
  for (let i = 0; i < lessonPlans.length; i++) {
    const plan = lessonPlans[i];
    const classSubjectId = (i % 24) + 1;
    await prisma.lesson.create({
      data: {
        title: plan.title,
        topic: plan.topic,
        objectives: plan.objectives,
        materials: "Textbook chapter, whiteboard, worksheets",
        notes: "Homework: finish exercises 1-5.",
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 3)),
        classSubjectId,
      },
    });
  }

  // TEACHING LOGBOOK (recent entries for the same class subjects)
  for (let i = 1; i <= 10; i++) {
    const classSubject = await prisma.classSubject.findUnique({
      where: { id: (i % 24) + 1 },
      select: { teacherId: true },
    });
    const entryDate = new Date();
    entryDate.setDate(entryDate.getDate() - (i % 5));
    entryDate.setHours(9, 0, 0, 0);
    await prisma.logbookEntry.create({
      data: {
        date: entryDate,
        topic: `Topic covered in session ${i}`,
        summary: `Covered core concepts and solved example problems from the textbook.`,
        homework: `Complete practice problems 1-${(i % 5) + 1}.`,
        notes: "Class participation was good.",
        classSubjectId: (i % 24) + 1,
        teacherId: classSubject?.teacherId ?? "teacher1",
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

  // SYSTEM: school settings (key/value)
  const settingDefs = [
    { key: "schoolName", value: "Kamal Memorial School" },
    { key: "motto", value: "Knowledge is Power" },
    { key: "address", value: "Kathmandu, Nepal" },
    { key: "phone", value: "01-4412345" },
    { key: "email", value: "info@kamalmemorial.edu.np" },
    { key: "academicYear", value: "2026/2027" },
  ];
  for (const setting of settingDefs) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  // SYSTEM: audit trail entries
  await prisma.auditLog.create({
    data: {
      actorId: "admin1",
      actorRole: "admin",
      action: "create",
      entity: "Setting",
      entityId: "settings",
      details: "Seeded school settings",
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: "admin1",
      actorRole: "admin",
      action: "create",
      entity: "InventoryItem",
      entityId: String(inventoryItemIds[0]),
      details: "Maths Textbook Grade 7",
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: "admin1",
      actorRole: "admin",
      action: "update",
      entity: "Staff",
      entityId: "staff1",
      details: "Updated staff records",
    },
  });

  // SYSTEM: permission catalog (all keys, one row each)
  const permissionCatalog = [
    // System
    ["home.view", "Access Home"],
    ["profile.view", "View Profile"],
    ["audit.view", "View Audit Log"],
    ["settings.manage", "Manage Settings"],
    ["permissions.manage", "Manage Permissions"],
    ["relationships.view", "View Relationships"],
    // Academic
    ["classes.view", "View Classes"],
    ["classes.manage", "Manage Classes"],
    ["subjects.view", "View Subjects"],
    ["subjects.manage", "Manage Subjects"],
    ["classSubjects.view", "View Class Subjects"],
    ["classSubjects.manage", "Manage Class Subjects"],
    ["exams.view", "View Exams"],
    ["exams.manage", "Manage Exams"],
    ["assignments.view", "View Assignments"],
    ["assignments.manage", "Manage Assignments"],
    ["results.view", "View Results"],
    ["results.manage", "Manage Results"],
    ["halltickets.view", "View Hall Tickets"],
    ["reports.view", "View Reports"],
    ["attendance.view", "View Attendance"],
    ["attendance.manage", "Manage Attendance"],
    ["timetable.view", "View Timetable"],
    ["timetable.manage", "Manage Timetable"],
    ["lessons.view", "View Lesson Plans"],
    ["lessons.manage", "Manage Lesson Plans"],
    ["logbook.view", "View Logbook"],
    ["logbook.manage", "Manage Logbook"],
    ["periods.manage", "Manage Periods"],
    ["events.view", "View Events"],
    ["events.manage", "Manage Events"],
    ["announcements.view", "View Announcements"],
    ["announcements.manage", "Manage Announcements"],
    // People
    ["teachers.view", "View Teachers"],
    ["teachers.manage", "Manage Teachers"],
    ["students.view", "View Students"],
    ["students.manage", "Manage Students"],
    ["parents.view", "View Parents"],
    ["parents.manage", "Manage Parents"],
    ["guardians.view", "View Guardians"],
    ["guardians.manage", "Manage Guardians"],
    ["staff.view", "View Staff"],
    ["staff.manage", "Manage Staff"],
    ["staff.attendance.view", "View Staff Attendance"],
    ["staff.attendance.manage", "Manage Staff Attendance"],
    ["staff.performance.view", "View Staff Performance"],
    ["staff.performance.manage", "Manage Staff Performance"],
    // Finance
    ["fees.view", "View Fees"],
    ["fees.manage", "Manage Fees"],
    ["invoices.view", "View Invoices"],
    ["invoices.manage", "Manage Invoices"],
    ["payments.view", "View Payments"],
    ["payments.manage", "Manage Payments"],
    ["salaries.view", "View Salaries"],
    ["salaries.manage", "Manage Salaries"],
    ["expenses.view", "View Expenses"],
    ["expenses.manage", "Manage Expenses"],
    // Communication
    ["notifications.view", "View Notifications"],
    ["notifications.manage", "Manage Notifications"],
    ["messages.view", "View Messages"],
    ["messages.send", "Send Messages"],
    ["chat.view", "View Chat Rooms"],
    // Inventory
    ["inventory.view", "View Inventory"],
    ["inventory.manage", "Manage Inventory"],
    ["inventory.issue.manage", "Manage Issue & Return"],
  ] as const;

  const categoryOf = (key: string): string => {
    if (key.startsWith("classes") || key.startsWith("subjects") || key.startsWith("classSubjects") ||
        key.startsWith("exams") || key.startsWith("assignments") || key.startsWith("results") ||
        key.startsWith("halltickets") || key.startsWith("reports") || key.startsWith("attendance") ||
        key.startsWith("timetable") || key.startsWith("lessons") || key.startsWith("logbook") ||
        key.startsWith("periods") || key.startsWith("events") || key.startsWith("announcements")) {
      return "Academic";
    }
    if (key.startsWith("teachers") || key.startsWith("students") || key.startsWith("parents") ||
        key.startsWith("guardians") || key.startsWith("staff")) {
      return "People";
    }
    if (key.startsWith("fees") || key.startsWith("invoices") || key.startsWith("payments") ||
        key.startsWith("salaries") || key.startsWith("expenses")) {
      return "Finance";
    }
    if (key.startsWith("notifications") || key.startsWith("messages")) return "Communication";
    if (key.startsWith("inventory")) return "Inventory";
    return "System";
  };

  for (const [key, label] of permissionCatalog) {
    await prisma.permission.upsert({
      where: { key },
      update: { label, category: categoryOf(key) },
      create: { key, label, category: categoryOf(key) },
    });
  }

  // SYSTEM: default permission-to-role assignments (mirror the pre-RBAC access)
  const TEACHER_PERMISSIONS = [
    "home.view", "profile.view",
    "teachers.view", "students.view", "parents.view", "classes.view",
    "exams.view", "exams.manage",
    "assignments.view", "assignments.manage",
    "results.view", "results.manage",
    "halltickets.view", "reports.view",
    "attendance.view", "attendance.manage",
    "timetable.view", "timetable.manage",
    "lessons.view", "lessons.manage",
    "logbook.view", "logbook.manage",
    "events.view", "announcements.view",
    "notifications.view", "messages.view", "messages.send",
  ] as const;
  const LEARNER_PERMISSIONS = [
    "home.view", "profile.view",
    "exams.view", "assignments.view", "results.view", "reports.view",
    "attendance.view", "timetable.view", "lessons.view", "logbook.view",
    "events.view", "announcements.view",
    "notifications.view", "messages.view", "messages.send",
  ] as const;

  await prisma.rolePermission.createMany({
    data: [
      // Admin holds every permission.
      ...permissionCatalog.map(([key]) => ({ role: "admin", permissionKey: key })),
      ...TEACHER_PERMISSIONS.map((key) => ({ role: "teacher", permissionKey: key })),
      ...LEARNER_PERMISSIONS.map((key) => ({ role: "student", permissionKey: key })),
      ...LEARNER_PERMISSIONS.map((key) => ({ role: "parent", permissionKey: key })),
    ],
    skipDuplicates: true,
  });

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