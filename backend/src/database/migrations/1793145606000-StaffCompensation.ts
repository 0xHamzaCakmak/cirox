import type { MigrationInterface, QueryRunner } from 'typeorm';
export class StaffCompensation1793145606000 implements MigrationInterface {
  transaction = false;
  async up(runner: QueryRunner) {
    if (!await runner.hasColumn('staff', 'salary_basis')) {
      await runner.query("ALTER TABLE staff ADD salary_basis enum('daily','monthly') NOT NULL DEFAULT 'monthly', ADD client_request_id varchar(64) NULL UNIQUE, ADD request_hash char(64) NULL");
      await runner.query("UPDATE staff SET salary_basis='daily' WHERE monthly_salary=0 AND daily_wage>0");
      await runner.query("UPDATE staff SET daily_wage=ROUND(monthly_salary/30,2) WHERE salary_basis='monthly'");
      await runner.query("UPDATE staff SET monthly_salary=ROUND(daily_wage*30,2) WHERE salary_basis='daily'");
    }
    if (!await runner.hasColumn('expenses', 'payment_basis')) await runner.query(`ALTER TABLE expenses
      ADD payment_basis enum('daily','monthly') NULL, ADD staff_payment_type enum('yevmiye','maas','avans','prim') NULL,
      ADD staff_name_snapshot varchar(128) NULL, ADD staff_daily_wage_snapshot decimal(10,2) NULL,
      ADD staff_monthly_salary_snapshot decimal(10,2) NULL`);
    await runner.query(`UPDATE expenses e JOIN staff s ON s.id=e.staff_id SET e.staff_name_snapshot=s.full_name WHERE e.staff_name_snapshot IS NULL`);
  }
  async down(runner: QueryRunner) {
    await runner.query('ALTER TABLE expenses DROP COLUMN payment_basis, DROP COLUMN staff_payment_type, DROP COLUMN staff_name_snapshot, DROP COLUMN staff_daily_wage_snapshot, DROP COLUMN staff_monthly_salary_snapshot');
    await runner.query('ALTER TABLE staff DROP COLUMN salary_basis, DROP COLUMN client_request_id, DROP COLUMN request_hash');
  }
}
