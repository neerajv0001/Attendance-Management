# Modern Attendance App

A complete, modern Attendance Management System built with **Next.js**, **React**, and **CSS Modules**.

## Features

### Admin Panel
- **Login**: Secure access.
- **Dashboard**: Overview of Teachers, Students, Courses.
- **Approve Teachers**: Review and approve teacher registrations.
- **Manage**: Add Courses/Subjects (Planned).

### Teacher Panel
- **Registration**: Sign up with details (Pending Approval).
- **Dashboard**: Student overview.
- **Add Student**: Auto-generate Student ID & Password.
- **Mark Attendance**: Daily attendance tracking.
- **Timetable**: Create class schedules.

### Student Panel
- **Login**: Use Student ID & Auto-generated Password.
- **Dashboard**: View attendance percentage.
- **My Attendance**: Detailed history.
- **Timetable**: View class schedule.

## Setup & Run

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Open App**:
   Visit [http://localhost:3000](http://localhost:3000)

## Default Credentials

### Admin
- **Username**: `admin`
- **Password**: `admin123`
*(Created automatically on first login attempt)*

### Teacher
- Register a new account at `/register`.
- Login as Admin to Approve (`/admin/dashboard` -> `Recent Registrations` -> `View` -> `Approve`).

### Student
- Login as Teacher (`/teacher/dashboard`).
- Go to `Add Student`.
- Use generated credentials to login as Student.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Modern CSS (Dark Blue + White Theme)
- **Auth**: JWT & Bcrypt based custom authentication
- **Database**: Local JSON file system (for portability)

## Data Storage
Data is stored in `data/*.json` files in the project root. To reset, delete the `data` folder.
