const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const COURSES_FILE = path.join(DATA_DIR, 'courses.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');

const NAMES = {
  teachers: ['John Doe', 'Sarah Smith', 'Michael Johnson', 'Emily Davis', 'Robert Wilson'],
  students: ['Alice Brown', 'Bob White', 'Charlie Green', 'Diana Black', 'Ethan Hall', 'Fiona Clark', 'George Lewis', 'Hannah Walker', 'Ian Young', 'Julia Scott', 'Kevin King', 'Laura Wright', 'Liam Harris', 'Mia Nelson', 'Noah Carter'],
  courses: ['Computer Science', 'Information Technology', 'Electronics'],
  subjects: ['Data Structures', 'Database Management', 'Operating Systems', 'Computer Networks']
};

function generateStudentId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let length = 6;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function seed() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    const passwordHash = await bcrypt.hash('123456', 10);
    const users = [];
    const courses = [];
    const attendance = [];

    // 0. Admin
    const adminHash = await bcrypt.hash('admin123', 10);
    users.push({
      id: 'admin-1',
      username: 'admin',
      passwordHash: adminHash,
      role: 'ADMIN',
      name: 'System Admin',
      createdAt: new Date().toISOString()
    });

    // 1. Teachers
    const teachers = NAMES.teachers.map((name, i) => ({
      id: `teacher-dummy-${i}`,
      username: `teacher${i}@test.com`,
      passwordHash,
      role: 'TEACHER',
      name,
      email: `teacher${i}@test.com`,
      qualification: 'PhD',
      experience: '5',
      subject: NAMES.subjects[i % NAMES.subjects.length],
      isApproved: true,
      createdAt: new Date().toISOString()
    }));
    users.push(...teachers);

    // 2. Students
    const students = NAMES.students.map((name, i) => {
        const id = generateStudentId();
        return {
            id,
            username: id,
            passwordHash,
            role: 'STUDENT',
            name,
            email: `student${i}@test.com`,
            department: NAMES.courses[i % NAMES.courses.length],
            createdAt: new Date().toISOString()
        };
    });
    users.push(...students);

    // 3. Courses
    NAMES.courses.forEach((name, i) => {
        courses.push({
            id: `course-dummy-${i}`,
            name,
            subjects: NAMES.subjects
        });
    });

    // 4. Attendance (30 days)
    const today = new Date();
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        students.forEach(student => {
            const status = Math.random() > 0.15 ? 'PRESENT' : 'ABSENT';
            attendance.push({
                date: dateStr,
                status,
                studentId: student.id,
                teacherId: teachers[0].id
            });
        });
    }

    // Save
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(COURSES_FILE, JSON.stringify(courses, null, 2));
    fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(attendance, null, 2));

    console.log(`Seeding complete: ${users.length} users, ${courses.length} courses, ${attendance.length} attendance records.`);
  } catch (err) {
    console.error(err);
  }
}

seed();
