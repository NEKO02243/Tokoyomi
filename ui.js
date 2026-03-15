/* ==========================================================================
   🎨 UI 渲染邏輯 (UI, 商店, 背包, 技能表)
   ========================================================================== */

function switchLogTab(type) {
    currentLogTab = type;
    el('tab-log-btn').classList.toggle('active', type === 'log'); el('tab-inv-btn').classList.toggle('active', type === 'inv'); 
    el('tab-skill-btn').classList.toggle('active', type === 'skill'); el('tab-helper-btn').classList.toggle('active', type === 'helper'); 
    el('log').classList.toggle('hidden', type !== 'log'); el('inv-area').classList.toggle('hidden', type !== 'inv'); 
    el('skill-area').classList.toggle('hidden', type !== 'skill'); el('helper-area').classList.toggle('hidden', type !== 'helper'); 
    if(type === 'inv') renderBag(); if(type === 'skill') renderPath(); if(type === 'helper') renderHelper();
}

function setInvFilter(cat) { currentInvFilter = cat; document.querySelectorAll('.f-btn').forEach(b => b.classList.remove('active')); el(`fb-${cat}`).classList.add('active'); renderBag(); }
function setSkillFilter(cat) { currentSkillFilter = cat; document.querySelectorAll('#skill-area .f-btn').forEach(b => b.classList.remove('active')); el(`sb-${cat}`).classList.add('active'); renderPath(); }

function renderBag() {
    const listEl = el('inv-list'); if(!listEl) return; listEl.innerHTML = ""; let bagItems = [];
    for(let k in player.potions) if(player.potions[k] > 0) bagItems.push({id: k, count: player.potions[k]});
    for(let k in player.mats) if(player.mats[k] > 0) bagItems.push({id: k, count: player.mats[k]});
    let filtered = bagItems.filter(item => { if(currentInvFilter === 'all') return true; return getItem(item.id).cat === currentInvFilter; });
    if(filtered.length === 0) { listEl.innerHTML = "<div style='color:#555; text-align:center; padding:30px;'>此類別目前沒有物品</div>"; return; }

    filtered.forEach(slot => {
        let db = getItem(slot.id);
        let checkHtml = db.sellable ? `<input type="checkbox" class="bag-check" data-id="${slot.id}">` : `<div style="width:16px;"></div>`;
        let qtyInputHtml = db.sellable ? `<input type="number" class="bag-qty-input" data-id="${slot.id}" value="1" min="1" max="${slot.count}">` : `<span style="color:#444; font-size:12px;">-</span>`;
        listEl.innerHTML += `<div class="inv-row ${db.cat}">${checkHtml}<div style="flex:1; margin-left:10px;"><div style="color:#eee; font-size:1.05em;">${db.name} <b style="color:var(--gold)">x${slot.count}</b></div><div style="color:#666; font-size:0.85em;">單價: $${db.sellPrice}</div></div><div style="text-align:right; display:flex; align-items:center; gap:5px;"><span style="font-size:12px; color:#555;">賣出:</span>${qtyInputHtml}</div></div>`;
    });
    listEl.innerHTML += `<div style="position: sticky; bottom: 0; background: #000; padding: 12px 0; border-top: 1px solid #333; margin-top: 10px; text-align:center;"><button class="btn-action" style="width:90%; background:linear-gradient(180deg, #ffd700, #b8860b); color:#000; border-radius:20px;" onclick="executeSelectedSell()">💰 賣出選中物品</button></div>`;
}

function executeSelectedSell() {
    let checkBoxes = document.querySelectorAll('.bag-check:checked');
    if(checkBoxes.length === 0) return log("❌ 請先勾選要賣出的物品。", "var(--danger)");
    let totalEarned = 0; let soldSummary = [];
    checkBoxes.forEach(cb => {
        let id = cb.getAttribute('data-id'); let db = getItem(id); let qtyInput = document.querySelector(`.bag-qty-input[data-id="${id}"]`); let sellQty = parseInt(qtyInput.value);
        let currentOwn = (db.cat === 'rec') ? (player.potions[id] || 0) : (player.mats[id] || 0);
        if(isNaN(sellQty) || sellQty <= 0) return; if(sellQty > currentOwn) sellQty = currentOwn;
        totalEarned += db.sellPrice * sellQty;
        if(db.cat === 'rec') player.potions[id] -= sellQty; else player.mats[id] -= sellQty;
        soldSummary.push(`${db.name}x${sellQty}`);
    });
    if(totalEarned > 0) { player.gold += totalEarned; log(`💰 變賣清單：${soldSummary.join(", ")}，共入帳 ${totalEarned} 金幣！`, "var(--gold)"); updateUI(); renderBag(); }
}

