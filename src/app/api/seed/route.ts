import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole, User, Course, AttendanceRecord, TimetableEntry } from '@/lib/types';
import bcrypt from 'bcryptjs';
import { generateStudentId, generatePassword } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import { User as UserModel, Course as CourseModel, AttendanceRecord as AttendanceModel, TimetableEntry as TimetableModel } from '@/lib/models';

// 10 Teachers - 5 for BSc IT, 5 for BSc CS
const TEACHERS_DATA = [
    // BSc IT Teachers (5)
    { name: 'Dr. Rajesh Kumar', subject: 'Database Management', qualification: 'Ph.D. in Computer Science', experience: '8' },
    { name: 'Prof. Priya Sharma', subject: 'Web Development', qualification: 'M.Tech in IT', experience: '6' },
    { name: 'Dr. Amit Patel', subject: 'Network Security', qualification: 'Ph.D. in Cybersecurity', experience: '10' },
    { name: 'Prof. Sunita Gupta', subject: 'Software Engineering', qualification: 'M.E. in Software Systems', experience: '7' },
    { name: 'Dr. Vikram Singh', subject: 'Cloud Computing', qualification: 'Ph.D. in Distributed Systems', experience: '9' },
    // BSc CS Teachers (5)
    { name: 'Dr. Neha Verma', subject: 'Data Structures', qualification: 'Ph.D. in Algorithms', experience: '8' },
    { name: 'Prof. Arun Mishra', subject: 'Operating Systems', qualification: 'M.Tech in CS', experience: '12' },
    { name: 'Dr. Kavita Reddy', subject: 'Computer Networks', qualification: 'Ph.D. in Networking', experience: '7' },
    { name: 'Prof. Sanjay Joshi', subject: 'Artificial Intelligence', qualification: 'M.S. in AI', experience: '6' },
    { name: 'Dr. Meera Iyer', subject: 'Machine Learning', qualification: 'Ph.D. in ML', experience: '9' },
];

// 30 Students - 15 for BSc IT, 15 for BSc CS
const STUDENTS_DATA = [
    // BSc IT Students (15)
    { name: 'Rahul Sharma', course: 'BSc IT' },
    { name: 'Priya Patel', course: 'BSc IT' },
    { name: 'Amit Kumar', course: 'BSc IT' },
    { name: 'Sneha Gupta', course: 'BSc IT' },
    { name: 'Vikram Singh', course: 'BSc IT' },
    { name: 'Neha Verma', course: 'BSc IT' },
    { name: 'Arun Mishra', course: 'BSc IT' },
    { name: 'Kavita Reddy', course: 'BSc IT' },
    { name: 'Sanjay Joshi', course: 'BSc IT' },
    { name: 'Meera Iyer', course: 'BSc IT' },
    { name: 'Rohit Desai', course: 'BSc IT' },
    { name: 'Anjali Nair', course: 'BSc IT' },
    { name: 'Karthik Menon', course: 'BSc IT' },
    { name: 'Divya Rao', course: 'BSc IT' },
    { name: 'Suresh Babu', course: 'BSc IT' },
    // BSc CS Students (15)
    { name: 'Aditya Roy', course: 'BSc CS' },
    { name: 'Pooja Shah', course: 'BSc CS' },
    { name: 'Nitin Khanna', course: 'BSc CS' },
    { name: 'Ritu Agarwal', course: 'BSc CS' },
    { name: 'Manoj Tiwari', course: 'BSc CS' },
    { name: 'Shalini Bose', course: 'BSc CS' },
    { name: 'Deepak Chopra', course: 'BSc CS' },
    { name: 'Swati Malhotra', course: 'BSc CS' },
    { name: 'Gaurav Saxena', course: 'BSc CS' },
    { name: 'Mona Das', course: 'BSc CS' },
    { name: 'Tarun Ghosh', course: 'BSc CS' },
    { name: 'Rekha Jain', course: 'BSc CS' },
    { name: 'Prakash Sinha', course: 'BSc CS' },
    { name: 'Suman Banerjee', course: 'BSc CS' },
    { name: 'Ajay Pandey', course: 'BSc CS' },
];

