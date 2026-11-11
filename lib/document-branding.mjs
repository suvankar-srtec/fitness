export function documentBranding(gym={}){
 return {name:gym.name||'Gym',contact:gym.phone||'Not provided',email:gym.email||'Not provided',website:String(gym.website||'Not provided').replace(/^https?:\/\//,'').replace(/\/$/,'')};
}
