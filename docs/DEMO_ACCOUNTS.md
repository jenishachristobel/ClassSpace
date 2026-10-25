# ClassSpace Academic Demo Accounts & Access Matrix

All users log in using their **registered institutional email address** and password. Role identification is handled by the backend server based on verified database records.

---

## 1. Central Administrator Account

| Attribute | Details |
|---|---|
| **Email** | `admin@classspace.edu` |
| **Password** | `Admin@123` |
| **Role** | `admin` |
| **Portal URL** | `/login/admin` |
| **Responsibilities** | Manage student accounts, manage teachers, manage dynamic subjects catalog, class section rosters, audit logs, and external integration settings. |

---

## 2. Faculty & Teacher Accounts

Teachers are only authorized to access subjects and classes assigned to them by the administrator.

| Teacher Name | Registered Email | Password | Employee ID | Assigned Subjects | Notes |
|---|---|---|---|---|---|
| **Prof. Robert Vance** | `prof.vance@classspace.edu` | `Teacher@123` | `EMP-T-101` | **CS302** (Java Programming)<br>**CS205** (Python Programming) | Can only view and grade Java & Python. Blocked from AI and DBMS. |
| **Dr. Maya Patel** | `dr.patel@classspace.edu` | `Teacher@123` | `EMP-T-102` | **CS401** (Artificial Intelligence)<br>**CS201** (Data Structures) | Instructs A* Search Assignment & manages AI submissions. |
| **Prof. David Clark** | `prof.clark@classspace.edu` | `Teacher@123` | `EMP-T-103` | **CS305** (Database Management Systems) | Instructs SQL optimization & indexing. |
| **Prof. Elena Wright** | `prof.wright@classspace.edu` | `Teacher@123` | `EMP-T-104` | **CS405** (Software Engineering) | Senior lecturer for software lifecycle. |

---

## 3. Student Accounts

Students are strictly restricted to accessing course materials and submitting assignments for courses in which they are enrolled.

| Student Name | Registered Email | Password | Student ID | Enrolled Subjects (Count) | Test Scenario Focus |
|---|---|---|---|---|---|
| **Alex Rivera** | `alex.student@classspace.edu` | `Student@123` | `STU-2024-001` | **5 Subjects:**<br>&bull; CS401 (AI)<br>&bull; CS302 (Java)<br>&bull; CS205 (Python)<br>&bull; CS201 (Data Structures)<br>&bull; CS305 (DBMS) | **Critical Test Case 1:** Enrolled in 5 subjects and sees all 5 on dashboard and My Subjects. Has submitted and published grade (95/100). |
| **Emma Watson** | `emma.student@classspace.edu` | `Student@123` | `STU-2024-002` | **4 Subjects:**<br>&bull; CS401 (AI)<br>&bull; CS302 (Java)<br>&bull; CS205 (Python)<br>&bull; CS201 (Data Structures) | **Critical Test Case 9:** Submitted work in AI; grade is saved as draft and only becomes visible after teacher publishes it. |
| **Liam Chen** | `liam.student@classspace.edu` | `Student@123` | `STU-2024-003` | **3 Subjects:**<br>&bull; CS302 (Java)<br>&bull; CS205 (Python)<br>&bull; CS305 (DBMS) | Submitted assignment in Java. |
| **Sophia Patel** | `sophia.student@classspace.edu` | `Student@123` | `STU-2024-004` | **4 Subjects:**<br>&bull; CS401 (AI)<br>&bull; CS205 (Python)<br>&bull; CS201 (Data Structures)<br>&bull; CS405 (Software Engineering) | Enrolled in Section B. |
| **Noah Williams** | `noah.student@classspace.edu` | `Student@123` | `STU-2024-005` | **3 Subjects:**<br>&bull; CS401 (AI)<br>&bull; CS201 (Data Structures)<br>&bull; CS305 (DBMS)<br>*(NOT enrolled in Java)* | **Critical Test Case 2:** Not enrolled in Java (CS302). System strictly denies access with HTTP 403. |
| **Olivia Brown** | `olivia.student@classspace.edu` | `Student@123` | `STU-2024-006` | **2 Subjects:**<br>&bull; CS401 (AI)<br>&bull; CS405 (Software Engineering) | Introductory student profile. |
| **Jenisha Christobel** | `jenishachristobel@karunya.edu.in` | *(Institutional OTP / Google SSO)* | `URK-2024-0100` | Dynamic Auto-Provisioning | **Karunya Institutional Student:** Authenticates via Google GIS SSO or 6-digit email OTP. Automatically provisioned with `role: 'student'`. |

---

## 4. Academic Course Catalog (Dynamic Database Subjects)

| Code | Subject Name | Credits | Department | Color Accent | Assigned Faculty |
|---|---|---|---|---|---|
| **CS401** | Artificial Intelligence | 4 | AI & Data Science | `#3B82F6` (Blue) | Dr. Maya Patel |
| **CS302** | Java Programming | 4 | Computer Science | `#EA580C` (Orange) | Prof. Robert Vance |
| **CS205** | Python Programming | 3 | Computer Science | `#10B981` (Emerald) | Prof. Robert Vance |
| **CS201** | Data Structures | 4 | Computer Science | `#8B5CF6` (Purple) | Dr. Maya Patel |
| **CS305** | Database Management Systems | 4 | Information Systems | `#EC4899` (Pink) | Prof. David Clark |
| **CS405** | Software Engineering | 3 | Software Engineering | `#6366F1` (Indigo) | Prof. Elena Wright |

