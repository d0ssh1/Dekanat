-- =====================================================================
-- Безопасность на уровне БД (второй слой защиты, docs/architecture.md §5.2)
--
-- Приложение подключается ролью app_user: она не владелец таблиц
-- и не имеет BYPASSRLS, поэтому политики ниже действуют всегда.
-- Каждый запрос DAL выполняется в транзакции, где заданы:
--   app.user_id — id пользователя из сессии
--   app.role    — student | staff | system | auth | anon
-- Нет контекста → роль anon → личные строки не видны (ошибка = закрыто).
-- =====================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.user_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.role() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('app.role', true), ''), 'anon') $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.is_privileged() RETURNS boolean
  LANGUAGE sql STABLE AS $$ SELECT app.role() IN ('staff', 'system') $$;
--> statement-breakpoint

-- ---------- Права на таблицы (минимально необходимые) ----------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public, app TO app_user;
--> statement-breakpoint
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO app_user;
--> statement-breakpoint
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_user;
--> statement-breakpoint
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
--> statement-breakpoint
GRANT UPDATE (password_hash, last_login_at) ON users TO app_user;
--> statement-breakpoint
GRANT INSERT, UPDATE, DELETE ON sessions, login_attempts TO app_user;
--> statement-breakpoint
GRANT UPDATE (email, avatar_color) ON students TO app_user;
--> statement-breakpoint
GRANT INSERT, UPDATE, DELETE ON scores, final_grades TO app_user;
--> statement-breakpoint
GRANT INSERT, UPDATE ON requests TO app_user;
--> statement-breakpoint
GRANT INSERT ON request_events TO app_user;
--> statement-breakpoint
GRANT INSERT, UPDATE ON request_requirements TO app_user;
--> statement-breakpoint
GRANT INSERT, DELETE ON attachments TO app_user;
--> statement-breakpoint
GRANT INSERT ON issued_documents TO app_user;
--> statement-breakpoint
GRANT INSERT, UPDATE, DELETE ON notifications TO app_user;
--> statement-breakpoint
GRANT INSERT ON announcements TO app_user;
--> statement-breakpoint
GRANT INSERT, UPDATE, DELETE ON home_layouts, user_prefs, assistant_messages TO app_user;
--> statement-breakpoint
GRANT INSERT ON audit_log TO app_user;
--> statement-breakpoint
GRANT INSERT, UPDATE ON lessons TO app_user;
--> statement-breakpoint

-- ---------- Учётные записи и сессии: только слой входа ----------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY users_select ON users FOR SELECT TO app_user
  USING (id = app.user_id() OR app.role() IN ('auth', 'system'));
--> statement-breakpoint
CREATE POLICY users_update ON users FOR UPDATE TO app_user
  USING (id = app.user_id() OR app.role() IN ('auth', 'system'))
  WITH CHECK (id = app.user_id() OR app.role() IN ('auth', 'system'));
--> statement-breakpoint
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY sessions_all ON sessions FOR ALL TO app_user
  USING (app.role() = 'auth' OR user_id = app.user_id())
  WITH CHECK (app.role() = 'auth' OR user_id = app.user_id());
--> statement-breakpoint
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY login_attempts_all ON login_attempts FOR ALL TO app_user
  USING (app.role() = 'auth') WITH CHECK (app.role() = 'auth');
--> statement-breakpoint

-- ---------- Профили ----------
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY students_select ON students FOR SELECT TO app_user
  USING (user_id = app.user_id() OR app.is_privileged());
--> statement-breakpoint
CREATE POLICY students_update ON students FOR UPDATE TO app_user
  USING (user_id = app.user_id()) WITH CHECK (user_id = app.user_id());
--> statement-breakpoint
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY staff_select ON staff FOR SELECT TO app_user
  USING (user_id = app.user_id() OR app.is_privileged());
--> statement-breakpoint

-- ---------- Успеваемость: студент читает своё, пишет только сотрудник ----------
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY scores_select ON scores FOR SELECT TO app_user
  USING (student_id = app.user_id() OR app.is_privileged());
--> statement-breakpoint
CREATE POLICY scores_write ON scores FOR ALL TO app_user
  USING (app.is_privileged()) WITH CHECK (app.is_privileged());
--> statement-breakpoint
ALTER TABLE final_grades ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY final_grades_select ON final_grades FOR SELECT TO app_user
  USING (student_id = app.user_id() OR app.is_privileged());
--> statement-breakpoint
CREATE POLICY final_grades_write ON final_grades FOR ALL TO app_user
  USING (app.is_privileged()) WITH CHECK (app.is_privileged());
--> statement-breakpoint

-- ---------- Заявки ----------
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY requests_select ON requests FOR SELECT TO app_user
  USING (student_id = app.user_id() OR app.is_privileged());
--> statement-breakpoint
CREATE POLICY requests_insert ON requests FOR INSERT TO app_user
  WITH CHECK ((student_id = app.user_id() AND app.role() = 'student') OR app.is_privileged());
