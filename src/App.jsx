// App.jsx — entry point re-export
// All logic has been split into separate modules:
//   src/constants.js          – shared constants & colors
//   src/styles.js             – shared style helpers
//   src/utils.js              – pure utility functions
//   src/models.js             – data models & Firebase helpers
//   src/components/           – Sheet, Toast, TopBar, Drawer, FormInputs
//   src/pages/                – LoginScreen, Dashboard, AttendancePage,
//                               ScoresPage, StudentsPage, StatsPage,
//                               IOPage, SettingsPage, HomeroomPage
//   src/TeacherApp.jsx        – teacher shell (nav, FAB, toast wiring)
//   src/StudentApp.jsx        – student shell (scores, attendance, PIN)
//   src/AppRouter.jsx         – minimal router (loading / login / role routing)
export { default } from './AppRouter';
