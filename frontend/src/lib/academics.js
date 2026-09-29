// USTP departments, the courses each offers, and year levels. Same data as mobile/constants/Data.js;
// keep the two in sync. Registration picks the department first and only shows its courses.

export const DEPARTMENT_COURSES = {
    'College of Engineering and Architecture (CEA)': [
        'BS Civil Engineering', 'BS Electronics Engineering', 'BS Electrical Engineering',
        'BS Mechanical Engineering', 'BS Computer Engineering', 'BS Geodetic Engineering',
    ],
    'College of Information Technology and Computing (CITC)': [
        'BS Information Technology', 'BS Computer Science', 'BS Data Science', 'BS Technology Communication Management',
    ],
    'College of Science and Mathematics (CSM)': [
        'BS Applied Physics', 'BS Applied Mathematics', 'BS Chemistry', 'BS Environmental Science', 'BS Food Technology',
    ],
    'College of Science and Technology Education (CSTE)': [
        'BS Secondary Education Major in Science', 'Major in Mathematics',
        'B. Tech & Livelihood Education (Home Economics)', 'B. Tech & Livelihood Education (Industrial Arts)',
        'Bachelor in Technical-Vocational Teacher Education Major in Computer System Servicing',
        'Major in Fashion and Garments', 'Major in Food Service Management',
    ],
    'College of Technology (CT)': [
        'BS AutoTronics', 'BS Electro-Mechanical Technology', 'BS Electronics Technology',
        'BS Energy Systems and Management', 'BS Manufacturing Engineering Technology',
    ],
    'College of Medicine (COM)': ['College of Medicine'],
    'Senior High School (SHS)': ['STEM'],
};

export const DEPARTMENTS = Object.keys(DEPARTMENT_COURSES);
export const COURSES = DEPARTMENTS.flatMap((d) => DEPARTMENT_COURSES[d]);

export const SHS_DEPARTMENT = 'Senior High School (SHS)';

/** Year level choices as { value, label }: Grade 11/12 for SHS, Year 1–5 for college. */
export const yearLevelsFor = (department) =>
    department === SHS_DEPARTMENT
        ? [{ value: 'Grade 11', label: 'Grade 11' }, { value: 'Grade 12', label: 'Grade 12' }]
        : ['1', '2', '3', '4', '5'].map((y) => ({ value: y, label: `Year ${y}` }));

/** Department that offers `course` (e.g. from a scanned QR, which only carries the course), or ''. */
export const departmentForCourse = (course) =>
    DEPARTMENTS.find((d) => DEPARTMENT_COURSES[d].includes(course)) || '';

/** Course choices for `department`, plus `current` when it's an older name no longer on the list. */
export const courseOptionsFor = (department, current) => {
    const list = DEPARTMENT_COURSES[department] || [];
    return current && !list.includes(current) ? [...list, current] : list;
};

// Student gender (registration and the guard's report); same list as mobile/constants/Data.js
export const GENDERS = ['Male', 'Female'];

// "College of Information Technology and Computing (CITC)" -> "CITC", for compact filters and charts
export const departmentShort = (department) => (String(department || '').match(/\(([^)]+)\)\s*$/) || [])[1] || department;
