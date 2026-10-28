import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/session';
import { appDataSource } from '../database/data-source';
import { BranchEntity, type UserRow } from '../database/entities';
import { asyncRoute, HttpError } from '../http';
import { readableBranch, writableBranch } from '../services/branch-access';
import { branchCategories, publicCategory } from '../services/expenses';
import { bootstrapData } from '../services/bootstrap';

export const expenseCategoriesRouter = Router();
expenseCategoriesRouter.use(requireAuth);
const fields = z.object({ name: z.string().trim().min(1).max(128), type: z.enum(['single', 'staff_based']),
  description: z.string().trim().max(5000), iconName: z.string().min(1).max(64),
  defaultVatRate: z.union([z.literal(0), z.literal(1), z.literal(10), z.literal(20)]), isActive: z.boolean() });
const createSchema = fields.extend({ branchId: z.string().uuid() });
const updateSchema = fields.partial().extend({ branchId: z.string().uuid() }).refine(input => Object.keys(input).length > 1);
expenseCategoriesRouter.get('/expense-categories', asyncRoute(async (req, res) => {
  const branch = await readableBranch(res.locals.user as UserRow, z.string().uuid().parse(req.query.branchId));
  res.json({ categories: (await branchCategories(branch)).map(category => publicCategory(category, branch.id)) });
}));
expenseCategoriesRouter.post('/expense-categories', asyncRoute(async (req, res) => {
  const input = createSchema.parse(req.body); const user = res.locals.user as UserRow;
  const branch = await writableBranch(user, input.branchId);
  await appDataSource.transaction(async manager => {
    await manager.findOneOrFail(BranchEntity, { where: { id: branch.id }, lock: { mode: 'pessimistic_write' } });
    const [duplicate] = await manager.query(`SELECT c.id FROM expense_categories c LEFT JOIN branch_expense_category_settings s ON s.category_id=c.id AND s.branch_id=?
      WHERE (c.company_id IS NULL OR (c.company_id=? AND (c.branch_id IS NULL OR c.branch_id=?))) AND COALESCE(s.name,c.name)=?`, [branch.id, branch.companyId, branch.id, input.name]);
    if (duplicate) throw new HttpError(409, 'Bu isimde bir gider kalemi zaten var. Mevcut kalemi düzenleyin veya etkinleştirin.');
    const id = randomUUID();
    const vat = input.type === 'staff_based' ? 0 : input.defaultVatRate;
    await manager.query(`INSERT INTO expense_categories (id,company_id,branch_id,name,type,icon_name,description,default_vat_rate,is_system) VALUES (?,?,?,?,?,?,?,?,false)`,
      [id, branch.companyId, branch.id, input.name, input.type, input.iconName, input.description, vat]);
    await manager.query(`INSERT INTO branch_expense_category_settings (branch_id,category_id,name,type,icon_name,description,default_vat_rate,is_active) VALUES (?,?,?,?,?,?,?,?)`,
      [branch.id, id, input.name, input.type, input.iconName, input.description, vat, input.isActive]);
  });
  res.status(201).json({ bootstrap: await bootstrapData(user) });
}));
expenseCategoriesRouter.post('/expense-categories/:categoryId/update', asyncRoute(async (req, res) => {
  const input = updateSchema.parse(req.body); const user = res.locals.user as UserRow;
  const branch = await writableBranch(user, input.branchId); const id = String(req.params.categoryId);
  await appDataSource.transaction(async manager => {
    await manager.findOneOrFail(BranchEntity, { where: { id: branch.id }, lock: { mode: 'pessimistic_write' } });
    const current = (await branchCategories(branch, manager)).find(category => category.id === id);
    if (!current) throw new HttpError(404, 'Bu işletmeye ait gider kalemi bulunamadı.');
    const next = { name: input.name ?? current.name, type: input.type ?? current.type, icon: input.iconName ?? current.icon_name,
      description: input.description ?? current.description, vat: input.defaultVatRate ?? Number(current.default_vat_rate), active: input.isActive ?? (Number(current.is_active) !== 0) };
    if (next.type === 'staff_based') next.vat = 0;
    const [duplicate] = await manager.query(`SELECT c.id FROM expense_categories c LEFT JOIN branch_expense_category_settings s ON s.category_id=c.id AND s.branch_id=?
      WHERE (c.company_id IS NULL OR (c.company_id=? AND (c.branch_id IS NULL OR c.branch_id=?))) AND c.id<>? AND COALESCE(s.name,c.name)=?`, [branch.id, branch.companyId, branch.id, id, next.name]);
    if (duplicate) throw new HttpError(409, 'Bu isimde başka bir gider kalemi var.');
    await manager.query(`INSERT INTO branch_expense_category_settings (branch_id,category_id,name,type,icon_name,description,default_vat_rate,is_active) VALUES (?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE name=VALUES(name),type=VALUES(type),icon_name=VALUES(icon_name),description=VALUES(description),default_vat_rate=VALUES(default_vat_rate),is_active=VALUES(is_active)`,
      [branch.id, id, next.name, next.type, next.icon, next.description, next.vat, next.active]);
  });
  res.json({ bootstrap: await bootstrapData(user) });
}));
