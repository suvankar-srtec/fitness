import {gatePassStatus} from '../../lib/gate-pass.mjs';
import {validDate} from '../../lib/members.mjs';

function formatDate(value){
 return validDate(value)?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z')):'Not set';
}
export default function MembershipValidity({member}){
 const status=gatePassStatus(member);
 return <div className="membership-validity"><span className={'membership-validity-status '+(status==='Active'?'is-active':'')}>{status==='Expired'?'Expired · Disabled':status}</span><span><span className="muted">From </span>{formatDate(member.valid_from)}</span><span><span className="muted">To </span>{formatDate(member.valid_to)}</span></div>;
}
