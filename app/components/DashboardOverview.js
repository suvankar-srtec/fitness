'use client';
import NavigationIcon from './NavigationIcon';
import ResponsiveTable from './ResponsiveTable';
import dynamic from 'next/dynamic';
import ContactDetails from './ContactDetails';
import { useEffect, useState } from 'react';
import useAdminActivity from '../hooks/useAdminActivity';
const AdminRecentActivity=dynamic(()=>import('./AdminRecentActivity'));
const AdminDashboardCharts=dynamic(()=>import('./AdminDashboardCharts'));
const AdminHome=dynamic(()=>import('./AdminHome'));
import {gatePassStatus} from '../../lib/gate-pass.mjs';
import {validDate} from '../../lib/members.mjs';
const overviewDate=value=>validDate(value)?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z')):'Not set';

export function DashboardIcon({name}){return <NavigationIcon name={name}/>;}
export default function DashboardOverview({loading=false,members,plans=[],admins=[],supervisors=[],role,onView,onSelectMember,onAdd,onEditMember,onDeleteMember,onShopMember,onRenewMember,busy}) {
 const activity=useAdminActivity(role==='admin');
 const [now,setNow]=useState(null);
 useEffect(()=>{setNow(new Date());const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer);},[]);
 const latest=[...members].sort((a,b)=>b.id-a.id).slice(0,5);
 const month=now?`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`:'';
 const joined=month?members.filter(m=>String(m.joined).startsWith(month)).length:0;
 const owner=role==='superadmin';
 const allCards=[{name:owner?'Administrators':'Plans',value:owner?admins.length:role==='supervisor'?new Set(members.map(m=>m.plan)).size:plans.length,icon:owner?'members':'plans'},
 {name:'Members',value:members.length,icon:'members'},
 {name:owner?'Supervisors':'Joined this month',value:owner?supervisors.length:joined,icon:owner?'members':'joined'}];
 const cards=role==='admin'?[allCards.find(card=>card.name==='Members'),{name:"Today's Present",value:activity.data.summary?.present??'?',icon:'attendance'},{name:"Today's Absent",value:activity.data.summary?.absent??'?',icon:'members'}]:allCards;
 if(role==='admin')return <AdminHome members={members} loading={loading} activity={activity} onAdd={onAdd} onSelectMember={onSelectMember} onEditMember={onEditMember} onDeleteMember={onDeleteMember} onShopMember={onShopMember} onRenewMember={onRenewMember} busy={busy}/>;
 return <div className={'overview '+(role==='admin'?'admin-overview':'')}>{role!=='admin'&&<div className="overview-title"><span>This Month</span></div>}<div className="overview-grid">{cards.map(card=><article data-card-surface="" className="overview-card" key={card.name}><span className="overview-icon"><DashboardIcon name={card.icon}/></span><div><strong>{loading?'...':card.value}</strong><span>{card.name}</span></div></article>)}{role!=='admin'&&<article data-card-surface="" className="overview-card overview-clock"><span className="overview-icon"><DashboardIcon name="clock"/></span><div><strong>{now?now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'—'}</strong><span>{now?now.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short'}):'—'}</span></div></article>}</div><section data-card-surface="" className="overview-section latest-member-section"><div className="overview-section-title"><h2>Latest Members</h2></div><div className="latest-members">{latest.map(member=><button type="button" className="member-avatar-button" key={member.id} aria-label={'View '+member.name} title={member.name} onClick={()=>onSelectMember?.(member)}><span className="member-avatar">{member.profilePictureUrl?<img src={member.profilePictureUrl} alt={'Profile of '+member.name}/>:<svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><circle cx="32" cy="23" r="12"/><path d="M10 63v-9a22 22 0 0 1 44 0v9Z"/></svg>}</span></button>)}{!latest.length&&<div className="overview-empty">{loading?'Loading...':'No members'}</div>}</div></section>{role==='admin'&&<AdminDashboardCharts members={members} loading={loading} attendance={activity.data.attendance||[]}/>}
{role==='admin'&&<AdminRecentActivity {...activity}/>}<section data-card-surface="" className={'overview-section '+(role==='admin'?'admin-mobile-member-overview':'')}><div className="overview-section-title"><h2>Member Overview</h2><button type="button" onClick={onView}>See all</button></div><div className="dashboard-member-directory"><ResponsiveTable className="dashboard-member-table" aria-label="Member overview"><thead><tr><th scope="col">Member</th><th scope="col">Contact</th><th scope="col">Plan</th><th scope="col">Validity</th><th scope="col">Status</th></tr></thead><tbody>{latest.map(member=>{const status=gatePassStatus(member);return <tr key={member.id}><td><button type="button" className="dashboard-member-link" onClick={()=>onSelectMember?.(member)} aria-label={'View '+member.name}><span className="dashboard-member-photo">{member.profilePictureUrl?<img src={member.profilePictureUrl} alt="" loading="lazy"/>:member.name?.trim().split(/\s+/).slice(0,2).map(part=>part.charAt(0)).join('').toUpperCase()}</span><span className="dashboard-member-name"><strong>{member.name}</strong><small>{member.memberId}</small></span></button></td><td><ContactDetails person={member}/></td><td className="dashboard-member-plan" data-label="Plan"><span>{member.plan||'Not assigned'}</span></td><td className="dashboard-member-dates"><span><small>From</small> {overviewDate(member.valid_from)}</span><span><small>To</small> {overviewDate(member.valid_to)}</span></td><td className="dashboard-member-state"><span className={'dashboard-membership-status '+(status==='Active'?'is-active':status==='Expired'?'is-expired':'')}>{status}</span></td></tr>;})}{!latest.length&&<tr><td colSpan={5} className="dashboard-members-empty">{loading?'Loading...':'No members'}</td></tr>}</tbody></ResponsiveTable></div></section></div>;
}
