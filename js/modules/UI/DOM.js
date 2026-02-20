export const DOM = {
    elements: {},

    cacheDOM() {
        this.elements = {
            courseList: document.getElementById('course-list'),
            scheduleBody: document.getElementById('schedule-body'),
            selectedCoursesList: document.getElementById('selected-courses-list'),
            creditCountBadge: document.getElementById('credit-count-badge'),
            cycleFilter: document.getElementById('cycle-filter'),
            savedSchedulesList: document.getElementById('saved-schedules-list'),
            conflictModal: document.getElementById('conflict-modal'),
            conflictMessage: document.getElementById('conflict-message'),
            modalContent: document.getElementById('modal-content'),
        };
    },

    getElement(key) {
        return this.elements[key];
    }
};
