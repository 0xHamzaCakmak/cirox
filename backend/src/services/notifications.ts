import type { EntityManager } from 'typeorm';
import { appDataSource } from '../database/data-source';
import { BranchEntity, type UserRow } from '../database/entities';

export interface BranchActivity {
  kind: string; tone: 'income' | 'expense' | 'info' | 'warning'; title: string; detail: string; amount?: number;
}

// Called inside the business transaction: a failed mutation never creates an alert.
export async function recordBranchActivity(manager: EntityManager, branchId: string, actor: UserRow, activity: BranchActivity) {
  const branch = await manager.findOneByOrFail(BranchEntity, { id: branchId });
  await manager.query(`INSERT INTO branch_events (branch_id,center_company_id,actor_id,actor_name,kind,tone,title,detail,amount)
    VALUES (?,?,?,?,?,?,?,?,?)`, [branch.id, branch.centerCompanyId, actor.id, actor.name, activity.kind, activity.tone,
    activity.title.slice(0, 255), activity.detail.slice(0, 1024), activity.amount === undefined ? null : activity.amount.toFixed(2)]);
}

export interface NotificationScope { centerId?: string; branchId?: string }
interface NotificationRow {
  id: string; branch_id: string; branch_name: string; kind: string; tone: BranchActivity['tone'];
  title: string; detail: string; amount: string | null; actor_name: string; created_at: Date; is_read: number;
}
function visibility(user: UserRow, scope: NotificationScope) {
  const conditions: string[] = [];
  const parameters: string[] = [];
  const centerId = user.role === 'merkez' ? user.companyId : user.role === 'admin' ? scope.centerId : null;
  if (centerId) {
    // Removing or moving a branch revokes the old center's visibility immediately.
    conditions.push('b.center_company_id=? AND e.center_company_id=?'); parameters.push(centerId, centerId);
  } else if (user.role === 'merkez') conditions.push('1=0');
  if (user.role === 'sube') {
    conditions.push('b.id=? AND b.company_id=?'); parameters.push(user.branchId || '', user.companyId || '');
  }
  if (user.role === 'admin' && scope.branchId) { conditions.push('e.branch_id=?'); parameters.push(scope.branchId); }
  return { sql: conditions.length ? conditions.map(condition => `(${condition})`).join(' AND ') : '1=1', parameters };
}

export async function notificationFeed(user: UserRow, scope: NotificationScope = {}) {
  const filter = visibility(user, scope);
  const events: NotificationRow[] = await appDataSource.query(`SELECT CAST(e.id AS CHAR) AS id,e.branch_id,b.name AS branch_name,
    e.kind,e.tone,e.title,e.detail,e.amount,e.actor_name,e.created_at,(r.event_id IS NOT NULL) AS is_read
    FROM branch_events e JOIN branches b ON b.id=e.branch_id
    LEFT JOIN notification_reads r ON r.event_id=e.id AND r.user_id=?
    WHERE ${filter.sql} ORDER BY e.id DESC LIMIT 50`, [user.id, ...filter.parameters]);
  const [count] = await appDataSource.query(`SELECT COUNT(*) AS unread FROM branch_events e JOIN branches b ON b.id=e.branch_id
    LEFT JOIN notification_reads r ON r.event_id=e.id AND r.user_id=?
    WHERE ${filter.sql} AND r.event_id IS NULL`, [user.id, ...filter.parameters]);
  return {
    events: events.map(event => ({
      id: String(event.id), branchId: event.branch_id, branchName: event.branch_name, kind: event.kind, tone: event.tone,
      title: event.title, detail: event.detail, amount: event.amount === null ? null : Number(event.amount),
      actorName: event.actor_name, createdAt: new Date(event.created_at).toISOString(), read: !!Number(event.is_read),
    })),
    unreadCount: Number(count.unread), latestId: events[0] ? String(events[0].id) : '0',
  };
}

export async function markNotificationsRead(user: UserRow, throughId: string, scope: NotificationScope = {}) {
  const filter = visibility(user, scope);
  await appDataSource.query(`INSERT IGNORE INTO notification_reads (user_id,event_id)
    SELECT ?,e.id FROM branch_events e JOIN branches b ON b.id=e.branch_id
    WHERE ${filter.sql} AND e.id<=?`, [user.id, ...filter.parameters, throughId]);
}
