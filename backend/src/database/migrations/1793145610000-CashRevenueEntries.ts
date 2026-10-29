import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CashRevenueEntries1793145610000 implements MigrationInterface {
  transaction = false;
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE IF NOT EXISTS cash_revenue_entries (
      id varchar(64) NOT NULL PRIMARY KEY, revenue_id varchar(64) NOT NULL, company_id varchar(64) NOT NULL,
      branch_id varchar(64) NOT NULL, record_date date NOT NULL,
      kind enum('banknotes','manual_adjustment','opening_balance') NOT NULL,
      amount decimal(12,2) NOT NULL, banknotes json NULL, actor_id varchar(64) NULL, actor_name varchar(128) NOT NULL,
      note varchar(1000) NOT NULL DEFAULT '', client_request_id varchar(64) NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_cash_request (branch_id,client_request_id), KEY idx_cash_day (branch_id,record_date,created_at),
      FOREIGN KEY (revenue_id) REFERENCES daily_revenues(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await runner.query(`INSERT INTO cash_revenue_entries (id,revenue_id,company_id,branch_id,record_date,kind,amount,actor_id,actor_name,note,created_at)
      SELECT UUID(),r.id,r.company_id,r.branch_id,r.date,'opening_balance',r.cash,r.submitted_by,u.name,
      'Banknot detayı olmayan mevcut nakit bakiyesi',r.updated_at FROM daily_revenues r
      JOIN users u ON u.id=r.submitted_by LEFT JOIN cash_revenue_entries e ON e.revenue_id=r.id
      WHERE r.cash>0 AND e.id IS NULL`);
  }
  async down(runner: QueryRunner) { await runner.query('DROP TABLE cash_revenue_entries'); }
}
