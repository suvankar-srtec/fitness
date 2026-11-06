export function managerAnalytics(data,selected='all'){
 const members=data.members||[],today=data.today;
 const addDays=(date,offset)=>{const day=new Date(date+'T00:00:00Z');day.setUTCDate(day.getUTCDate()+offset);return day.toISOString().slice(0,10);};
 const member=members.find(row=>String(row.id)===String(selected));
 const attendance=data.attendance||[],seen=new Set(attendance.map(row=>row.member_id+'|'+row.date));
 const presentToday=members.filter(row=>seen.has(row.id+'|'+today)).length;
 let present=presentToday,total=members.filter(row=>row.joined<=today).length;
 if(member){present=0;total=0;for(let offset=-29;offset<=0;offset++){const day=addDays(today,offset);if(day>=member.joined){total++;if(seen.has(member.id+'|'+day))present++;}}}
 const bars=Array.from({length:7},(_,index)=>{const date=addDays(today,index-6);return {date,count:attendance.filter(row=>row.date===date&&(!member||String(row.member_id)===String(member.id))).length};});
 return {member,totalMembers:members.length,joinedThisMonth:members.filter(row=>row.joined>=today.slice(0,7)+'-01'&&row.joined<=today).length,presentToday,pie:{present,absent:Math.max(0,total-present),total},bars};
}
