/* eslint-disable @typescript-eslint/no-unused-vars */
import cors from 'cors';
import express, { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import 'dotenv/config';

import telemetry from './routes/telemetry';
import trips from './routes/trips.js';
import ApiError from './util/ApiError.js';

const app = express();
const port = process.env.PORT ?? '3000';

app.use(cors());
app.use(express.json());

app.use('/api/trips', trips);
app.use('/api/telemetry', telemetry);

app.use(((err, req, res, next) => {
	if (err instanceof ZodError) {
		next(new ApiError(403, err.issues[0].message));
	} else next(err);
}) satisfies ErrorRequestHandler);

app.use(((err, req, res, next) => {
	if (err instanceof ApiError) {
		if (!res.headersSent) res.status(err.status).json({ message: err.message });
	} else {
		console.error(err);
		if (!res.headersSent) res.status(500).json({ message: 'Internal server error' });
	}
}) satisfies ErrorRequestHandler);

app.listen(port, () => {
	console.log(`App listening on port ${port}`);
});
