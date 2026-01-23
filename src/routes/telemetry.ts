import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from '@electric-sql/client';
import { createInsertSchema } from 'drizzle-zod';
import express from 'express';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { z } from 'zod/v4';

import { db, table } from '../db/index.js';
import ApiError from '../util/ApiError.js';
import { tripIdSchema } from './trips';

const router = express.Router();

if (!process.env.ELECTRIC_ORIGIN) console.error('ELECTRIC_ORIGIN not defined');
if (!process.env.ELECTRIC_SECRET) console.error('ELECTRIC_SECRET not defined');

router.get('/:tripId', async (req, res) => {
	if (!process.env.ELECTRIC_SECRET || !process.env.ELECTRIC_ORIGIN)
		throw new Error('ELECTRIC_ORIGIN and/or ELECTRIC_SECRET not set');

	const tripId = tripIdSchema.parse(req.params.tripId);
	const electricUrl = new URL(`/v1/shape`, process.env.ELECTRIC_ORIGIN);

	// Only pass through Electric protocol parameters
	Object.entries(req.query as Record<string, string>).forEach(([key, value]) => {
		if (ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key)) {
			electricUrl.searchParams.set(key, value);
		}
	});

	// Set the table server-side - not from client params
	electricUrl.searchParams.set(`table`, 'telemetry');
	electricUrl.searchParams.set(`where`, `${table.telemetryTable.tripId.name} = '${tripId.toString()}'`);
	electricUrl.searchParams.set(`secret`, process.env.ELECTRIC_SECRET);

	try {
		const response = await fetch(electricUrl);

		// Remove problematic headers that could break decoding
		const headers: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			if (key.toLowerCase() !== `content-encoding` && key.toLowerCase() !== `content-length`) headers[key] = value;
		});

		res.writeHead(response.status, response.statusText, headers);

		// Convert Web Streams to Node.js stream and pipe
		if (!response.body) throw new ApiError(500, 'Sync Service Error');
		const nodeStream = Readable.fromWeb(response.body);

		// Handle stream errors gracefully
		nodeStream.on(`error`, (err) => {
			console.error(`Stream error:`, err);
			if (!res.headersSent) {
				res.writeHead(500);
			}
			res.end();
		});

		res.on(`close`, () => {
			nodeStream.destroy();
		});

		await pipeline(nodeStream, res);
	} catch (error) {
		// Ignore premature close errors - these happen when clients disconnect early
		if (
			error instanceof Error &&
			'code' in error &&
			(error.code === 'ERR_STREAM_PREMATURE_CLOSE' || error.code === 'ERR_STREAM_UNABLE_TO_PIPE')
		) {
			return;
		}

		console.error(`Error proxying to Electric:`, error);
		// Only write headers if they haven't been sent yet
		if (!res.headersSent) {
			res.status(500).json({ error: `Sync Service Error` });
		}
	}
});

const telemetryInsertSchema = createInsertSchema(table.telemetryTable);

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
