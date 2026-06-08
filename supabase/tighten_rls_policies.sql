-- 1. 收紧 Profiles 表的权限
DROP POLICY IF EXISTS "Allow authenticated users full access to profiles" ON public.profiles;

CREATE POLICY "Allow users to view all profiles" 
ON public.profiles FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to update only their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- 2. 收紧 Partner Records 表的权限 (彻底解决私密理由网络查看泄漏的问题)
DROP POLICY IF EXISTS "Allow authenticated users full access to partner_records" ON public.partner_records;

CREATE POLICY "Allow users to view public records or their own records" 
ON public.partner_records FOR SELECT 
USING (
  creator_id = auth.uid() 
  OR is_secret = false
);

CREATE POLICY "Allow users to manage their own records" 
ON public.partner_records FOR ALL 
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());


-- 3. 收紧 Partner Preferences 表的权限
DROP POLICY IF EXISTS "Allow authenticated users full access to partner_preferences" ON public.partner_preferences;

CREATE POLICY "Allow users to view all partner preferences" 
ON public.partner_preferences FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to manage only their own preferences row" 
ON public.partner_preferences FOR ALL 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());


-- 4. 收紧 Whispers 表的权限
DROP POLICY IF EXISTS "Allow authenticated users full access to whispers" ON public.whispers;

CREATE POLICY "Allow users to view all whispers" 
ON public.whispers FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to manage their own whispers" 
ON public.whispers FOR ALL 
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());


-- 5. 收紧 Tasks 表的权限
DROP POLICY IF EXISTS "Allow authenticated users full access to tasks" ON public.tasks;

CREATE POLICY "Allow users to view all tasks" 
ON public.tasks FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to manage their own tasks" 
ON public.tasks FOR ALL 
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());
