import { db, table } from '#db/index.js';
import { eq } from 'drizzle-orm';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import express from 'express';
import { z } from 'zod/v4';

const router = express.Router();

router.get('/', async (req, res) => {
	const trips = await db.query.tripsTable.findMany({
		orderBy: (table, { desc }) => desc(table.startedAt),
	});

	res.status(200).json(trips);
});

const tripInsertSchema = createInsertSchema(table.tripsTable);
const tripIdSchema = tripInsertSchema.shape.id.unwrap();

router.post('/', async (req, res) => {
	const trip = tripInsertSchema.parse(req.body);
	await db.insert(table.tripsTable).values(trip).onConflictDoNothing();
	res.status(200).json(trip);
});

router.post('/many', async (req, res) => {
	const trips = z.array(tripInsertSchema).min(1).max(100).parse(req.body);
	await db.insert(table.tripsTable).values(trips).onConflictDoNothing();
	res.status(200).json(trips);
});

const tripUpdateSchema = createUpdateSchema(table.tripsTable, {
	id: z.undefined(),
});

router.patch('/:id', async (req, res) => {
	const id = tripIdSchema.parse(req.params.id);
	const tripUpdate = tripUpdateSchema.parse(req.body);

	const dbRes = await db
		.update(table.tripsTable)
		.set({ ...tripUpdate, id: undefined })
		.where(eq(table.tripsTable.id, id))
		.returning();

	if (dbRes.length < 1) return res.status(404).json({ message: 'Not Found' });

	res.status(200).json(dbRes[0]);
});

router.delete('/:id', async (req, res) => {
	const id = tripIdSchema.parse(req.params.id);

	const dbRes = await db.delete(table.tripsTable).where(eq(table.tripsTable.id, id)).returning();

	if (dbRes.length < 1) return res.status(404).json({ message: 'Not Found' });

	res.status(200).json({});
});

export default router;
