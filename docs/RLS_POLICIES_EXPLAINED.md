# Row Level Security (RLS) Policies Explained

## What is RLS?

Row Level Security (RLS) is a PostgreSQL feature that allows you to control which rows users can see, insert, update, or delete based on policies you define. In Supabase, RLS is enabled on tables to ensure data security.

## How RLS Works

When RLS is enabled on a table:
1. **By default, NO ONE can access the table** (not even the table owner)
2. You must create **policies** that explicitly allow access
3. Policies are evaluated for **each row** in the table
4. If a row matches **ANY** policy, the user can access it

## Policy Types

### SELECT Policies (Reading Data)
- Multiple SELECT policies are combined with **OR**
- If a user matches ANY SELECT policy, they can see that row
- Example: If you have "Users see own orders" OR "Admins see all orders", an admin will see all orders

### INSERT Policies
- Uses `WITH CHECK` clause
- Validates data before insertion
- Example: `WITH CHECK (auth.uid() = user_id)` ensures users can only insert orders with their own user_id

### UPDATE Policies
- Uses both `USING` (to check existing row) and `WITH CHECK` (to validate new values)
- Example: `USING (is_admin(auth.uid()))` allows admins to update any row

### DELETE Policies
- Uses `USING` clause
- Determines which rows can be deleted
- Example: `USING (is_admin(auth.uid()))` allows only admins to delete

## Our Orders Table Policies

### Policy 1: "Users can insert own orders"
```sql
CREATE POLICY "Users can insert own orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```
**Meaning:** Authenticated users can create orders, but only if the `user_id` matches their own ID.

### Policy 2: "Users can read own orders"
```sql
CREATE POLICY "Users can read own orders"
ON orders FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```
**Meaning:** Users can see orders where `user_id` equals their own ID.

### Policy 3: "Admins can read all orders"
```sql
CREATE POLICY "Admins can read all orders"
ON orders FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));
```
**Meaning:** If `is_admin()` returns true for the current user, they can see ALL orders.

**Key Point:** Policies 2 and 3 are combined with OR. So:
- Regular users: See only their own orders (Policy 2 matches)
- Admins: See ALL orders (Policy 3 matches, which includes their own + everyone else's)

### Policy 4: "Admins can update all orders"
```sql
CREATE POLICY "Admins can update all orders"
ON orders FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
```
**Meaning:** Only admins can update orders. Regular users cannot update any orders.

### Policy 5: "Admins can delete orders"
```sql
CREATE POLICY "Admins can delete orders"
ON orders FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));
```
**Meaning:** Only admins can delete orders.

## Why We Use `is_admin()` Function

### The Problem (Infinite Recursion)
If we wrote the policy like this:
```sql
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
```

This would cause infinite recursion because:
1. Policy checks if user is admin by querying `user_profiles`
2. That query triggers RLS on `user_profiles`
3. The `user_profiles` policy checks if user is admin by querying `user_profiles`
4. This creates an infinite loop! 🔄

### The Solution (SECURITY DEFINER Function)
```sql
CREATE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = check_user_id 
      AND user_profiles.role = 'admin'
  );
END;
$$;
```

**`SECURITY DEFINER`** means:
- The function runs with the privileges of the function creator (postgres user)
- It **bypasses RLS** completely
- No infinite recursion!

## Troubleshooting: Why Can't Admin See All Orders?

### Check 1: Is the user actually an admin?
```sql
-- Run this in Supabase SQL Editor (replace with your user ID)
SELECT user_id, role FROM user_profiles WHERE user_id = 'YOUR_USER_ID';
-- Should return: role = 'admin'
```

### Check 2: Does is_admin() work?
```sql
-- Run this in Supabase SQL Editor
SELECT is_admin('YOUR_USER_ID');
-- Should return: true
```

### Check 3: Are the policies correct?
```sql
-- Check all policies on orders table
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'orders';
```

### Check 4: Test as the admin user
```sql
-- This should return all 4 orders if you're logged in as admin
SELECT COUNT(*) FROM orders;
SELECT * FROM orders;
```

## Common Issues

### Issue 1: Only seeing 2 orders instead of 4
**Cause:** The admin user's profile might not have `role = 'admin'`, or the `is_admin()` function isn't working.

**Fix:** 
1. Verify admin profile: `SELECT * FROM user_profiles WHERE role = 'admin';`
2. Run migration 005 to recreate policies
3. Refresh the page

### Issue 2: Can't update orders
**Cause:** The update policy might not be using `is_admin()` correctly.

**Fix:** Ensure Policy 4 uses `is_admin(auth.uid())` in both `USING` and `WITH CHECK`.

### Issue 3: Infinite recursion error
**Cause:** Policies are directly querying `user_profiles` instead of using `is_admin()` function.

**Fix:** Run migration 003 to create the function and update all policies.

## Best Practices

1. **Always use functions for role checks** - Prevents recursion
2. **Test policies after creating them** - Verify they work as expected
3. **Use SECURITY DEFINER carefully** - Only for trusted functions
4. **Combine policies with OR for SELECT** - Multiple policies = broader access
5. **Use AND logic within a policy** - Multiple conditions in one policy = stricter access

## Summary

- **RLS = Security layer** that controls row-level access
- **Policies = Rules** that define who can do what
- **SELECT policies = OR logic** (match any = can see)
- **Functions with SECURITY DEFINER = Bypass RLS** (prevents recursion)
- **Admin access = Check role via function, not direct query**
