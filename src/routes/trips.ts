import { db, table } from '#db/index.js';
import ApiError from '#util/ApiError.js';
import buildConflictUpdateColumns from '#util/buildConflictUpdateColumns.js';
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from '@electric-sql/client';
import { eq } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import express from 'express';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { z } from 'zod/v4';

const router = express.Router();

router.get('/', async (req: express.Request<unknown, unknown, unknown, Record<string, string>>, res) => {
	if (!process.env.ELECTRIC_SECRET || !process.env.ELECTRIC_ORIGIN)
		throw new Error('ELECTRIC_ORIGIN and/or ELECTRIC_SECRET not set');

	const electricUrl = new URL(`/v1/shape`, process.env.ELECTRIC_ORIGIN);

	// Only pass through Electric protocol parameters
	Object.entries(req.query).forEach(([key, value]) => {
		if (ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key)) {
			electricUrl.searchParams.set(key, value);
		}
	});

	// Set the table server-side - not from client params
	electricUrl.searchParams.set(`table`, `trips`);
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
		if (error instanceof Error && 'code' in error && error.code === `ERR_STREAM_PREMATURE_CLOSE`) {
			return;
		}

		console.error(`Error proxying to Electric:`, error);
		// Only write headers if they haven't been sent yet
		if (!res.headersSent) {
			res.status(500).json({ error: `Sync Service Error` });
		}
	}
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
