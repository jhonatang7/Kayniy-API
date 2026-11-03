import {
  AnalyticsExample,
  ProfessorActivityAnalytics,
  ProfessorBottlenecksAnalytics,
  ProfessorStudentRiskAnalytics,
} from './analytics.types';

export const ADMIN_ANALYTICS_EXAMPLE: AnalyticsExample = {
  funnel: {
    totalEnrollments: 120,
    stages: [
      { stage: 'enrolled', count: 120, rate: 100 },
      { stage: 'moduleActivity', count: 96, rate: 80 },
      { stage: 'completed', count: 48, rate: 40 },
    ],
    dropoutRate: 60,
  },
  cohorts: [
    {
      registrationMonth: '2026-01',
      completionMonth: '2026-02',
      completedLessons: 35,
    },
    {
      registrationMonth: '2026-01',
      completionMonth: '2026-03',
      completedLessons: 64,
    },
    {
      registrationMonth: '2026-02',
      completionMonth: '2026-02',
      completedLessons: 51,
    },
    {
      registrationMonth: '2026-02',
      completionMonth: '2026-03',
      completedLessons: 73,
    },
    {
      registrationMonth: '2026-03',
      completionMonth: '2026-03',
      completedLessons: 46,
    },
  ],
  enrollmentTreemap: [
    {
      communityId: 'community-uuid',
      community: 'Programación',
      course: 'Fundamentos de JavaScript',
      level: 'Intermedio',
      enrollments: 42,
    },
    {
      communityId: 'community-uuid-2',
      community: 'Diseño UX/UI',
      course: 'Introducción al Diseño de Interfaces',
      level: 'Básico',
      enrollments: 31,
    },
    {
      communityId: 'community-uuid-2',
      community: 'Diseño UX/UI',
      course: 'Sistemas de Diseño Avanzados',
      level: 'Avanzado',
      enrollments: 18,
    },
    {
      communityId: 'community-uuid-3',
      community: 'Ciencias de Datos',
      course: 'Python para Datos',
      level: 'Intermedio',
      enrollments: 27,
    },
    {
      communityId: 'community-uuid-3',
      community: 'Ciencias de Datos',
      course: 'Machine Learning Aplicado',
      level: 'Avanzado',
      enrollments: 22,
    },
  ],
};

export const PROFESSOR_BOTTLENECKS_EXAMPLE: ProfessorBottlenecksAnalytics = [
    {
      quizId: 'quiz-uuid',
      quiz: 'Funciones',
      averageScore: 62.5,
      failedAttempts: 15,
      totalAttempts: 30,
      failedRate: 50,
    },
    {
      quizId: 'quiz-uuid-2',
      quiz: 'Estructuras de datos',
      averageScore: 68.75,
      failedAttempts: 11,
      totalAttempts: 32,
      failedRate: 34.38,
    },
    {
      quizId: 'quiz-uuid-3',
      quiz: 'Consultas SQL',
      averageScore: 76.4,
      failedAttempts: 6,
      totalAttempts: 28,
      failedRate: 21.43,
    },
];

export const PROFESSOR_STUDENT_RISK_EXAMPLE: ProfessorStudentRiskAnalytics = [
    {
      studentId: 'student-uuid',
      student: 'Ada Lovelace',
      courseProgress: 28.57,
      averageScore: 54.2,
    },
    {
      studentId: 'student-uuid-2',
      student: 'Grace Hopper',
      courseProgress: 35.71,
      averageScore: 61.8,
    },
    {
      studentId: 'student-uuid-3',
      student: 'Katherine Johnson',
      courseProgress: 57.14,
      averageScore: 78.6,
    },
    {
      studentId: 'student-uuid-4',
      student: 'Alan Turing',
      courseProgress: 14.29,
      averageScore: 42.5,
    },
];

export const PROFESSOR_ACTIVITY_EXAMPLE: ProfessorActivityAnalytics = [
    { weekday: 2, hour: 19, completedLessons: 18 },
    { weekday: 2, hour: 20, completedLessons: 24 },
    { weekday: 3, hour: 18, completedLessons: 12 },
    { weekday: 4, hour: 19, completedLessons: 29 },
    { weekday: 5, hour: 20, completedLessons: 21 },
    { weekday: 6, hour: 10, completedLessons: 9 },
];
