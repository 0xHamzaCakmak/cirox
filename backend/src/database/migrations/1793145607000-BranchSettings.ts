import type { MigrationInterface, QueryRunner } from 'typeorm';
export class BranchSettings1793145607000 implements MigrationInterface {
  transaction = false;
  async up(runner: QueryRunner) {
    for (const [name, size] of [['legal_name', 255], ['trade_register_no', 64], ['tax_office', 128], ['tax_number', 11], ['contact_email', 128]] as const) {
      if (!await runner.hasColumn('branches', name)) await runner.query(`ALTER TABLE branches ADD ${name} varchar(${size}) NOT NULL DEFAULT ''`);
    }
  }
  async down(runner: QueryRunner) {
    await runner.query('ALTER TABLE branches DROP COLUMN legal_name, DROP COLUMN trade_register_no, DROP COLUMN tax_office, DROP COLUMN tax_number, DROP COLUMN contact_email');
  }
}
