import { date, doublePrecision, index, integer, pgTable, real, smallint, varchar } from 'drizzle-orm/pg-core';

export const tripsTable = pgTable('trips', {
	id: integer().primaryKey().generatedByDefaultAsIdentity(),
	name: varchar({ length: 512 }).notNull(),
	type: integer().notNull(),
	createdAt: date().notNull(),
	startedAt: date(),
});

export const telemetryTable = pgTable(
	'telemetry',
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		tripId: integer().notNull(),
		time: date().notNull(),
		// data values
		tempMosfet: real(),
		tempMotor: real(),
		motorCurrent: real(),
		inputCurrent: real(),
		dutyCycle: real(),
		tacho: real(),
		rpm: real(),
		volts: real(),
		wattHours: real(),
		error: smallint(),
		// phone values
		lat: doublePrecision(),
		long: doublePrecision(),
	},
	(table) => [index('idx_tripId').on(table.tripId)]
);
