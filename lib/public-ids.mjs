export function memberPublicId(record) {
 return record.public_id||record.member_public_id||record.memberId||'mem'+String(record.member_id??record.id).padStart(2,'0');
}
