import { useCallback } from 'react';
import { getDb } from '../../../lib/database';
import { hashPassword, verifyPassword } from '../../../utils/crypto';
import { useAuth } from '../../../contexts/AuthContext';

interface SetupParams {
  fullName: string;
  username: string;
  phone: string;
  password: string;
  securityQuestion: string;
  securityAnswer: string;
}

export function useAuthActions() {
  const { refreshSetupFlag } = useAuth();

  const createInitialAccount = useCallback(async (params: SetupParams): Promise<void> => {
    const db = getDb();
    const pwdHash = await hashPassword(params.password);
    const answerHash = await hashPassword(params.securityAnswer.trim().toLowerCase());

    await db.query(
      `INSERT INTO users (username, password_hash, role, full_name, phone)
       VALUES ($1, $2, 'admin', $3, $4)`,
      [params.username.trim(), pwdHash, params.fullName.trim(), params.phone.trim() || null],
    );

    const userResult = await db.query<{ id: number }>(
      'SELECT id FROM users WHERE username = $1',
      [params.username.trim()],
    );
    const userId = userResult.rows[0].id;

    await db.query(
      `INSERT INTO security_questions (user_id, question, answer_hash)
       VALUES ($1, $2, $3)`,
      [userId, params.securityQuestion.trim(), answerHash],
    );

    await refreshSetupFlag();
  }, [refreshSetupFlag]);

  const getSecurityQuestion = useCallback(async (username: string): Promise<string | null> => {
    const db = getDb();
    const result = await db.query<{ question: string }>(
      `SELECT sq.question FROM security_questions sq
       JOIN users u ON u.id = sq.user_id
       WHERE u.username = $1
       LIMIT 1`,
      [username.trim()],
    );
    return result.rows.length > 0 ? result.rows[0].question : null;
  }, []);

  const resetPassword = useCallback(
    async (username: string, answer: string, newPassword: string): Promise<boolean> => {
      const db = getDb();
      const userResult = await db.query<{ id: number }>(
        'SELECT id FROM users WHERE username = $1',
        [username.trim()],
      );
      if (userResult.rows.length === 0) return false;

      const userId = userResult.rows[0].id;
      const qResult = await db.query<{ answer_hash: string }>(
        'SELECT answer_hash FROM security_questions WHERE user_id = $1 LIMIT 1',
        [userId],
      );
      if (qResult.rows.length === 0) return false;

      const answerHash = await hashPassword(answer.trim().toLowerCase());
      if (answerHash !== qResult.rows[0].answer_hash) return false;

      const newHash = await hashPassword(newPassword);
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2',
        [newHash, userId],
      );
      return true;
    },
    [],
  );

  const changePassword = useCallback(
    async (userId: number, currentPassword: string, newPassword: string): Promise<boolean> => {
      const db = getDb();
      const result = await db.query<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId],
      );
      if (result.rows.length === 0) return false;

      const valid = await verifyPassword(currentPassword, result.rows[0].password_hash);
      if (!valid) return false;

      const newHash = await hashPassword(newPassword);
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2',
        [newHash, userId],
      );
      return true;
    },
    [],
  );

  return {
    createInitialAccount,
    getSecurityQuestion,
    resetPassword,
    changePassword,
  };
}
