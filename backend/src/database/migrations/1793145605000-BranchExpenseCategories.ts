import type { MigrationInterface, QueryRunner } from 'typeorm';
export class BranchExpenseCategories1793145605000 implements MigrationInterface {
  transaction = false;
  async up(runner: QueryRunner) {
    if (!await runner.hasColumn('expense_categories', 'branch_id')) await runner.query(`ALTER TABLE expense_categories ADD branch_id varchar(64) NULL,
      ADD CONSTRAINT fk_custom_category_branch FOREIGN KEY (branch_id,company_id) REFERENCES branches(id,company_id) ON DELETE RESTRICT`);
    await runner.query(`CREATE TABLE IF NOT EXISTS branch_expense_category_settings (
      branch_id varchar(64) NOT NULL, category_id varchar(64) NOT NULL,
      name varchar(128) NOT NULL, type enum('single','staff_based') NOT NULL,
      icon_name varchar(64) NOT NULL, description text NOT NULL, default_vat_rate int NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (branch_id,category_id),
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
      FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT,
      CONSTRAINT chk_category_vat CHECK (default_vat_rate IN (0,1,10,20))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    if (!await runner.hasColumn('expenses', 'category_name_snapshot')) await runner.query(`ALTER TABLE expenses
      ADD category_name_snapshot varchar(128) NULL, ADD category_type_snapshot enum('single','staff_based') NULL`);
    await runner.query(`UPDATE expenses e JOIN expense_categories c ON c.id=e.category_id SET
      e.category_name_snapshot=COALESCE(e.category_name_snapshot,c.name),e.category_type_snapshot=COALESCE(e.category_type_snapshot,c.type)`);
    const descriptions = [
      ['cat-1','Günlük yevmiye, avans ve personel prim ödemeleri'], ['cat-2','Taze kırmızı et, tavuk ve işlenmiş et alımları'],
      ['cat-3','Kahve, çay, asitli meşrubatlar ve su tedariği'], ['cat-4','Günlük taze hal alımları ve yeşillikler'],
      ['cat-5','Deterjan, peçete, kimyasal ve mutfak hijyen malzemeleri'], ['cat-6','Merkez depo sevkiyat ve kargo taşıma giderleri'],
      ['cat-7','Dönemsel şube kira ve AVM ortak gider payı'], ['cat-8','Enerji, fırın doğalgaz ve şebeke suyu harcamaları'],
      ['cat-9','POS komisyonları, kırtasiye, küçük bakım onarım'],
    ];
    for (const [id, description] of descriptions) await runner.query("UPDATE expense_categories SET description=? WHERE id=? AND company_id IS NULL AND description=''", [description, id]);
  }
  async down(runner: QueryRunner) {
    await runner.query('DROP TABLE branch_expense_category_settings');
    await runner.query('ALTER TABLE expenses DROP COLUMN category_name_snapshot, DROP COLUMN category_type_snapshot');
    await runner.query('ALTER TABLE expense_categories DROP FOREIGN KEY fk_custom_category_branch, DROP COLUMN branch_id');
  }
}
