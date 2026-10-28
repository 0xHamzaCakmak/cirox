import type { MigrationInterface, QueryRunner } from 'typeorm';
export class Expenses1793145604000 implements MigrationInterface {
  transaction = false;
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE IF NOT EXISTS expense_categories (
      id varchar(64) PRIMARY KEY, company_id varchar(64) NULL, name varchar(128) NOT NULL,
      type enum('single','staff_based') NOT NULL DEFAULT 'single', icon_name varchar(64) NOT NULL DEFAULT 'Receipt',
      description text NOT NULL, default_vat_rate int NOT NULL DEFAULT 20, is_system boolean NOT NULL DEFAULT false,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    const categories = [
      ['cat-1', 'Personel', 'staff_based', 'Users', 0], ['cat-2', 'Kasap & Et Ürünleri', 'single', 'Beef', 1],
      ['cat-3', 'İçecek & Meşrubat', 'single', 'Coffee', 10], ['cat-4', 'Sebze & Meyve (Hal)', 'single', 'Apple', 1],
      ['cat-5', 'Temizlik & Hijyen', 'single', 'Sparkles', 20], ['cat-6', 'Nakliye & Lojistik', 'single', 'Truck', 20],
      ['cat-7', 'Kira & Ortak Alan', 'single', 'Building2', 20], ['cat-8', 'Elektrik & Doğalgaz & Su', 'single', 'Zap', 20],
      ['cat-9', 'Diğer Genel Giderler', 'single', 'MoreHorizontal', 20],
    ];
    for (const [id, name, type, icon, vat] of categories) await runner.query(`INSERT IGNORE INTO expense_categories
      (id,name,type,icon_name,default_vat_rate,description,is_system) VALUES (?,?,?,?,?,'',true)`, [id, name, type, icon, vat]);
    await runner.query(`CREATE TABLE IF NOT EXISTS staff (
      id varchar(64) PRIMARY KEY, company_id varchar(64) NOT NULL, branch_id varchar(64) NOT NULL,
      full_name varchar(128) NOT NULL, role varchar(64) NOT NULL, daily_wage decimal(10,2) NOT NULL DEFAULT 0,
      monthly_salary decimal(10,2) NOT NULL DEFAULT 0, status enum('active','passive') NOT NULL DEFAULT 'active',
      phone varchar(32) NOT NULL DEFAULT '', hire_date date NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      KEY idx_staff_scope (company_id,branch_id),
      FOREIGN KEY (branch_id,company_id) REFERENCES branches(id,company_id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await runner.query(`CREATE TABLE IF NOT EXISTS expenses (
      id varchar(64) PRIMARY KEY, client_request_id varchar(64) NOT NULL UNIQUE, request_hash char(64) NOT NULL,
      company_id varchar(64) NOT NULL, branch_id varchar(64) NOT NULL, category_id varchar(64) NOT NULL,
      date date NOT NULL, amount decimal(12,2) NOT NULL, vat_rate int NOT NULL DEFAULT 0,
      description text NOT NULL, receipt_number varchar(128) NULL, staff_id varchar(64) NULL, submitted_by varchar(64) NOT NULL,
      deleted_at datetime(3) NULL, deleted_by varchar(64) NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      KEY idx_expense_scope (company_id,branch_id,date,deleted_at),
      FOREIGN KEY (branch_id,company_id) REFERENCES branches(id,company_id) ON DELETE RESTRICT,
      FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE RESTRICT,
      FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT chk_expense_amount CHECK (amount > 0), CONSTRAINT chk_expense_vat CHECK (vat_rate IN (0,1,10,20))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    if (!await runner.hasColumn('receipt_files', 'expense_id')) await runner.query(`ALTER TABLE receipt_files ADD expense_id varchar(64) NULL,
      ADD KEY idx_receipt_expense (expense_id), ADD CONSTRAINT fk_receipt_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE RESTRICT,
      ADD CONSTRAINT chk_receipt_single_record CHECK (revenue_id IS NULL OR expense_id IS NULL)`);
  }
  async down(runner: QueryRunner) {
    await runner.query('ALTER TABLE receipt_files DROP CHECK chk_receipt_single_record, DROP FOREIGN KEY fk_receipt_expense, DROP COLUMN expense_id');
    await runner.query('DROP TABLE expenses'); await runner.query('DROP TABLE staff'); await runner.query('DROP TABLE expense_categories');
  }
}
