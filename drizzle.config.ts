import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	out: './drizzle',
	schema: './src/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		url: process.env.DATABASE_URL!,
	},
});
