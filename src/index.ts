import telemetry from '#routes/telemetry.js';
import trips from '#routes/trips.js';
import 'dotenv/config';
import express from 'express';

const app = express();
const port = process.env.PORT ?? '3000';

app.use(express.json());

app.use('/api/trips', trips);
app.use('/api/telemetry', telemetry);

app.listen(port, () => {
	console.log(`App listening on port ${port}`);
});
