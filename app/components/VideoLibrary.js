'use client';
import {MessageNotice,confirmMessage} from './MessagePopup';

import {useEffect,useState} from 'react';
import {requestApi} from '../../lib/api-client.mjs';
import {videoLink} from '../../lib/video-links.mjs';
function Player({video,onError}){const link=video.link_url?videoLink(video.link_url):null;
 if(link?.kind==='embed')return <iframe className="video-link-player" src={link.src} title={video.name} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>;
 if(link?.kind==='link')return <a className="video-link-open" href={link.url} target="_blank" rel="noopener noreferrer"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m9 5 11 7-11 7Z"/></svg><span>Open video ↗</span></a>;
 return <video controls playsInline preload="none" controlsList="nodownload" aria-label={video.name} src={link?.src||video.streamUrl} onError={onError}><track kind="captions"/></video>;
}
export default function VideoLibrary({canUpload=false}){
 const [videos,setVideos]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function refresh(){setVideos(await requestApi('videos'));}
 useEffect(()=>{let active=true;requestApi('videos').then(rows=>{if(active)setVideos(rows);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 async function save(event){event.preventDefault();const form=event.currentTarget;setBusy(true);setError('');try{await requestApi('videos','POST',Object.fromEntries(new FormData(form)));await refresh();form.reset();}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function remove(video){if(!await confirmMessage('Remove '+video.name+'?'))return;setBusy(true);try{await requestApi('videos','DELETE',{id:video.id});await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="video-library" aria-label="Organization videos">{canUpload&&<form className="video-upload-form" onSubmit={save}><div><label htmlFor="videoTitle">Video title</label><input id="videoTitle" name="name" maxLength={120} required disabled={busy}/></div><div><label htmlFor="videoLink">Video link</label><input id="videoLink" name="url" type="url" placeholder="https://" maxLength={2048} required disabled={busy}/></div><button disabled={busy}>{busy?'Saving...':'Add Video'}</button></form>}{error&&<MessageNotice>{error}</MessageNotice>}{loading?<p role="status">Loading videos...</p>:<div className="video-grid">{videos.map(video=><article className="video-card" key={video.id}><Player video={video} onError={()=>setError('Video unavailable. Check the video link or your connection.')}/><div><h2>{video.name}</h2>{canUpload&&video.canDelete&&<button className="delete-button" disabled={busy} onClick={()=>remove(video)}>Delete</button>}</div></article>)}{!videos.length&&<p className="muted">No videos</p>}</div>}</section>;
}
