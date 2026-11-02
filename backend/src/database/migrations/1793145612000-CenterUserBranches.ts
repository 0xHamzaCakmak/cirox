import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CenterUserBranches1793145612000 implements MigrationInterface {
  transaction = false;
  async up(runner: QueryRunner) {
    if (!await runner.hasColumn('users', 'center_branch_access')) {
      await runner.query("ALTER TABLE users ADD center_branch_access enum('all','selected') NOT NULL DEFAULT 'selected'");
      // Preserve existing center accounts until an admin narrows their access.
      await runner.query("UPDATE users SET center_branch_access='all' WHERE role='merkez'");
    }
    await runner.query(`CREATE TABLE IF NOT EXISTS center_user_branches (
      user_id varchar(64) NOT NULL, branch_id varchar(64) NOT NULL,
      PRIMARY KEY (user_id,branch_id), KEY idx_center_user_branch (branch_id),
      CONSTRAINT fk_center_user_branch_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_center_user_branch_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  async down(runner: QueryRunner) {
    await runner.query('DROP TABLE IF EXISTS center_user_branches');
    await runner.query('ALTER TABLE users DROP COLUMN center_branch_access');
  }
}
