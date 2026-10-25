import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Layouts
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Auth Pages
import PortalSelector from './pages/auth/PortalSelector';
import StudentLogin from './pages/auth/StudentLogin';
import TeacherLogin from './pages/auth/TeacherLogin';
import AdminLogin from './pages/auth/AdminLogin';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageStudents from './pages/admin/ManageStudents';
import ManageTeachers from './pages/admin/ManageTeachers';
import ManageSubjects from './pages/admin/ManageSubjects';
import ManageClasses from './pages/admin/ManageClasses';
import AllAssignments from './pages/admin/AllAssignments';
import Reports from './pages/admin/Reports';
import AuditLogs from './pages/admin/AuditLogs';
import LoginActivity from './pages/admin/LoginActivity';
import AdminSettings from './pages/admin/Settings';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentSubjects from './pages/student/StudentSubjects';
import StudentSubjectDetail from './pages/student/StudentSubjectDetail';
import StudentAssignments from './pages/student/StudentAssignments';
import StudentAssignmentDetail from './pages/student/StudentAssignmentDetail';
import StudentGrades from './pages/student/StudentGrades';
import StudentCalendar from './pages/student/StudentCalendar';
import StudentProfile from './pages/student/StudentProfile';
import StudentNotifications from './pages/student/StudentNotifications';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherSubjects from './pages/teacher/TeacherSubjects';
import TeacherSubjectDetail from './pages/teacher/TeacherSubjectDetail';
import TeacherAssignments from './pages/teacher/TeacherAssignments';
import TeacherSubmissions from './pages/teacher/TeacherSubmissions';
import TeacherSubmissionsOverview from './pages/teacher/TeacherSubmissionsOverview';
import TeacherGradebook from './pages/teacher/TeacherGradebook';
import TeacherProfile from './pages/teacher/TeacherProfile';

import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public Portal & Login Routes */}
            <Route path="/" element={<PortalSelector />} />
            <Route path="/login/student" element={<StudentLogin />} />
            <Route path="/login/teacher" element={<TeacherLogin />} />
            <Route path="/login/admin" element={<AdminLogin />} />

            {/* Admin Portal Protected Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="students" element={<ManageStudents />} />
              <Route path="teachers" element={<ManageTeachers />} />
              <Route path="subjects" element={<ManageSubjects />} />
              <Route path="classes" element={<ManageClasses />} />
              <Route path="enrollments" element={<ManageStudents />} />
              <Route path="teacher-assignments" element={<ManageTeachers />} />
              <Route path="all-assignments" element={<AllAssignments />} />
              <Route path="reports" element={<Reports />} />
              <Route path="login-activity" element={<LoginActivity />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="profile" element={<AdminSettings />} />
            </Route>

            {/* Student Portal Protected Routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/student/dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="subjects" element={<StudentSubjects />} />
              <Route path="subjects/:subjectId" element={<StudentSubjectDetail />} />
              <Route path="assignments" element={<StudentAssignments />} />
              <Route path="assignments/:assignmentId" element={<StudentAssignmentDetail />} />
              <Route path="grades" element={<StudentGrades />} />
              <Route path="calendar" element={<StudentCalendar />} />
              <Route path="notifications" element={<StudentNotifications />} />
              <Route path="profile" element={<StudentProfile />} />
            </Route>

            {/* Teacher Portal Protected Routes */}
            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/teacher/dashboard" replace />} />
              <Route path="dashboard" element={<TeacherDashboard />} />
              <Route path="subjects" element={<TeacherSubjects />} />
              <Route path="subjects/:subjectId" element={<TeacherSubjectDetail />} />
              <Route path="assignments" element={<TeacherAssignments />} />
              <Route path="assignments/:assignmentId/submissions" element={<TeacherSubmissions />} />
              <Route path="submissions" element={<TeacherSubmissionsOverview />} />
              <Route path="gradebook" element={<TeacherGradebook />} />
              <Route path="calendar" element={<TeacherAssignments />} />
              <Route path="announcements" element={<TeacherSubjects />} />
              <Route path="profile" element={<TeacherProfile />} />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