function renderPath() {
    const c = el('skill-list-content'); if(!c) return;
    let filteredSkills = player.unlockedSkills.filter(sid => { if(currentSkillFilter === 'all') return true; return (skillDB[sid] && skillDB[sid].cat === currentSkillFilter); });

    let html = `<div style="display:flex; flex-direction:column; gap:8px; text-align:left;">`;
    if(filteredSkills.length === 0) { html += `<div style="color:#666; text-align:center; padding: 20px;">尚無此類別的秘技...</div>`; } 
    else {
        filteredSkills.forEach(sid => {
            let sk = skillDB[sid]; let isEqIdx = player.equippedSkills.indexOf(sid); let isEq = isEqIdx !== -1;
            
            // ✨ [新功能 3] 判斷屬性是否達標 (反灰邏輯)
            let isValid = isSkillValid(sid);
            let boxBg = isValid ? '#1a1a2e' : '#111';
            let borderColor = isValid ? (sk.type === 'active' ? 'var(--skill)' : 'var(--passive)') : '#333';
            let nameColor = isValid ? sk.color : '#555';
            let descColor = isValid ? '#ddd' : '#555';
            
            let btnAction = isEq ? `unequipSkill(${isEqIdx})` : (isValid ? `equipSkill('${sid}')` : ``); 
            let btnText = isEq ? '卸下' : (isValid ? '裝備' : '🔒 不足');
            let btnColor = isEq ? 'var(--danger)' : (isValid ? 'var(--quest)' : '#222'); 
            let btnFontColor = isEq ? '#fff' : (isValid ? '#000' : '#555');

            if (isEq && combatState.slotSetupCds[isEqIdx] > 0) { btnColor = '#444'; btnFontColor = '#888'; btnText = '調息中'; }

            let tacticHtml = "";
            if (isEq && sk.type === 'active' && isValid) {
                let i = isEqIdx;
                tacticHtml = `
                    <div style="margin-top:10px; border-top:1px dashed #444; padding-top:10px; display:flex; gap:8px; align-items:center;">
                        <span style="font-size:0.9em; color:#aaa;">戰術:</span>
                        <select style="flex:1; font-size:0.9em; background:#000; color:white; border:1px solid #666; padding:4px;" onchange="updateGambit(${i}, this.value)">
                            <option value="0" ${player.skillGambits[i]==0?'selected':''}>始終施放</option><option value="3" ${player.skillGambits[i]==3?'selected':''}>僅對首領</option>
                            <option value="4" ${player.skillGambits[i]==4?'selected':''}>我方 HP</option><option value="5" ${player.skillGambits[i]==5?'selected':''}>敵方 HP</option>
                        </select>`;
                if(player.skillGambits[i] >= 4) { tacticHtml += `<span style="cursor:pointer; background:#333; color:var(--gold); padding:2px 8px; border-radius:3px; user-select:none;" onclick="toggleGambitOp(${i})">${player.skillGambitOps[i] === '<' ? '&lt;' : '&gt;'}</span><input type="number" value="${player.skillGambitValues[i]}" style="width:50px; background:#000; color:white; border:1px solid #555; text-align:center;" onchange="updateGambitVal(${i}, this.value)"> %`; }
                tacticHtml += `</div>`;
            }
            
            let reqWarn = "";
            if (!isValid) {
                let rTxt = [];
                for(let s in sk.req) if(player[s] < sk.req[s]) rTxt.push(`${s.toUpperCase()}需${sk.req[s]}`);
                reqWarn = `<div style="color:var(--danger); font-size:0.8em; margin-top:5px;">⚠️ 體魄衰退：${rTxt.join(", ")}</div>`;
            }

            html += `
            <div style="background:${boxBg}; padding:12px; border-left:4px solid ${borderColor}; border-radius:6px; position:relative;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div><b style="color:${nameColor}; font-size:1.1em;">${sk.name}</b><span style="font-size:0.85em; color:#888; margin-left:8px;">${isEq ? `(裝備於第 ${isEqIdx+1} 槽)` : ''}</span><br><small style="color:${descColor}; font-size:0.95em;">${sk.desc}</small>${reqWarn}</div>
                    <button id="btn-path-${sid}" class="btn-action" style="padding:6px 15px; font-size:0.95em; background:${btnColor}; color:${btnFontColor}; border-radius:4px;" ${!isValid && !isEq ? 'disabled' : ''} onclick="${btnAction}">${btnText}</button>
                </div>${tacticHtml}
            </div>`;
        });
    }
    c.innerHTML = html + `</div>`;
}

