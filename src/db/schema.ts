import { date, doublePrecision, integer, pgTable, real, smallint, varchar } from 'drizzle-orm/pg-core';

export const tripsTable = pgTable('trips', {
	id: integer().primaryKey().generatedByDefaultAsIdentity(),
	name: varchar({ length: 512 }).notNull(),
	type: integer().notNull(),
	startedAt: date().notNull(),
});

export const telemetryTable = pgTable('telemetry', {
	id: integer().primaryKey().generatedByDefaultAsIdentity(),
	tripId: integer()
		.references(() => tripsTable.id, { onDelete: 'cascade' })
		.notNull(),
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
	wattHours: doublePrecision(),
	error: smallint(),
	// phone values
	lat: doublePrecision(),
	long: doublePrecision(),
});
