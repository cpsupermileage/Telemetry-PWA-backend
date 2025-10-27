import { db, table } from '#db/index.js';
import buildConflictUpdateColumns from '#util/buildConflictUpdateColumns.js';
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from '@electric-sql/client';
import { eq } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import express from 'express';
import { z } from 'zod/v4';

const router = express.Router();

router.get('/', async (req: express.Request<unknown, unknown, unknown, Record<string, string>>, res) => {
	if (!process.env.ELECTRIC_SECRET || !process.env.ELECTRIC_ORIGIN)
		throw new Error('ELECTRIC_ORIGIN and/or ELECTRIC_SECRET not set');

	const originUrl = new URL(`/v1/shape`, process.env.ELECTRIC_ORIGIN);

	// Only pass through Electric protocol parameters
	Object.entries(req.query).forEach(([key, value]) => {
		if (ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key)) {
			originUrl.searchParams.set(key, value);
		}
	});

	// Set the table server-side - not from client params
	originUrl.searchParams.set(`table`, `trips`);
	originUrl.searchParams.set(`secret`, process.env.ELECTRIC_SECRET);

	const response = await fetch(originUrl);

	// Fetch decompresses the body but doesn't remove the
	// content-encoding & content-length headers which would
	// break decoding in the browser.
	//
	// See https://github.com/whatwg/fetch/issues/1729
	const headers = new Headers(response.headers);
	headers.delete(`content-encoding`);
	headers.delete(`content-length`);

	res.status(response.status).setHeaders(headers).send(response.body);
});

const tripInsertSchema = createInsertSchema(table.tripsTable);
const tripIdSchema = tripInsertSchema.shape.id.unwrap();

router.post('/', async (req, res) => {
	const trip = tripInsertSchema.parse(req.body);
	await db
		.insert(table.tripsTable)
		.values(trip)
		.onConflictDoUpdate({
			target: table.tripsTable.id,
			set: buildConflictUpdateColumns(table.tripsTable, ['name', 'type', 'createdAt', 'startedAt']),
		});
	res.status(200).json(trip);
});

router.post('/many', async (req, res) => {
	const trips = z.array(tripInsertSchema).min(1).max(100).parse(req.body);
	await db
		.insert(table.tripsTable)
		.values(trips)
		.onConflictDoUpdate({
			target: table.tripsTable.id,
			set: buildConflictUpdateColumns(table.tripsTable, ['name', 'type', 'createdAt', 'startedAt']),
		});
	res.status(200).json(trips);
});

router.delete('/:id', async (req, res) => {
	const id = tripIdSchema.parse(req.params.id);

	const dbRes = await db.delete(table.tripsTable).where(eq(table.tripsTable.id, id)).returning();

	if (dbRes.length < 1) return res.status(404).json({ message: 'Not Found' });

	res.status(200).json({});
});

export default router;
