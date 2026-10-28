import type { MigrationInterface, QueryRunner } from 'typeorm';
export class RevenueReceipts1793145603000 implements MigrationInterface {
  transaction = false;
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE IF NOT EXISTS daily_revenues (
      id varchar(64) PRIMARY KEY, company_id varchar(64) NOT NULL, branch_id varchar(64) NOT NULL,
      date date NOT NULL, credit_card decimal(12,2) NOT NULL DEFAULT 0, cash decimal(12,2) NOT NULL DEFAULT 0,
      online decimal(12,2) NOT NULL DEFAULT 0, other decimal(12,2) NOT NULL DEFAULT 0,
      total decimal(12,2) GENERATED ALWAYS AS (credit_card + cash + online + other) STORED,
      notes text NOT NULL, submitted_by varchar(64) NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_branch_daily_revenue (branch_id,date), KEY idx_revenue_scope (company_id,branch_id,date),
      CONSTRAINT fk_revenue_branch FOREIGN KEY (branch_id,company_id) REFERENCES branches(id,company_id) ON DELETE RESTRICT,
      CONSTRAINT fk_revenue_user FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT chk_revenue_amounts CHECK (credit_card >= 0 AND cash >= 0 AND online >= 0 AND other >= 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await runner.query(`CREATE TABLE IF NOT EXISTS receipt_files (
      id varchar(64) PRIMARY KEY, company_id varchar(64) NOT NULL, branch_id varchar(64) NOT NULL,
      revenue_id varchar(64) NULL, bucket varchar(128) NOT NULL, object_key varchar(500) NOT NULL UNIQUE,
      file_name varchar(255) NOT NULL, byte_size int NOT NULL, uploaded_by varchar(64) NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      KEY idx_receipt_scope (company_id,branch_id), KEY idx_receipt_revenue (revenue_id),
      CONSTRAINT fk_receipt_branch FOREIGN KEY (branch_id,company_id) REFERENCES branches(id,company_id) ON DELETE RESTRICT,
      CONSTRAINT fk_receipt_revenue FOREIGN KEY (revenue_id) REFERENCES daily_revenues(id) ON DELETE RESTRICT,
      CONSTRAINT fk_receipt_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  async down(runner: QueryRunner) {
    await runner.query('DROP TABLE receipt_files');
    await runner.query('DROP TABLE daily_revenues');
  }
}
