import {memberPublicId} from './public-ids.mjs';
import {NextResponse} from 'next/server';
import {validDate,memberToday} from './members.mjs';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(error,status)=>reply({error},status);
export async function attendanceApi(request,user,sql) {
 if(request.method!=='GET')return fail('Attendance is recorded only by supervisor QR scans',405);
 const owner=user.role==='superadmin',adminId=user.role==='supervisor'?user.created_by:user.id;
 if(user.role==='supervisor'&&!user.location_id)return fail('Ask your gym admin to assign your location',403);
 const params=new URL(request.url).searchParams;
 const from=params.get('from')||params.get('date')||memberToday(),to=params.get('to')||from;
 if(!validDate(from)||!validDate(to)||from>to)return fail('Select a valid date range',400);
 if((new Date(to+'T00:00:00Z')-new Date(from+'T00:00:00Z'))/86400000>365)return fail('Select an attendance range of at most 366 days',400);
 const rows=await sql`SELECT m.id AS member_id,m.public_id AS member_public_id,m.name,m.phone,m.plan,to_char(d.day,'YYYY-MM-DD') AS attended_on,CASE WHEN a.status='Present' AND a.source='qr' THEN 'Present' ELSE 'Absent' END AS status FROM members m CROSS JOIN generate_series(${from}::date,${to}::date,INTERVAL '1 day') AS d(day) LEFT JOIN attendance a ON a.member_id=m.id AND a.attended_on=d.day::date WHERE (${owner}::boolean OR m.admin_id=${adminId}) AND (${user.role}<>'supervisor' OR m.location_id=${user.location_id||null}) AND m.joined<=d.day::date ORDER BY d.day DESC,m.name,m.id`;
 return reply(rows.map(row=>({...row,id:row.member_id+'-'+row.attended_on,memberId:memberPublicId(row)})));
}
