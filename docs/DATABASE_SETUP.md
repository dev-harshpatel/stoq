# Database Setup Instructions for Supabase

## Issue
The error "Could not find the 'items' column of 'orders' in the schema cache" indicates that the `orders` table either doesn't exist or has a different structure than expected.

## Solution

### Step 1: Create the Orders Table in Supabase

Go to your Supabase Dashboard → SQL Editor and run the SQL from:
- `supabase/create_orders_table.sql`

Or copy and paste this SQL directly:

```sql
-- CreateTable
CREATE TABLE IF NOT EXISTS "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "total_price" NUMERIC(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex (optional, for better query performance)
CREATE INDEX IF NOT EXISTS "orders_user_id_idx" ON "orders"("user_id");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");
CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders"("created_at");
```

### Step 2: Verify the Table Was Created

After running the SQL, verify in Supabase:
1. Go to Table Editor
2. Check that the `orders` table exists
3. Verify all columns are present: `id`, `user_id`, `username`, `items`, `total_price`, `status`, `created_at`, `updated_at`

### Step 3: Update Row Level Security (RLS) Policies

In Supabase, you may need to set up RLS policies for the orders table:

```sql
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own orders
CREATE POLICY "Users can insert their own orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can view their own orders
CREATE POLICY "Users can view their own orders"
ON orders FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

-- Policy: Admins can view all orders (adjust role check as needed)
CREATE POLICY "Admins can view all orders"
ON orders FOR SELECT
TO authenticated
USING (true); -- Adjust this based on your admin role logic
```

## Schema Structure

### Orders Table
- `id` (TEXT, PRIMARY KEY)
- `user_id` (TEXT, NOT NULL) - The Supabase auth user ID
- `username` (TEXT, NOT NULL) - Display name
- `items` (JSONB, NOT NULL) - Array of order items
- `total_price` (NUMERIC(10,2), NOT NULL)
- `status` (TEXT, NOT NULL) - "pending", "approved", "rejected", "completed"
- `created_at` (TIMESTAMP, DEFAULT NOW())
- `updated_at` (TIMESTAMP, NOT NULL)

### Items JSON Structure
The `items` column stores an array of objects:
```json
[
  {
    "item": {
      "id": "string",
      "deviceName": "string",
      "brand": "string",
      "grade": "A|B|C",
      "storage": "string",
      "quantity": 0,
      "pricePerUnit": 0.00,
      "lastUpdated": "string",
      "priceChange": "up|down|stable|null"
    },
    "quantity": 1
  }
]
```

## Troubleshooting

1. **If the table already exists with different columns:**
   - Check the actual column names in Supabase
   - Update `src/lib/database.types.ts` to match the actual schema
   - Or drop and recreate the table (⚠️ this will delete all data)

2. **If you get permission errors:**
   - Check RLS policies in Supabase
   - Ensure your service role key has proper permissions
   - Check that authenticated users have INSERT permission

3. **If items column type is wrong:**
   - Ensure it's JSONB, not JSON or TEXT
   - JSONB provides better querying capabilities

## Next Steps

After creating the table:
1. Test creating an order from the cart
2. Verify orders appear in the admin dashboard
3. Test order approval flow
