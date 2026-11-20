// Chợ Đồ Cũ — client (Supabase). Mọi quy tắc tiền/phí được kiểm tra lại trên server (RLS + trigger).
new MutationObserver(()=>{for(const c of document.querySelectorAll('.stack td:not([data-l])')){let i=0,p=c;while(p=p.previousElementSibling)i+=p.colSpan;c.dataset.l=c.closest('table').rows[0].cells[i]?.textContent||''}}).observe(document,{childList:true,subtree:true});
{
const SB_URL = 'https://dddmvbowpxkpwpdkicwv.supabase.co';
const SB_KEY = 'sb_publishable_em0ZycGd6MEADB4agXgZhA_oKrCC9dU'; // khóa công khai, an toàn để nằm trên web
const sb = window.supabase.createClient(SB_URL, SB_KEY);
const $ = s => document.querySelector(s);
const CATS=[["dt","Điện thoại, máy tính bảng"],["lap","Laptop, máy tính"],["dm","Điện máy, gia dụng"],["nt","Nội thất"],["xe","Xe, phụ tùng"],["tt","Thời trang"],["mb","Mẹ và bé"],["sach","Sách, học tập"],["tthao","Thể thao, dã ngoại"],["khac","Khác"]];
const CONDS=[["moi","Gần như mới"],["tot","Còn tốt"],["kha","Có vết dùng"],["hu","Hư, bán xác"]];
const DAY=864e5;
let cfg={name:'Chợ Đồ Cũ Chơn Thành',fee_rate:5,fee_min:5000,fee_max:200000,free_under:50000,pay_days:7,pay_note:'',areas:['Chơn Thành','Đồng Xoài','Bình Long','Hớn Quản','Bàu Bàng','Nơi khác']};
let session=null, me=null, prof=null, listings=[], myPaid={}, myClaims=[], adm={purchases:[],reports:[],payments:[],profiles:[],claims:[]};
let view='cho', q='', fcat='', farea='', sort='new', draft=[], loaded=false;
const catName=k=>(CATS.find(c=>c[0]===k)||[,'Khác'])[1];
const condName=k=>(CONDS.find(c=>c[0]===k)||[,''])[1];
const money=n=>(Math.round(+n||0)).toLocaleString('vi-VN')+'đ';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/gi,'d').toLowerCase();
const fee=p=>{p=+p||0;if(p<cfg.free_under)return 0;const f=Math.round(p*cfg.fee_rate/100/1000)*1000;return Math.min(cfg.fee_max,Math.max(cfg.fee_min,f))};
const ts=t=>new Date(t).getTime();
const ago=t=>{const m=Math.floor((Date.now()-ts(t))/6e4);if(m<60)return Math.max(1,m)+' phút trước';if(m<1440)return Math.floor(m/60)+' giờ trước';return Math.floor(m/1440)+' ngày trước'};
const dstr=t=>new Date(t).toLocaleDateString('vi-VN');
const img=p=>sb.storage.from('photos').getPublicUrl(p).data.publicUrl;
const isAdmin=()=>!!(prof&&prof.is_admin);
function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',3500)}
const errMsg=e=>{const m=(e&&e.message)||'';return /quá hạn|tối đa|Đã bán|Chỉ quản trị|Không tìm thấy|không còn|Giá|khóa|đăng nhập|chờ xác nhận|chính mình|Bạn không/.test(m)?m:'Chưa lưu được: '+(m||'lỗi mạng')};
function dueOf(l){return ts(l.sold_at)+cfg.pay_days*DAY}
function ledger(uid,paid){let owe=0,got=0,over=0,n=0;for(const l of listings){if(l.seller_id!==uid||l.status!=='da_ban'||!l.fee)continue;n++;if(paid[l.id])got+=+paid[l.id];else{owe+=+l.fee;if(Date.now()>dueOf(l))over+=+l.fee}}return{owe,got,over,n}}

