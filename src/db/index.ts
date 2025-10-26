import { drizzle } from 'drizzle-orm/node-postgres';
import 'dotenv/config';

import * as schema from './schema';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export const table = {
	...schema,
};

export const db = drizzle({
	connection: {
		connectionString: process.env.DATABASE_URL,
	},
	schema: table,
	casing: 'snake_case',
});
