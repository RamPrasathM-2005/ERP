// db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

// --- DB config ---
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
};

// Create a pool up-front (we'll create the DB before using it)
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const initDatabase = async () => {
  try {
    // 0) Ensure the database exists
    const admin = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });

    await admin.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    await admin.end();

    // 1) Batch
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Batch (
        batchId INT PRIMARY KEY AUTO_INCREMENT,
        degree VARCHAR(50) NOT NULL,
        branch VARCHAR(100) NOT NULL,
        batch VARCHAR(4) NOT NULL,              -- e.g. "2024" (start year)
        batchYears VARCHAR(20) NOT NULL,        -- e.g. "2024-2028"
        isActive ENUM('YES','NO') DEFAULT 'YES',
        createdBy VARCHAR(150),
        updatedBy VARCHAR(150),
        createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_batch (degree, branch, batch),
        KEY idx_batch (batch)
      )
    `);

    // 2) Users
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Users (
        userId INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        passwordHash VARCHAR(255) NOT NULL,
        role ENUM('ADMIN','STAFF') NOT NULL,
        isActive ENUM('YES','NO') DEFAULT 'YES',
        createdBy VARCHAR(150),
        updatedBy VARCHAR(150),
        createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 3) Semester
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Semester (
        semesterId INT PRIMARY KEY AUTO_INCREMENT,
        batchId INT NOT NULL,
        degree VARCHAR(50) NOT NULL,
        branch VARCHAR(100) NOT NULL,
        semesterNumber INT NOT NULL CHECK (semesterNumber BETWEEN 1 AND 8),
        startDate DATE NOT NULL,
        endDate DATE NOT NULL,
        isActive ENUM('YES','NO') DEFAULT 'YES',
        createdBy VARCHAR(150),
        updatedBy VARCHAR(150),
        createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_sem_batch
          FOREIGN KEY (batchId) REFERENCES Batch(batchId)
          ON UPDATE CASCADE ON DELETE RESTRICT
      )
    `);

    // 4) Course
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Course (
        courseCode VARCHAR(50) PRIMARY KEY,
        semesterId INT NOT NULL,
        batchId INT NOT NULL,
        courseName VARCHAR(100) NOT NULL,
        courseType ENUM('INTEGRAL','PRACTICAL','THEORY') NOT NULL,
        courseCategory ENUM('OEC','PEC','CORE') NOT NULL,
        minMark INT NOT NULL,
        maxMark INT NOT NULL,
        isActive ENUM('YES','NO') DEFAULT 'YES',
        createdBy VARCHAR(150),
        updatedBy VARCHAR(150),
        createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_course_sem
          FOREIGN KEY (semesterId) REFERENCES Semester(semesterId)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_course_batch
          FOREIGN KEY (batchId) REFERENCES Batch(batchId)
          ON UPDATE CASCADE ON DELETE RESTRICT
      )
    `);

    // 5) Student (kept batch as text for simplicity)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Student (
        rollnumber VARCHAR(20) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        courseCode VARCHAR(50) NOT NULL,
        degree VARCHAR(50) NOT NULL,
        branch VARCHAR(100) NOT NULL,
        batch VARCHAR(20) NOT NULL,
        semesterNumber INT NOT NULL CHECK (semesterNumber BETWEEN 1 AND 8),
        isActive ENUM('YES','NO') DEFAULT 'YES',
        createdBy VARCHAR(150),
        updatedBy VARCHAR(150),
        createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_stu_course
          FOREIGN KEY (courseCode) REFERENCES Course(courseCode)
          ON UPDATE CASCADE ON DELETE RESTRICT
      )
    `);

    // 6) StaffCourse
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS StaffCourse (
        staffCourseId INT PRIMARY KEY AUTO_INCREMENT,
        staffId INT NOT NULL,
        courseCode VARCHAR(50) NOT NULL,
        isActive ENUM('YES','NO') DEFAULT 'YES',
        createdBy VARCHAR(150),
        updatedBy VARCHAR(150),
        createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_sc_user
          FOREIGN KEY (staffId) REFERENCES Users(userId)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_sc_course
          FOREIGN KEY (courseCode) REFERENCES Course(courseCode)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        UNIQUE (staffId, courseCode)
      )
    `);

    // 7) CourseOutcome
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS CourseOutcome (
        coId INT PRIMARY KEY AUTO_INCREMENT,
        courseCode VARCHAR(50) NOT NULL,
        coNumber VARCHAR(10) NOT NULL,
        weightage INT NOT NULL,
        isActive ENUM('YES','NO') DEFAULT 'YES',
        createdBy VARCHAR(150),
        updatedBy VARCHAR(150),
        createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_co_course
          FOREIGN KEY (courseCode) REFERENCES Course(courseCode)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        UNIQUE (courseCode, coNumber)
      )
    `);

    // 8) COTool
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS COTool (
        toolId INT PRIMARY KEY AUTO_INCREMENT,
        coId INT NOT NULL,
        toolName VARCHAR(50) NOT NULL,
        weightage INT NOT NULL,
        isActive ENUM('YES','NO') DEFAULT 'YES',
        createdBy VARCHAR(150),
        updatedBy VARCHAR(150),
        createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_tool_co
          FOREIGN KEY (coId) REFERENCES CourseOutcome(coId)
          ON UPDATE CASCADE ON DELETE RESTRICT
      )
    `);

    // 9) StudentCOTool
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS StudentCOTool (
        studentToolId INT PRIMARY KEY AUTO_INCREMENT,
        rollnumber VARCHAR(20) NOT NULL,
        toolId INT NOT NULL,
        marksObtained INT NOT NULL,
        isActive ENUM('YES','NO') DEFAULT 'YES',
        createdBy VARCHAR(150),
        updatedBy VARCHAR(150),
        createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_sct_stu
          FOREIGN KEY (rollnumber) REFERENCES Student(rollnumber)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_sct_tool
          FOREIGN KEY (toolId) REFERENCES COTool(toolId)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        UNIQUE (rollnumber, toolId)
      )
    `);

    // 10) Timetable
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Timetable (
        timetableId INT PRIMARY KEY AUTO_INCREMENT,
        staffId INT NOT NULL,
        courseCode VARCHAR(50) NOT NULL,
        degree VARCHAR(50) NOT NULL,
        branch VARCHAR(100) NOT NULL,
        batch VARCHAR(20) NOT NULL,
        dayOfWeek ENUM('MON','TUE','WED','THU','FRI','SAT') NOT NULL,
        periodNumber INT NOT NULL CHECK (periodNumber BETWEEN 1 AND 8),
        isActive ENUM('YES','NO') DEFAULT 'YES',
        createdBy VARCHAR(150),
        updatedBy VARCHAR(150),
        createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_tt_user
          FOREIGN KEY (staffId) REFERENCES Users(userId)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_tt_course
          FOREIGN KEY (courseCode) REFERENCES Course(courseCode)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        UNIQUE (staffId, courseCode, degree, branch, batch, dayOfWeek, periodNumber)
      )
    `);

    // 11) DayAttendance
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS DayAttendance (
        dayAttendanceId INT PRIMARY KEY AUTO_INCREMENT,
        rollnumber VARCHAR(20) NOT NULL,
        degree VARCHAR(50) NOT NULL,
        branch VARCHAR(100) NOT NULL,
        batch VARCHAR(20) NOT NULL,
        semesterNumber INT NOT NULL CHECK (semesterNumber BETWEEN 1 AND 8),
        attendanceDate DATE NOT NULL,
        status ENUM('P','A') NOT NULL,
        createdBy VARCHAR(150),
        updatedBy VARCHAR(150),
        createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_da_student
          FOREIGN KEY (rollnumber) REFERENCES Student(rollnumber)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        UNIQUE (rollnumber, attendanceDate)
      )
    `);

    // 12) PeriodAttendance
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS PeriodAttendance (
        periodAttendanceId INT PRIMARY KEY AUTO_INCREMENT,
        rollnumber VARCHAR(20) NOT NULL,
        staffId INT NOT NULL,
        courseCode VARCHAR(50) NOT NULL,
        degree VARCHAR(50) NOT NULL,
        branch VARCHAR(100) NOT NULL,
        batch VARCHAR(20) NOT NULL,
        semesterNumber INT NOT NULL CHECK (semesterNumber BETWEEN 1 AND 8),
        dayOfWeek ENUM('MON','TUE','WED','THU','FRI','SAT') NOT NULL,
        periodNumber INT NOT NULL CHECK (periodNumber BETWEEN 1 AND 8),
        attendanceDate DATE NOT NULL,
        status ENUM('P','A') NOT NULL,
        createdBy VARCHAR(150),
        updatedBy VARCHAR(150),
        createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_pa_student
          FOREIGN KEY (rollnumber) REFERENCES Student(rollnumber)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_pa_user
          FOREIGN KEY (staffId) REFERENCES Users(userId)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_pa_course
          FOREIGN KEY (courseCode) REFERENCES Course(courseCode)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        UNIQUE (rollnumber, courseCode, attendanceDate, periodNumber)
      )
    `);

    console.log('✅ Database and all tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

initDatabase();

export default pool;
