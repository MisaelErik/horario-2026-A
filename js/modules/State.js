/*
© 2026 Misael Erik. Todos los derechos reservados.
El uso, modificación, distribución o copia no autorizada de este código o esta herramienta se encuentra terminantemente prohibido sin el previo y explícito consentimiento del autor original.
*/
import { TimeUtils } from './TimeUtils.js';

export const State = {
    selectedCourses: [],
    colorsLight: ['#d1fae5', '#e0f2fe', '#fef3c7', '#fee2e2', '#f3e8ff', '#ffedd5', '#ccfbf1', '#cffafe', '#fef08a', '#fce7f3'],
    colorsDark: ['#065f46', '#075985', '#92400e', '#991b1b', '#6b21a8', '#9a3412', '#115e59', '#155e75', '#854d0e', '#831843'],
    courseColorMap: {},
    colorIndex: 0,

    getConflict(newClass) {
        const newRange = TimeUtils.parseTimeRange(newClass.hora);
        for (const selected of this.selectedCourses) {
            for (const existingClass of selected.seccion.clases) {
                if (existingClass.dia === newClass.dia) {
                    const existingRange = TimeUtils.parseTimeRange(existingClass.hora);
                    if (newRange.start < existingRange.end && newRange.end > existingRange.start) {
                        return {
                            selectedCourse: selected,
                            conflictDetails: {
                                day: existingClass.dia,
                                time: existingClass.hora,
                                courseName: selected.curso.nombre
                            }
                        };
                    }
                }
            }
        }
        return null;
    },

    addCourse(courseData) {
        // Remove existing instance of this course if present (e.g., switching sections)
        const existingCourseIndex = this.selectedCourses.findIndex(c => c.curso.codigo === courseData.curso.codigo);
        if (existingCourseIndex !== -1) {
            this.selectedCourses.splice(existingCourseIndex, 1);
        }

        // Assign color and add
        if (!this.courseColorMap[courseData.curso.codigo]) {
            const isDarkMode = document.documentElement.classList.contains('dark');
            const colors = isDarkMode ? this.colorsDark : this.colorsLight;
            this.courseColorMap[courseData.curso.codigo] = colors[this.colorIndex % colors.length];
            this.colorIndex++;
        }

        this.selectedCourses.push(courseData);
        window.dispatchEvent(new CustomEvent('schedule-updated'));
    },

    removeCourse(courseCode) {
        this.selectedCourses = this.selectedCourses.filter(c => c.curso.codigo !== courseCode);
        window.dispatchEvent(new CustomEvent('schedule-updated'));
    },

    getSelectedCourses() {
        return this.selectedCourses;
    },

    setSelectedCourses(courses) {
        this.selectedCourses = courses || [];
        // Re-map colors
        this.courseColorMap = {};
        this.colorIndex = 0;
        const isDarkMode = document.documentElement.classList.contains('dark');
        const colors = isDarkMode ? this.colorsDark : this.colorsLight;

        this.selectedCourses.forEach(c => {
            if (!this.courseColorMap[c.curso.codigo]) {
                this.courseColorMap[c.curso.codigo] = colors[this.colorIndex % colors.length];
                this.colorIndex++;
            }
        });
        window.dispatchEvent(new CustomEvent('schedule-updated'));
    },

    clearSchedule() {
        this.selectedCourses = [];
        this.courseColorMap = {};
        this.colorIndex = 0;
        window.dispatchEvent(new CustomEvent('schedule-updated'));
    },

    getCourseColor(courseCode) {
        const isDarkMode = document.documentElement.classList.contains('dark');
        const colors = isDarkMode ? this.colorsDark : this.colorsLight;

        if (!this.courseColorMap[courseCode]) {
            this.courseColorMap[courseCode] = colors[this.colorIndex % colors.length];
            this.colorIndex++;
        }

        const colorIndex = this.colorIndex - 1;
        return colors[colorIndex % colors.length];
    }
};
