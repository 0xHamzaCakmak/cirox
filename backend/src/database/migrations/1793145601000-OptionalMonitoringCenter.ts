import type { MigrationInterface, QueryRunner } from 'typeorm';

export class OptionalMonitoringCenter1793145601000 implements MigrationInterface {
  transaction = false;
  async up(runner: QueryRunner): Promise<void> {
    if (!await runner.hasColumn('companies', 'kind')) {
      await runner.query("ALTER TABLE companies ADD kind enum('center','business') NOT NULL DEFAULT 'center'");
    }
    if (!await runner.hasColumn('branches', 'center_company_id')) {
      await runner.query(`ALTER TABLE branches ADD center_company_id varchar(64) NULL,
        ADD KEY idx_branch_center (center_company_id),
        ADD CONSTRAINT fk_branch_monitoring_center FOREIGN KEY (center_company_id) REFERENCES companies(id) ON DELETE RESTRICT`);
      // Preserve the existing links. New businesses will have a separate owning tenant.
      await runner.query(`UPDATE branches b JOIN companies c ON c.id = b.company_id
        SET b.center_company_id = b.company_id WHERE c.kind = 'center'`);
    }
  }
  async down(runner: QueryRunner): Promise<void> {
    // A rollback must not silently discard new independent business ownership.
    const [{ count }] = await runner.query("SELECT COUNT(*) AS count FROM companies WHERE kind = 'business'");
    if (Number(count)) throw new Error('Independent business records exist; migrate them before reverting this schema.');
    await runner.query('ALTER TABLE branches DROP FOREIGN KEY fk_branch_monitoring_center, DROP COLUMN center_company_id');
    await runner.query('ALTER TABLE companies DROP COLUMN kind');
  }
}
