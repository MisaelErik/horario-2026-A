


import { coursesData } from '../data/courses.js';
import { Storage } from './modules/Storage.js';

import { State } from './modules/State.js';
import { TimeUtils } from './modules/TimeUtils.js';
import { UI } from './modules/UI.js';
import { Export } from './modules/Export.js';

// Setup backwards compatibility during refactoring
window.Schedule = State;
window.TimeUtils = TimeUtils;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Init UI
    UI.init();
    UI.populateCycleFilter(coursesData);

    // 2. Load Saved Schedules
    const savedSchedules = Storage.getSavedSchedules();
    UI.renderSavedSchedules(savedSchedules, {
        load: loadSchedule,
        delete: deleteSchedule
    });

    // 3. Render Course List
    renderCourses();

    // Event Listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Course Selection (Delegated)
    UI.elements.courseList.addEventListener('change', (e) => {
        if (e.target.matches('input[name^="course-"]')) {
            const courseCode = e.target.dataset.courseCode;
            const sectionId = e.target.dataset.sectionId;
            handleCourseSelection(courseCode, sectionId);
        }
    });

    // Cycle Filter
    UI.elements.cycleFilter.addEventListener('change', () => {
        renderCourses();
    });

    // Clear Schedule
    document.getElementById('clear-schedule-btn').addEventListener('click', () => {
        if (confirm('¿Borrar todo el horario actual?')) {
            State.clearSchedule();
            updateUI();
            document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
            renderCourses();
        }
    });

    // Save Schedule
    document.getElementById('save-schedule-btn').addEventListener('click', async () => {
        const schedule = Schedule.getSelectedCourses();
        if (schedule.length === 0) return alert("Selecciona cursos primero.");

        const name = prompt("Nombre del horario:");
        if (!name) return;

        try {
            const container = document.getElementById('schedule-container');
            // Temporary style fix for capture
            const originalOverflow = container.style.overflow;
            container.style.overflow = 'visible';

            const canvas = await window.html2canvas(container, { scale: 0.5, backgroundColor: '#ffffff' });
            container.style.overflow = originalOverflow;

            const thumbnail = canvas.toDataURL('image/png');

            Storage.saveSchedule({
                id: Date.now(),
                name,
                courses: schedule,
                thumbnail
            });

            UI.renderSavedSchedules(Storage.getSavedSchedules(), { load: loadSchedule, delete: deleteSchedule });
            UI.showToast("Horario guardado correctamente");
        } catch (error) {
            console.error(error);
            alert("Error al guardar.");
        }
    });

    // Exports
    const exportBtnPdf = document.getElementById('download-pdf-btn');
    const exportBtnPng = document.getElementById('download-png-btn');
    const exportBtnExcel = document.getElementById('download-excel-btn');

    if (exportBtnPdf) exportBtnPdf.addEventListener('click', () => {
        UI.showToast("Generando PDF, por favor espera...", "info", true);
        Export.downloadSchedule('pdf', 'schedule-container');
    });
    if (exportBtnPng) exportBtnPng.addEventListener('click', () => {
        UI.showToast("Generando Imagen, por favor espera...", "info", true);
        Export.downloadSchedule('png', 'schedule-container');
    });
    if (exportBtnExcel) exportBtnExcel.addEventListener('click', () => {
        UI.showToast("Generando Excel, por favor espera...", "info", true);
        Export.downloadExcel('schedule-table');
    });

    // Mobile Menu
    document.getElementById('download-menu-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('download-menu').classList.toggle('hidden');
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', () => {
        document.getElementById('download-menu')?.classList.add('hidden');
    });

    // Mobile export menu links
    document.getElementById('download-png-menu')?.addEventListener('click', (e) => {
        e.preventDefault();
        UI.showToast("Generando Imagen, por favor espera...", "info", true);
        Export.downloadSchedule('png', 'schedule-container');
    });
    document.getElementById('download-pdf-menu')?.addEventListener('click', (e) => {
        e.preventDefault();
        UI.showToast("Generando PDF, por favor espera...", "info", true);
        Export.downloadSchedule('pdf', 'schedule-container');
    });
    document.getElementById('download-excel-menu')?.addEventListener('click', (e) => {
        e.preventDefault();
        UI.showToast("Generando Excel, por favor espera...", "info", true);
        Export.downloadExcel('schedule-table');
    });

    // Trim/Recortar schedule
    document.getElementById('trim-schedule-btn')?.addEventListener('click', () => {
        const selected = State.getSelectedCourses();
        if (selected.length === 0) {
            UI.showToast('Primero selecciona cursos para recortar el horario', 'error', true);
            return;
        }
        const earliest = UI.getEarliestHour(selected);
        UI.renderScheduleGrid(earliest);
        UI.renderScheduleEvents(selected);
        UI.showToast(`Horario recortado desde las ${earliest}:00 ✂️`);
    });
}

