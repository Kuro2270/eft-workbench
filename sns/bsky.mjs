/* Bluesky とのやり取り（ログイン・鍵の取り直し・API・画像の送信）。役割はこれだけ。
   いいね（bsky-like.mjs）と、動画の告知（bsky-post-video.mjs）の両方で使う。
   環境変数：BSKY_HANDLE, BSKY_APP_PASSWORD（アプリパスワード。ログイン用のパスワードではない）
             BSKY_BASE … 確認用（作り物のサーバーに向ける） */
import { appendFile } from "node:fs/promises";

export const BASE = process.env.BSKY_BASE || "https://bsky.social/xrpc";
const REFRESH_MS = 60 * 60000;   // ログインの鍵を取り直す間隔（1時間。鍵は2時間ほどで切れる）

export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const summary = async md => { if(process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, md + "\n"); };

/* ログインして、API を呼ぶための道具を返す。鍵が無ければ null */
export async function login(){
  const H = process.env.BSKY_HANDLE, P = process.env.BSKY_APP_PASSWORD;
  if(!H || !P) return null;
  const s = await fetch(`${BASE}/com.atproto.server.createSession`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: H, password: P }) });
  if(!s.ok) throw new Error(`Bluesky のログインに失敗 HTTP ${s.status}: ${(await s.text()).slice(0, 200)}`);
  const session = await s.json();
  let fresh = Date.now();
  const auth = () => ({ Authorization: `Bearer ${session.accessJwt}` });
  async function refresh(){
    const r = await fetch(`${BASE}/com.atproto.server.refreshSession`, { method: "POST", headers: { Authorization: `Bearer ${session.refreshJwt}` } });
    if(!r.ok) throw new Error(`Bluesky の鍵の取り直しに失敗 HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const n = await r.json(); session.accessJwt = n.accessJwt; session.refreshJwt = n.refreshJwt; fresh = Date.now();
    console.log("（ログインの鍵を取り直しました）");
  }
  async function call(path, init = {}){
    const r = await fetch(`${BASE}/${path}`, { ...init, headers: { ...(init.headers || {}), ...auth() } });
    if(!r.ok) throw new Error(`${path.split("?")[0]} HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
  }
  /* API を呼ぶ。前に鍵を取ってから1時間たっていたら取り直す。それでも鍵が切れていたら（ExpiredToken）、1回だけ取り直して呼び直す */
  async function api(path, init = {}){
    if(Date.now() - fresh > REFRESH_MS) await refresh();
    try{ return await call(path, init); }
    catch(e){ if(!/ExpiredToken/.test(e.message)) throw e; await refresh(); return call(path, init); }
  }
  const create = (collection, record) => api("com.atproto.repo.createRecord", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo: session.did, collection, record }) });
  const uploadBlob = async (buf, mime) => (await api("com.atproto.repo.uploadBlob", { method: "POST", headers: { "Content-Type": mime }, body: buf })).blob;
  return { did: session.did, handle: session.handle, api, create, uploadBlob };
}
