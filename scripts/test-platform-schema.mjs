import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
const owner='00000000-0000-0000-0000-000000000001', other='00000000-0000-0000-0000-000000000002';
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${owner}'),('${other}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated,service_role; grant execute on function auth.uid() to authenticated,service_role;`);
  // Representative existing policies exercise the migration's preservation/wrapping logic.
  await db.exec(`create table public.clients(id uuid primary key,user_id uuid not null references auth.users(id),name text);
    alter table public.clients enable row level security; grant select,insert,update,delete on public.clients to authenticated;
    create policy clients_read on public.clients for select to authenticated using(auth.uid()=user_id);
    create policy clients_write on public.clients for insert to authenticated with check(auth.uid()=user_id);
    create policy clients_update on public.clients for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);`);
  await db.exec(`create table public.leads(id uuid primary key,user_id uuid not null references auth.users(id));insert into public.leads values('${owner}','${owner}');alter table public.leads enable row level security;grant select,delete on public.leads to authenticated;create policy leads_read on public.leads for select to authenticated using(auth.uid()=user_id);`);
  const files=await readdir('supabase/migrations');
  for(const suffix of ['workspace_document_persistence.sql','account_subscription_access.sql']) {
    const path=files.find(file=>file.endsWith(suffix)); assert.ok(path); await db.exec(await readFile('supabase/migrations/'+path,'utf8'));
  }
  const login=async user=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role authenticated');};
  await login(owner);
  await db.query('insert into public.workspace_documents(user_id,key,value) values($1,$2,$3)',[owner,'clients','private']);
  assert.equal((await db.query('select value from public.workspace_documents')).rows[0].value,'private');
  await assert.rejects(db.exec("update public.workspace_documents set revision=7 where key='clients'"));
  await login(other);assert.equal((await db.query('select * from public.workspace_documents')).rows.length,0);
  await assert.rejects(db.query('insert into public.workspace_documents(user_id,key,value) values($1,$2,$3)',[owner,'forged','bad']));
  await assert.rejects(db.exec("insert into public.account_subscriptions(user_id,provider,provider_subscription_id,status,current_period_end,last_event_created) values('"+other+"','manual','forged','active',now()+interval '1 year',1)"));
  await db.exec('reset role; update public.platform_config set billing_enforced=true where id;');
  await login(owner); assert.equal((await db.query('select public.account_can_write() as allowed')).rows[0].allowed,false);
  await assert.rejects(db.exec("update public.workspace_documents set value='unpaid',revision=revision+1 where key='clients' returning key").then(result=>{if(!result.some(x=>x.rows.length))throw Error('write denied')}));
  assert.equal((await db.query('select value from public.workspace_documents')).rows[0].value,'private');
  await assert.rejects(db.query('select public.delete_owned_lead($1)',[owner]));
  await assert.rejects(db.query('insert into public.clients(id,user_id,name) values($1,$2,$3)',[other,owner,'unpaid']));
  await db.exec('reset role; set role service_role;');
  const apply=async(id,status,created,end='2099-01-01')=>(await db.query('select public.apply_billing_event($1,$2,$3,$4,$5,$6,$7,$8) as applied',['manual',id,owner,'sub-test',status,end,null,created])).rows[0].applied;
  assert.equal(await apply('evt-1','active',10),true);assert.equal(await apply('evt-1','refunded',11),false);assert.equal(await apply('evt-old','unpaid',1),false);
  await login(owner);assert.equal((await db.query('select public.account_can_write() as allowed')).rows[0].allowed,true);
  await db.exec("update public.workspace_documents set value='paid',revision=revision+1 where key='clients';");
  await db.exec('reset role; set role service_role;');await apply('evt-cancel','canceled',11);
  await login(owner);assert.equal((await db.query('select public.account_can_write() as allowed')).rows[0].allowed,true);
  await db.exec('reset role; set role service_role;');await apply('evt-refund','refunded',12);
  await login(owner);assert.equal((await db.query('select public.account_can_write() as allowed')).rows[0].allowed,false);
  await assert.rejects(db.query('select public.apply_billing_event($1,$2,$3,$4,$5,$6,$7,$8)',['manual','forged',owner,'x','active','2099-01-01',null,100]));
  console.log('PASS database: migrations, owner RLS, revision constraints, read-only expiration, protected subscription changes, deduplication, stale events, cancellation and refund.');
} finally { await db.close(); }