function renderHelper() {
    const c = el('helper-area'); if(!c) return;
    if(!player.helper || !player.helper.id || !HELPER_DB[player.helper.id]) { c.innerHTML = `<div style="text-align:center; color:#666; padding:30px;">身邊空無一物...<br>請前往居酒屋尋找結契夥伴。</div>`; return; }
    let hdb = HELPER_DB[player.helper.id]; let timeStr = formatHelperTime(player.helper.remainSec); let leftTxt = `<span style="color:${player.helper.remainSec < 60 ? 'var(--danger)' : 'var(--quest)'}; font-weight:bold;">${timeStr}</span>`;
    c.innerHTML = `<div style="background:#1a1a2e; border:1px solid #fdcb6e; border-radius:8px; padding:20px; text-align:center;"><h3 style="color:#fdcb6e; margin-top:0;">⛩️ ${hdb.name}</h3><p style="color:#aaa;">${hdb.desc}</p><div style="margin-top:20px; background:#000; padding:10px;">在線合約剩餘：${leftTxt}</div></div>`;
}

function updateStatHints() {
    const hintEl = el('stat-hint'); if (!hintEl) return; let minDist = Infinity; let targetMsg = "已掌握目前境界所有基礎招式。";
    for(let id in skillDB) {
        if(player.unlockedSkills.includes(id)) continue;
        let req = skillDB[id].req; let isMet = true; let currentDist = 0; let mainStat = "";
        for(let s in req) { let diff = req[s] - player[s]; if(diff > 0) { isMet = false; currentDist += diff; mainStat = s.toUpperCase(); } }
        if(!isMet && currentDist < minDist) { minDist = currentDist; let statName = mainStat === 'STR' ? '力量' : mainStat === 'VIT' ? '體質' : '敏捷'; targetMsg = `【感悟】建議提升 ${statName} (相距 ${minDist} 點) 以領悟 ${skillDB[id].name}...`; }
    }
    hintEl.innerText = targetMsg;
}

