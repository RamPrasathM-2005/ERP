import express from 'express';
import { addSemester, deleteSemester, getAllSemesters, getSemester, updateSemester } from '../../controllers/semesterController.js';
import { addCourse, getAllCourse, getCourseBySemester } from '../../controllers/subjectController.js';

const router = express.Router();


//Semester

// For add + get all
router.route('/semester')
  .post(addSemester)
  .get(getSemester)
  

router.route('/semesters')
    .get(getAllSemesters);

// For update + delete (by id)
router.route('/semester/:semesterId')
  .put(updateSemester)
  .delete(deleteSemester);




// Course
router.route('/semester/:semesterId/courses')
  .post(addCourse)
  .get(getCourseBySemester)

router.route('/courses') 
  .get(getAllCourse)

export default router;