--> statement-breakpoint
CREATE POLICY requests_update ON requests FOR UPDATE TO app_user
  USING (student_id = app.user_id() OR app.is_privileged())
  WITH CHECK (student_id = app.user_id() OR app.is_privileged());
--> statement-breakpoint
ALTER TABLE request_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY request_events_select ON request_events FOR SELECT TO app_user
  USING (student_id = app.user_id() OR app.is_privileged());
--> statement-breakpoint
CREATE POLICY request_events_insert ON request_events FOR INSERT TO app_user
  WITH CHECK (student_id = app.user_id() OR app.is_privileged());
--> statement-breakpoint
ALTER TABLE request_requirements ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY request_requirements_all ON request_requirements FOR ALL TO app_user
  USING (student_id = app.user_id() OR app.is_privileged())
  WITH CHECK (student_id = app.user_id() OR app.is_privileged());
--> statement-breakpoint
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY attachments_all ON attachments FOR ALL TO app_user
  USING (student_id = app.user_id() OR app.is_privileged())
  WITH CHECK (student_id = app.user_id() OR app.is_privileged());
--> statement-breakpoint
ALTER TABLE issued_documents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY issued_documents_select ON issued_documents FOR SELECT TO app_user
  USING (student_id = app.user_id() OR app.is_privileged());
--> statement-breakpoint
CREATE POLICY issued_documents_insert ON issued_documents FOR INSERT TO app_user
  WITH CHECK (app.is_privileged());
--> statement-breakpoint

-- ---------- Уведомления ----------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY notifications_select ON notifications FOR SELECT TO app_user
  USING (user_id = app.user_id() OR app.role() = 'system');
--> statement-breakpoint
CREATE POLICY notifications_insert ON notifications FOR INSERT TO app_user
  WITH CHECK (user_id = app.user_id() OR app.is_privileged());
--> statement-breakpoint
CREATE POLICY notifications_update ON notifications FOR UPDATE TO app_user
  USING (user_id = app.user_id()) WITH CHECK (user_id = app.user_id());
--> statement-breakpoint
CREATE POLICY notifications_delete ON notifications FOR DELETE TO app_user
  USING (user_id = app.user_id());
--> statement-breakpoint
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY announcements_select ON announcements FOR SELECT TO app_user USING (true);
--> statement-breakpoint
CREATE POLICY announcements_insert ON announcements FOR INSERT TO app_user WITH CHECK (app.is_privileged());
--> statement-breakpoint

-- ---------- Личные настройки и помощник: строго свои ----------
ALTER TABLE home_layouts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY home_layouts_own ON home_layouts FOR ALL TO app_user
  USING (user_id = app.user_id()) WITH CHECK (user_id = app.user_id());
--> statement-breakpoint
ALTER TABLE user_prefs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY user_prefs_own ON user_prefs FOR ALL TO app_user
  USING (user_id = app.user_id()) WITH CHECK (user_id = app.user_id());
--> statement-breakpoint
ALTER TABLE assistant_messages ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY assistant_messages_own ON assistant_messages FOR ALL TO app_user
  USING (user_id = app.user_id()) WITH CHECK (user_id = app.user_id());
--> statement-breakpoint

-- ---------- Аудит: писать может каждый про себя, читать — только сотрудник ----------
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY audit_log_insert ON audit_log FOR INSERT TO app_user
  WITH CHECK (actor_user_id IS NOT DISTINCT FROM app.user_id() OR app.role() IN ('auth', 'staff', 'system'));
--> statement-breakpoint
CREATE POLICY audit_log_select ON audit_log FOR SELECT TO app_user USING (app.is_privileged());
--> statement-breakpoint

-- ---------- Расписание: общее для группы (не личные данные), менять может только сотрудник ----------
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY lessons_select ON lessons FOR SELECT TO app_user USING (true);
--> statement-breakpoint
CREATE POLICY lessons_insert ON lessons FOR INSERT TO app_user WITH CHECK (app.is_privileged());
--> statement-breakpoint
CREATE POLICY lessons_update ON lessons FOR UPDATE TO app_user
  USING (app.is_privileged()) WITH CHECK (app.is_privileged());
--> statement-breakpoint

-- ---------- Публичная проверка справки по QR ----------
-- Страница /verify не читает таблицы: она вызывает эту функцию и получает минимум
-- (номер, тип, даты и инициалы), а не профиль студента.
CREATE OR REPLACE FUNCTION app.verify_document(p_code text)
RETURNS TABLE (number integer, title text, issued_at timestamptz, valid_until date, holder text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT r.number, dt.title, d.issued_at, d.valid_until,
         s.last_name || ' ' || left(s.first_name, 1) || '.' || coalesce(' ' || left(s.middle_name, 1) || '.', '')
  FROM issued_documents d
  JOIN requests r ON r.id = d.request_id
  JOIN document_types dt ON dt.code = r.type_code
  JOIN students s ON s.user_id = d.student_id
  WHERE d.verify_code = p_code AND length(p_code) >= 16
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.verify_document(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.verify_document(text) TO app_user;
