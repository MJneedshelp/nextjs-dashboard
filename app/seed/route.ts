import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import { customers, invoices, revenue, users } from '../lib/placeholder-data';

const sql = neon(process.env.POSTGRES_URL!);

export async function GET() {
  try {
    const hashedUsers = await Promise.all(
      users.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 10),
      })),
    );

    await sql.transaction((txn) => [
      txn`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
      txn`
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL
        )
      `,
      ...hashedUsers.map(
        (user) => txn`
          INSERT INTO users (id, name, email, password)
          VALUES (${user.id}, ${user.name}, ${user.email}, ${user.password})
          ON CONFLICT (id) DO NOTHING
        `,
      ),
      txn`
        CREATE TABLE IF NOT EXISTS customers (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          image_url VARCHAR(255) NOT NULL
        )
      `,
      ...customers.map(
        (customer) => txn`
          INSERT INTO customers (id, name, email, image_url)
          VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
          ON CONFLICT (id) DO NOTHING
        `,
      ),
      txn`
        CREATE TABLE IF NOT EXISTS invoices (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          customer_id UUID NOT NULL,
          amount INT NOT NULL,
          status VARCHAR(255) NOT NULL,
          date DATE NOT NULL
        )
      `,
      ...invoices.map(
        (invoice) => txn`
          INSERT INTO invoices (customer_id, amount, status, date)
          VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
          ON CONFLICT (id) DO NOTHING
        `,
      ),
      txn`
        CREATE TABLE IF NOT EXISTS revenue (
          month VARCHAR(4) NOT NULL UNIQUE,
          revenue INT NOT NULL
        )
      `,
      ...revenue.map(
        (rev) => txn`
          INSERT INTO revenue (month, revenue)
          VALUES (${rev.month}, ${rev.revenue})
          ON CONFLICT (month) DO NOTHING
        `,
      ),
    ]);

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred';

    return Response.json({ error: message }, { status: 500 });
  }
}
