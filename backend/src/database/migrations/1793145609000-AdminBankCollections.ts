import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminBankCollections1793145609000 implements MigrationInterface {
  transaction = false;
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE IF NOT EXISTS admin_bank_accounts (
      id varchar(64) NOT NULL PRIMARY KEY, bank_name varchar(128) NOT NULL, account_name varchar(255) NOT NULL,
      iban varchar(26) NOT NULL, branch_code varchar(128) NOT NULL DEFAULT '', currency char(3) NOT NULL DEFAULT 'TRY',
      notes varchar(1000) NOT NULL DEFAULT '', is_active boolean NOT NULL DEFAULT true,
      created_by varchar(64) NULL, created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_admin_bank_iban (iban), FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await runner.query(`CREATE TABLE IF NOT EXISTS subscription_payments (
      id varchar(64) NOT NULL PRIMARY KEY, company_id varchar(64) NOT NULL, company_name varchar(255) NOT NULL,
      bank_account_id varchar(64) NULL, amount decimal(12,2) NOT NULL, currency char(3) NOT NULL DEFAULT 'TRY',
      method enum('bank_transfer','credit_card','manual') NOT NULL, paid_date date NOT NULL,
      receipt_number varchar(128) NOT NULL DEFAULT '', description varchar(2000) NOT NULL DEFAULT '',
      renew_license boolean NOT NULL, renewed_until date NULL, recorded_by varchar(64) NULL,
      recorded_by_name varchar(128) NOT NULL, client_request_id varchar(64) NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_payment_request (recorded_by,client_request_id), KEY idx_payment_bank (bank_account_id,paid_date),
      KEY idx_payment_company (company_id,paid_date),
      FOREIGN KEY (company_id) REFERENCES companies(id), FOREIGN KEY (bank_account_id) REFERENCES admin_bank_accounts(id),
      FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  async down(runner: QueryRunner) {
    await runner.query('DROP TABLE subscription_payments');
    await runner.query('DROP TABLE admin_bank_accounts');
  }
}
