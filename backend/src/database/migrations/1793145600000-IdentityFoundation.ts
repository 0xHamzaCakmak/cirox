import type { MigrationInterface, QueryRunner } from 'typeorm';

export class IdentityFoundation1793145600000 implements MigrationInterface {
  // MySQL DDL commits implicitly. IF NOT EXISTS allows an interrupted migration to be retried.
  transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS companies (
      id varchar(64) PRIMARY KEY,
      name varchar(255) NOT NULL, code varchar(32) NOT NULL UNIQUE,
      sector varchar(128) NOT NULL, owner_name varchar(128) NOT NULL,
      owner_email varchar(128) NOT NULL, owner_phone varchar(32) NOT NULL DEFAULT '',
      tax_number varchar(32) NULL, tax_office varchar(128) NULL,
      status enum('active','passive','trial','past_due') NOT NULL DEFAULT 'active',
      plan_tier enum('starter','growth','enterprise') NOT NULL DEFAULT 'growth',
      plan_name varchar(64) NOT NULL DEFAULT 'Growth',
      license_price decimal(12,2) NOT NULL DEFAULT 0,
      billing_cycle enum('monthly','yearly') NOT NULL DEFAULT 'monthly',
      billing_method enum('credit_card','bank_transfer','manual') NOT NULL DEFAULT 'bank_transfer',
      branch_limit int NOT NULL DEFAULT 5,
      start_date date NOT NULL, next_billing_date date NOT NULL,
      auto_renew boolean NOT NULL DEFAULT false, notes text NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      CONSTRAINT chk_company_branch_limit CHECK (branch_limit > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS branches (
      id varchar(64) PRIMARY KEY, company_id varchar(64) NOT NULL,
      code varchar(32) NOT NULL, name varchar(128) NOT NULL,
      city varchar(64) NOT NULL DEFAULT '', district varchar(64) NOT NULL DEFAULT '',
      manager_name varchar(128) NOT NULL, phone varchar(32) NOT NULL DEFAULT '',
      status enum('active','review','passive') NOT NULL DEFAULT 'active',
      royalty_rate decimal(5,2) NOT NULL DEFAULT 0,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_branch_code_per_company (company_id, code),
      UNIQUE KEY uq_branch_tenant (id, company_id),
      CONSTRAINT fk_branch_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS users (
      id varchar(64) PRIMARY KEY, company_id varchar(64) NULL, branch_id varchar(64) NULL,
      name varchar(128) NOT NULL, email varchar(128) NOT NULL UNIQUE,
      password_hash varchar(255) NOT NULL,
      role enum('admin','merkez','sube') NOT NULL, title varchar(128) NOT NULL DEFAULT '',
      phone varchar(32) NOT NULL DEFAULT '', active boolean NOT NULL DEFAULT true,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      CONSTRAINT fk_user_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
      CONSTRAINT fk_user_branch_tenant FOREIGN KEY (branch_id, company_id) REFERENCES branches(id, company_id) ON DELETE RESTRICT,
      CONSTRAINT chk_user_scope CHECK (
        (role = 'admin' AND company_id IS NULL AND branch_id IS NULL) OR
        (role = 'merkez' AND company_id IS NOT NULL AND branch_id IS NULL) OR
        (role = 'sube' AND company_id IS NOT NULL AND branch_id IS NOT NULL)
      )
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS auth_sessions (
      id varchar(64) PRIMARY KEY, user_id varchar(64) NOT NULL,
      expires_at datetime(3) NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      KEY idx_session_expiry (expires_at), KEY idx_session_user (user_id),
      CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['auth_sessions', 'users', 'branches', 'companies']) {
      await queryRunner.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
  }
}
