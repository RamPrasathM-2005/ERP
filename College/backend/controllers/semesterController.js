import pool from "../db.js";
import catchAsync from "../utils/catchAsync.js";

// Add Semester
export const addSemester = async (req, res) => {
  try {
    const {
      batchId,
      degree,
      branch,
      semesterNumber,
      startDate,
      endDate,
      createdBy,
      updatedBy
    } = req.body;

    // Validate required fields
    if (
      !batchId ||
      !degree ||
      !branch ||
      !semesterNumber ||
      !startDate ||
      !endDate ||
      !createdBy ||
      !updatedBy
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if batch exists
    const [batchRows] = await pool.execute(
      `SELECT batchId FROM Batch WHERE batchId = ?`,
      [batchId]
    );

    if (batchRows.length === 0) {
      return res.status(404).json({ message: `Batch with ID ${batchId} not found` });
    }

    const foundBatchId = batchRows[0].batchId;

    // Prevent duplicate semester entry
    const [existing] = await pool.execute(
      `SELECT semesterId FROM Semester 
       WHERE batchId = ? AND degree = ? AND branch = ? AND semesterNumber = ?`,
      [foundBatchId, degree, branch, semesterNumber]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Semester already exists for this batch, degree, and branch" });
    }

    // Format dates (YYYY-MM-DD)
    const formattedStartDate = new Date(startDate).toISOString().split("T")[0];
    const formattedEndDate = new Date(endDate).toISOString().split("T")[0];

    // Insert new semester
    const [rows] = await pool.execute(
      `INSERT INTO Semester (batchId, degree, branch, semesterNumber, startDate, endDate, createdBy, updatedBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [foundBatchId, degree, branch, semesterNumber, formattedStartDate, formattedEndDate, createdBy, updatedBy]
    );

    return res.status(201).json({
      status: "success",
      message: "Semester added successfully",
      semesterId: rows.insertId
    });

  } catch (error) {
    console.error("Error adding semester:", error);
    return res.status(500).json({ message: "Database error", error: error.message });
  }
};



// Get Semesters by batch, degree, branch, semesterNumber
export const getSemester = async (req, res) => {
  try {
    const { batch, degree, branch, semesterNumber } = req.query;

    if (!batch || !degree || !branch || !semesterNumber) {
      return res.status(400).json({ message: 'batch, degree, branch, and semesterNumber are required' });
    }
    // Find batchId
    const [batchRows] = await pool.execute(
      `SELECT batchId FROM Batch WHERE batch = ?`,
      [batch]
    );
    if (batchRows.length === 0) {
      return res.status(404).json({ message: `Batch ${batch} not found` });
    }
    const batchId = batchRows[0].batchId;
    // Get semester
    const [rows] = await pool.execute(
      `SELECT * FROM Semester 
       WHERE batchId = ? AND degree = ? AND branch = ? AND semesterNumber = ?`,
      [batchId, degree, branch, semesterNumber]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error', error });
  }
};


//Get All Semesters
export const getAllSemesters = catchAsync(async(req, res) => {
  const [rows] = await pool.execute( `SELECT * FROM SEMESTER`);
    return res.status(200).json({
      message: "success",
      data: rows
    })
})

//UpdateSemester
export const updateSemester = catchAsync(async (req, res) => {
  const { semesterId } = req.params;
  const { batchId, degree, branch, semesterNumber, startDate, endDate, isActive, updatedBy } = req.body;

  if (!semesterId) {
    return res.status(400).json({ status: "failure", message: "semesterId is required" });
  }

  const [result] = await pool.query(
    `UPDATE semester
     SET batchId = ?, degree = ?, branch = ?, semesterNumber = ?, startDate = ?, endDate = ?, isActive = ?, updatedBy = ?, updatedDate = NOW()
     WHERE semesterId = ?`,
      [batchId, degree, branch, semesterNumber, startDate, endDate, isActive, updatedBy, semesterId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: "failure", message: "Semester not found" });
    }

    res.status(200).json({
      status: "success",
      data : result,
      message: "Semester updated successfully"
    });
});


//Delete Semester
export const deleteSemester = catchAsync( async (req, res) => {
   const {semesterId} = req.params;
    if(!semesterId) {
      return res.status(400).json({status: "failure", message: "semesterId is required"});
    }

    const [result] = await pool.query(`DELETE FROM SEMESTER WHERE SemesterId = ?` , [semesterId]);

    if(result.affectedRows === 0) {
      return res.status(404).json({status: "failure", message: "Semester not found"})
    }
    res.status(200).json({
      status: "success",
      message: `Semester with id ${semesterId} deleted successfully`
    });
})