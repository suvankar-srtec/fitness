const rawQuery=Symbol('rawAuditQuery');
// The actor context and every write share a transaction, including existing multi-query transactions.
export function withAuditActor(base,user){
 const actor=JSON.stringify({id:user.id,userId:user.public_id,name:user.name});
 const context=()=>base`SELECT set_config('app.audit_actor',${actor},true)`;
 function audited(strings,...values){
  const query=base(strings,...values);
  if(!/\b(INSERT|UPDATE|DELETE)\b/i.test(strings.join(' ')))return query;
  return {[rawQuery]:query,then(resolve,reject){return base.transaction([context(),query]).then(rows=>rows[1]).then(resolve,reject);}};
 }
 audited.transaction=(queries,options)=>base.transaction([context(),...queries.map(query=>query[rawQuery]||query)],options).then(rows=>rows.slice(1));
 return audited;
}