function renderCourses() {
    UI.renderCourseList(coursesData, State.getSelectedCourses());
}

function handleCourseSelection(courseCode, sectionId) {
    const course = coursesData.find(c => c.codigo === courseCode);
    const section = course.secciones.find(s => s.id === sectionId);

    // Verifica no solo el curso, sino si esa sección en particular ya está seleccionada
    const alreadySelected = State.getSelectedCourses().some(c => c.curso.codigo === courseCode && c.seccion.id === sectionId);

    if (alreadySelected) {
        // Si ya está seleccionada esta sección exacta, no hacemos nada (evita remociones accidentales)
        return;
    }

    // Check conflicts
    let conflict = null;
    const currentSelected = State.getSelectedCourses();

    for (const newClass of section.clases) {
        for (const selected of currentSelected) {
            if (selected.curso.codigo === courseCode) continue;

            for (const existingClass of selected.seccion.clases) {
                if (existingClass.dia === newClass.dia) {
                    const newRange = TimeUtils.parseTimeRange(newClass.hora);
                    const existingRange = TimeUtils.parseTimeRange(existingClass.hora);

                    if (newRange.start < existingRange.end && newRange.end > existingRange.start) {
                        conflict = selected;
                        break;
                    }
                }
            }
            if (conflict) break;
        }
        if (conflict) break;
    }

    if (conflict) {
        UI.showConflictModal(
            `El curso ${course.nombre} se cruza con ${conflict.curso.nombre}.`,
            () => { // Replace
                State.removeCourse(conflict.curso.codigo);
                State.addCourse({ curso: course, seccion: section });
                UI.showToast(`${course.nombre} agregado`);
                updateUI();
                renderCourses(); // Updates radio buttons visually
            },
            () => { // Cancel
                renderCourses(); // Revert radio selection
            }
        );
    } else {
        State.addCourse({ curso: course, seccion: section });
        UI.showToast(`${course.nombre} agregado`);
        updateUI();
        renderCourses();
    }
}

function removeCourseCallback(courseCode) {
    State.removeCourse(courseCode);
    UI.showToast(`Curso removido`, 'info');
    updateUI();
    renderCourses();
}

function updateUI() {
    const selectedFields = State.getSelectedCourses();
    UI.renderScheduleEvents(selectedFields);
    UI.renderSelectedList(selectedFields, removeCourseCallback);
}

function loadSchedule(id) {
    const saved = Storage.getSavedSchedules().find(s => s.id === id);
    if (saved) {
        State.setSelectedCourses(saved.courses);
        updateUI();
        renderCourses();
        UI.showToast(`Horario cargado`);
    }
}

function deleteSchedule(id) {
    if (confirm("¿Eliminar este horario?")) {
        Storage.deleteSchedule(id);
        UI.renderSavedSchedules(Storage.getSavedSchedules(), { load: loadSchedule, delete: deleteSchedule });
    }
}
