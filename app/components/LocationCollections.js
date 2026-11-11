import {totalPayments} from '../../lib/payment-report.mjs';
export default function LocationCollections({payments=[]}){
 const locations=[...new Set(payments.map(row=>row.location||'Unassigned'))].sort();
 const money=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(Number(value));
 return <section className="location-collections" aria-label="Location collections"><h2>Location collections</h2><div className="tablewrap"><table><thead><tr><th>Gym Location</th><th>Cash</th><th>Online</th><th>Total</th></tr></thead><tbody>{locations.map(location=>{const rows=payments.filter(row=>(row.location||'Unassigned')===location);return <tr key={location}><td>{location}</td><td>{money(totalPayments(rows.filter(row=>row.method==='Cash')))}</td><td>{money(totalPayments(rows.filter(row=>row.method==='Online')))}</td><td><strong>{money(totalPayments(rows))}</strong></td></tr>;})}</tbody></table></div>{!locations.length&&<p>No collections</p>}</section>;
}
