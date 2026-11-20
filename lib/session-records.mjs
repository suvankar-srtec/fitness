import {tokenHash} from './password.mjs';
import {publicUser} from './user-profile.mjs';
import {isMainSuperadmin} from './user-permissions.mjs';
// Shared by both the general API and the small startup handlers. No auth cache.
export async function staffSessionRecord(sql,token){const [u]=await sql`SELECT u.*,(SELECT name FROM employee_roles er WHERE er.id=u.employee_role_id AND er.admin_id=u.created_by) AS employee_role_name,g.contact_phone AS owner_gym_phone,g.gym_website AS owner_gym_website,g.email AS gym_email,CASE WHEN u.role IN ('manager','supervisor') THEN g.gym_logo ELSE u.gym_logo END AS gym_logo,gym_account_enabled(u.id) AS account_enabled,gym_subscription_active(CASE WHEN u.role='admin' THEN u.id ELSE u.created_by END) AS subscription_active,l.name AS location_name,CASE WHEN u.role IN ('manager','supervisor') THEN COALESCE(NULLIF(g.gym_name,''),g.name) ELSE u.gym_name END AS gym_name FROM users u JOIN sessions s ON u.id=s.user_id LEFT JOIN (SELECT *,COALESCE(NULLIF(gym_phone,''),phone) AS contact_phone FROM users WHERE role='admin') g ON g.id=u.created_by LEFT JOIN gym_locations l ON l.id=u.location_id WHERE s.token_hash=${tokenHash(token)} AND s.expires_at>NOW()`;return u;}
export async function memberSessionRecord(sql,token){const [m]=await sql`SELECT m.*,gym_subscription_active(m.admin_id) AS subscription_active,COALESCE((SELECT p.name FROM plans p WHERE p.id=m.plan_id),m.plan) AS plan,to_char(m.valid_from,'YYYY-MM-DD') AS valid_from,to_char(m.valid_to,'YYYY-MM-DD') AS valid_to,g.gym_name,g.gym_logo,COALESCE(NULLIF(g.gym_phone,''),g.phone) AS gym_phone,g.archived_at AS gym_archived FROM member_sessions s JOIN members m ON m.id=s.user_id JOIN users g ON g.id=m.admin_id WHERE s.token_hash=${tokenHash(token)} AND s.phone=m.phone AND m.password_ready=TRUE AND s.expires_at>NOW()`;return m;}
export function staffSessionError(u){
 if(!u||!u.account_enabled||u.role==='superadmin'&&!isMainSuperadmin(publicUser(u)))return {error:'Please sign in',status:401};
 if(u.role!=='superadmin'&&!u.password_ready)return {error:'Verify your WhatsApp number and set your password.',status:401};
 if(u.role!=='superadmin'&&u.subscription_active===false)return {error:'Organization subscription is not active. Contact superadmin.',code:'SUBSCRIPTION_EXPIRED',status:403};
 return null;
}
