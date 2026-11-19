export function dashboardRevenue(revenue,start,end,today,location='All'){
 const scoped=location==='All'?revenue:revenue.filter(payment=>(payment.location||'Unassigned')===location);
 const selected=scoped.filter(payment=>payment.date>=start&&payment.date<=end);
 const total=selected.reduce((sum,payment)=>sum+Number(payment.amount||0),0);
 const modes={Cash:0,Online:0};
 for(const payment of selected){const method=String(payment.method||'').trim().toLowerCase();if(method==='cash')modes.Cash+=Number(payment.amount||0);if(method==='online')modes.Online+=Number(payment.amount||0);}
 const sevenDaysFrom=new Date(Date.parse(today+'T00:00:00Z')-6*86400000).toISOString().slice(0,10);
 const sevenDaysTotal=scoped.filter(payment=>payment.date>=sevenDaysFrom&&payment.date<=today).reduce((sum,payment)=>sum+Number(payment.amount||0),0);
 return {selected,total,modes,sevenDaysTotal,sevenDaysFrom};
}