/* ---------- LOAD ---------- */
async function loadAll(){
  const c=await sb.from('config').select('*').eq('id',1).maybeSingle();if(c.data)cfg=c.data;
  const r=await sb.from('listings').select('*, seller:profiles!listings_seller_id_fkey(display_name,verified)').order('created_at',{ascending:false}).limit(1000);
  if(r.error){toast('Không tải được chợ: '+r.error.message)}else listings=r.data||[];
  myPaid={};myClaims=[];
  if(me){
    const p=await sb.rpc('my_profile');prof=p.data||null;
    const [f,cl,pu]=await Promise.all([sb.from('fee_payments').select('listing_id,amount,seller_id'),sb.from('fee_claims').select('*').order('created_at',{ascending:false}),sb.from('purchases').select('*')]);
    (f.data||[]).forEach(x=>{if(x.seller_id===me)myPaid[x.listing_id]=x.amount});
    myClaims=(cl.data||[]).filter(x=>x.seller_id===me);adm.purchases=pu.data||[];
    if(isAdmin()){
      const [b,d]=await Promise.all([sb.from('reports').select('*').order('created_at',{ascending:false}),sb.rpc('admin_profiles')]);
      adm={purchases:pu.data||[],reports:b.data||[],payments:f.data||[],profiles:d.data||[],claims:cl.data||[]};
    }
  }else{prof=null;adm={purchases:[],reports:[],payments:[],profiles:[],claims:[]}}
  loaded=true;render();
}
/* ---------- RENDER ---------- */
function render(){
  document.title=cfg.name;$('#bname').textContent=cfg.name;
  $('#tabadmin').hidden=!isAdmin();
  $('#who').innerHTML=me?`<button class="btn s ghost" data-act="logout">${esc((prof&&prof.display_name)||'Tài khoản')} · Thoát</button>`:`<button class="btn s ghost" data-act="login">Đăng nhập</button>`;
  document.querySelectorAll('#tabs a').forEach(a=>a.classList.toggle('on',a.dataset.v===view));
  $('#app').innerHTML=(!loaded?'<div class="note">Đang tải chợ…</div>':'')+({cho:vMarket,'cua-toi':vMine,'quy-dinh':vRules,'quan-tri':vAdmin}[view]||vMarket)();
}
function cardHTML(l){const sold=l.status==='da_ban';return `<button class="tag" data-act="open" data-k="${l.id}"><div class="ph">${l.photos&&l.photos[0]?`<img loading="lazy" src="${esc(img(l.photos[0]))}" alt="">`:`<span class="ini">${esc(catName(l.cat)[0])}</span>`}</div>
<div class="tb"><span class="pr">${money(sold&&l.sold_price!=null?l.sold_price:l.price)}</span><span class="tt">${esc(l.title)}</span><span class="mt">${esc(l.area)} · ${esc(condName(l.cond))} · ${ago(l.created_at)}</span></div>
${sold?'<span class="stampx">ĐÃ BÁN</span>':''}<span class="corner">${l.status==='giu'?'<span class="badge w">Đang giữ</span>':''}</span></button>`}
function vMarket(){
  let list=listings.filter(l=>l.status==='ban'||l.status==='giu'||(l.status==='da_ban'&&Date.now()-ts(l.sold_at)<3*DAY));
  if(q){const k=norm(q);list=list.filter(l=>norm(l.title+' '+l.descr).includes(k))}
  if(fcat)list=list.filter(l=>l.cat===fcat);if(farea)list=list.filter(l=>l.area===farea);
  if(sort==='lo')list.sort((a,b)=>a.price-b.price);else if(sort==='hi')list.sort((a,b)=>b.price-a.price);
  list.sort((a,b)=>(a.status==='da_ban')-(b.status==='da_ban'));
  return `<div class="filters"><input id="q" type="search" placeholder="Tìm: tủ lạnh, xe đạp, điện thoại…" value="${esc(q)}" aria-label="Tìm kiếm">
<select id="farea" aria-label="Khu vực"><option value="">Mọi khu vực</option>${cfg.areas.map(a=>`<option ${a===farea?'selected':''}>${esc(a)}</option>`).join('')}</select>
<select id="sort" aria-label="Sắp xếp"><option value="new">Mới đăng</option><option value="lo" ${sort==='lo'?'selected':''}>Giá thấp trước</option><option value="hi" ${sort==='hi'?'selected':''}>Giá cao trước</option></select>
<button class="btn" data-act="clear">Xóa lọc</button></div>
<div class="chips"><button class="chip ${fcat?'':'on'}" data-act="cat" data-k="">Tất cả</button>${CATS.map(c=>`<button class="chip ${fcat===c[0]?'on':''}" data-act="cat" data-k="${c[0]}">${c[1]}</button>`).join('')}</div>
<p class="count">${list.length} món ${q||fcat||farea?'khớp bộ lọc':'đang bày bán'}</p>
${list.length?`<div class="grid">${list.map(cardHTML).join('')}</div>`:`<div class="empty"><b>${loaded?'Chưa có món nào ở đây':'Đang tải…'}</b>${loaded?'Nhà có món không dùng nữa? Bấm “Đăng bán”. Đăng tin miễn phí, chỉ trả phí khi bán được.':''}</div>`}`}
function vMine(){
  if(!me)return `<div class="empty"><b>Đăng nhập để bán đồ</b>Tạo tài khoản bằng email trong 1 phút.<br><br><button class="btn p" data-act="login">Đăng nhập / Đăng ký</button></div>`;
  const mine=listings.filter(l=>l.seller_id===me),L=ledger(me,myPaid);
  const st={ban:['Đang bán','g'],giu:['Đang giữ','w'],da_ban:['Đã bán','r'],an:['Đã ẩn',''],an_admin:['Bị quản trị ẩn','r']};
  return `<div class="kpis"><div class="kpi"><span>Đang bán</span><b>${mine.filter(l=>l.status==='ban'||l.status==='giu').length}</b></div><div class="kpi"><span>Đã bán</span><b>${L.n}</b></div><div class="kpi"><span>Phí còn phải nộp</span><b>${money(L.owe)}</b></div><div class="kpi"><span>Phí quá hạn</span><b style="color:${L.over?'var(--stamp)':'inherit'}">${money(L.over)}</b></div></div>
${prof?.banned?'<div class="note"><b>Tài khoản của bạn đang bị khóa đăng tin.</b> Liên hệ quản trị sàn để được giải quyết.</div>':''}${payPanel(L)}
<div class="panel"><div class="two"><div class="fld"><label for="sname">Tên hiển thị khi bán</label><input id="sname" maxlength="40" value="${esc(prof?.display_name||'')}"></div><div class="fld"><label for="sphone">Số điện thoại / Zalo</label><input id="sphone" maxlength="20" inputmode="tel" value="${esc(prof?.phone||'')}"></div></div><button class="btn s" data-act="saveprofile">Lưu thông tin</button> ${prof?.verified?'<span class="badge g">Đã xác thực</span>':'<span class="hint">Chưa xác thực. Quản trị xác thực sau khi kiểm tra số điện thoại.</span>'}</div>
${mine.length?`<table class="stack"><thead><tr><th>Món</th><th class="n">Giá</th><th>Trạng thái</th><th class="n">Phí sàn</th><th>Việc</th></tr></thead><tbody>${mine.map(l=>`<tr><td><b>${esc(l.title)}</b><br><span class="hint">${ago(l.created_at)}</span></td><td class="n">${money(l.status==='da_ban'?l.sold_price:l.price)}</td><td><span class="badge ${st[l.status][1]}">${st[l.status][0]}</span></td>
<td class="n">${l.status==='da_ban'?(+l.fee?money(l.fee)+'<br>'+(myPaid[l.id]?'<span class="badge g">Đã nộp</span>':Date.now()>dueOf(l)?'<span class="badge r">Quá hạn</span>':'<span class="badge w">Hạn '+dstr(dueOf(l))+'</span>'):'Miễn phí'):''}</td>
<td><div class="acts">${l.status==='ban'||l.status==='giu'?`<button class="btn s p" data-act="sold" data-k="${l.id}">Đã bán</button><button class="btn s" data-act="edit" data-k="${l.id}">Sửa</button><button class="btn s" data-act="hold" data-k="${l.id}">${l.status==='giu'?'Mở bán lại':'Giữ hàng'}</button><button class="btn s" data-act="hide" data-k="${l.id}">Ẩn</button>`:''}${l.status==='an'?`<button class="btn s" data-act="unhide" data-k="${l.id}">Hiện lại</button>`:''}${l.status!=='da_ban'?`<button class="btn s" data-act="del" data-k="${l.id}">Xóa</button>`:''}</div></td></tr>`).join('')}</tbody></table>`:'<div class="empty"><b>Bạn chưa đăng món nào</b>Bấm “Đăng bán” ở góc trên. Đăng tin miễn phí.</div>'}`}
function payPanel(L){if(!L.owe)return '';const pend=myClaims.find(c=>c.status==='cho'),code='CDC '+(prof?.pay_code||'');
  return `<div class="panel pay"><h2 class="h2s">Nộp phí sàn: ${money(L.owe)}</h2>
<p class="note" style="margin:0 0 12px">Số điện thoại của bạn đang <b>tạm ẩn</b> trên mọi tin cho đến khi sàn xác nhận đã nhận phí.${L.over?' Bạn có phí <b>quá hạn</b> nên tạm chưa đăng tin mới được.':''}</p>
<div class="paygrid">${cfg.qr_path?`<img class="qr" src="${esc(img(cfg.qr_path))}" alt="Mã QR nộp phí">`:'<div class="qr none">Quản trị chưa cài mã QR</div>'}
<div><p>Số tiền: <b class="big">${money(pend?pend.amount:L.owe)}</b></p><p>Nội dung chuyển: <b class="big">${esc(pend?pend.code:code)}</b> <button class="btn s" data-act="copy" data-k="${esc(pend?pend.code:code)}">Chép</button></p>${cfg.pay_note?`<p class="hint">${esc(cfg.pay_note)}</p>`:''}
${pend?`<p><span class="badge w">Đã báo chuyển ${dstr(pend.created_at)}, đang chờ quản trị xác nhận</span></p>`:`<button class="btn p" data-act="claim">Tôi đã chuyển ${money(L.owe)}</button>`}
${myClaims.some(c=>c.status==='tu_choi')?'<p class="hint">Có lần báo chuyển trước bị từ chối vì quản trị chưa thấy tiền. Kiểm tra lại số tiền và nội dung rồi báo lại.</p>':''}</div></div></div>`}
function vRules(){const ex=[30000,200000,1500000,8000000];
  return `<div class="panel rules"><h2>Đăng miễn phí. Chỉ trả phí khi bán được.</h2>
<h3>Phí sàn</h3><ul><li>Phí = <b>${cfg.fee_rate}%</b> giá bán thực tế, làm tròn đến nghìn đồng.</li><li>Tối thiểu ${money(cfg.fee_min)}, tối đa ${money(cfg.fee_max)} mỗi món.</li><li>Món bán dưới ${money(cfg.free_under)}: miễn phí.</li><li>Nộp phí trong ${cfg.pay_days} ngày sau khi báo đã bán: quét mã QR ở mục “Tin của tôi”, ghi đúng nội dung chuyển, rồi bấm “Tôi đã chuyển”.</li><li>Khi còn phí chưa nộp, số điện thoại của người bán tạm ẩn trên mọi tin. Quá hạn thì tạm khóa đăng tin mới cho đến khi nộp.</li></ul>
<table><thead><tr><th>Bán được</th><th class="n">Phí sàn</th><th class="n">Người bán nhận</th></tr></thead><tbody>${ex.map(p=>`<tr><td>${money(p)}</td><td class="n">${money(fee(p))}</td><td class="n">${money(p-fee(p))}</td></tr>`).join('')}</tbody></table>
<h3>Mua bán diễn ra thế nào</h3><ol><li>Người bán đăng tin kèm ảnh thật, giá, tình trạng, số liên hệ.</li><li>Người mua gọi hoặc nhắn Zalo, hẹn xem hàng. Tiền hàng trả thẳng cho người bán; sàn không giữ tiền hàng.</li><li>Bán xong, người bán bấm “Đã bán” và nhập giá chốt. Sàn tính phí tự động.</li><li>Người mua nên bấm “Tôi đã mua món này” và ghi giá thật để được sàn hỗ trợ khi có khiếu nại.</li></ol>
<h3>Không được đăng</h3><ul><li>Vũ khí, chất cấm, pháo, thuốc kê đơn, động vật hoang dã.</li><li>Hàng giả, hàng không rõ nguồn gốc, hàng trộm cắp, giấy tờ tùy thân, SIM đã đăng ký tên người khác.</li><li>Tài khoản, mã thẻ, dịch vụ cờ bạc hay vay tiền.</li><li>Tin sai sự thật về tình trạng hàng.</li></ul>
<h3>Khiếu nại</h3><p>Bấm “Báo vi phạm” ở tin đăng. Quản trị xem trong 24 giờ, có thể ẩn tin và khóa người bán vi phạm.</p>
<h3>Dữ liệu cá nhân</h3><p>Sàn lưu email, tên hiển thị và số điện thoại bạn nhập. Số điện thoại chỉ hiện ở tin đang bán để người mua liên hệ; người chỉ mua không bị lộ số. Muốn xóa tài khoản, báo quản trị.</p>
<p class="hint">Người đăng chịu trách nhiệm về món hàng của mình. Sàn là nơi kết nối, không phải bên bán.</p></div>`}
function vAdmin(){if(!isAdmin())return '<div class="empty"><b>Chỉ quản trị sàn xem được trang này</b></div>';
  const paidAll={};adm.payments.forEach(p=>paidAll[p.listing_id]=p.amount);
  const P=id=>adm.profiles.find(x=>x.id===id)||{},nm=id=>esc(P(id).display_name||'Người dùng');
  const sold=listings.filter(l=>l.status==='da_ban'),sellers=[...new Set(listings.map(l=>l.seller_id))];
  let owe=0,got=0,over=0;const rows=sellers.map(s=>{const L=ledger(s,paidAll);owe+=L.owe;got+=L.got;over+=L.over;return{s,L,p:P(s),active:listings.filter(l=>l.seller_id===s&&(l.status==='ban'||l.status==='giu')).length}}).sort((a,b)=>b.L.owe-a.L.owe);
  const pend=adm.claims.filter(c=>c.status==='cho');
  const flags=adm.purchases.map(p=>({p,l:listings.find(l=>l.id===p.listing_id)})).filter(x=>x.l&&(x.l.status!=='da_ban'||(+x.p.price>0&&Math.abs(x.p.price-x.l.sold_price)>Math.max(50000,x.p.price*0.1))));
  const openRep=adm.reports.filter(r=>r.status==='moi');
  return `<div class="kpis"><div class="kpi"><span>Tin đang bán</span><b>${listings.filter(l=>l.status==='ban'||l.status==='giu').length}</b></div><div class="kpi"><span>Món đã bán</span><b>${sold.length}</b></div><div class="kpi"><span>Giá trị đã bán</span><b>${money(sold.reduce((s,l)=>s+(+l.sold_price||0),0))}</b></div><div class="kpi"><span>Phí đã thu</span><b>${money(got)}</b></div><div class="kpi"><span>Phí còn phải thu</span><b>${money(owe)}</b></div><div class="kpi"><span>Trong đó quá hạn</span><b style="color:${over?'var(--stamp)':'inherit'}">${money(over)}</b></div><div class="kpi"><span>Người dùng</span><b>${adm.profiles.length}</b></div></div>
<div class="panel"><h2 class="h2s">Chờ xác nhận nộp phí ${pend.length?`<span class="badge w">${pend.length}</span>`:''}</h2><p class="hint">Mở lịch sử nhận tiền MoMo, thấy đúng số tiền và nội dung thì bấm Xác nhận.</p>${pend.length?`<table class="stack"><thead><tr><th>Người bán</th><th>Nội dung chuyển</th><th class="n">Số tiền</th><th>Lúc báo</th><th>Việc</th></tr></thead><tbody>${pend.map(c=>`<tr><td><b>${nm(c.seller_id)}</b><br><span class="hint">${esc(P(c.seller_id).phone||'')}</span></td><td><b>${esc(c.code)}</b></td><td class="n">${money(c.amount)}</td><td>${new Date(c.created_at).toLocaleString('vi-VN')}</td><td><div class="acts"><button class="btn s p" data-act="claimok" data-k="${c.id}">Xác nhận đã nhận</button><button class="btn s" data-act="claimno" data-k="${c.id}">Chưa thấy tiền</button></div></td></tr>`).join('')}</tbody></table>`:'<p>Không có yêu cầu nào đang chờ.</p>'}</div>
<div class="panel"><h2 class="h2s">Người bán</h2>${rows.length?`<table class="stack"><thead><tr><th>Người bán</th><th class="n">Đang bán</th><th class="n">Đã bán</th><th class="n">Đã thu</th><th class="n">Còn nợ</th><th>Việc</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.p.display_name||'Người bán')}</b> ${r.p.verified?'<span class="badge g">Xác thực</span>':''}${r.p.banned?' <span class="badge r">Đang khóa</span>':''}<br><span class="hint">${esc(r.p.phone||'chưa có SĐT')} · mã CDC ${esc(r.p.pay_code||'')}</span></td><td class="n">${r.active}</td><td class="n">${r.L.n}</td><td class="n">${money(r.L.got)}</td><td class="n">${money(r.L.owe)}${r.L.over?'<br><span class="badge r">Quá hạn '+money(r.L.over)+'</span>':''}</td><td><div class="acts">${r.L.owe?`<button class="btn s" data-act="collect" data-k="${r.s}">Thu tiền mặt ${money(r.L.owe)}</button>`:''}<button class="btn s" data-act="verify" data-k="${r.s}" data-v="${r.p.verified?0:1}">${r.p.verified?'Bỏ xác thực':'Xác thực'}</button>${r.s!==me?`<button class="btn s ${r.p.banned?'':'d'}" data-act="ban" data-k="${r.s}" data-v="${r.p.banned?0:1}">${r.p.banned?'Mở khóa':'Khóa'}</button>`:''}</div></td></tr>`).join('')}</tbody></table>`:'<p class="hint">Chưa có người bán.</p>'}</div>
<div class="panel"><h2 class="h2s">Đối chiếu chống “bán ngoài”</h2><p class="hint">Người mua báo đã mua nhưng người bán chưa báo bán, hoặc hai bên báo giá chênh nhau.</p>${flags.length?`<table class="stack"><thead><tr><th>Món</th><th>Người bán</th><th class="n">Người mua báo</th><th class="n">Người bán báo</th><th>Ngày</th></tr></thead><tbody>${flags.map(f=>`<tr><td>${esc(f.l.title)}</td><td>${nm(f.l.seller_id)}</td><td class="n">${money(f.p.price)}</td><td class="n">${f.l.status==='da_ban'?money(f.l.sold_price):'chưa báo bán'}</td><td>${dstr(f.p.created_at)}</td></tr>`).join('')}</tbody></table>`:'<p>Không có chênh lệch.</p>'}</div>
<div class="panel"><h2 class="h2s">Báo vi phạm ${openRep.length?`<span class="badge r">${openRep.length} mới</span>`:''}</h2>${adm.reports.length?`<table class="stack"><thead><tr><th>Món</th><th>Lý do</th><th>Ngày</th><th>Việc</th></tr></thead><tbody>${adm.reports.map(r=>{const l=listings.find(x=>x.id===r.listing_id);return `<tr><td>${esc(l?l.title:'(đã xóa)')}<br><span class="hint">${l?nm(l.seller_id):''}</span></td><td>${esc(r.reason)}</td><td>${dstr(r.created_at)}</td><td><div class="acts">${l&&l.status!=='an_admin'?`<button class="btn s d" data-act="ahide" data-k="${l.id}">Ẩn tin</button>`:''}${r.status==='moi'?`<button class="btn s" data-act="repdone" data-k="${r.id}">Đã xử lý</button>`:'<span class="badge g">Đã xử lý</span>'}</div></td></tr>`}).join('')}</tbody></table>`:'<p>Chưa có báo cáo nào.</p>'}</div>
<div class="panel"><h2 class="h2s">Mã QR nhận phí</h2><div class="paygrid">${cfg.qr_path?`<img class="qr" src="${esc(img(cfg.qr_path))}" alt="Mã QR hiện tại">`:'<div class="qr none">Chưa có mã QR</div>'}<div><p class="hint">Tải ảnh mã QR MoMo (hoặc ngân hàng) của bạn. Người bán thấy mã này khi nộp phí.</p><input id="qrfile" type="file" accept="image/*"></div></div></div>
<div class="panel"><h2 class="h2s">Cấu hình sàn</h2><div class="two"><div class="fld"><label for="c_name">Tên sàn</label><input id="c_name" value="${esc(cfg.name)}"></div><div class="fld"><label for="c_rate">Phí (% giá bán)</label><input id="c_rate" type="number" step="0.5" min="0" max="30" value="${cfg.fee_rate}"></div><div class="fld"><label for="c_min">Phí tối thiểu (đ)</label><input id="c_min" type="number" step="1000" value="${cfg.fee_min}"></div><div class="fld"><label for="c_max">Phí tối đa (đ)</label><input id="c_max" type="number" step="1000" value="${cfg.fee_max}"></div><div class="fld"><label for="c_free">Miễn phí cho món dưới (đ)</label><input id="c_free" type="number" step="1000" value="${cfg.free_under}"></div><div class="fld"><label for="c_days">Hạn nộp phí (ngày)</label><input id="c_days" type="number" min="1" value="${cfg.pay_days}"></div></div>
<div class="fld"><label for="c_areas">Khu vực (cách nhau dấu phẩy)</label><input id="c_areas" value="${esc(cfg.areas.join(', '))}"></div><div class="fld"><label for="c_pay">Ghi chú thêm khi nộp phí</label><textarea id="c_pay" placeholder="VD: Chuyển qua MoMo, tên người nhận Vi Văn Biểu. Sàn xác nhận trong 24 giờ.">${esc(cfg.pay_note)}</textarea><span class="hint">Mọi người dùng sàn đều đọc được nội dung này.</span></div><button class="btn p" data-act="savecfg">Lưu cấu hình</button></div>`}

/* ---------- SHEETS ---------- */
function openSheet(h){$('#sheet').innerHTML='<button class="closer" data-act="close" aria-label="Đóng">×</button>'+h;$('#ov').classList.add('on')}
function closeSheet(){$('#ov').classList.remove('on');draft=[]}
function loginForm(mode){mode=mode||'in';openSheet(`<h2>${mode==='in'?'Đăng nhập':'Tạo tài khoản'}</h2><form id="lf" data-mode="${mode}">
${mode==='up'?`<div class="fld"><label for="l_name">Tên hiển thị</label><input id="l_name" required maxlength="40" placeholder="VD: Chị Lan đồ gia dụng"></div><div class="fld"><label for="l_phone">Số điện thoại / Zalo</label><input id="l_phone" required maxlength="20" inputmode="tel"></div>`:''}
<div class="fld"><label for="l_email">Email</label><input id="l_email" type="email" required autocomplete="email"></div>
<div class="fld"><label for="l_pass">Mật khẩu (ít nhất 6 ký tự)</label><input id="l_pass" type="password" required minlength="6" autocomplete="${mode==='in'?'current-password':'new-password'}"></div>
${mode==='up'?'<label class="chk"><input type="checkbox" required> <span>Tôi đồng ý với <a href="#quy-dinh" data-act="close">phí và quy định</a> của sàn.</span></label>':''}
<button class="btn p wide" type="submit">${mode==='in'?'Đăng nhập':'Tạo tài khoản'}</button></form>
${mode==='in'?'<p style="text-align:center"><button class="linkb" data-act="forgot">Quên mật khẩu?</button></p>':''}<p style="text-align:center">${mode==='in'?'Chưa có tài khoản? <button class="linkb" data-act="signup">Tạo tài khoản</button>':'Đã có tài khoản? <button class="linkb" data-act="login">Đăng nhập</button>'}</p>`)}
async function submitLogin(f){const email=$('#l_email').value.trim(),password=$('#l_pass').value,btn=f.querySelector('button[type=submit]');btn.disabled=true;
  if(f.dataset.mode==='up'){const{data,error}=await sb.auth.signUp({email,password,options:{data:{display_name:$('#l_name').value.trim(),phone:$('#l_phone').value.trim()},emailRedirectTo:location.origin+location.pathname}});btn.disabled=false;
    if(error)return toast('Chưa tạo được: '+error.message);if(!data.session){openSheet('<h2>Kiểm tra email</h2><p>Sàn đã gửi thư xác nhận tới <b>'+esc(email)+'</b>. Bấm vào link trong thư rồi quay lại đăng nhập.</p><button class="btn p wide" data-act="login">Đăng nhập</button>');return}
    closeSheet();toast('Chào mừng bạn đến chợ!')}
  else{const{error}=await sb.auth.signInWithPassword({email,password});btn.disabled=false;if(error)return toast(/confirm/i.test(error.message)?'Bạn chưa bấm link xác nhận trong email.':'Sai email hoặc mật khẩu.');closeSheet()}}
function openItem(id){const l=listings.find(x=>x.id===id);if(!l)return;const s=l.seller||{},own=l.seller_id===me,sold=l.status==='da_ban',bought=adm.purchases.some(p=>p.listing_id===id&&p.buyer_id===me);
  openSheet(`${(l.photos||[]).length?`<div class="gal">${l.photos.map(p=>`<img src="${esc(img(p))}" alt="">`).join('')}</div>`:''}<h2>${esc(l.title)}</h2>
