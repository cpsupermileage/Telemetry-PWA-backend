import { getTableColumns, sql, SQL } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';

/**
 * https://orm.drizzle.team/docs/guides/upsert
 */
export default function buildConflictUpdateColumns<T extends PgTable | SQLiteTable, Q extends keyof T['_']['columns']>(
	table: T,
	columns: Q[]
) {
	const cls = getTableColumns(table);

	return columns.reduce(
		(acc, column) => {
			const colName = cls[column].name;
			acc[column] = sql.raw(`excluded.${colName}`);

			return acc;
		},
		{} as Record<Q, SQL>
	);
}
