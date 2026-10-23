// Explicit maintenance command. Default is read-only. No local-DB fallback.
// Backups are authenticated/encrypted using NEXTAUTH_SECRET and never committed.
import { MongoClient, BSON } from 'mongodb';
import { randomBytes, createCipheriv, createDecipheriv, scryptSync, randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const args=process.argv.slice(2), apply=args.includes('--apply');
const expected=Number(args.find(a=>a.startsWith('--expected-count='))?.split('=')[1]);
const name=process.env.MONGODB_DB||'senganthal';
const declared=args.find(a=>a.startsWith('--database='))?.slice('--database='.length);
const owners=(process.env.ADMIN_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
if(!process.env.MONGODB_URI||!owners.length)throw Error('MongoDB and protected ADMIN_EMAILS must be configured.');
if(apply&&(!process.env.NEXTAUTH_SECRET||declared!==name||!Number.isSafeInteger(expected)||expected<0))throw Error('Apply requires NEXTAUTH_SECRET, --database and --expected-count from a preview.');
const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000});
try {
  await client.connect();
  const database=client.db(name);
  async function snapshot(session) {
    const options=session?{session}:{};
    const admins=await database.collection('members').find({role:'admin'},options).toArray();
    const protectedEmails=[...new Set([...owners,...admins.map(a=>a.email)])];
    const emailFilter={email:{$exists:true,$nin:protectedEmails}};
    const ownerFilter={owner:{$exists:true,$nin:protectedEmails}};
    const filters={
      members:{...emailFilter,role:{$ne:'admin'}},
      users:emailFilter,emailCredentials:emailFilter,phoneCredentials:emailFilter,
      emailOtpChallenges:{_id:{$nin:protectedEmails.flatMap(email=>[`onboarding:${email}`,`reset:${email}`])}},
      phoneOtpSessions:emailFilter,presence:emailFilter,messages:emailFilter,
      preferences:ownerFilter,visits:ownerFilter,watchlist:ownerFilter,portfolio:ownerFilter,
      reports:ownerFilter,stakeScans:ownerFilter,transactions:ownerFilter,ledgers:ownerFilter
    };
    // A reset must never orphan a paid or renewable provider subscription.
    for(const collection of ['billingAccounts','subscriptions','paymentEvents','billingArchive']) {
      if(await database.collection(collection).countDocuments({},options))throw Error('Payment records exist. Stop and review subscriptions before resetting accounts.');
    }
    const records={};
    for(const [collection,filter] of Object.entries(filters))records[collection]=await database.collection(collection).find(filter,options).toArray();
    return {database:name,createdAt:new Date().toISOString(),protectedEmails,admins,records};
  }
  const preview=await snapshot();
  console.log(JSON.stringify({mode:apply?'apply':'preview',database:name,protectedEmails:preview.protectedEmails,counts:Object.fromEntries(Object.entries(preview.records).map(([k,v])=>[k,v.length]))},null,2));
  if(apply) {
    if(preview.records.members.length!==expected)throw Error('Member count changed. Run preview again.');
    const session=client.startSession();
    let result;
    try {
      await session.withTransaction(async()=>{
        const data=await snapshot(session);
        if(data.records.members.length!==expected)throw Error('Member count changed. No reset applied.');
        const plain=BSON.EJSON.stringify(data,{relaxed:false}),salt=randomBytes(16),iv=randomBytes(12);
        const key=scryptSync(process.env.NEXTAUTH_SECRET,salt,32);
        const cipher=createCipheriv('aes-256-gcm',key,iv);
        const encrypted=Buffer.concat([cipher.update(plain,'utf8'),cipher.final()]);
        const envelope={version:1,salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:encrypted.toString('base64')};
        const folder=path.resolve('.data','account-reset-backups');await mkdir(folder,{recursive:true});
        const file=path.join(folder,`reset-${Date.now()}-${randomUUID()}.json`);
        await writeFile(file,JSON.stringify(envelope),{flag:'wx',mode:0o600});
        // Verify the actual on-disk backup before any deletion.
        const saved=JSON.parse(await readFile(file,'utf8'));
        const decipher=createDecipheriv('aes-256-gcm',scryptSync(process.env.NEXTAUTH_SECRET,Buffer.from(saved.salt,'base64'),32),Buffer.from(saved.iv,'base64'));
        decipher.setAuthTag(Buffer.from(saved.tag,'base64'));
        const recovered=Buffer.concat([decipher.update(Buffer.from(saved.data,'base64')),decipher.final()]).toString('utf8');
        if(recovered!==plain)throw Error('Backup verification failed. No reset applied.');
        const deleted={};
        for(const [collection,rows] of Object.entries(data.records)) {
          if(!rows.length){deleted[collection]=0;continue;}
          const filter={_id:{$in:rows.map(r=>r._id)}};
          if(collection==='members')Object.assign(filter,{role:{$ne:'admin'},email:{$nin:data.protectedEmails}});
          const removal=await database.collection(collection).deleteMany(filter,{session});
          if(removal.deletedCount!==rows.length)throw Error('Records changed during reset. Transaction rolled back.');
          deleted[collection]=removal.deletedCount;
        }
        if(await database.collection('members').countDocuments({role:'admin'},{session})!==data.admins.length)throw Error('Administrator preservation check failed.');
        await database.collection('audit').insertOne({action:'members.reset.non-admin',actor:owners[0],deleted,backup:path.basename(file),createdAt:new Date()},{session});
        result={deleted,backup:file};
      },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});
    }finally{await session.endSession();}
    console.log(JSON.stringify({completed:true,...result}));
  }
} catch(error) {
  console.error(error instanceof Error && !/mongodb|password|authentication|connection/i.test(error.message)?error.message:'Reset could not complete. Check database connectivity and permissions.');
  process.exitCode=1;
} finally {await client.close();}
