import {gatePassStatus} from '../../lib/gate-pass.mjs';
import {validDate} from '../../lib/members.mjs';

function formatDate(value){
 return validDate(value)?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z')):'Not set';
}
export function MembershipStatus({member}){const status=gatePassStatus(member);return <span className={'membership-validity-status '+(status==='Active'?'is-active':status==='Expired'?'is-expired':'')}>{status==='Expired'?'Expired \u00b7 Disabled':status}</span>;}
export default function MembershipValidity({member}){
 return <div className="membership-validity"><MembershipStatus member={member}/><span><span className="muted">From </span>{formatDate(member.valid_from)}</span><span><span className="muted">To </span>{formatDate(member.valid_to)}</span></div>;
}
