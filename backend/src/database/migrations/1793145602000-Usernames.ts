import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Usernames1793145602000 implements MigrationInterface {
  transaction = false;
  async up(runner: QueryRunner): Promise<void> {
    if (!await runner.hasColumn('users', 'username')) {
      await runner.query('ALTER TABLE users ADD username varchar(32) NULL, ADD UNIQUE KEY uq_user_username (username)');
    }
    const existing: { username: string }[] = await runner.query('SELECT username FROM users WHERE username IS NOT NULL');
    const reserved = new Set(existing.map(user => user.username.toLowerCase()));
    const users: { id: string; code: string }[] = await runner.query(`SELECT u.id, b.code FROM users u
      JOIN branches b ON b.id = u.branch_id WHERE u.username IS NULL AND u.role = 'sube' ORDER BY u.created_at, u.id`);
    for (const user of users) {
      const code = user.code.trim().toLowerCase();
      let username = /^[a-z0-9_.-]{3,32}$/.test(code) && !reserved.has(code) ? code : '';
      if (!username) {
        const base = 'isletme_' + user.id.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 20);
        username = base;
        let suffix = 1;
        while (reserved.has(username)) username = base + '_' + suffix++;
      }
      await runner.query('UPDATE users SET username = ? WHERE id = ? AND username IS NULL', [username, user.id]);
      reserved.add(username);
    }
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE users DROP COLUMN username');
  }
}
