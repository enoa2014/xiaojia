export interface StatsHomeSummary {
  patients: number;
  services: number;
  activities: number;
  tenancies: number;
}

export interface StatsSeriesPoint {
  label: string;
  value: number;
}

export interface StatsSeriesResponse {
  points: StatsSeriesPoint[];
}

export interface StatsDailyRequest {
  from: string;
  to: string;
}

export interface StatsWeeklyRequest {
  year: number;
  weeks: number;
}

export interface StatsMonthlyRequest {
  year: number;
}

export interface StatsYearlyRequest {
  years: number;
}
