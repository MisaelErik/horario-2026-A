/*
© 2026 ErikMisael. Todos los derechos reservados.
Creado por ErikMisael. El uso, modificación, distribución o copia no autorizada de este código o esta herramienta se encuentra terminantemente prohibido sin el previo y explícito consentimiento del autor original.
*/

import { coursesData as localCoursesData } from '../data/courses.js?v=11';
import { Storage } from './modules/Storage.js?v=11';
import { State } from './modules/State.js?v=11';
import { TimeUtils } from './modules/TimeUtils.js?v=11';
import { UI } from './modules/UI.js?v=11';
import { Export } from './modules/Export.js?v=11';
import { FirebaseSync } from './modules/Firebase.js?v=11';

let activeCoursesData = localCoursesData;
let facultySelector = null; // Declare it here for access across functions

// Setup backwards compatibility during refactoring
window.Schedule = State;
window.TimeUtils = TimeUtils;
window.facultyNames = {
    'ADM': 'Administración',
    'FCA': 'Administración'
};

function updateSubtitle(facultyId) {
    const subtitle = document.getElementById('faculty-subtitle');
    if (subtitle) {
        const name = window.facultyNames[facultyId] || 'Administración';
        subtitle.textContent = `${name} - UNAC`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Init UI
    UI.init();
    facultySelector = document.getElementById('faculty-selector');

    // 2. Initial Sync/Check Faculty OR Load Shared
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = urlParams.get('share');

    let initialSyncComplete = false;
    
    // Default to ADM
    localStorage.setItem('selected-faculty', 'ADM');

    if (sharedId) {
        UI.showToast("Cargando horario compartido...", "info", true);
        const sharedData = await FirebaseSync.getSharedSchedule(sharedId);
        if (sharedData && sharedData.data && sharedData.faculty) {
            const syncResult = await syncFacultyData('ADM');
            if (syncResult) {
                State.setSelectedCourses(sharedData.data);
                updateUI();
                renderCourses();
                UI.showToast("¡Horario compartido cargado!", "success");

                initialSyncComplete = true;

                // Send to GA
                if (typeof window.gtag === 'function') {
                    window.gtag('event', 'load_shared_schedule', {
                        'faculty': 'ADM',
                        'share_id': sharedId
                    });
                }
            }
        } else {
            UI.showToast("Enlace de horario inválido o expirado.", "error");
        }
    }

    if (!initialSyncComplete) {
        const syncResult = await syncFacultyData('ADM');
    }

    // Initial Render (if not handled by sync)
    UI.populateCycleFilter(activeCoursesData);
    renderCourses();

    // 3. Load Saved Schedules
    const savedSchedules = Storage.getSavedSchedules();
    UI.renderSavedSchedules(savedSchedules, {
        load: loadSchedule,
        delete: deleteSchedule
    });

    // Event Listeners
    setupEventListeners();
});

async function syncFacultyData(facultyId) {
    activeCoursesData = localCoursesData;
    UI.populateCycleFilter(activeCoursesData);
    renderCourses();
    updateSubtitle('ADM');
    return true;
}

