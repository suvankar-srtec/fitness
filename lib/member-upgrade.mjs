export function canUpgradePlan(currentPlanId,currentAmount,plan){
 if(!plan)return false;
 if(!currentPlanId)return plan.amount!=null&&Number.isFinite(Number(plan.amount))&&Number(plan.amount)>=0;
 if(Number(plan.id)===Number(currentPlanId))return true;
 return plan.amount!=null&&Number.isFinite(Number(currentAmount))&&Number.isFinite(Number(plan.amount))&&Number(plan.amount)>Number(currentAmount);
}
export function fixedDateOfBirth(existingDob,requestedDob){return !!existingDob&&requestedDob!==undefined&&requestedDob!==existingDob;}
export function updateMemberWithUpgrade(sql,{user,gymId,branch,existing,member:m,location,picture,photoChanged}){
 return sql`WITH selected AS MATERIALIZED (
 SELECT x.id,x.plan_id AS old_plan,p.id AS new_plan,p.name AS new_name,p.amount AS new_amount
 FROM members x JOIN plans p ON p.id=${m.planId} AND p.admin_id=x.admin_id
 WHERE x.id=${existing.id} AND x.archived_at IS NULL AND (${user.role}='superadmin' OR x.admin_id=${gymId}) AND (${!branch} OR x.location_id=${branch})
 AND (x.dob IS NULL OR x.dob=${m.dob}::date)
 AND (p.id=x.plan_id OR (x.plan_id IS NULL AND p.archived=FALSE AND p.amount>=0) OR (p.archived=FALSE AND p.amount IS NOT NULL AND p.amount>GREATEST(COALESCE((SELECT amount FROM plans WHERE id=x.plan_id),0),COALESCE((SELECT amount FROM membership_assignments WHERE member_id=x.id AND superseded_by IS NULL ORDER BY id DESC LIMIT 1),0))))
 FOR UPDATE OF x
 ), upgraded AS (
 UPDATE membership_assignments a SET plan_id=s.new_plan,plan_name=s.new_name,amount=s.new_amount FROM selected s
 WHERE a.member_id=s.id AND a.superseded_by IS NULL AND s.old_plan IS DISTINCT FROM s.new_plan AND s.new_amount>=a.paid RETURNING a.member_id
 ), enrolled AS (
 INSERT INTO membership_assignments(admin_id,member_id,plan_id,plan_name,amount,paid,valid_from,valid_to,request_key)
 SELECT x.admin_id,s.id,s.new_plan,s.new_name,s.new_amount,0,${m.validFrom}::date,${m.validTo}::date,'lead-enrollment-'||s.id FROM selected s JOIN members x ON x.id=s.id WHERE s.old_plan IS NULL AND NOT EXISTS(SELECT 1 FROM membership_assignments a WHERE a.member_id=s.id) RETURNING member_id
 ), updated AS (
 UPDATE members x SET email=${m.email??existing.email??''},group_name=${m.groupName??existing.group_name??'Default'},location_id=${location.id},name=${m.name},phone=${m.phone},gender=${m.gender},age=${m.age},dob=COALESCE(x.dob,${m.dob}::date),address=${m.address},height_ft=${m.height},weight_kg=${m.weight},interested_area=${m.interestedArea},status=${m.status},valid_from=CASE WHEN s.old_plan IS NULL THEN ${m.validFrom}::date ELSE x.valid_from END,valid_to=CASE WHEN s.old_plan IS NULL THEN ${m.validTo}::date ELSE x.valid_to END,plan_id=s.new_plan,plan=s.new_name
 FROM selected s WHERE x.id=s.id AND (s.old_plan=s.new_plan OR EXISTS(SELECT 1 FROM upgraded a WHERE a.member_id=x.id) OR EXISTS(SELECT 1 FROM enrolled a WHERE a.member_id=x.id)) RETURNING x.id,x.public_id
 ), saved_picture AS (
 INSERT INTO member_pictures(member_id,data) SELECT id,${picture}::text FROM updated WHERE ${photoChanged} AND ${picture}::text IS NOT NULL ON CONFLICT(member_id) DO UPDATE SET data=EXCLUDED.data
 ), removed_picture AS (
 DELETE FROM member_pictures WHERE member_id IN(SELECT id FROM updated) AND ${photoChanged&&picture===null}
 ) SELECT id,public_id FROM updated`;
}
