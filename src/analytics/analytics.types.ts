export interface FunnelMetric {
  stage: 'enrolled' | 'moduleActivity' | 'completed';
  count: number;
  rate: number;
}

export interface AnalyticsExample {
  funnel: {
    totalEnrollments: number;
    stages: FunnelMetric[];
    dropoutRate: number;
  };
  cohorts: Array<{
    registrationMonth: string;
    completionMonth: string;
    completedLessons: number;
  }>;
  enrollmentTreemap: Array<{
    communityId: string;
    community: string;
    course: string;
    level: string;
    enrollments: number;
  }>;
}

export type FunnelAnalytics = AnalyticsExample['funnel'];
export type CohortAnalytics = AnalyticsExample['cohorts'];
export type TreemapAnalytics = AnalyticsExample['enrollmentTreemap'];

export interface QuizBottleneckAnalytics {
  quizId: string;
  quiz: string;
  averageScore: number;
  failedAttempts: number;
  totalAttempts: number;
  failedRate: number;
}

export interface StudentRiskAnalytics {
  studentId: string;
  student: string;
  courseProgress: number;
  averageScore: number;
}

export interface ActivityByWeekdayHourAnalytics {
  weekday: number;
  hour: number;
  completedLessons: number;
}

export type ProfessorBottlenecksAnalytics = QuizBottleneckAnalytics[];
export type ProfessorStudentRiskAnalytics = StudentRiskAnalytics[];
export type ProfessorActivityAnalytics = ActivityByWeekdayHourAnalytics[];