function updateUI() {
    if(el('p-name')) el('p-name').innerText = player.name || "無名者"; if(el('p-display-name')) el('p-display-name').innerText = player.name || "無名者"; if(el('p-lvl')) el('p-lvl').innerText = player.lvl; if(el('p-gold')) el('p-gold').innerText = player.gold.toLocaleString();
    ['str','vit','agi'].forEach(s => { if(el(`p-${s}-val`)) el(`p-${s}-val`).innerText = player[s]; if(el(`stat-${s}`)) el(`stat-${s}`).innerText = player[s]; if(el(`pre-${s}`)) el(`pre-${s}`).innerText = statPreview[s] > 0 ? `+${statPreview[s]}` : ""; });
    
    if(el('stat-points')) { el('stat-points').innerText = player.statPoints; if (player.statPoints > 0) el('stat-points').classList.add('glow-pts'); else el('stat-points').classList.remove('glow-pts'); }
    if(el('alloc-btns')) el('alloc-btns').classList.toggle('hidden', (statPreview.str + statPreview.vit + statPreview.agi) === 0);

    let curAtk = getAtkVal(); let curSpd = (1.5 / (1 + player.agi * 0.025)).toFixed(2); let curDef = getDefPercent(player.vit).toFixed(1); let curEva = getEvaPercent(player.agi).toFixed(1);
    let tempStr = player.str + statPreview.str; let tempVit = player.vit + statPreview.vit; let tempAgi = player.agi + statPreview.agi;

    if(el('det-atk')) { let nAtk = curAtk + Math.floor(tempStr*1.5) - Math.floor(player.str*1.5); let diff = nAtk - curAtk; el('det-atk').innerHTML = `${curAtk}${diff > 0 ? ` <span style="color:lime;">+${diff}</span>` : ""}`; }
    if(el('det-spd')) { let nSpd = (1.5 / (1 + tempAgi * 0.025)).toFixed(2); let diff = (nSpd - curSpd).toFixed(2); el('det-spd').innerHTML = `${curSpd}${diff < 0 ? ` <span style="color:var(--accent);">${diff}s</span>` : ""}s`; }
    if(el('det-def')) { let nDefVal = tempVit <= 100 ? tempVit * 0.5 : tempVit <= 300 ? 50 + (tempVit - 100) * 0.1 : 70 + (tempVit - 300) * 0.05; let diff = (nDefVal - (player.vit <= 100 ? player.vit*0.5 : player.vit<=300 ? 50+(player.vit-100)*0.1 : 70+(player.vit-300)*0.05)).toFixed(1); el('det-def').innerHTML = `${curDef}${diff > 0 ? ` <span style="color:lime;">+${diff}%</span>` : ""}%`; }
    if(el('det-eva')) { let nEvaVal = tempAgi <= 50 ? tempAgi * 0.6 : 30 + (tempAgi - 50) * 0.2; let oldEvaBase = player.agi <= 50 ? player.agi * 0.6 : 30 + (player.agi - 50) * 0.2; let diff = (nEvaVal - oldEvaBase).toFixed(1); el('det-eva').innerHTML = `${curEva}${diff > 0 ? ` <span style="color:lime;">+${diff}%</span>` : ""}%`; }

    if(el('p-hp-bar')) el('p-hp-bar').style.width = (player.hp / getMaxHP() * 100) + "%";
    if(el('p-hp-text')) { if(isReviving) el('p-hp-text').innerHTML = `<span style="color:var(--gold);">💀 重塑中...</span>`; else el('p-hp-text').innerText = `${Math.floor(player.hp)} / ${getMaxHP()}`; }
    if(el('p-exp-bar')) el('p-exp-bar').style.width = (player.exp / player.next * 100) + "%";
    if(el('p-exp-text')) el('p-exp-text').innerText = `${player.exp} / ${player.next}`;
    
    if(el('m-name')) el('m-name').innerHTML = monster.name;
    let mHpBar = el('m-hp-bar'); let mHpText = el('m-hp-text'); let mSubInfo = el('m-sub-info');
    if(player.mapIdx === 0) { if(mHpBar) { mHpBar.className = 'zen-fill'; mHpBar.style.width = (combatState.zenTimer / 20 * 100) + "%"; } if(mHpText) mHpText.innerText = "冥想中..."; if(mSubInfo) mSubInfo.innerHTML = `累積威力: <span style="color:var(--gold)">${combatState.zenDmgAccum}</span>`;
    } else { if(mHpBar) { mHpBar.className = 'hp-fill'; mHpBar.style.width = (monster.mhp > 0 ? (monster.hp / monster.mhp * 100) : 0) + "%"; } if(mHpText) mHpText.innerText = `${Math.floor(monster.hp)} / ${monster.mhp}`; if(mSubInfo) mSubInfo.innerHTML = `Lv. ${monster.lvl}`; }

    let hInfo = el('helper-info'); if(hInfo) { if(player.helper && player.helper.id && HELPER_DB[player.helper.id]) { hInfo.innerText = `⛩️ 夥伴：${HELPER_DB[player.helper.id].name} (在線剩餘 ${formatHelperTime(player.helper.remainSec)})`; hInfo.style.color = player.helper.remainSec < 60 ? "var(--danger)" : "#fdcb6e"; } else { hInfo.innerText = ""; } }
    
    document.querySelectorAll('.btn-plus').forEach(b => b.disabled = (player.statPoints <= 0 || isReviving));
    if(el('auto-boss-check')) el('auto-boss-check').checked = player.autoBoss;
    
    let pCount = el('potion-count'); if(pCount && player.potions && player.potions[player.selectedPotion] !== undefined) pCount.innerText = player.potions[player.selectedPotion];
    if(el('revive-count')) el('revive-count').innerText = player.revives;
    let btnManual = el('btn-manual-heal'); if(btnManual) { if(combatState.potionCd > 0) { btnManual.innerText = `冷卻 ${Math.ceil(combatState.potionCd)}s`; btnManual.style.background = "#444"; } else { btnManual.innerText = "手動"; btnManual.style.background = "var(--cherry)"; } }
    if(el('kill-text')) { if(player.mapIdx === 0) el('kill-text').innerHTML = `輪迴: ${player.kills}`; else el('kill-text').innerHTML = `擊殺: ${player.kills}/10`; }
    let mInfo = el('map-info'); if(mInfo && mInfo.innerHTML === "") updateMapSelector();
    
    if(player.equippedSkills) {
        for(let i=0; i<4; i++) {
            let slotEl = el(`slot-${i}`); if(!slotEl) continue; let sid = player.equippedSkills[i];
            if(!sid || !skillDB[sid] || !isSkillValid(sid)) { slotEl.className = "skill-slot empty"; slotEl.innerHTML = `空 <br><small style="color:#555;">(點擊配置)</small>`; slotEl.style.opacity = "1.0"; } 
            else {
                let sk = skillDB[sid]; let isAct = sk.type === 'active'; let isGambitReady = isAct ? checkGambit(i) : true;
                slotEl.style.opacity = (isAct && !isGambitReady) ? "0.4" : "1.0"; slotEl.className = `skill-slot ${isAct ? 'active' : 'passive'}`;
                let html = `<b style="color:${sk.color}">${sk.name}</b>`;
                if(isAct && combatState.skillCds[i] > 0) html += `<div class="skill-cd-overlay" style="height:${(combatState.skillCds[i] / sk.cd) * 100}%;">${Math.ceil(combatState.skillCds[i])}s</div>`;
                if(combatState.slotSetupCds[i] > 0) html += `<div class="skill-setup-overlay">🔒</div>`;
                slotEl.innerHTML = html;
            }
        }
    }
    
    updateStatHints(); 
    if(currentLogTab === 'inv') { const activeEl = document.activeElement; const isEditing = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT'); if(!isEditing) renderBag(); }
    if(currentLogTab === 'skill') { 
        for(let i=0; i<4; i++) { let sid = player.equippedSkills[i]; if(sid) { let btn = el(`btn-path-${sid}`); if(btn) { if(combatState.slotSetupCds[i] > 0) { btn.style.background = '#444'; btn.style.color = '#888'; btn.innerText = `調息中`; } else { btn.style.background = 'var(--danger)'; btn.style.color = '#fff'; btn.innerText = `卸下`; } } } }
    }
    if(currentLogTab === 'helper') renderHelper();
}

function previewStat(t) { if(player.statPoints > 0) { player.statPoints--; statPreview[t]++; updateUI(); } }
function cancelPreview() { player.statPoints += (statPreview.str + statPreview.vit + statPreview.agi); statPreview = { str: 0, vit: 0, agi: 0 }; updateUI(); }
function confirmStats() { player.str += statPreview.str; player.vit += statPreview.vit; player.agi += statPreview.agi; player.hp = getMaxHP(); statPreview = { str: 0, vit: 0, agi: 0 }; log("✔ 屬性已固化。", "var(--quest)"); checkSkillUnlocks(); updateUI(); }

// ✨ [新功能 2] 打王逃跑機制實裝
function switchView(v) {
    if(player.workStartTime && v === 'battle') return openModal("正在工作中", "妳還在居酒屋幫忙，不能翹班去打怪！", "我知道了");
    if(isResting) return openModal("歇息中", "正在旅籠屋休息...", "等候");
    
    // ✨ 魔王戰逃跑邏輯
    if(monster.isBoss && v !== 'battle') {
        return openModal("⚠️ 戰況危急", "確定要落荒而逃嗎？<br>退回村莊後，首領將會恢復狀態，您必須重新挑戰！", "落荒而逃", () => {
            player.autoBoss = false;
            player.kills = 10; // 退回 10/10 狀態
            log("🏃 妳果斷放棄了戰鬥，連滾帶爬地逃回了結界之里。", "var(--danger)");
            executeSwitchView(v);
        }, true);
    }
    
    executeSwitchView(v);
}

function executeSwitchView(v) {
    currentView = v; 
    let vBat = el('view-battle'); if(vBat) vBat.classList.toggle('hidden', v !== 'battle'); 
    let vVil = el('view-village'); if(vVil) vVil.classList.toggle('hidden', v !== 'village');
    let tBat = el('t-battle'); if(tBat) tBat.classList.toggle('active', v === 'battle'); 
    let tVil = el('t-village'); if(tVil) tVil.classList.toggle('active', v === 'village');
    
    let qb = el('btn-quick-battle');
    if(v === 'battle') { 
        isPaused = false; startBattleLoop(); if(qb) qb.classList.add('hidden');
    } else { 
        isPaused = true; if(qb) qb.classList.remove('hidden'); backToVillage(); 
    }
}

function startWork() { player.workStartTime = Date.now(); isPaused = true; log("🏃 換上圍裙，開始在居酒屋幫忙...", "var(--gold)"); showSubView('work'); }
function stopWork() { let now = Date.now(); if (!player.workStartTime) player.workStartTime = now; let hourlyRate = 1200 + (player.lvl * 100); if (player.helper && player.helper.id && HELPER_DB[player.helper.id] && HELPER_DB[player.helper.id].workBonus) { hourlyRate *= HELPER_DB[player.helper.id].workBonus.rate; } let elapsedSecs = Math.floor((now - player.workStartTime) / 1000); if (isNaN(elapsedSecs) || elapsedSecs < 0) elapsedSecs = 0; if (elapsedSecs > 43200) elapsedSecs = 43200; let earn = Math.floor((elapsedSecs / 3600) * hourlyRate); if (earn > 0) { player.gold = (Number(player.gold) || 0) + earn; log(`💰 老闆：「辛苦啦！」獲得了 $${earn.toLocaleString()}。`, "var(--gold)"); } else { log("💨 工作時間太短，老闆揮揮手叫你趕快走。", "#888"); } player.workStartTime = null; isPaused = false; updateUI(); showSubView('izakaya'); }

function showSubView(s) {
    if(isResting) return; let vMenu = el('village-menu'); if(vMenu) vMenu.classList.add('hidden'); let sView = el('sub-view'); if(sView) sView.classList.remove('hidden');
    const c = el('sub-content'); if(!c) return; c.innerHTML = "";
    
    if(s==='inn') { let cost = player.lvl <= 10 ? 0 : Math.min(50, player.lvl * 2); c.innerHTML = `<h3>🛌 旅籠屋</h3><p>Lv.10 以內免費，最高 50 金幣。</p><button class="btn-action" style="width:100%;" id="btn-inn-rest" onclick="innRest(${cost})">入內休息 (${cost} 金幣)</button>`; } 
    else if(s==='smith') { renderSmithy(); } else if(s==='smith_sell') { renderSmithySell(); }
    else if(s==='izakaya') { c.innerHTML = `<h3>🏮 居酒屋</h3><div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;"><div class="slot-card" onclick="showSubView('helper_shop')"><h3>🤝 夥伴結契</h3></div><div class="slot-card" onclick="showSubView('work')"><h3>🧹 居酒屋打工</h3></div></div>`; }
    else if(s==='helper_shop') { renderIzakaya('helper'); }
    else if(s==='work') { let rate = 1200 + (player.lvl * 100); if (player.helper && player.helper.id && HELPER_DB[player.helper.id].workBonus) rate *= HELPER_DB[player.helper.id].workBonus.rate; c.innerHTML = `<h3>🧹 居酒屋勤務</h3><p>時薪 $${Math.floor(rate)}</p>`; if (!player.workStartTime) { c.innerHTML += `<button class="btn-action" style="width:100%;" onclick="startWork()">開始幫忙</button>`; } else { c.innerHTML += `<button class="btn-action" style="width:100%; background:var(--danger);" onclick="stopWork()">領工錢並收工</button>`; } }
    else if(s==='gm') { c.innerHTML = `<h3>🛠️ 神明特權</h3><button class="btn-action" style="width:100%; margin-bottom:10px;" onclick="player.gold+=10000; updateUI();">💰 +10000 金幣</button><button class="btn-action" style="width:100%; background:var(--danger);" onclick="player.statPoints+=10; updateUI();">💪 +10 點數</button>`; } 
    else if(s==='save') { c.innerHTML = `<h3>💾 紀錄點</h3><button class="btn-action" style="width:100%; margin-bottom:15px;" id="btn-save-game" onclick="saveGameWithFeedback()">手動存檔</button><button class="btn-action" style="width:100%; margin-bottom:15px; background:var(--accent);" onclick="generateImportCode()">📤 生成引繼碼</button><button class="btn-action" style="width:100%; background:#e67e22;" onclick="promptImportCode()">📥 輸入引繼碼</button>`; } 
    else if(s==='shop') { c.innerHTML = `<h3>🏮 萬屋</h3><p>持有金幣：<b style="color:var(--gold);">${player.gold}</b></p><button class="btn-action" style="width:100%;" onclick="buyFullStatReset(100)">🌀 忘卻之水 ($100)</button>`; }
}

function renderSmithy() { const c = el('sub-content'); if(!c) return; c.innerHTML = `<h3>⚒️ 鍛冶屋</h3><p>強化功能實裝中...</p>`; }
function renderSmithySell() { const c = el('sub-content'); if(!c) return; c.innerHTML = `<h3>⚒️ 鍛冶屋</h3><p>變賣素材請至行囊。</p>`; }

function saveGameWithFeedback() { saveGame(true); let btn = el('btn-save-game'); if(btn) { btn.innerText = "✔ 存檔成功"; btn.style.background = "var(--quest)"; setTimeout(() => { btn.innerText = "手動存檔"; btn.style.background = "var(--cherry)"; }, 1500); } }
function innRest(cost) { if(player.hp >= getMaxHP()) return openModal("精神飽滿", "妳精神好得很！", "知道了"); if(player.gold >= cost) { player.gold -= cost; isResting = true; let area = el('btn-inn-rest'); if(area) area.disabled = true; let sec = 3; const timer = setInterval(() => { sec--; if(sec <= 0) { clearInterval(timer); isResting = false; player.hp = getMaxHP(); updateUI(); openModal("✨ 休息完畢", "體力已完全恢復！", "出發", () => showSubView('inn')); } }, 1000); } else openModal("金幣不足", "錢不夠喔。", "知道了"); }
function backToVillage() { if (player.workStartTime) return log("📢 工還沒做完想溜？", "var(--danger)"); let sv = el('sub-view'); if(sv) sv.classList.add('hidden'); let vm = el('village-menu'); if(vm) vm.classList.remove('hidden'); }
function changeMap() { const sel = el('map-selector'); if(!sel) return; player.mapIdx = parseInt(sel.value); player.kills=0; combatState.zenTimer = 0; combatState.zenDmgAccum = 0; spawn(); updateMapSelector(); }
function manualBoss() { spawn(true); }
function showDmg(tid, txt, col) { const b = el(tid); if(!b) return; const e = document.createElement('div'); e.className='dmg-text'; e.innerText=txt; e.style.color=col; b.appendChild(e); setTimeout(()=>e.remove(), 800); }
function log(m, color = "#888") { const l = el('log'); if(l) l.innerHTML = `<span style="color:${color}; font-size:1.05em;">> ${m}</span><br>` + l.innerHTML; }

function openModal(t,b,bt,cb,showCancel=false) { 
    isPaused=true; let titleEl = el('modal-title'); if(titleEl) titleEl.innerText=t; let bodyEl = el('modal-body'); if(bodyEl) bodyEl.innerHTML=b;
    const btn=el('modal-confirm-btn'); if(btn) btn.innerText=bt; const cBtn=el('modal-cancel-btn'); if(cBtn) cBtn.style.display=showCancel?'block':'none';
    let isMainMenu = false; let slotScreen = el('slot-screen'); if(slotScreen) isMainMenu = !slotScreen.classList.contains('hidden');
    if(btn) btn.onclick=()=>{ if(cb && cb() === false) return; let gm = el('game-modal'); if(gm) gm.style.display='none'; if(!isMainMenu) { isPaused=false; if(currentView==='battle' && !player.workStartTime) startBattleLoop(); } };
    if(cBtn) cBtn.onclick=()=>{ let gm = el('game-modal'); if(gm) gm.style.display='none'; if(!isMainMenu) { isPaused=false; if(currentView==='battle' && !player.workStartTime) startBattleLoop(); } };
    let gm = el('game-modal'); if(gm) gm.style.display='flex'; 
}

window.onload = () => { 
    initSlotScreen(); 
    setInterval(() => { if(!isPaused && currentSlotKey && player.name && !player.workStartTime) saveGame(false); }, 5000); 
    setInterval(() => { if (player.workStartTime && currentView === 'village' && !el('sub-view').classList.contains('hidden')) showSubView('work'); }, 1000); 
};