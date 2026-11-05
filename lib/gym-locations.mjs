export function normalizeLocationName(value){
 if(typeof value!=='string'||/[\u0000-\u001f\u007f]/.test(value))return null;
 const name=value.trim().replace(/\s+/g,' ');
 return name&&name.length<=120?name:null;
}
export async function resolveGymLocation(sql,adminId,data){
 if(data.locationId!==undefined&&data.locationId!==null&&data.locationId!==''){
  const id=Number(data.locationId);
  if(!Number.isInteger(id)||id<1||id>2147483647)throw Error('INVALID_GYM_LOCATION');
  const [location]=await sql`SELECT id,name,admin_id FROM gym_locations WHERE id=${id} AND admin_id=${adminId}`;
  if(!location)throw Error('INVALID_GYM_LOCATION');
  return location;
 }
 const name=normalizeLocationName(data.locationName);
 if(!name)throw Error('GYM_LOCATION_REQUIRED');
 const [location]=await sql`INSERT INTO gym_locations(admin_id,name) SELECT id,${name} FROM users WHERE id=${adminId} AND role='admin' ON CONFLICT(admin_id,lower(name)) DO UPDATE SET name=gym_locations.name RETURNING id,name,admin_id`;
 if(!location)throw Error('INVALID_GYM_LOCATION');
 return location;
}
