import { State } from './State.js';
import { TimeUtils } from './TimeUtils.js';
import { UI } from './UI.js';

export const Export = {
    async downloadSchedule(format, scheduleContainerId) {
        const selectedCourses = State.getSelectedCourses();
        if (selectedCourses.length === 0) {
            alert("No hay cursos seleccionados para exportar.");
            return;
        }

        const studentName = prompt("Ingresa tu nombre para el horario (opcional):");
        const earliestHour = UI.getEarliestHour(selectedCourses);

        // Create a temporary container for valid printing/exporting
        const printContainer = document.createElement('div');
        printContainer.className = 'bg-white text-slate-900';

        // Landscape A4 proportions
        // A4 Landscape: 1123 x 794 pixels (approx)
        Object.assign(printContainer.style, {
            position: 'absolute',
            left: '-9999px',
            top: '0',
            width: '1280px',
            padding: '40px 60px',
            backgroundColor: 'white',
            fontFamily: "'Outfit', sans-serif"
        });

        // Add custom large header
        const customHeader = document.createElement('div');
        customHeader.className = 'text-center mb-6 pb-4 border-b-2 border-slate-100';
        customHeader.innerHTML = `
            <h1 style="font-size: 38px; font-weight: 800; color: #0f172a; margin-bottom: 4px; text-transform: uppercase;">
                Planificador de Horarios 2026-A
            </h1>
            <p style="font-size: 18px; font-weight: 600; color: #475569;">
                FACULTAD DE CIENCIAS ADMINISTRATIVAS - UNAC
            </p>
            ${studentName ? `<div style="margin-top: 15px; font-size: 24px; font-weight: 700; color: #4338ca;">Estudiante: ${studentName}</div>` : ''}
        `;
        printContainer.appendChild(customHeader);

        // CREATE A CUSTOM TABLE FOR EXPORT
        // This allows us to re-order columns (Hours to the right) and trim hours
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.backgroundColor = 'white';
        table.style.tableLayout = 'fixed';

        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const pixelsPerMinute = 1.0; // Fixed for consistent export

        // THEAD: Days first, then HORA
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.style.backgroundColor = '#f8fafc';

        days.forEach(day => {
            const th = document.createElement('th');
            th.textContent = day;
            th.style.padding = '12px 4px';
            th.style.fontSize = '12px';
            th.style.fontWeight = '700';
            th.style.color = '#64748b';
            th.style.textTransform = 'uppercase';
            th.style.border = '1px solid #e2e8f0';
            headerRow.appendChild(th);
        });

        const hourTh = document.createElement('th');
        hourTh.textContent = 'HORA';
        hourTh.style.width = '70px';
        hourTh.style.padding = '12px 4px';
        hourTh.style.fontSize = '11px';
        hourTh.style.fontWeight = '800';
        hourTh.style.color = '#475569';
        hourTh.style.border = '1px solid #e2e8f0';
        headerRow.appendChild(hourTh);

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // TBODY: Rows from earliestHour to 23
        const tbody = document.createElement('tbody');
        const endHour = 23;

        for (let h = earliestHour; h < endHour; h++) {
            const tr = document.createElement('tr');
            tr.style.height = `${60 * pixelsPerMinute}px`;

            // Day cells first
            for (let d = 0; d < 6; d++) {
                const td = document.createElement('td');
                td.style.border = '1px solid #f1f5f9';
                td.style.position = 'relative';
                tr.appendChild(td);
            }

            // Time cell last (Right side)
            const timeTd = document.createElement('td');
            timeTd.style.border = '1px solid #f1f5f9';
            timeTd.style.backgroundColor = '#f8fafc';
            timeTd.style.textAlign = 'center';
            timeTd.style.verticalAlign = 'top';
            timeTd.style.paddingTop = '4px';
            timeTd.style.fontSize = '12px';
            timeTd.style.fontWeight = '700';
            timeTd.style.color = '#64748b';
            timeTd.innerHTML = `${String(h).padStart(2, '0')}:00`;
            tr.appendChild(timeTd);

            tbody.appendChild(tr);
        }
        table.appendChild(tbody);

        // Create a container for the table to handle absolute positioning of events
        const tableWrapper = document.createElement('div');
        tableWrapper.style.position = 'relative';
        tableWrapper.appendChild(table);

        // RENDER EVENTS into the tableWrapper
        selectedCourses.forEach(selected => {
            const { curso, seccion } = selected;
            const color = State.getColor(curso.codigo, true);
            const borderColor = State.darkenColor(color, -40);
            const textColor = State.darkenColor(color, -100);

            seccion.clases.forEach(clase => {
                const range = TimeUtils.parseTimeRange(clase.hora);
                const dayIndex = days.indexOf(clase.dia);
                if (dayIndex === -1) return;

                // Calculate block position and size
                // The `thead.offsetHeight` is tricky here because the element is not yet rendered.
                // A fixed value (e.g., 42px for the header row height) or dynamic calculation after append
                // would be needed for perfect alignment. For now, let's use a reasonable estimate.
                const headerHeightEstimate = 42; // Approximate height of the header row
                const topOffset = (range.start - earliestHour * 60) * pixelsPerMinute + headerHeightEstimate;
                const blockHeight = (range.end - range.start) * pixelsPerMinute;

                // Calculate column width and left position based on the table structure
                // The table has 6 day columns + 1 hour column.
                // The total width of the table is 100%. The hour column is fixed width (70px).
                // The remaining width is for the 6 day columns.
                // This is a simplified approach, for pixel-perfect, one would need to measure the rendered table.
                // For now, let's use percentages for the day columns relative to the total width of the day columns area.
                const totalTableWidth = 1280 - 120; // printContainer width - padding
                const dayColumnsAreaWidth = totalTableWidth - 70; // totalTableWidth - hour column width
                const singleDayColumnWidthPercentage = (dayColumnsAreaWidth / 6) / totalTableWidth * 100;

                const blockEl = document.createElement('div');
                blockEl.style.position = 'absolute';
                blockEl.style.top = `${topOffset}px`;
                // Left position needs to account for the table's left edge and the day column's position
                // The tableWrapper is relative, so positions are relative to it.
                // The first day column starts at 0. The width of each day column is `singleDayColumnWidthPercentage`.
                blockEl.style.left = `${dayIndex * singleDayColumnWidthPercentage}%`;
                blockEl.style.width = `${singleDayColumnWidthPercentage - 0.2}%`; // Subtract a small margin
                blockEl.style.height = `${blockHeight}px`;
                blockEl.style.backgroundColor = color;
                blockEl.style.borderLeft = `4px solid ${borderColor}`;
                blockEl.style.padding = '4px';
                blockEl.style.boxSizing = 'border-box';
                blockEl.style.zIndex = '10';
                blockEl.style.borderRadius = '4px';
                blockEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                blockEl.style.overflow = 'hidden';
                blockEl.style.display = 'flex';
                blockEl.style.flexDirection = 'column';
                blockEl.style.justifyContent = 'center';
                blockEl.style.alignItems = 'center';
                blockEl.style.textAlign = 'center';

                blockEl.innerHTML = `
                    <div style="font-size: 10.5px; font-weight: 800; color: ${textColor}; line-height: 1.15; margin-bottom: 3px; word-break: break-word;">${curso.nombre}</div>
                    <div style="font-size: 8.5px; font-weight: 700; color: ${textColor}; opacity: 0.9; margin-bottom: 1px;">${clase.aula} - Sec. ${seccion.id}</div>
                    <div style="font-size: 8px; font-weight: 600; color: ${textColor}; opacity: 0.8;">${clase.hora}</div>
                `;
                tableWrapper.appendChild(blockEl);
            });
        });

        printContainer.appendChild(tableWrapper);
        document.body.appendChild(printContainer);

        // Wait for fonts/layout
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            const canvas = await window.html2canvas(printContainer, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false
            });

            const fileName = `Horario_2026A_${studentName ? studentName.replace(/\s+/g, '_') : 'UNAC'}`;

            if (format === 'png') {
                const link = document.createElement('a');
                link.download = `${fileName}.png`;
                link.href = canvas.toDataURL('image/png', 1.0);
                link.click();
            } else if (format === 'pdf') {
                const imgData = canvas.toDataURL('image/png', 1.0);
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'px',
                    format: [canvas.width, canvas.height]
                });
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save(`${fileName}.pdf`);
            }
        } catch (err) {
            console.error(`Error en exportación:`, err);
            alert('Error al generar archivo. Reintenta.');
        } finally {
            document.body.removeChild(printContainer);
        }
    },

    downloadExcel() {
        const selectedCourses = State.getSelectedCourses();
        if (selectedCourses.length === 0) {
            alert("No hay cursos seleccionados para exportar.");
            return;
        }

        const earliestHour = UI.getEarliestHour(selectedCourses);
        const endHour = 23;
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const numRows = endHour - earliestHour;

        // Create empty grid (Rows x Columns: Hours x (Time + 6 Days))
        // We will build data matrix: data[row_index][col_index]
        const data = [];

        // --- Custom Title Row ---
        data.push(['PLANIFICADOR DE HORARIOS 2026-A', '', '', '', '', '', '']);
        data.push(['Facultad de Ciencias Administrativas - UNAC', '', '', '', '', '', '']);
        data.push(['']); // Empty row

        // --- Header Row ---
        // Record the index where the actual schedule grid starts
        const startGridRow = data.length;
        data.push([...days, 'Hora']); // Put 'Hora' at the end just like the PDF, or at start depending on preference. 
        // User requested "Hora" on the right for PDF, let's keep it consistent: Days 0..5, Hour 6

        // Initialize rows with empty strings, and set the Hour label
        for (let i = 0; i < numRows; i++) {
            const rowData = new Array(7).fill('');
            rowData[6] = `${String(earliestHour + i).padStart(2, '0')}:00`;
            data.push(rowData);
        }

        // --- Fill Grid with Classes ---
        selectedCourses.forEach(selected => {
            const { curso, seccion } = selected;
            seccion.clases.forEach(clase => {
                const dayIndex = days.findIndex(d => d.startsWith(clase.dia)); // matches 'Lun' with 'Lunes'
                if (dayIndex === -1 && clase.dia !== 'Sáb' && clase.dia !== 'Mié') {
                    // Quick map for abbreviations:
                    const dayMap = { 'Lun': 0, 'Mar': 1, 'Mié': 2, 'Jue': 3, 'Vie': 4, 'Sáb': 5 };
                    if (dayMap[clase.dia] !== undefined) {
                        // handled below
                    }
                }
                const actualDayIndex = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].indexOf(clase.dia);
                if (actualDayIndex === -1) return;

                const range = TimeUtils.parseTimeRange(clase.hora);

                // Determine which row(s) this class belongs to
                const startHourIndex = Math.floor(range.start / 60) - earliestHour;
                const endHourIndex = Math.ceil(range.end / 60) - earliestHour;

                // Fill the text in the first block, and mark the rest if needed, or put the text in all overlapping hour rows
                const cellText = `${curso.nombre}\nAula: ${clase.aula} - Sec. ${seccion.id}\nHora: ${clase.hora}`;

                for (let r = startHourIndex; r < endHourIndex; r++) {
                    if (r >= 0 && r < numRows) {
                        const matrixRow = startGridRow + 1 + r;
                        // Avoid overwriting if multiple classes overlap tightly, merge them instead
                        if (data[matrixRow][actualDayIndex]) {
                            data[matrixRow][actualDayIndex] += `\n\n---\n\n${cellText}`;
                        } else {
                            data[matrixRow][actualDayIndex] = cellText;
                        }
                    }
                }
            });
        });

        const ws = window.XLSX.utils.aoa_to_sheet(data);

        // Styling widths (works in free SheetJS)
        // Set days to be wide, and hour column to be narrower
        const colWidths = [
            { wch: 25 }, { wch: 25 }, { wch: 25 },
            { wch: 25 }, { wch: 25 }, { wch: 25 },
            { wch: 10 }
        ];
        ws['!cols'] = colWidths;

        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, 'Horario');
        window.XLSX.writeFile(wb, 'Horario_2026A.xlsx');
    }
};