const COURSES_DATA = [
    { name: 'BSc IT', subjects: ['Database Management', 'Web Development', 'Network Security', 'Software Engineering', 'Cloud Computing'] },
    { name: 'BSc CS', subjects: ['Data Structures', 'Operating Systems', 'Computer Networks', 'Artificial Intelligence', 'Machine Learning'] },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function GET() {
    try {
        const passwordHash = await bcrypt.hash('teacher123', 10);
        const studentPasswordHash = await bcrypt.hash('student123', 10);

        const users: User[] = [];
        const courses: Course[] = [];
        const attendance: AttendanceRecord[] = [];
        const timetable: TimetableEntry[] = [];

        // Connect to DB and clear existing data (except admin)
        await connectDB();
        await UserModel.deleteMany({ role: { $ne: UserRole.ADMIN } });
        await CourseModel.deleteMany({});
        await AttendanceModel.deleteMany({});
        await TimetableModel.deleteMany({});

        // Get admin users only
        const adminUsers = await UserModel.find({ role: UserRole.ADMIN }).lean();

        // 1. Create Teachers
        const teachers: User[] = TEACHERS_DATA.map((data, i) => ({
            id: `teacher-${Date.now()}-${i}`,
            username: `teacher${i + 1}@college.edu`,
            passwordHash,
            role: UserRole.TEACHER,
            name: data.name,
            email: `teacher${i + 1}@college.edu`,
            qualification: data.qualification,
            experience: data.experience,
            subject: data.subject,
            isApproved: true,
            createdAt: new Date().toISOString()
        }));
        users.push(...teachers);

        // 2. Create Students
        const students: User[] = STUDENTS_DATA.map((data, i) => {
            const id = generateStudentId();
            return {
                id,
                username: id,
                passwordHash: studentPasswordHash,
                role: UserRole.STUDENT,
                name: data.name,
                email: `student${i + 1}@college.edu`,
                department: data.course,
                createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString() // Random date within last 90 days
            };
        });
        users.push(...students);

        // 3. Create Courses
        COURSES_DATA.forEach((data, i) => {
            courses.push({
                id: `course-${Date.now()}-${i}`,
                name: data.name,
                subjects: data.subjects
            });
        });

        // 4. Generate Timetable (for each teacher)
        teachers.forEach((teacher, teacherIndex) => {
            const courseType = teacherIndex < 5 ? 'BSc IT' : 'BSc CS';
            const subjects = COURSES_DATA.find(c => c.name === courseType)?.subjects || [];

            // Create 2-3 classes per week for each teacher
            const numClasses = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < numClasses; i++) {
                const day = DAYS[Math.floor(Math.random() * DAYS.length)];
                const startHour = 9 + Math.floor(Math.random() * 6); // 9 AM to 3 PM
                const startTime = `${startHour.toString().padStart(2, '0')}:00`;
                const endTime = `${(startHour + 1).toString().padStart(2, '0')}:00`;

                timetable.push({
                    id: `tt-${teacher.id}-${i}`,
                    subject: teacher.subject || subjects[teacherIndex % subjects.length],
                    day,
                    startTime,
                    endTime,
                    teacherId: teacher.id
                });
            }
        });

        // 5. Generate Attendance (Last 60 days for realistic data)
        const today = new Date();
        const bscITStudents = students.filter(s => s.department === 'BSc IT');
        const bscCSStudents = students.filter(s => s.department === 'BSc CS');

        for (let i = 0; i < 60; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            // Skip Sundays
            if (date.getDay() === 0) continue;

            // Generate attendance for BSc IT students (first 5 teachers)
            bscITStudents.forEach((student, idx) => {
                const teacher = teachers[idx % 5]; // Assign to BSc IT teachers
                // Varied attendance rates (70-95% present)
                const attendanceRate = 0.70 + (Math.random() * 0.25);
                const status = Math.random() < attendanceRate ? 'PRESENT' : 'ABSENT';
                attendance.push({
                    date: dateStr,
                    status: status as 'PRESENT' | 'ABSENT',
                    studentId: student.id,
                    teacherId: teacher.id
                });
            });

            // Generate attendance for BSc CS students (last 5 teachers)
            bscCSStudents.forEach((student, idx) => {
                const teacher = teachers[5 + (idx % 5)]; // Assign to BSc CS teachers
                const attendanceRate = 0.75 + (Math.random() * 0.20);
                const status = Math.random() < attendanceRate ? 'PRESENT' : 'ABSENT';
                attendance.push({
                    date: dateStr,
                    status: status as 'PRESENT' | 'ABSENT',
                    studentId: student.id,
                    teacherId: teacher.id
                });
            });
        }

        // Save all data to DB
        // Save users one by one using create method
        for (const user of users) {
            try {
                await db.users.create(user);
            } catch (err: any) {
                console.log(`Skipping user ${user.username}: ${err.message}`);
            }
        }

        // Save other data
        await db.courses.save(courses);
        await db.attendance.save(attendance);
        await db.timetable.save(timetable);

        return NextResponse.json({
            success: true,
            message: `Seeded data successfully!`,
            summary: {
                teachers: teachers.length,
                students: students.length,
                courses: courses.length,
                timetableEntries: timetable.length,
                attendanceRecords: attendance.length,
                bscITStudents: bscITStudents.length,
                bscCSStudents: bscCSStudents.length,
            },
            credentials: {
                teachers: teachers.map(t => ({ name: t.name, username: t.username, password: 'teacher123' })),
                students: students.slice(0, 5).map(s => ({ name: s.name, username: s.username, password: 'student123' })),
                note: 'Showing first 5 students only. All students have password: student123'
            }
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 });
    }
}