<p><span class="pr">${money(sold?l.sold_price:l.price)}</span> ${sold?'<span class="badge r">Đã bán</span>':l.status==='giu'?'<span class="badge w">Đang có người giữ</span>':''}</p>
<p class="hint">${esc(catName(l.cat))} · ${esc(condName(l.cond))} · ${esc(l.area)} · đăng ${ago(l.created_at)}</p><p style="white-space:pre-line">${esc(l.descr)}</p>
<div class="panel"><b>${esc(s.display_name||'Người bán')}</b> ${s.verified?'<span class="badge g">Đã xác thực</span>':'<span class="badge">Chưa xác thực</span>'}<div id="ct" class="contact">${sold?'':'<span class="hint">Đang lấy số liên hệ…</span>'}</div></div>
<div class="acts">${own?'<a class="btn" href="#cua-toi" data-act="close">Quản lý tin này</a>':`${!sold?`<button class="btn p" data-act="buy" data-k="${id}" ${bought?'disabled':''}>${bought?'Bạn đã báo mua món này':'Tôi đã mua món này'}</button>`:''}<button class="btn" data-act="report" data-k="${id}">Báo vi phạm</button>`}${isAdmin()&&!own&&l.status!=='an_admin'?`<button class="btn d" data-act="ahide" data-k="${id}">Ẩn tin (quản trị)</button>`:''}</div>`);
  if(!sold)sb.rpc('listing_contact',{p_listing:id}).then(({data})=>{const ct=$('#ct');if(!ct)return;const ph=data&&data.phone;
    if(ph)ct.innerHTML=`<a href="tel:${esc(ph.replace(/[^\d+]/g,''))}">${esc(ph)}</a><a class="btn s" href="https://zalo.me/${esc(ph.replace(/\D/g,''))}" target="_blank" rel="noopener">Nhắn Zalo</a><p class="hint" style="flex-basis:100%">Hẹn xem hàng nơi đông người. Không chuyển tiền trước cho người lạ.</p>`;
    else ct.innerHTML=`<span class="hint">${data&&data.reason==='hidden'?'Liên hệ của người bán đang tạm ẩn. Bạn quay lại sau nhé.':data&&data.reason==='none'?'Người bán chưa để số liên hệ.':'Tin này không còn nhận liên hệ.'}</span>`})}
function postForm(id){const l=id?listings.find(x=>x.id===id):null;draft=[];
  openSheet(`<h2>${l?'Sửa tin':'Đăng bán món đồ'}</h2><form id="pf" data-id="${l?l.id:''}">
