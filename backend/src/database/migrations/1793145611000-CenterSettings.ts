import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CenterSettings1793145611000 implements MigrationInterface {
  transaction = false;
  async up(runner: QueryRunner) {
    for (const [name, size] of [['legal_name', 255], ['trade_register_no', 64], ['tax_office', 128], ['tax_number', 11], ['contact_email', 128], ['phone', 32]] as const) {
      if (!await runner.hasColumn('companies', name)) await runner.query(`ALTER TABLE companies ADD ${name} varchar(${size}) NOT NULL DEFAULT ''`);
    }
    await runner.query("UPDATE companies SET legal_name = name, contact_email = owner_email, phone = owner_phone");
  }
  async down(runner: QueryRunner) {
    await runner.query('ALTER TABLE companies DROP COLUMN legal_name, DROP COLUMN trade_register_no, DROP COLUMN tax_office, DROP COLUMN tax_number, DROP COLUMN contact_email, DROP COLUMN phone');
  }
}
