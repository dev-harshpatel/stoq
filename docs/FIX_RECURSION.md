# Fix Infinite Recursion Error

## Problem
You're getting this error:
```
infinite recursion detected in policy for relation "user_profiles"
```

This happens because RLS policies are checking if a user is admin by querying `user_profiles`, which triggers the same policies again, creating infinite recursion.

## Solution

Run the migration `003_fix_rls_recursion.sql` in your Supabase Dashboard.

### Steps:

1. **Go to Supabase Dashboard → SQL Editor**

2. **Copy and paste the ENTIRE contents of `supabase/migrations/003_fix_rls_recursion.sql`**

3. **Click "Run" to execute the SQL**

4. **Verify the function was created:**
   - Go to Database → Functions
   - You should see `is_admin` function

5. **Test by trying to checkout again**

## What This Migration Does

1. **Drops problematic policies** that cause recursion
2. **Creates `is_admin()` function** that bypasses RLS using `SECURITY DEFINER`
3. **Recreates all policies** using the function instead of direct queries

The `SECURITY DEFINER` function runs with postgres user privileges, so it can read from `user_profiles` without triggering RLS policies, breaking the recursion.

## If It Still Doesn't Work

If you still get the error after running the migration:

1. **Check if the function exists:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'is_admin';
   ```
   Should return `is_admin`

2. **Check if policies were dropped:**
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles';
   ```
   Should NOT show "Admins can read all profiles" with the old EXISTS query

3. **Manually drop and recreate:**
   - Drop all policies on user_profiles, inventory, and orders that check admin status
   - Run the migration again

4. **Alternative: Temporarily disable RLS to test:**
   ```sql
   ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
   ```
   (Only for testing - re-enable after fixing!)