<div class="fld"><label for="p_title">Tên món</label><input id="p_title" required minlength="3" maxlength="80" value="${esc(l?.title||'')}" placeholder="VD: Tủ lạnh Toshiba 180L"></div>
<div class="two"><div class="fld"><label for="p_price">Giá bán (đ)</label><input id="p_price" required type="number" min="0" step="1000" inputmode="numeric" value="${l?.price??''}"></div>
<div class="fld"><label for="p_cat">Loại</label><select id="p_cat">${CATS.map(c=>`<option value="${c[0]}" ${l?.cat===c[0]?'selected':''}>${c[1]}</option>`).join('')}</select></div>
<div class="fld"><label for="p_cond">Tình trạng</label><select id="p_cond">${CONDS.map(c=>`<option value="${c[0]}" ${l?.cond===c[0]?'selected':''}>${c[1]}</option>`).join('')}</select></div>
<div class="fld"><label for="p_area">Khu vực</label><select id="p_area">${cfg.areas.map(a=>`<option ${(l?.area||prof?.area)===a?'selected':''}>${esc(a)}</option>`).join('')}</select></div></div>
<div id="feep" class="feebox"></div>
<div class="fld"><label for="p_desc">Mô tả</label><textarea id="p_desc" maxlength="1500" placeholder="Mua năm nào, đã sửa gì chưa, lỗi nhỏ nếu có, giao hay tự lấy…">${esc(l?.descr||'')}</textarea></div>
<div class="fld"><label for="p_ph">Ảnh thật (tối đa 5)</label><input id="p_ph" type="file" accept="image/*" multiple><div class="thumbs" id="pth">${(l?.photos||[]).map(p=>`<img src="${esc(img(p))}" alt="">`).join('')}</div>${l?'<span class="hint">Chọn ảnh mới sẽ thay toàn bộ ảnh cũ.</span>':''}</div>
${prof?.phone?'':'<div class="fld"><label for="p_phone">Số điện thoại / Zalo</label><input id="p_phone" required maxlength="20" inputmode="tel"></div>'}
<label class="chk"><input type="checkbox" required> <span>Tôi là chủ món đồ, hàng hợp pháp, không thuộc danh sách cấm, mô tả đúng sự thật.</span></label>
<button class="btn p wide" type="submit">${l?'Lưu thay đổi':'Đăng tin miễn phí'}</button></form>`);
  const upd=()=>{const p=+$('#p_price').value||0;$('#feep').innerHTML=p?`Nếu bán đúng giá này: phí sàn <b>${money(fee(p))}</b>, bạn nhận ${money(p-fee(p))}`:'Nhập giá để xem phí sàn (chỉ tính khi bán được).'};
  $('#p_price').addEventListener('input',upd);upd();
  $('#p_ph').addEventListener('change',async e=>{const fs=[...e.target.files].slice(0,5);$('#pth').textContent='Đang xử lý ảnh…';draft=[];for(const f of fs){try{draft.push(await shrink(f,1200,.75))}catch(_){}}$('#pth').innerHTML=draft.map(b=>`<img src="${URL.createObjectURL(b)}" alt="">`).join('')||'Không đọc được ảnh.'})}
function shrink(file,max,qu){return new Promise((res,rej)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(b=>b?res(b):rej(),'image/jpeg',qu)};im.onerror=()=>{URL.revokeObjectURL(u);rej()};im.src=u})}
async function submitPost(f){const id=f.dataset.id,old=id?listings.find(x=>x.id===id):null,btn=f.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Đang lưu…';
  try{
    if($('#p_phone')){const r=await sb.from('profiles').update({phone:$('#p_phone').value.trim()}).eq('id',me);if(r.error)throw r.error}
    let photos=old?old.photos:[];
    if(draft.length){const up=[];for(const b of draft){const path=me+'/'+crypto.randomUUID()+'.jpg';const r=await sb.storage.from('photos').upload(path,b,{contentType:'image/jpeg'});if(r.error)throw r.error;up.push(path)}if(old&&old.photos.length)await sb.storage.from('photos').remove(old.photos);photos=up}
    const row={title:$('#p_title').value.trim(),price:Math.max(0,Math.round(+$('#p_price').value||0)),cat:$('#p_cat').value,cond:$('#p_cond').value,area:$('#p_area').value,descr:$('#p_desc').value.trim(),photos};
    const r=old?await sb.from('listings').update(row).eq('id',id):await sb.from('listings').insert(row);if(r.error)throw r.error;
    closeSheet();toast(old?'Đã lưu tin.':'Đã đăng! Món của bạn đang ở trong chợ.');await loadAll();
  }catch(e){toast(errMsg(e));btn.disabled=false;btn.textContent='Thử lại'}}
function soldForm(id){const l=listings.find(x=>x.id===id);openSheet(`<h2>Báo đã bán: ${esc(l.title)}</h2><div class="fld"><label for="s_price">Giá bán thực tế (đ)</label><input id="s_price" type="number" step="1000" min="0" inputmode="numeric" value="${l.price}"></div><div id="sfee" class="feebox"></div><p class="hint">Phí tính theo giá bạn nhập, nộp trong ${cfg.pay_days} ngày. Người mua có thể xác nhận giá với sàn, nên hãy nhập đúng giá.</p><button class="btn p wide" data-act="confirmsold" data-k="${id}">Xác nhận đã bán</button>`);
  const u=()=>{const p=+$('#s_price').value||0;$('#sfee').innerHTML=`Phí sàn: <b>${money(fee(p))}</b> · Hạn nộp ${dstr(Date.now()+cfg.pay_days*DAY)}`};$('#s_price').addEventListener('input',u);u()}

/* ---------- ACTIONS ---------- */
async function run(p,okMsg){const r=await p;if(r&&r.error){toast(errMsg(r.error));return false}if(okMsg)toast(okMsg);await loadAll();return true}
document.addEventListener('click',async e=>{const t=e.target.closest('[data-act]');if(!t){if(e.target===$('#ov'))closeSheet();return}const a=t.dataset.act,k=t.dataset.k;
  const needLogin=['post','sold','edit','hold','hide','unhide','del','saveprofile','buy','sendbuy','report','sendreport','confirmsold','claim'];
  if(needLogin.includes(a)&&!me){loginForm('in');return}
  if(t.tagName==='BUTTON'&&a!=='close')e.preventDefault();
  switch(a){
  case 'login':loginForm('in');break;case 'signup':loginForm('up');break;
  case 'logout':await sb.auth.signOut();break;
  case 'post':{if(prof&&prof.banned)return toast('Tài khoản đang bị khóa đăng tin, liên hệ quản trị.');const L=ledger(me,myPaid);if(L.over)return toast('Bạn có phí quá hạn. Nộp phí xong mới đăng tin mới được.');postForm();break}
  case 'close':closeSheet();break;
  case 'cat':fcat=k;render();break;
  case 'clear':q='';fcat='';farea='';sort='new';render();break;
  case 'open':openItem(k);break;
  case 'edit':postForm(k);break;case 'sold':soldForm(k);break;
  case 'confirmsold':{const p=Math.max(0,Math.round(+$('#s_price').value||0));t.disabled=true;const r=await sb.rpc('mark_sold',{p_listing:k,p_price:p});if(r.error){toast(errMsg(r.error));t.disabled=false;return}closeSheet();toast(r.data?'Chúc mừng! Phí sàn '+money(r.data)+' đã ghi vào mục của bạn.':'Chúc mừng! Món này được miễn phí.');await loadAll();break}
  case 'hold':{const l=listings.find(x=>x.id===k);await run(sb.from('listings').update({status:l.status==='giu'?'ban':'giu'}).eq('id',k));break}
  case 'hide':await run(sb.from('listings').update({status:'an'}).eq('id',k),'Đã ẩn tin.');break;
  case 'unhide':await run(sb.from('listings').update({status:'ban'}).eq('id',k),'Tin đã hiện lại.');break;
  case 'del':{if(t.dataset.sure!=='1'){t.dataset.sure='1';t.textContent='Bấm lần nữa để xóa';setTimeout(()=>{if(t.isConnected){t.dataset.sure='';t.textContent='Xóa'}},4000);return}const l=listings.find(x=>x.id===k);if(l.photos.length)await sb.storage.from('photos').remove(l.photos);await run(sb.from('listings').delete().eq('id',k),'Đã xóa tin.');break}
  case 'saveprofile':await run(sb.from('profiles').update({display_name:$('#sname').value.trim().slice(0,40),phone:$('#sphone').value.trim().slice(0,20)}).eq('id',me),'Đã lưu thông tin.');break;
  case 'buy':{const l=listings.find(x=>x.id===k);openSheet(`<h2>Bạn đã mua: ${esc(l.title)}</h2><div class="fld"><label for="b_price">Giá bạn đã trả thật (đ)</label><input id="b_price" type="number" step="1000" min="0" inputmode="numeric" value="${l.price}"></div><p class="hint">Thông tin này chỉ quản trị sàn xem, giúp sàn hỗ trợ bạn khi có khiếu nại.</p><button class="btn p wide" data-act="sendbuy" data-k="${k}">Gửi xác nhận</button>`);break}
  case 'sendbuy':{const p=Math.max(0,Math.round(+$('#b_price').value||0));if(await run(sb.from('purchases').insert({listing_id:k,price:p}),'Sàn đã ghi nhận bạn mua món này. Cảm ơn bạn!'))closeSheet();break}
  case 'report':openSheet(`<h2>Báo vi phạm</h2><div class="fld"><label for="r_why">Lý do</label><select id="r_why"><option>Hàng cấm hoặc không rõ nguồn gốc</option><option>Mô tả sai sự thật</option><option>Lừa đảo, đòi chuyển tiền trước</option><option>Tin trùng hoặc spam</option><option>Khác</option></select></div><div class="fld"><label for="r_note">Ghi chú thêm</label><textarea id="r_note" maxlength="500"></textarea></div><button class="btn d wide" data-act="sendreport" data-k="${k}">Gửi báo cáo</button>`);break;
  case 'sendreport':{const why=$('#r_why').value+($('#r_note').value.trim()?': '+$('#r_note').value.trim():'');if(await run(sb.from('reports').insert({listing_id:k,reason:why.slice(0,600)}),'Đã gửi. Quản trị sẽ xem trong 24 giờ.'))closeSheet();break}
  case 'collect':{t.disabled=true;const r=await sb.rpc('admin_record_payment',{p_seller:k});if(r.error){toast(errMsg(r.error));t.disabled=false;return}toast('Đã ghi nhận thu '+money(r.data));await loadAll();break}
  case 'verify':await run(sb.rpc('admin_set_verified',{p_user:k,p_val:t.dataset.v==='1'}));break;
  case 'ahide':if(await run(sb.from('listings').update({status:'an_admin'}).eq('id',k),'Đã ẩn tin.'))closeSheet();break;
  case 'copy':try{await navigator.clipboard.writeText(k);toast('Đã chép: '+k)}catch(_){toast(k)}break;
  case 'claim':{t.disabled=true;const r=await sb.rpc('submit_fee_claim');if(r.error){toast(errMsg(r.error));t.disabled=false;return}toast('Đã báo chuyển. Sàn sẽ xác nhận sớm, sau đó số điện thoại của bạn hiện lại.');await loadAll();break}
  case 'claimok':case 'claimno':{t.disabled=true;const r=await sb.rpc('admin_decide_claim',{p_claim:k,p_ok:a==='claimok'});if(r.error){toast(errMsg(r.error));t.disabled=false;return}toast(a==='claimok'?'Đã xác nhận nhận '+money(r.data):'Đã báo người bán chưa thấy tiền.');await loadAll();break}
  case 'ban':{if(t.dataset.sure!=='1'&&t.dataset.v==='1'){t.dataset.sure='1';t.textContent='Bấm lần nữa để khóa';setTimeout(()=>{if(t.isConnected){t.dataset.sure='';t.textContent='Khóa'}},4000);return}await run(sb.rpc('admin_set_banned',{p_user:k,p_val:t.dataset.v==='1'}),t.dataset.v==='1'?'Đã khóa người bán. Tin của họ đã ẩn khỏi chợ.':'Đã mở khóa.');break}
  case 'repdone':await run(sb.from('reports').update({status:'da_xu_ly'}).eq('id',k));break;
  case 'forgot':openSheet(`<h2>Quên mật khẩu</h2><div class="fld"><label for="f_email">Email đã đăng ký</label><input id="f_email" type="email" autocomplete="email"></div><button class="btn p wide" data-act="sendforgot">Gửi thư đặt lại mật khẩu</button>`);break;
  case 'sendforgot':{const em=$('#f_email').value.trim();if(!em)return toast('Nhập email.');t.disabled=true;const r=await sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname});t.disabled=false;if(r.error)return toast('Chưa gửi được: '+r.error.message);openSheet('<h2>Kiểm tra email</h2><p>Nếu email này đã đăng ký, bạn sẽ nhận thư có link đặt lại mật khẩu. Bấm link đó để quay lại đây đặt mật khẩu mới.</p>');break}
  case 'setpass':{const pw=$('#n_pass').value;if(pw.length<6)return toast('Mật khẩu ít nhất 6 ký tự.');const r=await sb.auth.updateUser({password:pw});if(r.error)return toast('Chưa đổi được: '+r.error.message);closeSheet();toast('Đã đổi mật khẩu.');break}
  case 'savecfg':{const n=(id,d)=>{const v=+$(id).value;return isFinite(v)&&v>=0?v:d};const c={name:$('#c_name').value.trim()||'Chợ Đồ Cũ',fee_rate:Math.min(30,n('#c_rate',5)),fee_min:n('#c_min',0),fee_max:n('#c_max',0),free_under:n('#c_free',0),pay_days:Math.max(1,n('#c_days',7)),areas:$('#c_areas').value.split(',').map(x=>x.trim()).filter(Boolean),pay_note:$('#c_pay').value.trim().slice(0,600)};if(!c.areas.length)return toast('Cần ít nhất 1 khu vực.');if(c.fee_max<c.fee_min)return toast('Phí tối đa phải lớn hơn tối thiểu.');await run(sb.from('config').update(c).eq('id',1),'Đã lưu cấu hình.');break}
  }
});
document.addEventListener('submit',e=>{e.preventDefault();if(e.target.id==='pf')submitPost(e.target);if(e.target.id==='lf')submitLogin(e.target)});
document.addEventListener('input',e=>{if(e.target.id==='q'){q=e.target.value;clearTimeout(render.t);render.t=setTimeout(()=>{const pos=e.target.selectionStart;render();const el=$('#q');if(el){el.focus();try{el.setSelectionRange(pos,pos)}catch(_){}}},250)}});
document.addEventListener('change',async e=>{if(e.target.id==='qrfile'&&e.target.files[0]){try{toast('Đang tải mã QR…');const b=await shrink(e.target.files[0],900,.9);const path=me+'/qr-'+crypto.randomUUID()+'.jpg';const u=await sb.storage.from('photos').upload(path,b,{contentType:'image/jpeg'});if(u.error)throw u.error;const old=cfg.qr_path;const r=await sb.from('config').update({qr_path:path}).eq('id',1);if(r.error)throw r.error;if(old)sb.storage.from('photos').remove([old]);toast('Đã cài mã QR mới.');await loadAll()}catch(err){toast(errMsg(err))}return}if(e.target.id==='farea'){farea=e.target.value;render()}if(e.target.id==='sort'){sort=e.target.value;render()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
function route(){const h=location.hash.slice(1);view=['cho','cua-toi','quy-dinh','quan-tri'].includes(h)?h:'cho';render()}
window.addEventListener('hashchange',route);
sb.auth.onAuthStateChange((ev,s)=>{if(ev==='PASSWORD_RECOVERY')setTimeout(()=>openSheet(`<h2>Đặt mật khẩu mới</h2><div class="fld"><label for="n_pass">Mật khẩu mới</label><input id="n_pass" type="password" minlength="6" autocomplete="new-password"></div><button class="btn p wide" data-act="setpass">Lưu mật khẩu</button>`),300);const id=s?s.user.id:null;session=s;if(id!==me||ev==='SIGNED_IN'){me=id;loadAll()}});
route();sb.auth.getSession().then(({data})=>{session=data.session;me=session?session.user.id:null;loadAll()});
}
