const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { initializeDatabase } = require('./init');

async function seed() {
  console.log('[Seed] Starting database seeding...');
  initializeDatabase();

  // Clean existing data
  const tables = [
    'audit_logs', 'notifications', 'plagiarism_checks', 'grades', 'submission_versions', 'submission_files',
    'submissions', 'assignment_files', 'assignments', 'learning_materials',
    'announcements', 'student_enrollments', 'teacher_subject_assignments',
    'classes', 'subjects', 'teachers', 'students', 'users'
  ];

  for (const table of tables) {
    db.run(`DELETE FROM ${table}`);
  }

  if (db.type === 'sqlite') {
    try {
      db.run('DELETE FROM sqlite_sequence');
    } catch (e) {}
  }

  console.log('[Seed] Cleared existing tables.');

  // Password hashes
  const adminPass = bcrypt.hashSync('Admin@123', 10);
  const teacherPass = bcrypt.hashSync('Teacher@123', 10);
  const studentPass = bcrypt.hashSync('Student@123', 10);

  // 1. Create Users
  // Admin
  const adminUser = db.run(
    `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, status)
     VALUES (?, ?, 'admin', 'System', 'Administrator', '+1-555-0100', 'active')`,
    ['admin@classspace.edu', adminPass]
  );

  // Teachers
  const teacherUsers = [
    { email: 'prof.vance@classspace.edu', first: 'Robert', last: 'Vance', empId: 'EMP-T-101', dept: 'Computer Science', desig: 'Associate Professor', room: 'Hall 3, Rm 304' },
    { email: 'dr.patel@classspace.edu', first: 'Maya', last: 'Patel', empId: 'EMP-T-102', dept: 'AI & Data Science', desig: 'Professor & Chair', room: 'Turing Wing, Rm 102' },
    { email: 'prof.clark@classspace.edu', first: 'David', last: 'Clark', empId: 'EMP-T-103', dept: 'Information Systems', desig: 'Assistant Professor', room: 'Hall 2, Rm 215' },
    { email: 'prof.wright@classspace.edu', first: 'Elena', last: 'Wright', empId: 'EMP-T-104', dept: 'Software Engineering', desig: 'Senior Lecturer', room: 'Ada Lab, Rm 401' }
  ];

  const teacherIds = [];
  for (const t of teacherUsers) {
    const uRes = db.run(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, status)
       VALUES (?, ?, 'teacher', ?, ?, '+1-555-0101', 'active')`,
      [t.email, teacherPass, t.first, t.last]
    );
    const tRes = db.run(
      `INSERT INTO teachers (user_id, employee_id, department, designation, office_room)
       VALUES (?, ?, ?, ?, ?)`,
      [uRes.lastInsertRowid, t.empId, t.dept, t.desig, t.room]
    );
    teacherIds.push({ email: t.email, id: tRes.lastInsertRowid, userId: uRes.lastInsertRowid, name: `${t.first} ${t.last}` });
  }

  // Students
  const studentUsers = [
    { email: 'alex.student@classspace.edu', first: 'Alex', last: 'Rivera', stuId: 'STU-2024-001', dept: 'Computer Science', sem: 3 },
    { email: 'emma.student@classspace.edu', first: 'Emma', last: 'Watson', stuId: 'STU-2024-002', dept: 'Computer Science', sem: 3 },
    { email: 'liam.student@classspace.edu', first: 'Liam', last: 'Chen', stuId: 'STU-2024-003', dept: 'Information Systems', sem: 3 },
    { email: 'sophia.student@classspace.edu', first: 'Sophia', last: 'Patel', stuId: 'STU-2024-004', dept: 'AI & Data Science', sem: 3 },
    { email: 'noah.student@classspace.edu', first: 'Noah', last: 'Williams', stuId: 'STU-2024-005', dept: 'Computer Science', sem: 3 },
    { email: 'olivia.student@classspace.edu', first: 'Olivia', last: 'Brown', stuId: 'STU-2024-006', dept: 'Software Engineering', sem: 3 }
  ];

  const studentIds = [];
  for (const s of studentUsers) {
    const uRes = db.run(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, status)
       VALUES (?, ?, 'student', ?, ?, '+1-555-0200', 'active')`,
      [s.email, studentPass, s.first, s.last]
    );
    const sRes = db.run(
      `INSERT INTO students (user_id, student_id, department, semester, enrollment_year)
       VALUES (?, ?, ?, ?, 2024)`,
      [uRes.lastInsertRowid, s.stuId, s.dept, s.sem]
    );
    studentIds.push({ email: s.email, id: sRes.lastInsertRowid, userId: uRes.lastInsertRowid, name: `${s.first} ${s.last}` });
  }

  // 2. Create Subjects
  const subjectsData = [
    {
      code: 'CS401',
      name: 'Artificial Intelligence',
      dept: 'AI & Data Science',
      desc: 'Foundational study of heuristic search algorithms, adversarial search, constraint satisfaction, probabilistic reasoning, and intro to deep learning.',
      credits: 4,
      color: '#3B82F6', // Blue
      icon: 'Cpu'
    },
    {
      code: 'CS302',
      name: 'Java Programming',
      dept: 'Computer Science',
      desc: 'Advanced object-oriented engineering with modern Java 21, JVM memory model, multi-threaded concurrency, Spring framework paradigms, and enterprise patterns.',
      credits: 4,
      color: '#EA580C', // Orange
      icon: 'Coffee'
    },
    {
      code: 'CS205',
      name: 'Python Programming',
      dept: 'Computer Science',
      desc: 'High-level script automation, scientific computing with NumPy & Pandas, asynchronous I/O, and RESTful web microservices development.',
      credits: 3,
      color: '#10B981', // Emerald
      icon: 'Terminal'
    },
    {
      code: 'CS201',
      name: 'Data Structures',
      dept: 'Computer Science',
      desc: 'Rigorous analysis of asymptotic complexity, dynamic memory, red-black trees, AVL trees, disjoint-sets, graph algorithms, and hash tables.',
      credits: 4,
      color: '#8B5CF6', // Purple
      icon: 'Network'
    },
    {
      code: 'CS305',
      name: 'Database Management Systems',
      dept: 'Information Systems',
      desc: 'Relational database schema modeling, SQL query optimization, relational calculus, ACID transaction isolation, B-tree indexes, and crash recovery.',
      credits: 4,
      color: '#EC4899', // Pink
      icon: 'Database'
    },
    {
      code: 'CS405',
      name: 'Software Engineering',
      dept: 'Software Engineering',
      desc: 'System design lifecycle, Agile/Scrum processes, automated testing, CI/CD pipelines, architectural styles, and collaborative code reviews.',
      credits: 3,
      color: '#6366F1', // Indigo
      icon: 'Layers'
    }
  ];

  const subjectMap = {};
  for (const s of subjectsData) {
    const res = db.run(
      `INSERT INTO subjects (code, name, department, description, credits, color, icon)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [s.code, s.name, s.dept, s.desc, s.credits, s.color, s.icon]
    );
    subjectMap[s.code] = res.lastInsertRowid;
  }

  // 3. Create Classes
  const classesData = [
    { sub: 'CS401', name: 'Artificial Intelligence - Section A', sec: 'Sec-A', term: 'Fall 2024', code: 'AI-2024-A' },
    { sub: 'CS302', name: 'Java Programming - Section A', sec: 'Sec-A', term: 'Fall 2024', code: 'JAVA-2024-A' },
    { sub: 'CS205', name: 'Python Programming - Section A', sec: 'Sec-A', term: 'Fall 2024', code: 'PY-2024-A' },
    { sub: 'CS201', name: 'Data Structures - Section A', sec: 'Sec-A', term: 'Fall 2024', code: 'DS-2024-A' },
    { sub: 'CS305', name: 'DBMS - Section A', sec: 'Sec-A', term: 'Fall 2024', code: 'DBMS-2024-A' },
    { sub: 'CS405', name: 'Software Engineering - Section A', sec: 'Sec-A', term: 'Fall 2024', code: 'SE-2024-A' }
  ];

  const classMap = {};
  for (const c of classesData) {
    const res = db.run(
      `INSERT INTO classes (subject_id, name, section, academic_term, class_code)
       VALUES (?, ?, ?, ?, ?)`,
      [subjectMap[c.sub], c.name, c.sec, c.term, c.code]
    );
    classMap[c.sub] = res.lastInsertRowid;
  }

  // 4. Assign Teachers to Subjects
  // Prof. Vance (id: 1) -> Java (CS302) and Python (CS205)
  // Dr. Patel (id: 2) -> AI (CS401) and Data Structures (CS201)
  // Prof. Clark (id: 3) -> DBMS (CS305)
  // Prof. Wright (id: 4) -> Software Engineering (CS405)
  const teacherAssignments = [
    { teacherId: teacherIds[0].id, subCode: 'CS302' },
    { teacherId: teacherIds[0].id, subCode: 'CS205' },
    { teacherId: teacherIds[1].id, subCode: 'CS401' },
    { teacherId: teacherIds[1].id, subCode: 'CS201' },
    { teacherId: teacherIds[2].id, subCode: 'CS305' },
    { teacherId: teacherIds[3].id, subCode: 'CS405' }
  ];

  for (const a of teacherAssignments) {
    db.run(
      `INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id)
       VALUES (?, ?, ?)`,
      [a.teacherId, subjectMap[a.subCode], classMap[a.subCode]]
    );
  }

  // 5. Enroll Students
  // Alex (studentIds[0]) is enrolled in 5 subjects: AI, Java, Python, Data Structures, DBMS
  // Emma (studentIds[1]) in 4: AI, Java, Python, Data Structures
  // Liam (studentIds[2]) in 3: Java, Python, DBMS
  // Sophia (studentIds[3]) in 4: AI, Python, Data Structures, SE
  // Noah (studentIds[4]) in 3: AI, Data Structures, DBMS (NOT enrolled in Java)
  // Olivia (studentIds[5]) in 2: AI, SE
  const enrollments = [
    // Alex
    { studentId: studentIds[0].id, sub: 'CS401' },
    { studentId: studentIds[0].id, sub: 'CS302' },
    { studentId: studentIds[0].id, sub: 'CS205' },
    { studentId: studentIds[0].id, sub: 'CS201' },
    { studentId: studentIds[0].id, sub: 'CS305' },
    // Emma
    { studentId: studentIds[1].id, sub: 'CS401' },
    { studentId: studentIds[1].id, sub: 'CS302' },
    { studentId: studentIds[1].id, sub: 'CS205' },
    { studentId: studentIds[1].id, sub: 'CS201' },
    // Liam
    { studentId: studentIds[2].id, sub: 'CS302' },
    { studentId: studentIds[2].id, sub: 'CS205' },
    { studentId: studentIds[2].id, sub: 'CS305' },
    // Sophia
    { studentId: studentIds[3].id, sub: 'CS401' },
    { studentId: studentIds[3].id, sub: 'CS205' },
    { studentId: studentIds[3].id, sub: 'CS201' },
    { studentId: studentIds[3].id, sub: 'CS405' },
    // Noah (Not enrolled in Java CS302!)
    { studentId: studentIds[4].id, sub: 'CS401' },
    { studentId: studentIds[4].id, sub: 'CS201' },
    { studentId: studentIds[4].id, sub: 'CS305' },
    // Olivia
    { studentId: studentIds[5].id, sub: 'CS401' },
    { studentId: studentIds[5].id, sub: 'CS405' }
  ];

  for (const e of enrollments) {
    db.run(
      `INSERT INTO student_enrollments (student_id, subject_id, class_id, status)
       VALUES (?, ?, ?, 'enrolled')`,
      [e.studentId, subjectMap[e.sub], classMap[e.sub]]
    );
  }

  // 6. Announcements
  const announcements = [
    {
      sub: 'CS401',
      authorUserId: teacherIds[1].userId,
      title: 'Welcome to Artificial Intelligence - Fall 2024',
      content: 'Welcome students! Please review the syllabus in the course materials tab. Our first lab focuses on search algorithms and heuristic optimizations.'
    },
    {
      sub: 'CS401',
      authorUserId: teacherIds[1].userId,
      title: 'Assignment 1 Submission Deadline Reminder',
      content: 'Please remember that Assignment 1: A* Search Algorithm Report is due this Sunday at 11:59 PM. Ensure your submission includes experimental node counts.'
    },
    {
      sub: 'CS302',
      authorUserId: teacherIds[0].userId,
      title: 'Java 21 Virtual Threads & Concurrency Lab',
      content: 'This week we will explore Project Loom virtual threads and how they compare with traditional thread pool executors.'
    },
    {
      sub: 'CS205',
      authorUserId: teacherIds[0].userId,
      title: 'NumPy Vectorization Workshop Recording Uploaded',
      content: 'The lecture recording and companion Jupyter notebook on broadcasting and vectorized tensor calculations are now available in Materials.'
    },
    {
      sub: 'CS201',
      authorUserId: teacherIds[1].userId,
      title: 'Balanced Search Trees Quiz Next Tuesday',
      content: 'There will be a brief 20-minute quiz covering Red-Black tree insertion cases and tree rotations.'
    },
    {
      sub: 'CS305',
      authorUserId: teacherIds[2].userId,
      title: 'PostgreSQL Query Planner & Index Analysis',
      content: 'We will be conducting live EXPLAIN ANALYZE walkthroughs during Thursday lecture. Bring your laptop.'
    }
  ];

  for (const a of announcements) {
    db.run(
      `INSERT INTO announcements (subject_id, class_id, author_id, title, content)
       VALUES (?, ?, ?, ?, ?)`,
      [subjectMap[a.sub], classMap[a.sub], a.authorUserId, a.title, a.content]
    );
  }

  // 7. Learning Materials
  const materials = [
    {
      sub: 'CS401',
      teacherId: teacherIds[1].id,
      title: 'Lecture 1: State Space Search & Heuristics Slide Deck',
      desc: 'Comprehensive overview of uninformed vs informed search algorithms (BFS, DFS, Dijkstra, A*, IDA*).',
      fileName: 'CS401_Lecture01_Search.pdf',
      fileType: 'application/pdf',
      fileSize: 2450000
    },
    {
      sub: 'CS401',
      teacherId: teacherIds[1].id,
      title: 'A* Search Benchmark Heuristics Implementation Guide',
      desc: 'Python reference template demonstrating admissibility checks and priority queue setup.',
      fileName: 'AStar_Reference_Guide.pdf',
      fileType: 'application/pdf',
      fileSize: 1120000
    },
    {
      sub: 'CS302',
      teacherId: teacherIds[0].id,
      title: 'Java Multithreading & Memory Consistency Primer',
      desc: 'Deep dive into volatile semantics, happens-before relationships, and lock-free atomic primitives.',
      fileName: 'Java_Concurrency_Handbook.pdf',
      fileType: 'application/pdf',
      fileSize: 3100000
    },
    {
      sub: 'CS205',
      teacherId: teacherIds[0].id,
      title: 'Python Data Science Ecosystem Cheat Sheet',
      desc: 'Quick reference for Pandas dataframe filtering, reshaping, and aggregation functions.',
      fileName: 'Python_DataScience_Reference.pdf',
      fileType: 'application/pdf',
      fileSize: 890000
    },
    {
      sub: 'CS201',
      teacherId: teacherIds[1].id,
      title: 'Red-Black Tree Insertion Case Analysis Handout',
      desc: 'Step-by-step visual proofs for all 3 color and rotation cases during balancing.',
      fileName: 'RBTree_Proof_Notes.pdf',
      fileType: 'application/pdf',
      fileSize: 1540000
    },
    {
      sub: 'CS305',
      teacherId: teacherIds[2].id,
      title: 'Database Normalization & B+ Tree Indexing Guide',
      desc: 'Boyce-Codd Normal Form decomposition algorithms and B+ Tree node splitting examples.',
      fileName: 'DBMS_Normalization_Index.pdf',
      fileType: 'application/pdf',
      fileSize: 2200000
    }
  ];

  for (const m of materials) {
    db.run(
      `INSERT INTO learning_materials (subject_id, teacher_id, title, description, file_name, file_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [subjectMap[m.sub], m.teacherId, m.title, m.desc, m.fileName, m.fileType, m.fileSize]
    );
  }

  // 8. Assignments
  const assignmentsData = [
    {
      sub: 'CS401',
      teacherId: teacherIds[1].id,
      title: 'Assignment 1: A* Search Algorithm & Heuristic Analysis',
      desc: 'Implement the A* search algorithm for solving the 8-puzzle and graph pathfinding. Compare Manhattan Distance versus Euclidean Distance heuristics in terms of total explored states, execution time, and optimality. Submit a comprehensive technical report in PDF, DOCX, or TXT format.',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days in future
      maxMarks: 100,
      resubmit: 1
    },
    {
      sub: 'CS401',
      teacherId: teacherIds[1].id,
      title: 'Assignment 2: Adversarial Minimax with Alpha-Beta Pruning',
      desc: 'Design an AI game agent for Connect-4 or Gomoku using Minimax search with dynamic depth evaluation and alpha-beta pruning.',
      dueDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
      maxMarks: 100,
      resubmit: 1
    },
    {
      sub: 'CS302',
      teacherId: teacherIds[0].id,
      title: 'Assignment 1: High-Throughput Concurrent Pipeline',
      desc: 'Build a multi-threaded task processor utilizing Java 21 Virtual Threads and thread-safe queues with graceful shutdown hooks.',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      maxMarks: 100,
      resubmit: 1
    },
    {
      sub: 'CS205',
      teacherId: teacherIds[0].id,
      title: 'Assignment 1: Automated Data Wrangling & Analysis Pipeline',
      desc: 'Develop a clean Python pipeline to ingest messy CSV datasets, sanitize anomalies, compute summary statistics, and export clean Parquet tables.',
      dueDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
      maxMarks: 100,
      resubmit: 1
    },
    {
      sub: 'CS201',
      teacherId: teacherIds[1].id,
      title: 'Assignment 1: Self-Balancing AVL & Red-Black Tree Implementation',
      desc: 'Write custom C++ or Java classes implementing self-balancing binary search trees with rigorous unit tests for height bounds.',
      dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
      maxMarks: 100,
      resubmit: 1
    },
    {
      sub: 'CS305',
      teacherId: teacherIds[2].id,
      title: 'Assignment 1: Complex SQL Analytics & Index Performance Tuning',
      desc: 'Analyze a simulated 1,000,000-row e-commerce database. Write advanced window functions, analyze EXPLAIN plans, and design covering composite indexes.',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      maxMarks: 100,
      resubmit: 1
    }
  ];

  const assignmentIds = [];
  for (const a of assignmentsData) {
    const res = db.run(
      `INSERT INTO assignments (subject_id, class_id, teacher_id, title, description, due_date, max_marks, allow_resubmission, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
      [subjectMap[a.sub], classMap[a.sub], a.teacherId, a.title, a.desc, a.dueDate, a.maxMarks, a.resubmit]
    );
    assignmentIds.push({ id: res.lastInsertRowid, title: a.title, subCode: a.sub });
  }

  // 9. Submissions for Assignment 1 in CS401 (AI)
  // Alex Rivera (studentIds[0]) submitted
  const sub1 = db.run(
    `INSERT INTO submissions (assignment_id, student_id, submitted_at, status, remarks, version)
     VALUES (?, ?, datetime('now', '-2 days'), 'submitted', 'Please find my analysis and code benchmarks attached.', 1)`,
    [assignmentIds[0].id, studentIds[0].id]
  );
  db.run(
    `INSERT INTO submission_files (submission_id, file_name, file_path, file_size, mime_type, content_hash)
     VALUES (?, 'alex_rivera_ai_assignment1.txt', 'uploads/alex_rivera_ai_assignment1.txt', 1024, 'text/plain', 'hash_alex_ai_001')`,
    [sub1.lastInsertRowid]
  );
  db.run(
    `INSERT INTO submission_versions (submission_id, version_number, file_name, file_path, file_size, mime_type, remarks, submitted_at, status)
     VALUES (?, 1, 'alex_rivera_ai_assignment1.txt', 'uploads/alex_rivera_ai_assignment1.txt', 1024, 'text/plain', 'Please find my analysis and code benchmarks attached.', datetime('now', '-2 days'), 'submitted')`,
    [sub1.lastInsertRowid]
  );

  // Emma Watson (studentIds[1]) submitted
  const sub2 = db.run(
    `INSERT INTO submissions (assignment_id, student_id, submitted_at, status, remarks, version)
     VALUES (?, ?, datetime('now', '-1 day'), 'submitted', 'A* heuristic comparison report attached.', 1)`,
    [assignmentIds[0].id, studentIds[1].id]
  );
  db.run(
    `INSERT INTO submission_files (submission_id, file_name, file_path, file_size, mime_type, content_hash)
     VALUES (?, 'emma_watson_ai_assignment1.txt', 'uploads/emma_watson_ai_assignment1.txt', 980, 'text/plain', 'hash_emma_ai_002')`,
    [sub2.lastInsertRowid]
  );
  db.run(
    `INSERT INTO submission_versions (submission_id, version_number, file_name, file_path, file_size, mime_type, remarks, submitted_at, status)
     VALUES (?, 1, 'emma_watson_ai_assignment1.txt', 'uploads/emma_watson_ai_assignment1.txt', 980, 'text/plain', 'A* heuristic comparison report attached.', datetime('now', '-1 day'), 'submitted')`,
    [sub2.lastInsertRowid]
  );

  // Sophia Patel (studentIds[3]) submitted
  const sub3 = db.run(
    `INSERT INTO submissions (assignment_id, student_id, submitted_at, status, remarks, version)
     VALUES (?, ?, datetime('now', '-5 hours'), 'submitted', 'Attached report with benchmark graphs.', 1)`,
    [assignmentIds[0].id, studentIds[3].id]
  );
  db.run(
    `INSERT INTO submission_files (submission_id, file_name, file_path, file_size, mime_type, content_hash)
     VALUES (?, 'sophia_ai_lab1.pdf', 'uploads/alex_rivera_ai_assignment1.txt', 154000, 'application/pdf', 'hash_sophia_ai_003')`,
    [sub3.lastInsertRowid]
  );
  db.run(
    `INSERT INTO submission_versions (submission_id, version_number, file_name, file_path, file_size, mime_type, remarks, submitted_at, status)
     VALUES (?, 1, 'sophia_ai_lab1.pdf', 'uploads/alex_rivera_ai_assignment1.txt', 154000, 'application/pdf', 'Attached report with benchmark graphs.', datetime('now', '-5 hours'), 'submitted')`,
    [sub3.lastInsertRowid]
  );

  // Liam Chen (studentIds[2]) submitted in Java Assignment (assignmentIds[2])
  const subJava = db.run(
    `INSERT INTO submissions (assignment_id, student_id, submitted_at, status, remarks, version)
     VALUES (?, ?, datetime('now', '-12 hours'), 'submitted', 'Producer-consumer thread pool pipeline report.', 1)`,
    [assignmentIds[2].id, studentIds[2].id]
  );
  db.run(
    `INSERT INTO submission_files (submission_id, file_name, file_path, file_size, mime_type, content_hash)
     VALUES (?, 'liam_chen_java_assignment1.txt', 'uploads/liam_chen_java_assignment1.txt', 840, 'text/plain', 'hash_liam_java_001')`,
    [subJava.lastInsertRowid]
  );
  db.run(
    `INSERT INTO submission_versions (submission_id, version_number, file_name, file_path, file_size, mime_type, remarks, submitted_at, status)
     VALUES (?, 1, 'liam_chen_java_assignment1.txt', 'uploads/liam_chen_java_assignment1.txt', 840, 'text/plain', 'Producer-consumer thread pool pipeline report.', datetime('now', '-12 hours'), 'submitted')`,
    [subJava.lastInsertRowid]
  );

  // 10. Grades (Alex's submission is graded and published; Emma's is graded but draft; Sophia is ungraded)
  db.run(
    `INSERT INTO grades (submission_id, graded_by, marks_obtained, feedback, is_published, graded_at, published_at)
     VALUES (?, ?, 95.0, 'Outstanding mathematical derivation and clean experimental charts. Well done!', 1, datetime('now', '-1 day'), datetime('now', '-1 day'))`,
    [sub1.lastInsertRowid, teacherIds[1].id]
  );

  db.run(
    `INSERT INTO grades (submission_id, graded_by, marks_obtained, feedback, is_published, graded_at)
     VALUES (?, ?, 88.5, 'Good heuristic comparison. Could have expanded more on Nilsson sequence score optimality proof.', 0, datetime('now', '-6 hours'))`,
    [sub2.lastInsertRowid, teacherIds[1].id]
  );

  // 11. Sample Plagiarism Check for Alex's submission
  db.run(
    `INSERT INTO plagiarism_checks (submission_id, assignment_id, initiated_by, token_id, status, similarity_percentage, report_summary, completed_at)
     VALUES (?, ?, ?, 'tok_demo_seed_sample_7788', 'completed', 14.5, 'Low similarity detected. Common theoretical definitions matched standard syllabus terminology.', datetime('now', '-1 day'))`,
    [sub1.lastInsertRowid, assignmentIds[0].id, teacherIds[1].id]
  );

  // 12. Notifications
  db.run(
    `INSERT INTO notifications (user_id, title, message, type, link)
     VALUES (?, 'Grade Published for Assignment 1', 'Your grade for A* Search Algorithm Report has been published: 95/100.', 'grade', '/student/grades')`,
    [studentIds[0].userId]
  );
  db.run(
    `INSERT INTO notifications (user_id, title, message, type, link)
     VALUES (?, 'New Assignment Posted in Java Programming', 'Assignment 1: High-Throughput Concurrent Pipeline is now active.', 'assignment', '/student/assignments')`,
    [studentIds[0].userId]
  );

  // 13. Audit Logs
  db.run(
    `INSERT INTO audit_logs (user_id, user_email, role, action, entity_type, entity_id, details)
     VALUES (?, 'admin@classspace.edu', 'admin', 'SYSTEM_INITIALIZATION', 'System', 'ALL', 'System seeded with academic demo dataset.')`,
    [adminUser.lastInsertRowid]
  );
  db.run(
    `INSERT INTO audit_logs (user_id, user_email, role, action, entity_type, entity_id, details)
     VALUES (?, 'dr.patel@classspace.edu', 'teacher', 'GRADE_PUBLISHED', 'Grade', '1', 'Published grade (95/100) for Alex Rivera in CS401.')`,
    [teacherIds[1].userId]
  );

  console.log('[Seed] Seeding completed successfully!');
  console.log('======================================================');
  console.log('ClassSpace Academic Demo Accounts:');
  console.log('  Admin:   admin@classspace.edu      / Admin@123');
  console.log('  Teacher: prof.vance@classspace.edu / Teacher@123 (Java & Python)');
  console.log('  Teacher: dr.patel@classspace.edu   / Teacher@123 (AI & Data Structures)');
  console.log('  Teacher: prof.clark@classspace.edu / Teacher@123 (DBMS)');
  console.log('  Student: alex.student@classspace.edu / Student@123 (5 Enrolled Subjects)');
  console.log('  Student: noah.student@classspace.edu / Student@123 (Not enrolled in Java)');
  console.log('======================================================');
}

if (require.main === module) {
  seed().catch(err => {
    console.error('[Seed] Error during seeding:', err);
    process.exit(1);
  });
}

module.exports = { seed };
