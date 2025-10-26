import { doublePrecision, index, integer, pgTable, real, smallint, timestamp, varchar } from 'drizzle-orm/pg-core';

export const tripsTable = pgTable('trips', {
	id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
	name: varchar('name', { length: 512 }).notNull(),
	type: integer('type').notNull(),
	createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
	startedAt: timestamp('started_at', { mode: 'string' }),
});

export const telemetryTable = pgTable(
	'telemetry',
	{
		id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
		tripId: integer('trip_id').notNull(),
		time: timestamp('time', { mode: 'string' }).notNull(),
		// data values
		tempMosfet: real('temp_mosfet'),
		tempMotor: real('temp_motor'),
		motorCurrent: real('motor_current'),
		inputCurrent: real('input_current'),
		dutyCycle: real('duty_cycle'),
		tacho: real('tacho'),
		rpm: real('rpm'),
		volts: real('volts'),
		wattHours: real('watt_hours'),
		error: smallint('error'),
		// phone values
		lat: doublePrecision('lat'),
		long: doublePrecision('long'),
	},
	(table) => [index('idx_tripId').on(table.tripId)]
);
