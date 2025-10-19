import { db, table } from '#db/index.js';
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from '@electric-sql/client';
import { createInsertSchema } from 'drizzle-zod';
import express from 'express';
import { z } from 'zod/v4';

const router = express.Router();

if (!process.env.ELECTRIC_ORIGIN) console.error('ELECTRIC_ORIGIN not defined');
if (!process.env.ELECTRIC_SECRET) console.error('ELECTRIC_SECRET not defined');

router.get('/:tripId', async (req) => {
	const tripId = tripIdSchema.parse(req.body);
	const url = new URL(req.url);

	const originUrl = new URL(`/v1/shape`, process.env.ELECTRIC_ORIGIN);

	// Only pass through Electric protocol parameters
	url.searchParams.forEach((value, key) => {
		if (ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key)) {
			originUrl.searchParams.set(key, value);
		}
	});

	// Set the table server-side - not from client params
	originUrl.searchParams.set(`table`, `telemetry`);
	originUrl.searchParams.set(`where`, `${table.telemetryTable.id.name} = '${tripId.toString()}'`);

	const response = await fetch(originUrl);

	// Fetch decompresses the body but doesn't remove the
	// content-encoding & content-length headers which would
	// break decoding in the browser.
	//
	// See https://github.com/whatwg/fetch/issues/1729
	const headers = new Headers(response.headers);
	headers.delete(`content-encoding`);
	headers.delete(`content-length`);

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
});

const telemetryInsertSchema = createInsertSchema(table.telemetryTable);
const tripIdSchema = telemetryInsertSchema.shape.tripId;

router.post('/', async (req, res) => {
	const entry = telemetryInsertSchema.parse(req.body);
	await db.insert(table.telemetryTable).values(entry).onConflictDoNothing();
	res.status(200).json(entry);
});

router.post('/many', async (req, res) => {
	const entries = z.array(telemetryInsertSchema).min(1).max(100).parse(req.body);
	await db.insert(table.telemetryTable).values(entries).onConflictDoNothing();
	res.status(200).json(entries);
});

export default router;
