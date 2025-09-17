import Database from "better-sqlite3";
import { StatsDailySchema, StatsMonthlySchema, StatsWeeklySchema, StatsYearlySchema } from "../../shared/schemas/stats.js";
import type {
  StatsDailyRequest,
  StatsHomeSummary,
  StatsMonthlyRequest,
  StatsSeriesResponse,
  StatsWeeklyRequest,
  StatsYearlyRequest,
} from "../../shared/types/stats.js";

const count = (db: InstanceType<typeof Database>, table: string): number => {
  const row = db.prepare(`SELECT COUNT(*) as total FROM ${table}`).get() as { total: number } | undefined;
  return Number(row?.total ?? 0);
};

export class StatsRepository {
  constructor(private readonly db: InstanceType<typeof Database>) {}

  homeSummary(): StatsHomeSummary {
    return {
      patients: count(this.db, "patients"),
      services: count(this.db, "services"),
      activities: count(this.db, "activities"),
      tenancies: count(this.db, "tenancies"),
    };
  }

  daily(rawParams: StatsDailyRequest): StatsSeriesResponse {
    const params = StatsDailySchema.parse(rawParams);
    const rows = this.db
      .prepare(
        `SELECT date(check_in_date) as bucket, COUNT(*) as total
         FROM tenancies
         WHERE check_in_date BETWEEN @from AND @to
         GROUP BY bucket
         ORDER BY bucket`
      )
      .all({ from: params.from, to: params.to }) as Array<{ bucket: string; total: number }>;

    return {
      points: rows.map((row) => ({ label: row.bucket, value: Number(row.total ?? 0) })),
    };
  }

  weekly(rawParams: StatsWeeklyRequest): StatsSeriesResponse {
    const params = StatsWeeklySchema.parse(rawParams);
    const rows = this.db
      .prepare(
        `SELECT strftime('%W', date) as bucket, COUNT(*) as total
         FROM services
         WHERE strftime('%Y', date) = @year
         GROUP BY bucket
         ORDER BY bucket`
      )
      .all({ year: String(params.year) }) as Array<{ bucket: string; total: number }>;

    return {
      points: rows.map((row) => ({ label: `第${row.bucket}周`, value: Number(row.total ?? 0) })),
    };
  }

  monthly(rawParams: StatsMonthlyRequest): StatsSeriesResponse {
    const params = StatsMonthlySchema.parse(rawParams);
    const rows = this.db
      .prepare(
        `SELECT strftime('%m', created_at/1000, 'unixepoch') as bucket, COUNT(*) as total
         FROM patients
         WHERE strftime('%Y', created_at/1000, 'unixepoch') = @year
         GROUP BY bucket
         ORDER BY bucket`
      )
      .all({ year: String(params.year) }) as Array<{ bucket: string; total: number }>;

    return {
      points: rows.map((row) => ({ label: `${row.bucket}月`, value: Number(row.total ?? 0) })),
    };
  }

  yearly(rawParams: StatsYearlyRequest): StatsSeriesResponse {
    const params = StatsYearlySchema.parse(rawParams);
    const rows = this.db
      .prepare(
        `SELECT strftime('%Y', date) as bucket, COUNT(*) as total
         FROM activities
         GROUP BY bucket
         ORDER BY bucket DESC
         LIMIT @years`
      )
      .all({ years: params.years }) as Array<{ bucket: string; total: number }>;

    return {
      points: rows
        .map((row) => ({ label: `${row.bucket}年`, value: Number(row.total ?? 0) }))
        .reverse(),
    };
  }
}
