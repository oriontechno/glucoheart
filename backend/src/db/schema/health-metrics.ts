import {
  pgTable,
  serial,
  integer,
  doublePrecision,
  varchar,
  timestamp,
  text,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

export const healthMetrics = pgTable(
  'health_metrics',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Nilai lab (semua optional, tipe double precision)
    bloodGlucoseRandom: doublePrecision('blood_glucose_random'), // mg/dL (GDS)
    bloodGlucoseFasting: doublePrecision('blood_glucose_fasting'), // mg/dL (GDP)
    hba1c: doublePrecision('hba1c'), // %
    hemoglobin: doublePrecision('hemoglobin'), // g/dL
    bloodGlucosePostprandial: doublePrecision('blood_glucose_postprandial'), // mg/dL

    // Wajib: tekanan darah & waktu pengukuran
    bloodPressure: varchar('blood_pressure', { length: 20 }).notNull(), // format "120/80"
    dateTime: timestamp('date_time', { withTimezone: false }).notNull(),

    // Catatan opsional
    notes: text('notes'),

    createdAt: timestamp('created_at').default(sql`now()`),
    updatedAt: timestamp('updated_at').default(sql`now()`),
  },
  (t) => ({
    byUserAndDate: index('idx_health_metrics_user_date').on(
      t.userId,
      t.dateTime,
    ),
  }),
);

export const healthMetricsRelations = relations(healthMetrics, ({ one }) => ({
  user: one(users, {
    fields: [healthMetrics.userId],
    references: [users.id],
  }),
}));
