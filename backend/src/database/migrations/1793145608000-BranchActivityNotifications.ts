import type { MigrationInterface, QueryRunner } from 'typeorm';

export class BranchActivityNotifications1793145608000 implements MigrationInterface {
  transaction = false;
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE IF NOT EXISTS branch_events (
      id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
      branch_id varchar(64) NOT NULL, center_company_id varchar(64) NULL, actor_id varchar(64) NULL,
      actor_name varchar(128) NOT NULL, kind varchar(64) NOT NULL,
      tone enum('income','expense','info','warning') NOT NULL,
      title varchar(255) NOT NULL, detail varchar(1024) NOT NULL,
      amount decimal(12,2) NULL, created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      KEY idx_event_branch (branch_id,id), KEY idx_event_center (center_company_id,id),
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
      FOREIGN KEY (center_company_id) REFERENCES companies(id) ON DELETE SET NULL,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await runner.query(`CREATE TABLE IF NOT EXISTS notification_reads (
      user_id varchar(64) NOT NULL, event_id bigint unsigned NOT NULL,
      read_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (user_id,event_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES branch_events(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  async down(runner: QueryRunner) {
    await runner.query('DROP TABLE notification_reads');
    await runner.query('DROP TABLE branch_events');
  }
}
