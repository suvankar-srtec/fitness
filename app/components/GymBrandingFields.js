'use client';
import GymLogoInput from './GymLogoInput';
import PhoneInput from './PhoneInput';
export default function GymBrandingFields({prefix,user={},fieldClass='staff-create-field'}){
 return <><div className={fieldClass}><label htmlFor={prefix+'Logo'}>Gym logo</label><GymLogoInput id={prefix+'Logo'} defaultValue={user.gymLogo} required/></div><div className={fieldClass}><label htmlFor={prefix+'Address'}>Gym address</label><input id={prefix+'Address'} name="gymAddress" defaultValue={user.gymAddress||''} maxLength={400} required/></div><div className={fieldClass}><label htmlFor={prefix+'Phone'}>Gym phone</label><PhoneInput id={prefix+'Phone'} name="gymPhone" countryName="gymCountry" defaultValue={user.gymPhone||user.phone||''}/></div><div className={fieldClass}><label htmlFor={prefix+'Website'}>Gym website</label><input id={prefix+'Website'} name="gymWebsite" defaultValue={user.gymWebsite||''} maxLength={250}/></div></>;
}