function setupEventListeners() {
    // Custom Schedule Upload Logic
    const customUploadBtn = document.getElementById('upload-custom-schedule-btn');
    const customUploadModal = document.getElementById('custom-upload-modal');
    const closeUploadModalBtn = document.getElementById('close-upload-modal-btn');
    const customFileInput = document.getElementById('custom-file-input');
    const customDropzone = document.getElementById('custom-dropzone');
    const customErrorBox = document.getElementById('custom-error-box');
    const customErrorMessage = document.getElementById('custom-error-message');
    const customFileNameDisplay = document.getElementById('custom-file-name-display');

    if (customUploadBtn) {
        customUploadBtn.addEventListener('click', () => {
            const title = document.getElementById('upload-modal-title');
            const desc = document.getElementById('upload-modal-desc');
            if (title) title.textContent = "Actualizar Horario";
            if (desc) desc.textContent = "Sube un nuevo archivo oficial para actualizar o reemplazar tu horario actual.";
            if (customUploadModal) {
                customUploadModal.dataset.pendingFaculty = "";
                customUploadModal.classList.remove('hidden');
            }
        });
    }

    if (closeUploadModalBtn) {
        closeUploadModalBtn.addEventListener('click', () => {
            if (customUploadModal) customUploadModal.classList.add('hidden');
        });
    }

    if (customDropzone && customFileInput) {
        customDropzone.addEventListener('click', () => customFileInput.click());

        ['dragenter', 'dragover'].forEach(eventName => {
            customDropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                customDropzone.classList.add('bg-indigo-50', 'dark:bg-indigo-900/30');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            customDropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                customDropzone.classList.remove('bg-indigo-50', 'dark:bg-indigo-900/30');
            }, false);
        });

        customDropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const file = dt.files[0];
            if (file) handleCustomFileWrapper(file);
        });

        customFileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) handleCustomFileWrapper(e.target.files[0]);
        });
    }

    function showCustomError(msg) {
        if (customErrorMessage) customErrorMessage.textContent = msg;
        if (customErrorBox) customErrorBox.classList.remove('hidden');
    }

    function handleCustomFileWrapper(file) {
        if (typeof XLSX === 'undefined') {
            showCustomError("El procesador XLSX está cargando. Inténtalo de nuevo.");
            return;
        }

        if (customErrorBox) customErrorBox.classList.add('hidden');
        if (customFileNameDisplay) customFileNameDisplay.textContent = `Procesando: ${file.name}`;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                const processedCourses = processScheduleRowsManual(rows);

                const currentFaculty = customUploadModal.dataset.pendingFaculty || localStorage.getItem('selected-faculty') || 'ADM';

                localStorage.setItem(`cache-courses-${currentFaculty}`, JSON.stringify({
                    courses: processedCourses,
                    uploadedAt: Date.now()
                }));

                localStorage.setItem('selected-faculty', currentFaculty);

                activeCoursesData = processedCourses;
                UI.populateCycleFilter(activeCoursesData);
                renderCourses();
                updateSubtitle(currentFaculty);

                if (customUploadModal) customUploadModal.classList.add('hidden');
                UI.showToast("Horario personalizado cargado con éxito", "success", true);

            } catch (err) {
                showCustomError(err.message || "Error al procesar el archivo. Asegúrate que sea un Excel válido.");
            }
        };
        reader.readAsArrayBuffer(file);
        customFileInput.value = '';
    }

    function processScheduleRowsManual(rows) {
        if (rows.length < 2) throw new Error("El archivo no contiene suficientes datos.");

        const headers = (rows[0] || []).map(h => String(h || '').toUpperCase().trim());

        const col = {
            ciclo: headers.findIndex(h => h.includes('CICLO')),
            curso: headers.findIndex(h => h.includes('CURSO')),
            docente: headers.findIndex(h => h.includes('DOCENTE')),
            seccion: headers.findIndex(h => h.includes('SECCI')),
            dia: headers.findIndex(h => h.includes('DIA') || h.includes('DÍA')),
            hora: headers.findIndex(h => h.includes('HORA')),
            aula: headers.findIndex(h => h.includes('AULA')),
            tipo: headers.findIndex(h => h.includes('TIPO'))
        };

        if (col.curso === -1 || col.seccion === -1 || col.dia === -1) {
            throw new Error("No se detectaron las columnas requeridas (Curso, Sección, Día).");
        }

        const coursesMap = {};

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 3) continue;

            const rawCurso = String(row[col.curso] || '').trim();
            const rawDocente = String(row[col.docente] || '').trim();
            const seccionId = String(row[col.seccion] || '').trim();

            if (!rawCurso || !seccionId) continue;

            let nombreCurso = rawCurso.replace(/^"|"$/g, '');
            let codigoCurso = "";
            const lastDashCurso = nombreCurso.lastIndexOf('-');
            if (lastDashCurso !== -1) {
                codigoCurso = nombreCurso.substring(lastDashCurso + 1).trim();
                nombreCurso = nombreCurso.substring(0, lastDashCurso).trim();
            }

            let nombreDocente = rawDocente.replace(/^"|"$/g, '');
            const lastDashDocente = nombreDocente.lastIndexOf('-');
            if (lastDashDocente !== -1) {
                nombreDocente = nombreDocente.substring(0, lastDashDocente).trim();
            }

            if (!codigoCurso) continue;

            if (!coursesMap[codigoCurso]) {
                coursesMap[codigoCurso] = {
                    ciclo: String(row[col.ciclo] || '').trim(),
                    codigo: codigoCurso,
                    nombre: nombreCurso,
                    creditos: 0,
                    seccionesMap: {}
                };
            }

            if (!coursesMap[codigoCurso].seccionesMap[seccionId]) {
                coursesMap[codigoCurso].seccionesMap[seccionId] = {
                    id: seccionId,
                    docente: nombreDocente || "Docente por asignar",
                    clases: []
                };
            }

            const dia = String(row[col.dia] || '').trim();
            const hora = String(row[col.hora] || '').trim();
            if (dia && hora) {
                const aula = String(row[col.aula] || '').trim();
                const tipo = String(row[col.tipo] || '').trim();

                const exists = coursesMap[codigoCurso].seccionesMap[seccionId].clases.some(c =>
                    c.dia === dia && c.hora === hora && c.tipo === tipo
                );

                if (!exists) {
                    coursesMap[codigoCurso].seccionesMap[seccionId].clases.push({ dia, hora, aula, tipo });
                }
            }
        }

        const finalArray = Object.values(coursesMap);
        if (finalArray.length === 0) throw new Error("No se pudo extraer ningún curso válido.");

        return finalArray.map(c => ({
            ciclo: c.ciclo,
            codigo: c.codigo,
            nombre: c.nombre,
            creditos: c.creditos,
            secciones: Object.values(c.seccionesMap).sort((a, b) => a.id.localeCompare(b.id))
        }));
    }

    // Theme Change Re-render
    window.addEventListener('theme-changed', () => {
        updateUI();
    });

    // Color Palette Selector
    const paletteSelector = document.getElementById('palette-selector');
    if (paletteSelector) {
        paletteSelector.value = State.activePalette;
        paletteSelector.addEventListener('change', (e) => {
            State.setPalette(e.target.value);
            updateUI();
            renderCourses();
            UI.showToast("Paleta actualizada", "success");
        });
    }

    // Schedule-updated global event (triggered by custom color picker)
    window.addEventListener('schedule-updated', () => {
        updateUI();
    });

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
                thumbnail,
                faculty: localStorage.getItem('selected-faculty') || 'ADM'
            });

            UI.renderSavedSchedules(Storage.getSavedSchedules(), { load: loadSchedule, delete: deleteSchedule });
            UI.showToast("Horario guardado correctamente");

            // Send GA event
            if (typeof window.gtag === 'function') {
                window.gtag('event', 'save_schedule', {
                    'faculty': localStorage.getItem('selected-faculty') || 'ADM',
                    'count_courses': schedule.length
                });
            }
        } catch (error) {
            console.error(error);
            alert("Error al guardar.");
        }
    });

    // Share Schedule
    const shareBtn = document.getElementById('share-schedule-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            const schedule = Schedule.getSelectedCourses();
            if (schedule.length === 0) return alert("Selecciona cursos para compartir.");

            UI.showToast("Generando enlace...", "info", true);
            shareBtn.disabled = true;
            shareBtn.classList.add('opacity-50');

            const currentFaculty = localStorage.getItem('selected-faculty') || 'FCA';
            const shareId = await FirebaseSync.shareSchedule(schedule, currentFaculty);

            if (shareId) {
                const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;

                // Track with GA
                if (typeof window.gtag === 'function') {
                    window.gtag('event', 'share', {
                        'method': 'Link_Generated',
                        'content_type': 'schedule',
                        'faculty': currentFaculty
                    });
                }

                try {
                    await navigator.clipboard.writeText(shareUrl);
                    UI.showToast("¡Enlace copiado al portapapeles!", "success");
                } catch (err) {
                    prompt("Copia este enlace para compartir tu horario:", shareUrl);
                }
            } else {
                UI.showToast("Error al generar enlace.", "error");
            }

            shareBtn.disabled = false;
            shareBtn.classList.remove('opacity-50');
        });
    }

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

    // Menú de Exportación (Dropdown)
    const downloadMenuBtn = document.getElementById('download-menu-btn');
    const downloadMenu = document.getElementById('download-menu');

    if (downloadMenuBtn && downloadMenu) {
        // Toggle menú al pulsar el botón
        downloadMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            downloadMenu.classList.toggle('hidden');
        });

        // Evitar que el menú se cierre al hacer clic dentro de él (pero no en las opciones)
        downloadMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Cerrar menú al hacer clic en cualquier otra parte del documento
        document.addEventListener('click', () => {
            downloadMenu.classList.add('hidden');
        });

        // Configurar acciones de cada opción del menú
        const exportOptions = [
            { id: 'download-png-menu', format: 'png', msg: 'Generando Imagen...' },
            { id: 'download-pdf-menu', format: 'pdf', msg: 'Generando PDF...' },
            { id: 'download-excel-menu', format: 'excel', msg: 'Generando Excel...' },
            { id: 'download-ics-menu', format: 'ics', msg: 'Generando Calendario...' }
        ];

        exportOptions.forEach(opt => {
            const el = document.getElementById(opt.id);
            if (el) {
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    downloadMenu.classList.add('hidden'); // Cerrar menú al elegir
                    UI.showToast(opt.msg, "info", true);

                    if (opt.format === 'excel') {
                        Export.downloadExcel('schedule-table');
                    } else if (opt.format === 'ics') {
                        Export.downloadICS();
                    } else {
                        Export.downloadSchedule(opt.format, 'schedule-container');
                    }
                });
            }
        });
    }

    // Trim/Recortar schedule
    document.getElementById('trim-schedule-btn')?.addEventListener('click', () => {
        const selected = State.getSelectedCourses();
        if (selected.length === 0) {
            UI.showToast('Primero selecciona cursos para recortar el horario', 'error', true);
            return;
        }
        const { start, end } = UI.getScheduleBounds(selected);
        UI.renderScheduleGrid(start, end);
        UI.renderScheduleEvents(selected);
        UI.showToast(`Horario ajustado: ${start}:00 a ${end}:00 ✂️`);
    });

    // Check if lucide icons are available
    if (window.lucide) window.lucide.createIcons();
}

function renderCourses() {
    UI.renderCourseList(activeCoursesData, State.getSelectedCourses());
}

function handleCourseSelection(courseCode, sectionId) {
    const course = activeCoursesData.find(c => c.codigo === courseCode);
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
    const { start, end } = UI.getScheduleBounds(selectedFields);
    UI.renderScheduleGrid(start, end);
    UI.renderScheduleEvents(selectedFields);
    UI.renderSelectedList(selectedFields, removeCourseCallback);
}

async function loadSchedule(id) {
    const saved = Storage.getSavedSchedules().find(s => s.id === id);
    if (saved) {
        const targetFaculty = saved.faculty || 'ADM'; 

        if (targetFaculty !== 'ADM' && targetFaculty !== 'FCA') {
            const confirmed = confirm(`Este horario pertenece a otra carrera originaria (${targetFaculty}). Es posible que los cursos no sean de Administración. ¿Deseas cargarlo de todas formas?`);
            if (!confirmed) return;
        }

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
