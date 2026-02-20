export const TimeUtils = {
    timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    },

    parseTimeRange(horaStr) {
        const [startStr, endStr] = horaStr.split(' a ');
        return {
            start: this.timeToMinutes(startStr.trim()),
            end: this.timeToMinutes(endStr.trim().replace('.', '')),
        };
    }
};
