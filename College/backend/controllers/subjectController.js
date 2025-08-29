import pool from "../db.js";
import catchAsync from "../utils/catchAsync.js";


//Add Course
export const addCourse = catchAsync(async (req, res) => {
  const {
    courseCode,
    semesterId,
    batchId,
    courseName,
    courseType,
    courseCategory,
    minMark,
    maxMark,
    isActive,
    createdBy
  } = req.body;

  if (
    !courseCode || !semesterId || !batchId || !courseName ||
    !courseType || !courseCategory || !minMark || !maxMark
  ) {
    return res.status(400).json({
      status: "failure",
      message: "All required fields must be provided"
    });
  }

  const [result] = await pool.execute(
    `INSERT INTO Course 
      (courseCode, semesterId, batchId, courseName, courseType, courseCategory, minMark, maxMark, isActive, createdBy) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      courseCode,
      semesterId,
      batchId,
      courseName,
      courseType,
      courseCategory,
      minMark,
      maxMark,
      isActive || "YES",
      createdBy || "admin"
    ]
  );

  res.status(201).json({
    status: "success",
    message: "Course added successfully",
    courseId: result.insertId
  });
});


//Get Course

export const getAllCourse = catchAsync(async(req, res) => {
  const [rows] = await pool.execute(`SELECT * FROM Course`);
  res.status(200).json({
    message: 'success',
    data : rows
  })
})


//Get Course By semester
export const getCourseBySemester = catchAsync(async (req, res) => {
  const { semesterId } = req.params;

  const [rows] = await pool.execute(
    `SELECT * FROM Course WHERE semesterId = ?`,
    [semesterId]
  );

  res.status(200).json({
    message: "success",
    data: rows
  });
});
