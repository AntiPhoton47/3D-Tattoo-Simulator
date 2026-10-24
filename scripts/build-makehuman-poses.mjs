import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const downloads = process.argv[2];
if (!downloads) throw new Error('Usage: node scripts/build-makehuman-poses.mjs <folder-containing-MakeHuman-zips>');
const pattern = /^(makehuman_system_poses|poses0[1-5])_cc0\.zip$/i, clamp = (value,min,max) => Math.max(min,Math.min(max,value));
const zipList = zip => execFileSync('unzip',['-Z1',zip],{encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
const zipRead = (zip,entry) => execFileSync('unzip',['-p',zip,entry],{encoding:'utf8',maxBuffer:32*1024*1024});
const normal = value => String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const poseAliases={arms_up_pose_001:'Arms Up',playing_guitar:'Playing Guitar',summoning_pose:'Summoning',archer_leap:'Archer Leap',cl_fight_01:'Fight Stance',boxing:'Boxing',wizard_with_sceptre_1:'Wizard With Sceptre',standing1:'Relaxed Standing'};
const title = (value,author='') => {
  const raw=String(value||''),suffix=raw.toLowerCase().replace(/^(?:spreadcore|mindfront|callharvey3d|culturalibre|gpedroso|sohh|anrico)_/,'');if(poseAliases[suffix])return poseAliases[suffix];
  let name=raw.replace(/[_-]+/g,' ').replace(/([A-Za-z])(\d)/g,'$1 $2').replace(/\b\w/g,letter=>letter.toUpperCase()),authorToken=String(author).split(/\s+/)[0];if(authorToken)name=name.replace(new RegExp(`^${authorToken.replace(/[^a-z0-9]/ig,'')}\\s+`,'i'),'');return name.replace(/^(?:Spreadcore|Mindfront|Callharvey 3 D|Culturalibre|Gpedroso|Sohh|Anrico)\s+/i,'').replace(/^Cl\s+/i,'').replace(/\s+Pose\s+0*1$/i,'').trim();
};

function channelsFor(source){
  const lines=source.trim().split(/\r?\n/),motion=lines.findIndex(line=>line.trim()==='MOTION'),channels=[];let bone='';
  for(let i=0;i<motion;i++){let match=lines[i].trim().match(/^(?:ROOT|JOINT)\s+(.+)$/);if(match)bone=match[1];match=lines[i].trim().match(/^CHANNELS\s+\d+\s+(.+)$/);if(match)for(const channel of match[1].split(/\s+/))channels.push([bone,channel]);}
  const values=lines[motion+3]?.trim().split(/\s+/).map(Number)||[],result={};channels.forEach(([name,channel],index)=>(result[name]??={})[channel]=values[index]||0);return result;
}
function adaptedPose(bones){
  const result={};for(const [suffix,side] of [['L','left'],['R','right']]){const direction=suffix==='L'?-1:1,upper=bones[`upperarm01.${suffix}`]||{},lower=bones[`lowerarm01.${suffix}`]||{},leg=bones[`lowerleg01.${suffix}`]||{};
    result[`${side}Shoulder`]=Math.round(clamp(18+direction*(upper.Yrotation||0)*2.51,0,155));
    result[`${side}ShoulderForward`]=Math.round(clamp(-(upper.Xrotation||0)*1.45,-60,120));
    result[`${side}ArmTwist`]=Math.round(clamp((suffix==='L'?1:-1)*(upper.Zrotation||0)*1.2,-90,90));
    result[`${side}Elbow`]=Math.round(clamp(Math.abs((lower.Xrotation||0)-26.93)*1.6,0,145));
    result[`${side}Knee`]=Math.round(clamp(Math.abs(leg.Xrotation||0),0,135));
  }return result;
}

const poses=[];for(const file of readdirSync(downloads).filter(name=>pattern.test(name)).sort()){const zip=join(downloads,file),pack=file.replace(/\.zip$/i,''),entries=zipList(zip),jsonEntry=entries.find(entry=>entry.endsWith('.json'));let metadata={};try{if(jsonEntry)metadata=JSON.parse(zipRead(zip,jsonEntry))}catch(_){}const byName=new Map(Object.entries(metadata).map(([key,value])=>[normal(key),value]));
  for(const entry of entries.filter(item=>item.toLowerCase().endsWith('.bvh')).sort()){const key=basename(entry,'.bvh'),meta=byName.get(normal(key))||{};poses.push({id:`${pack}__${key}`.toLowerCase().replace(/[^a-z0-9]+/g,'_'),name:title(key,meta.author),pack,author:meta.author||'MakeHuman community contributor',license:meta.license||'CC0',source:meta.source||'',description:meta.description||'',pose:adaptedPose(channelsFor(zipRead(zip,entry)))})}}
writeFileSync('pose-presets.js',`/* Limb-focused adaptations of the supplied MakeHuman CC0 pose library. */\nwindow.INK_ATLAS_POSE_PRESETS=${JSON.stringify(poses)};\n`);console.log(`Built ${poses.length} adapted limb pose presets.`);
