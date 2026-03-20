/* ==========================================================================
   🎨 UI 渲染邏輯 (V0.7.2 夥伴編隊與清單化大更新)
   ========================================================================== */

function switchView(v) {
    if (player.workStartTime && v === 'battle') return openModal("正在工作中", "妳還在居酒屋幫忙，不能翹班去打怪！", "我知道了");
    if (isResting) return openModal("歇息中", "正在旅籠屋休息...", "等候");

    if (monster.isBoss && v !== 'battle') {
        return openModal("⚠️ 戰況危急", "確定要落荒而逃嗎？<br>退回村莊後，首領將會恢復狀態，您必須重新挑戰！", "落荒而逃", () => {
            player.autoBoss = false;
            player.kills = 10;
            spawn(false);
            log("🏃 妳果斷放棄了戰鬥，連滾帶爬地逃回了結界之里。", "var(--danger)");
            executeSwitchView(v);
        }, true);
    }
    
    if (v === 'village' && player.hasSeenVillageIntro === false) {
        let tVil = document.getElementById('t-village');
        if (tVil) tVil.classList.remove('highlight-building');
        
        executeSwitchView(v);
        if (typeof runVillageIntro === 'function') {
            runVillageIntro();
        }
        return;
    }

    executeSwitchView(v);
}

function executeSwitchView(v) {
    currentView = v;
    let vBat = el('view-battle'); if (vBat) vBat.classList.toggle('hidden', v !== 'battle');
    let vVil = el('view-village'); if (vVil) vVil.classList.toggle('hidden', v !== 'village');
    let tBat = el('t-battle'); if (tBat) tBat.classList.toggle('active', v === 'battle');
    let tVil = el('t-village'); if (tVil) tVil.classList.toggle('active', v === 'village');

    let qb = el('btn-quick-battle');
    if (v === 'battle') {
        isPaused = false; startBattleLoop(); if (qb) qb.classList.add('hidden');
    } else {
        isPaused = true; if (qb) qb.classList.remove('hidden'); backToVillage();
    }
}

function backToVillage() {
    if (player.workStartTime) return log("📢 老闆：工還沒做完想溜啊？點擊紅色的收工按鈕才能走！", "var(--danger)");
    let sv = el('sub-view'); if (sv) sv.classList.add('hidden');
    let vm = el('village-menu'); if (vm) vm.classList.remove('hidden');
}

function showSubView(s) {
    if (isResting) return;
    let vMenu = el('village-menu'); if (vMenu) vMenu.classList.add('hidden');
    let sView = el('sub-view'); if (sView) sView.classList.remove('hidden');
    const c = el('sub-content'); if (!c) return; c.innerHTML = "";

    if (s === 'inn') {
        let cost = player.lvl <= 10 ? 0 : Math.min(50, player.lvl * 2);
        c.innerHTML = `<h3>🛌 旅籠屋</h3>
            <p style="font-size:0.9em; color:#aaa;">Lv.10 以內免費，最高收費 50 金幣。</p>
            <div style="background:#111; padding:15px; border-radius:8px; border:1px solid #333; margin: 15px 0;">
                <p style="margin:5px 0;">目前體力：<span style="color: ${player.hp < getMaxHP() ? 'var(--danger)' : 'var(--quest)'}; font-weight:bold;">${Math.floor(player.hp)}</span> / ${getMaxHP()}</p>
                <p style="margin:5px 0;">持有金幣：<span style="color:var(--gold);">${player.gold.toLocaleString()}</span></p>
            </div>
            <p>休息費用：${cost === 0 ? '<span style="color:var(--quest)">免費</span>' : cost + ' 金幣'}</p>
            <button class="btn-action" style="width:100%;" id="btn-inn-rest" onclick="innRest(${cost})">入內休息 (5秒)</button>`;
    }
    else if (s === 'shop') { renderShop(); }
    else if (s === 'izakaya') { renderIzakayaMenu(); }
    else if (s === 'helper_shop') { renderIzakaya('helper'); }
    else if (s === 'work') { renderIzakayaWork(); }
    else if (s === 'casino') { renderCasino(); }
    else if (s === 'smith') { renderSmithy(); }
    else if (s === 'smith_shop') renderSmithyShop();
    else if (s === 'smith_sell') { renderSmithySell(); }
    else if (s === 'shrine') { renderShrine(); }
    else if (s === 'shrine_shop') { renderShrineShop(); }
    else if (s === 'sect') { renderSect(); }
    else if (s === 'teahouse') { renderTeahouse(); }
    else if (s === 'save') {
        c.innerHTML = `<h3>💾 紀錄點</h3>
            <button class="btn-action" style="width:100%; margin-bottom:15px;" id="btn-save-game" onclick="saveGameWithFeedback()">手動存檔</button>
            <button class="btn-action" style="width:100%; margin-bottom:15px; background:var(--accent);" onclick="generateImportCode()">📤 生成引繼碼 (自動複製)</button>
            <button class="btn-action" style="width:100%; background:#e67e22;" onclick="promptImportCode()">📥 輸入引繼碼 (覆蓋此紀錄)</button>`;
    }
    else if (s === 'gm') {
        // ✨ 動態生成流派選單
        let sectOpts = `<option value="">無流派</option>`;
        if (typeof SECT_DB !== 'undefined') {
            for (let key in SECT_DB) {
                sectOpts += `<option value="${key}" ${player.sect === key ? 'selected' : ''}>${SECT_DB[key].name}</option>`;
            }
        }

        c.innerHTML = `<h3>🛠️ 神明特權</h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px; text-align:left; font-size:0.9em; color:white;">
                <div>等級: <input type="number" id="gm-lvl" value="${player.lvl}" style="width:60px;"></div><div>金幣: <input type="number" id="gm-gold" value="${player.gold}" style="width:60px;"></div>
                <div>力量: <input type="number" id="gm-str" value="${player.str}" style="width:60px;"></div><div>體質: <input type="number" id="gm-vit" value="${player.vit}" style="width:60px;"></div>
                <div>敏捷: <input type="number" id="gm-agi" value="${player.agi}" style="width:60px;"></div><div>點數: <input type="number" id="gm-pts" value="${player.statPoints}" style="width:60px;"></div>
            </div>
            
            <div style="margin-bottom:15px; text-align:left; font-size:0.95em; color:var(--gm);">
                強制切換流派: <select id="gm-sect" style="width:130px; background:#000; color:white; border:1px solid var(--gm); padding:3px;">${sectOpts}</select>
            </div>

            <button class="btn-action" style="width:100%; margin-bottom:10px; background:var(--gm);" onclick="applyGM()">✅ 套用數值與流派</button>
            <button class="btn-action" style="width:100%; margin-bottom:15px; background:var(--accent);" onclick="gmUnlockMaps()">🗺️ 解鎖全部地圖</button>
            <button class="btn-action" style="width:100%; margin-bottom:15px; background:var(--mat);" onclick="gmAddMats()">🎁 +100 全素材</button>`;
    }

    if (s === 'shrine' && player.hasSeenShrineIntro === false) {
        if (typeof runShrineIntro === 'function') {
            runShrineIntro();
        }
    }
}

function updateMapSelector() {
    const mapArea = el('map-ui-area');
    if (mapArea) {
        mapArea.innerHTML = `<select id="map-selector" onchange="changeMap()" style="font-size:1.05em; padding:4px;"></select>`;
        const sel = el('map-selector');
        if (sel) { for (let i = 0; i <= player.maxMapIdx; i++) { let opt = document.createElement('option'); opt.value = i; opt.innerText = maps[i].name; if (player.mapIdx === i) opt.selected = true; sel.appendChild(opt); } }
    }
    let mInfo = el('map-info');
    if (mInfo && maps[player.mapIdx]) {
        let m = maps[player.mapIdx];
        if (m.name === "[修行] 幽靜道場") {
            // ✨ 測試模式：顯示木人選擇按鈕與數據統計
            let isStaticActive = testDummyType === 'static' ? 'active' : '';
            let isDefendActive = testDummyType === 'defend' ? 'active' : '';

            let testDataHtml = "";
            if (combatState.testMode && combatState.skillDmgLog.length > 0) {
                let elapsedSec = (Date.now() - combatState.testStartTime) / 1000;
                let dps = elapsedSec > 0 ? (combatState.totalDmgDealt / elapsedSec).toFixed(2) : '0.00';
                testDataHtml = `
                    <div style="background:rgba(255,165,0,0.15); padding:8px; border-radius:5px; margin-top:8px; border:1px solid var(--gold); font-size:0.9em;">
                        📊 <b>本次測試統計</b>
                        <div style="margin-top:5px; color:#aaa; font-size:0.85em;">
                            總傷害: <b style="color:white">${combatState.totalDmgDealt}</b> | 
                            時長: <b style="color:white">${elapsedSec.toFixed(1)}s</b> | 
                            DPS: <b style="color:var(--quest)">${dps}</b>
                        </div>
                    </div>
                `;
            }

            mInfo.innerHTML = `
                <div style="display:flex; gap:8px; margin-bottom:8px;">
                    <button class="tab-btn ${isStaticActive}" style="flex:1" onclick="switchTestDummy('static'); spawn(); updateUI();">🌳 靜止木人</button>
                    <button class="tab-btn ${isDefendActive}" style="flex:1" onclick="switchTestDummy('defend'); spawn(); updateUI();">⚔️ 攻擊木人</button>
                    <button class="btn-action" style="flex:1; background:#444; color:white; font-size:0.9em;" onclick="resetTestData()">🔄 重置統計</button>
                </div>
                ${testDataHtml}
            `;
        } else {
            let lvlLimitTxt = m.maxLvl === 999 ? "MAX" : m.maxLvl;
            let dropSet = new Set();
            if (m.mobs) m.mobs.forEach(mobId => MOB_DB[mobId].drops.forEach(d => dropSet.add(getItem(d.id).name)));
            if (m.boss) MOB_DB[m.boss].drops.forEach(d => dropSet.add(getItem(d.id).name));
            if (m.rareMob) MOB_DB[m.rareMob.id].drops.forEach(d => dropSet.add(getItem(d.id).name));
            let dropStr = Array.from(dropSet).join("、 ") || "無";
            mInfo.innerHTML = `適合等級: ${m.minLvl}~${lvlLimitTxt}<br>報酬: <span style="color:var(--quest);">${dropStr}</span>`;
        }
    }
}

// --- 切換右側面板 ---
function switchLogTab(type) {
    currentLogTab = type;

    // 1. 切換按鈕的高亮狀態 (加上戰況按鈕)
    el('tab-log-btn').classList.toggle('active', type === 'log');
    if (el('tab-combat-log-btn')) el('tab-combat-log-btn').classList.toggle('active', type === 'combat');
    el('tab-inv-btn').classList.toggle('active', type === 'inv');
    el('tab-skill-btn').classList.toggle('active', type === 'skill');
    el('tab-helper-btn').classList.toggle('active', type === 'helper');

    // 2. 切換面板的顯示與隱藏 (加上戰況面板)
    el('log').classList.toggle('hidden', type !== 'log');
    if (el('combat-log-wrapper')) el('combat-log-wrapper').classList.toggle('hidden', type !== 'combat');
    el('inv-area').classList.toggle('hidden', type !== 'inv');
    el('skill-area').classList.toggle('hidden', type !== 'skill');
    el('helper-area').classList.toggle('hidden', type !== 'helper');

    // 3. 渲染對應的內容
    if (type === 'inv') renderBag();
    if (type === 'skill') renderPath();
    if (type === 'helper') renderHelper();

    // 4. ✨ 當玩家點開戰況時，自動把捲軸滾到最下面看最新的傷害
    if (type === 'combat') {
        let cl = el('combat-log-area'); // 這裡維持 area 不用動！
        if (cl) cl.scrollTop = 0;
    }
}

function setInvFilter(cat) { currentInvFilter = cat; document.querySelectorAll('.f-btn').forEach(b => b.classList.remove('active')); el(`fb-${cat}`).classList.add('active'); renderBag(); }
function setSkillFilter(cat) { currentSkillFilter = cat; document.querySelectorAll('#skill-area .f-btn').forEach(b => b.classList.remove('active')); el(`sb-${cat}`).classList.add('active'); renderPath(); }

// ✨ 新增：夥伴定位分類按鈕邏輯
function setHelperFilter(cat) {
    currentHelperFilter = cat;
    document.querySelectorAll('#helper-area .f-btn').forEach(b => b.classList.remove('active'));
    let activeBtn = el(`hb-${cat}`);
    if (activeBtn) activeBtn.classList.add('active');
    renderHelper();
}

// ✨ 新增：夥伴詳細資料彈窗
function showHelperDetails(id) {
    let h = HELPER_DB[id];
    if (!h) return;
    let content = `
        <div style="text-align:left; color:#ddd; font-size:1.05em; line-height: 1.6; background: #000; padding: 15px; border-radius: 8px; border: 1px solid #444;">
            <p style="margin: 5px 0;"><b style="color:var(--gold);">⛩️ 定位：</b>${h.roleName}</p>
            <p style="margin: 5px 0;"><b style="color:var(--accent);">⚔️ 特長：</b>${h.desc}</p>
            <p style="margin: 5px 0;"><b style="color:var(--quest);">🧹 打工加成：</b>${h.workBonus.label}</p>
            <p style="margin: 5px 0;"><b style="color:var(--cherry);">⏳ 剩餘時數：</b>${formatHelperTime(player.helperTimes[id] || 0)}</p>
        </div>
    `;
    openModal(`${h.name} 詳細資料`, content, "關閉");
}

function promptWashStar() {
    let maxQty = player.mats['wash_star'] || 0;

    // 直接用目前點數扣掉初始值
    let refStr = player.str - 2;
    let refVit = player.vit - 1;
    let refAgi = player.agi - 0;

    openModal("✨ 使用遺忘星砂",
        `<div style="text-align:left; font-size:0.95em; color:#ddd; margin-bottom:15px;">請選擇欲洗退的屬性：</div>
        <select id="wash-stat-sel" style="width:100%; padding:8px; margin-bottom:15px; background:#000; color:white;">
            <option value="str">力量 (可退 ${refStr})</option>
            <option value="vit">體質 (可退 ${refVit})</option>
            <option value="agi">敏捷 (可退 ${refAgi})</option>
        </select>
        <input type="number" id="wash-qty" value="1" min="1" max="${maxQty}" style="width:100%; text-align:center;">`,
        "確認",
        () => {
            useWashStar(el('wash-stat-sel').value, el('wash-qty').value);
        },
        true
    );
}
function renderBag() {
    const listEl = el('inv-list'); if (!listEl) return;

    let inputStates = {}; let checkStates = {};
    document.querySelectorAll('.bag-qty-input').forEach(el => inputStates[el.dataset.id] = el.value);
    document.querySelectorAll('.bag-check').forEach(el => checkStates[el.dataset.id] = el.checked);

    listEl.innerHTML = ""; let bagItems = [];
    for (let k in player.potions) if (player.potions[k] > 0) bagItems.push({ id: k, count: player.potions[k] });
    for (let k in player.mats) if (player.mats[k] > 0) bagItems.push({ id: k, count: player.mats[k] });
    let filtered = bagItems.filter(item => { if (currentInvFilter === 'all') return true; return getItem(item.id).cat === currentInvFilter; });
    if (filtered.length === 0) { listEl.innerHTML = "<div style='color:#555; text-align:center; padding:30px;'>此類別目前沒有物品</div>"; return; }

    filtered.forEach(slot => {
        let db = getItem(slot.id);
        let savedVal = inputStates[slot.id] || 1;
        let isChecked = checkStates[slot.id] ? "checked" : "";
        let checkHtml = ""; let qtyInputHtml = "";

        if (db.sellable) {
            checkHtml = `<input type="checkbox" class="bag-check" data-id="${slot.id}" ${isChecked}>`;
            qtyInputHtml = `<span style="font-size:12px; color:#555;">賣出:</span><input type="number" class="bag-qty-input" data-id="${slot.id}" value="${savedVal}" min="1" max="${slot.count}" style="width:50px; font-size:1.1em; text-align:center;">`;
        } else if (db.id === 'wash_star') {
            checkHtml = `<div style="width:16px;"></div>`;
            qtyInputHtml = `<button class="btn-action" style="padding:4px 10px; font-size:0.9em; background:var(--quest); color:black;" onclick="promptWashStar()">✨ 使用</button>`;
        } else if (db.cat === 'sp' && db.id !== 'c_shrine' && db.id !== 'revive' && !db.id.startsWith('mat_')) {
            checkHtml = `<div style="width:16px;"></div>`;
            qtyInputHtml = `<button class="btn-action" style="padding:4px 10px; font-size:0.9em; background:var(--gold); color:black;" onclick="useShrineBuffItem('${db.id}')">✨ 使用</button>`;
        } else {
            checkHtml = `<div style="width:16px;"></div>`;
            qtyInputHtml = `<span style="color:#444; font-size:12px;">-</span>`;
        }

        listEl.innerHTML += `<div class="inv-row ${db.cat}">${checkHtml}<div style="flex:1; margin-left:10px;"><div style="color:#eee; font-size:1.05em;">${db.name} <b style="color:var(--gold)">x${slot.count}</b></div><div style="color:#666; font-size:0.85em;">${db.sellable ? `單價: $${db.sellPrice}` : `<span style="color:var(--quest)">重要物品</span>`}</div></div><div style="text-align:right; display:flex; align-items:center; gap:5px;">${qtyInputHtml}</div></div>`;
    });
    listEl.innerHTML += `<div style="position: sticky; bottom: 0; background: #000; padding: 12px 0; border-top: 1px solid #333; margin-top: 10px; text-align:center;"><button class="btn-action" style="width:90%; background:linear-gradient(180deg, #ffd700, #b8860b); color:#000; border-radius:20px;" onclick="executeSelectedSell()">💰 賣出選中物品</button></div>`;
}

function renderPath() {
    const c = el('skill-list-content');
    if (!c) return;

    let filteredSkills = player.unlockedSkills.filter(sid => {
        if (currentSkillFilter === 'all') return true;
        return (skillDB[sid] && skillDB[sid].cat === currentSkillFilter);
    });

    let html = `<div style="display:flex; flex-direction:column; gap:8px; text-align:left;">`;
    if (filteredSkills.length === 0) {
        html += `<div style="color:#666; text-align:center; padding: 20px;">尚無此類別的秘技...</div>`;
    } else {
        filteredSkills.forEach(sid => {
            let sk = skillDB[sid];
            let isEqIdx = player.equippedSkills.indexOf(sid);
            let isEq = isEqIdx !== -1;

            // 重新整合更詳細的條件判定
            let isStatValid = isSkillValid(sid);
            let isRankValid = (sk.cat !== 'job' || (player.sectRank >= sk.rank));
            let isValid = isStatValid && isRankValid;

            // 重新整合更詳細的按鈕狀態 (包含「調息中」)
            let btnAction = isEq ? `unequipSkill(${isEqIdx})` : (isValid ? `smartEquipSkill('${sid}')` : ``);
            let btnText, btnColor, btnFontColor, isDisabled;

            if (isEq) {
                if (combatState.slotSetupCds[isEqIdx] > 0) {
                    btnText = '調息中';
                    btnColor = '#444';
                    btnFontColor = '#888';
                    isDisabled = true;
                } else {
                    btnText = '卸下';
                    btnColor = 'var(--danger)';
                    btnFontColor = '#fff';
                    isDisabled = false;
                }
            } else if (sk.type === 'trait') {
                btnText = '🟢 常駐生效';
                btnColor = '#1a3622';
                btnFontColor = '#2ecc71';
                isDisabled = true;
            } else {
                if (isValid) {
                    btnText = '裝備';
                    btnColor = 'var(--quest)';
                    btnFontColor = '#000';
                    isDisabled = false;
                } else {
                    btnText = !isRankValid ? '🔒 位階不足' : '🔒 屬性不足';
                    btnColor = '#222';
                    btnFontColor = '#555';
                    isDisabled = true;
                }
            }

            // 加上更詳細的限制條件提示文字
            let reqWarn = "";
            if (!isValid && !isEq) {
                let rTxt = [];
                if (!isStatValid) {
                    for (let s in sk.req) if (player[s] < sk.req[s]) rTxt.push(`${s.toUpperCase()}需${sk.req[s]}`);
                }
                if (!isRankValid) {
                    let sData = SECT_DB && SECT_DB[player.sect];
                    let rankName = sData && sData.ranks ? sData.ranks[sk.rank] : "未知位階";
                    rTxt.push(`宗門位階需達【${rankName}】`);
                }
                reqWarn = `<div style="color:var(--danger); font-size:0.8em; margin-top:5px;">⚠️ 限制：${rTxt.join(" / ")}</div>`;
            }

            // 重新加回【戰術設定】的 UI
            let tacticHtml = "";
            if (isEq && sk.type === 'active' && isValid) {
                let i = isEqIdx;
                tacticHtml = `
                    <div style="margin-top:10px; border-top:1px dashed #444; padding-top:10px; display:flex; gap:8px; align-items:center;">
                        <span style="font-size:0.9em; color:#aaa;">戰術:</span>
                        <select style="flex:1; font-size:0.9em; background:#000; color:white; border:1px solid #666; padding:4px;" onchange="updateGambit(${i}, this.value)">
                            <option value="0" ${player.skillGambits[i] == 0 ? 'selected' : ''}>始終施放</option>
                            <option value="99" ${player.skillGambits[i] == 99 ? 'selected' : ''}>手動施放</option>
                            <option value="3" ${player.skillGambits[i] == 3 ? 'selected' : ''}>僅對首領</option>
                            <option value="4" ${player.skillGambits[i] == 4 ? 'selected' : ''}>我方 HP</option>
                            <option value="5" ${player.skillGambits[i] == 5 ? 'selected' : ''}>敵方 HP</option>
                        </select>`;
                if (player.skillGambits[i] == 4 || player.skillGambits[i] == 5) {
                    tacticHtml += `<span style="cursor:pointer; background:#333; color:var(--gold); padding:2px 8px; border-radius:3px; user-select:none;" onclick="toggleGambitOp(${i})">${player.skillGambitOps[i] === '<' ? '&lt;' : '>'}</span>
                    <input type="number" value="${player.skillGambitValues[i]}" style="width:50px; background:#000; color:white; border:1px solid #555; text-align:center;" onchange="updateGambitVal(${i}, this.value)"> %`;
                }
                tacticHtml += `</div>`;
            }

            // ✨ 冷卻時間顯示
            let cdInfo = "";
            if (sk.type === 'active' && sk.cd) {
                cdInfo = `<span style="font-size:0.8em; background:#222; color:var(--gold); padding:2px 6px; border-radius:3px; margin-left:8px;">⏱️ ${sk.cd}s</span>`;
            }

            html += `
            <div style="background:${isValid ? '#1a1a2e' : '#111'}; padding:12px; border-left:4px solid ${isValid ? (sk.type === 'active' ? 'var(--skill)' : (sk.type === 'trait' ? '#e67e22' : 'var(--passive)')) : '#333'}; border-radius:6px; position:relative;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <b style="color:${isValid ? sk.color : '#555'}; font-size:1.1em;">${sk.name}</b>${cdInfo}
                        <span style="font-size:0.85em; color:#888; margin-left:8px;">${isEq ? `(裝備於第 ${isEqIdx + 1} 槽)` : ''}</span><br>
                        <small style="color:${isValid ? '#ddd' : '#555'}; font-size:0.95em;">${sk.desc}</small>
                        ${reqWarn}
                    </div>
                    <button id="btn-path-${sid}" class="btn-action" style="padding:6px 15px; font-size:0.95em; background:${btnColor}; color:${btnFontColor}; border-radius:4px; ${sk.type === 'trait' ? 'cursor:default;' : ''}" ${isDisabled ? 'disabled' : ''} ${btnAction ? `onclick="${btnAction}"` : ''}>${btnText}</button>
                </div>${tacticHtml}
            </div>`;
        });
    }
    c.innerHTML = html + `</div>`;
}






// ✨ V0.7.2 夥伴編隊大改版：清單過濾、詳細資料與大面板切換
function renderHelper() {
    const c = el('helper-area'); if (!c) return;

    // 狀態 1: 如果有夥伴正在上陣，顯示「出戰大面板」
    if (player.activeHelper && HELPER_DB[player.activeHelper] && player.helperTimes[player.activeHelper] > 0) {
        let hid = player.activeHelper;
        let hdb = HELPER_DB[hid];
        let timeStr = formatHelperTime(player.helperTimes[hid]);
        let isDanger = player.helperTimes[hid] < 60;

        c.innerHTML = `
            <div style="margin-bottom:15px; text-align:center;">
                <h3 style="color:var(--quest); margin:0;">✨ 夥伴出戰中</h3>
            </div>
            <div style="background:#1a1a2e; border:2px solid var(--quest); border-radius:8px; padding:20px; text-align:center; position:relative;">
                <span style="position:absolute; top:10px; right:10px; background:#000; color:var(--gold); padding:2px 8px; border-radius:4px; font-size:0.8em; border:1px solid var(--gold);">${hdb.roleName}</span>
                <h3 style="color:#fdcb6e; margin-top:10px;">⛩️ ${hdb.name}</h3>
                <p style="color:#aaa; font-size:0.9em; line-height:1.5;">${hdb.desc}</p>
                <div style="margin:20px 0; background:#000; padding:12px; border-radius:6px; border:1px dashed #555;">
                    合約時數倒數：<br>
                    <span style="color:${isDanger ? 'var(--danger)' : 'var(--quest)'}; font-size:1.5em; font-weight:bold; display:inline-block; margin-top:5px;">${timeStr}</span>
                </div>
                <button class="btn-action" style="width:100%; background:#e67e22; color:white; font-size:1.1em; padding:10px;" onclick="toggleHelper('${hid}')">☕ 讓夥伴退下休息</button>
            </div>
        `;
        return; // 返回，不渲染下方清單
    }

    // 狀態 2: 沒有夥伴上陣，顯示「待命陣容清單」
    let html = `
        <div class="inv-filter" style="margin-bottom:10px;">
            <button class="f-btn ${currentHelperFilter === 'all' ? 'active' : ''}" id="hb-all" onclick="setHelperFilter('all')">全部</button>
            <button class="f-btn ${currentHelperFilter === 'phy' ? 'active' : ''}" id="hb-phy" onclick="setHelperFilter('phy')">武術</button>
            <button class="f-btn ${currentHelperFilter === 'mag' ? 'active' : ''}" id="hb-mag" onclick="setHelperFilter('mag')">法術</button>
            <button class="f-btn ${currentHelperFilter === 'agi' ? 'active' : ''}" id="hb-agi" onclick="setHelperFilter('agi')">奇術</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
    `;

    let hasHelper = false;
    let roster = [];
    if (player.helperTimes) {
        for (let hid in player.helperTimes) {
            if (player.helperTimes[hid] > 0) {
                hasHelper = true;
                roster.push(hid);
            }
        }
    }

    if (!hasHelper) {
        html += `<div style="text-align:center; color:#666; padding:30px;">陣容空無一人...<br>請前往居酒屋招募夥伴。</div>`;
    } else {
        let filtered = roster.filter(hid => currentHelperFilter === 'all' || HELPER_DB[hid].role === currentHelperFilter);
        if (filtered.length === 0) {
            html += `<div style="text-align:center; color:#666; padding:20px;">此類別目前無待命夥伴。</div>`;
        } else {
            filtered.forEach(hid => {
                let hdb = HELPER_DB[hid];
                let timeStr = formatHelperTime(player.helperTimes[hid]);
                let roleColor = hdb.role === 'phy' ? '#ff4757' : (hdb.role === 'mag' ? '#3498db' : '#2ecc71');

                html += `
                <div class="item-row" style="border-left-color:${roleColor}; background:rgba(0,0,0,0.5); padding:12px;">
                    <div style="flex:1;">
                        <b style="color:#fdcb6e; font-size:1.05em;">${hdb.name}</b> 
                        <span style="font-size:0.75em; background:#222; color:${roleColor}; padding:2px 6px; border-radius:4px; margin-left:5px; border:1px solid ${roleColor};">${hdb.roleName}</span><br>
                        <small style="color:var(--gold); margin-top:5px; display:inline-block;">時數: ${timeStr}</small>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <button class="btn-action" style="background:#444; color:white; padding:6px 12px; font-size:0.9em;" onclick="showHelperDetails('${hid}')">詳細</button>
                        <button class="btn-action" style="background:var(--quest); color:black; padding:6px 12px; font-size:0.9em;" onclick="toggleHelper('${hid}')">✨ 上陣</button>
                    </div>
                </div>`;
            });
        }
    }
    html += `</div>`;
    c.innerHTML = html;
}

function renderShop() {
    const c = el('sub-content'); if (!c) return;
    const getShopOpts = (tabId) => { let opts = ""; Object.values(ITEM_DB).filter(i => i.shopAvailable && i.shopTab === tabId).forEach(item => { let label = item.tag ? `(${item.tag})` : ""; opts += `<option value="${item.id}">${item.name}${label} - $${item.cost}</option>`; }); return opts; };
    let recOpts = getShopOpts('rec'); let buffOpts = getShopOpts('buff'); let othOpts = getShopOpts('oth');

    let recHtml = recOpts ? `<div style="background:#111; padding:12px; border-radius:8px; margin-bottom:12px; border-left:4px solid var(--quest);"><h4 style="margin:0 0 8px 0; color:white;">🧪 恢復藥水</h4><div style="display:flex; gap:10px; margin-bottom:8px;"><select id="shop-rec-sel" style="flex:2;">${recOpts}</select><input type="number" id="shop-rec-cnt" value="1" min="1" style="flex:1;"></div><button class="btn-action" style="width:100%; background:var(--quest); color:black;" onclick="buyShopItem('rec')">購買</button></div>` : '';
    let buffHtml = buffOpts ? `<div style="background:#111; padding:12px; border-radius:8px; margin-bottom:12px; border-left:4px solid var(--mat);"><h4 style="margin:0 0 8px 0; color:white;">💪 強化道具</h4><div style="display:flex; gap:10px; margin-bottom:8px;"><select id="shop-buff-sel" style="flex:2;">${buffOpts}</select><input type="number" id="shop-buff-cnt" value="1" min="1" style="flex:1;"></div><button class="btn-action" style="width:100%; background:var(--mat); color:black;" onclick="buyShopItem('buff')">購買</button></div>` : '';
    let othHtml = othOpts ? `<div style="background:#111; padding:12px; border-radius:8px; margin-bottom:12px; border-left:4px solid var(--cherry);"><h4 style="margin:0 0 8px 0; color:white;">🎒 特殊道具</h4><div style="display:flex; gap:10px; margin-bottom:8px;"><select id="shop-oth-sel" style="flex:2;">${othOpts}</select><input type="number" id="shop-oth-cnt" value="1" min="1" style="flex:1;"></div><button class="btn-action" style="width:100%; background:var(--cherry); color:black;" onclick="buyShopItem('oth')">購買</button></div>` : '';

    c.innerHTML = `<h3>🏮 萬屋</h3>
        <p style="margin-top:0;">持有金幣：<span style="color:var(--gold); font-size:1.2em; font-weight:bold;">${player.gold.toLocaleString()}</span></p>
        <div id="shop-inventory-display" style="background:#1a1a2e; padding:10px; border-radius:8px; margin-bottom:15px; font-size:0.85em; color:#aaa; border:1px solid #333;"></div>
        ${recHtml}${buffHtml}${othHtml}`;
    updateShopInvDisplay();
}

function updateShopInvDisplay() {
    let inv = el('shop-inventory-display');
    if (!inv || !player.potions) return;
    let displayTexts = [];
    Object.values(ITEM_DB).filter(i => i.cat === 'rec').forEach(item => { let count = player.potions[item.id] || 0; displayTexts.push(`${item.name}: <b style="color:white">${count}</b>`); });

    let reviveCount = player.revives || 0;
    displayTexts.push(`${getItem('revive').name}: <b style="color:white">${reviveCount}</b>`);

    let washCount = player.mats['wash_star'] || 0;
    displayTexts.push(`${getItem('wash_star').name}: <b style="color:white">${washCount}</b>`);

    let formattedHtml = "<b>目前持有庫存：</b><br>";
    for (let i = 0; i < displayTexts.length; i += 2) { let line = displayTexts.slice(i, i + 2).join(" | "); formattedHtml += line + "<br>"; }
    inv.innerHTML = formattedHtml;
}

function renderSmithy() {
    const c = el('sub-content'); if (!c) return;

    // 1. 抓取目前的勾選狀態
    const currentHammer = document.getElementById('use-hammer')?.checked || false;
    const currentShield = document.getElementById('use-shield')?.checked || false;
    const currentShieldDown = document.getElementById('use-shield-down')?.checked || false; // ✨ 抓取緩衝符札狀態
    const currentGambler = document.getElementById('use-gambler')?.checked || false;
    const currentPerfect = document.getElementById('use-perfect')?.checked || false;

    // 2. 計算面板數值
    let baseAtk = getAtkVal();
    let curMatk = getMatkVal();
    let totalDef = getDefVal();
    let totalEva = parseFloat(getEvaPercent());
    let gearAtk = (player.gear.arms || 0) * 3;
    let gearDef = (player.gear.body || 0) * 1.5;
    let gearEva = (player.gear.legs || 0) * 1.0;

    // 3. 準備 UI 區塊 (面板與資源)
    let statusPanel = `
        <div style="background:rgba(0,0,0,0.5); padding:12px; border-radius:10px; border:1px solid #444; margin-bottom:15px; font-size:0.85em; line-height:1.6;">
            <h4 style="margin:0 0 8px 0; color:var(--gold); text-align:center;">✨ 目前靈脈總成</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px; text-align:center;">
                <div><span style="color:#aaa;">物 / 魔攻擊</span><br><b style="color:white;">${baseAtk} / ${curMatk}</b><br><small style="color:#888;">(+${gearAtk})</small></div>
                <div><span style="color:#aaa;">護甲防禦</span><br><b style="color:white;">${totalDef}</b><br><small style="color:#888;">(+${gearDef})</small></div>
                <div><span style="color:#aaa;">閃避機率</span><br><b style="color:white;">${totalEva}%</b><br><small style="color:#888;">(+${gearEva}%)</small></div>
            </div>
        </div>`;

    let invHtml = `<div style="text-align:left; font-size:0.85em; color:#aaa; margin-bottom:15px; padding:0 5px;"><span style="color:var(--gold);">💰 金幣: ${player.gold.toLocaleString()}</span> | <span style="color:#aaa;">⚙️ ${getItem('m0').name}: ${player.mats.m0 || 0}</span></div>`;

    // 4. 定義各法器屬性與每級提升幅度
    let gears = [
        { id: 'arms', name: '臂甲法器', attr: '物/魔攻擊', step: 3, unit: '' },
        { id: 'body', name: '胴甲法器', attr: '護甲防禦', step: 1.5, unit: '' },
        { id: 'legs', name: '足具法器', attr: '閃避機率', step: 1.0, unit: '%' }
    ];

    // 5. 生成裝備清單
    let upgradeHtml = gears.map(g => {
        let lv = player.gear[g.id] || 0;
        let req = getUpgradeCost(lv);
        let matName = getItem(req.matKey).name;

        // 抓取基礎機率
        let baseRate = (typeof UPGRADE_RATES !== 'undefined') ? (UPGRADE_RATES[lv] || 0) : 0;

        // 動態計算預覽機率
        let displayRate = baseRate;
        if (currentHammer) displayRate += 10;
        if (currentPerfect) displayRate = 100;
        displayRate = Math.min(100, displayRate);

        let canUpgrade = (player.gold >= req.goldCost && (player.mats.m0 || 0) >= req.ironCost && (player.mats[req.matKey] || 0) >= req.specialCost);

        // 計算當前屬性與下一級屬性
        let curStat = lv * g.step;
        let nextStat = (lv + 1) * g.step;
        let isMax = lv >= 15;
        let statPreviewHtml = `<div style="font-size:0.85em; color:#aaa; margin:4px 0;">
            ${g.attr}：<b style="color:white;">+${curStat}${g.unit}</b> 
            ${isMax ? '<span style="color:var(--gold); font-size:0.9em;">(已達極限)</span>' : `➔ <b style="color:lime;">+${nextStat}${g.unit}</b>`}
        </div>`;

        return `
            <div class="item-row" style="flex-direction:column; align-items:flex-start; margin-bottom:10px; border-left: 4px solid var(--mat);">
                <div style="width:100%; display:flex; justify-content:space-between; align-items:center;">
                    <b style="color:white; font-size:1.05em;">${g.name} <span style="color:var(--gold);">Lv.${lv}</span></b>
                    <span style="font-size:0.9em; font-weight:bold; color:${displayRate > 50 ? 'lime' : 'var(--danger)'};">成功率: ${displayRate}%</span>
                </div>
                ${statPreviewHtml}
                <div style="font-size:0.8em; color:#888; margin-bottom: 4px;">需求: 💰${req.goldCost} | ⚙️${getItem('m0').name}x${req.ironCost} | 🔮${matName}x${req.specialCost}</div>
                <button class="btn-action" style="width:100%; margin-top:5px; background:${canUpgrade ? 'var(--mat)' : '#444'}; color:${canUpgrade ? '#000' : '#888'}" ${!canUpgrade ? 'disabled' : ''} onclick="upgradeGear('${g.id}')">靈脈強化</button>
            </div>`;
    }).join("");

    // 6. 輸出完整畫面
    c.innerHTML = `
        <h3>⚒️ 虎徹的鍛冶屋</h3>
        ${statusPanel}
        ${invHtml}
        
        <div style="display:flex; margin-bottom:15px;">
            <button class="tab-btn active">靈脈強化</button>
            <button class="tab-btn" onclick="showSubView('smith_shop')">採買道具</button>
        </div>
        
        <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-bottom:15px; font-size:0.85em;">
            <p style="text-align:center; color:var(--cherry); margin:0 0 5px 0;">🔧 強化輔助設置</p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <label><input type="checkbox" id="use-hammer" ${currentHammer ? 'checked' : ''} onchange="renderSmithy()"> 匠人之錘 (${player.mats.mat_hammer_low || 0})</label>
                <label><input type="checkbox" id="use-shield" ${currentShield ? 'checked' : ''} onchange="renderSmithy()"> 替身符札 (${player.mats.mat_shield_break || 0})</label>
                <label><input type="checkbox" id="use-shield-down" ${currentShieldDown ? 'checked' : ''} onchange="renderSmithy()"> 緩衝符札 (${player.mats.mat_shield_down || 0})</label> <label><input type="checkbox" id="use-gambler" ${currentGambler ? 'checked' : ''} onchange="renderSmithy()"> 修羅之印 (${player.mats.mat_gambler || 0})</label>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
                <label><input type="checkbox" id="use-perfect" ${currentPerfect ? 'checked' : ''} onchange="renderSmithy()"> 絕對真理 (${player.mats.mat_perfect || 0})</label>
            </div>
            <p style="font-size:0.85em; color:#666; margin:8px 0 0 0; text-align:center;">* 註：防具 Lv.6 以上失敗會歸零。<br>若勾選「修羅之印」，失敗必降級，防護將失效。</p>
        </div>
        
        ${upgradeHtml}
    `;
}

function renderSmithyShop() {
    const c = el('sub-content'); if (!c) return;
    let shopItems = ['mat_shield_break', 'mat_shield_down', 'mat_hammer_low', 'mat_gambler'];

    let shopHtml = shopItems.map(id => {
        let item = getItem(id);
        let canAfford = player.gold >= item.cost;
        return `
            <div class="item-row" style="padding:12px; border-left-color:var(--cherry);">
                <div style="flex:1;">
                    <b style="color:var(--gold);">${item.name}</b><br>
                    <small style="color:#aaa;">${item.desc}</small>
                </div>
                <button class="btn-action" style="background:${canAfford ? 'var(--quest)' : '#444'}; color:${canAfford ? 'black' : '#888'}; min-width:80px;" ${!canAfford ? 'disabled' : ''} onclick="buySmithItem('${id}')">
                    $${item.cost.toLocaleString()}
                </button>
            </div>`;
    }).join("");

    c.innerHTML = `
        <h3>⚒️ 虎徹的鍛冶屋</h3>
        <p style="margin-top:0;">持有金幣：<span style="color:var(--gold); font-size:1.1em; font-weight:bold;">${player.gold.toLocaleString()}</span></p>
        <div style="display:flex; margin-bottom:15px;">
            <button class="tab-btn" onclick="showSubView('smith')">靈脈強化</button>
            <button class="tab-btn active">採買道具</button>
        </div>
        ${shopHtml}
        <div style="text-align:center; margin-top:15px;">
            <button class="btn-action" style="width:90%; background:#444; color:white;" onclick="backToVillage(); switchLogTab('inv'); switchView('battle');">📦 前往行囊變賣素材</button>
        </div>
    `;
}

// ✨ 新增：鍛造屋購買邏輯
function buySmithItem(id) {
    let item = getItem(id);
    if (player.gold < item.cost) return showToast("❌ 金幣不足！", "var(--danger)");
    player.gold -= item.cost;
    player.mats[id] = (player.mats[id] || 0) + 1;
    showToast(`獲得 ${item.name}`, "var(--quest)");
    updateUI();
    renderSmithyShop();
}
function renderIzakayaMenu() {
    let helperName = (player.activeHelper && HELPER_DB[player.activeHelper]) ? HELPER_DB[player.activeHelper].name : "前往招募";
    let bossQuote = player.lvl <= 30
        ? "老闆娘：「哎呀，又是妳呀？偷偷告訴妳，如果留下來幫忙打工，結算時我心情好可是會額外塞點『強化素材』給妳的喔！」"
        : "老闆娘：「哎呀，又是妳呀？今天想招募夥伴、喝個酒，還是來暗室小賭一下娛樂呢？」";

    el('sub-content').innerHTML = `<h3>🏮 居酒屋「宵月」</h3>
        <p style="color:#ffb7c5; font-style:italic; margin-bottom:20px;">${bossQuote}</p>
        <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; margin-bottom:15px; display:flex; justify-content:space-between; font-size:0.9em; border:1px solid #333;">
            <span>💰 持有金幣：<b style="color:var(--gold);">${player.gold.toLocaleString()}</b></span>
            <span>⛩️ 上陣夥伴：<b style="color:#fdcb6e;">${helperName}</b></span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="slot-card" style="width:auto; margin:0; border-color:#fdcb6e;" onclick="showSubView('helper_shop')">
                <h3 style="color:#fdcb6e; margin:5px 0;">🤝 招募板</h3><p style="margin:0; font-size:0.8em; color:#aaa;">購買夥伴時數</p>
            </div>
            <div class="slot-card" style="width:auto; margin:0; border-color:var(--gold);" onclick="showSubView('work')">
                <h3 style="color:var(--gold); margin:5px 0;">🧹 居酒屋打工</h3><p style="margin:0; font-size:0.8em; color:#aaa;">勞動換取修行金</p>
            </div>
            <div class="slot-card" style="width:auto; margin:0; border-color:#9b59b6;" onclick="showSubView('casino')">
                <h3 style="color:#9b59b6; margin:5px 0;">🎲 暗室賭局</h3><p style="margin:0; font-size:0.8em; color:#aaa;">德州式 21 點</p>
            </div>
        </div>`;
}

function renderIzakaya(tab = 'helper') {
    const c = el('sub-content'); if (!c) return;
    let infoBarHtml = `
        <div style="background:rgba(0,0,0,0.4); padding:12px; border-radius:8px; margin-bottom:15px; border:1px solid #444; text-align:center;">
            <span style="color:#aaa; font-size:0.85em;">💰 持有金幣：</span><b style="color:var(--gold); font-size:1.1em;">$${player.gold.toLocaleString()}</b>
        </div>
    `;

    let contentHtml = "";
    Object.values(HELPER_DB).forEach(h => {
        let canAfford = player.gold >= h.cost;
        let bonusLabel = h.workBonus.rate > 1.0 ? `<span style="color:var(--gold); font-size:0.8em;">[${h.workBonus.label}]</span>` : "";
        let currentOwnedTime = player.helperTimes ? (player.helperTimes[h.id] || 0) : 0;
        let ownedTxt = currentOwnedTime > 0 ? `<br><small style="color:var(--quest);">已持有：${formatHelperTime(currentOwnedTime)}</small>` : "";

        contentHtml += `
            <div class="item-row" style="border-left-color:#fdcb6e; padding:15px;">
                <div style="flex:1;">
                    <b style="color:#fdcb6e;">${h.name}</b> ${bonusLabel}<br>
                    <small style="color:#aaa; display:block; margin:5px 0;">${h.desc}</small>
                    ${ownedTxt}
                </div>
                <button class="btn-action" style="background:${canAfford ? 'var(--quest)' : '#444'}; color:${canAfford ? 'black' : '#888'}; min-width:80px;" onclick="hireHelper('${h.id}')">
                    購買 ${h.duration}分<br><small>$${h.cost}</small>
                </button>
            </div>`;
    });

    c.innerHTML = `<h3>🤝 招募佈告欄</h3>
        <p style="color:#aaa; font-size:0.9em; margin-bottom:15px;">老闆娘：「只要錢給到位，可以無限期買斷他們的時間。記得去右側『夥伴』分頁安排他們上陣喔。」</p>
        ${infoBarHtml}${contentHtml}
        <button class="btn-action" style="width:100%; margin-top:15px; background:#444; color:white;" onclick="showSubView('izakaya')">返回居酒屋</button>`;
}

function renderIzakayaWork() {
    let now = Date.now(); let baseRate = 1200 + (player.lvl * 100); let finalRate = baseRate; let bonusTxt = "";
    if (player.activeHelper && HELPER_DB[player.activeHelper] && HELPER_DB[player.activeHelper].workBonus) { let bonus = HELPER_DB[player.activeHelper].workBonus; finalRate = Math.floor(baseRate * bonus.rate); if (bonus.rate > 1.0) bonusTxt = `<br><small style='color:var(--quest);'>✨ 夥伴加成：${bonus.label}</small>`; }
    let html = `<h3>🧹 居酒屋勤務</h3>
        <p style="color:#aaa;">目前的時薪為 $${finalRate}${bonusTxt}</p>
        <div style="font-size:0.85em; color:var(--quest); margin-bottom:15px; border-left:3px solid var(--quest); background:rgba(85,239,196,0.1); padding:8px; border-radius:4px;">💡 <b>老闆的私下犒賞：</b>努力工作不僅能賺錢，結算時還有機會獲得額外的<b style="color:var(--mat)">強化素材</b>喔！</div>`;
    if (!player.workStartTime) {
        html += `<div style="background:rgba(255,255,255,0.05); padding:20px; border-radius:8px; border:1px solid #444; margin-top:15px;"><p>老闆：「現在剛好缺人手，要來幫忙嗎？」</p><button class="btn-action" style="width:100%; background:var(--gold); color:black;" onclick="startWork()">開始幫忙</button></div><button class="btn-action" style="width:100%; margin-top:15px; background:#444; color:white;" onclick="showSubView('izakaya')">返回居酒屋</button>`;
    } else {
        let elapsedSecs = Math.floor((now - player.workStartTime) / 1000); let earn = Math.floor((elapsedSecs / 3600) * finalRate);
        html += `<div style="background:rgba(255,184,0,0.1); padding:20px; border-radius:8px; border:1px solid var(--gold); margin-top:15px; text-align:center;">
            <p style="color:var(--gold);">🍺 努力工作中...</p>
            <p style="font-size:0.85em; color:#aaa;">身上現金：$${player.gold.toLocaleString()}</p>
            <p>已持續: ${Math.floor(elapsedSecs / 60)} 分鐘</p>
            <p>累積工錢：<span style="font-size:1.4em; font-weight:bold; color:var(--gold);">+$${earn.toLocaleString()}</span></p>
            <button class="btn-action" style="width:100%; background:var(--danger); color:white; margin-top:10px;" onclick="stopWork()">領工錢並收工</button>
        </div>`;
    }
    el('sub-content').innerHTML = html;
}

function renderCasino() {
    const c = el('sub-content'); if (!c) return;
    if (!casinoState.active) {
        c.innerHTML = `<h3>🎲 暗室 21 點</h3>
            <div style="background:#111; padding:20px; border-radius:8px; border:1px solid #333; text-align:center;">
                <p style="color:#aaa; font-size:0.95em; line-height:1.5;">老闆娘：「規矩很簡單，最接近 21 點的贏。<br>平手退錢，爆牌沒收。要來一把嗎？」</p>
                <div style="margin:20px 0; background:rgba(0,0,0,0.5); padding:15px; border-radius:5px; border:1px solid var(--gold);">
                    <p style="margin:0 0 10px 0;">持有金幣：<b style="color:var(--gold)">$${player.gold.toLocaleString()}</b></p>
                    底注：<input type="number" id="casino-bet" value="100" min="1" max="${player.gold}" style="width:120px; font-size:1.2em; text-align:center;">
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-action" style="flex:1; background:var(--quest); color:black;" onclick="startCasino(false)">🃏 一般發牌</button>
                    <button class="btn-action" style="flex:1; background:var(--danger); color:white;" onclick="startCasino(true)">🔥 梭哈 (ALL IN)</button>
                </div>
            </div>
            <button class="btn-action" style="width:100%; margin-top:15px; background:#444; color:white;" onclick="showSubView('izakaya')">← 返回居酒屋</button>`;
    } else {
        let dealerCardsHtml = casinoState.dealerCards.map((card, idx) => {
            if (idx === 1 && !casinoState.gameOver) return `<span style="display:inline-block; padding:10px; background:#333; color:#fff; border-radius:5px; margin:3px; border:1px solid #555;">🎴 蓋牌</span>`;
            return `<span style="display:inline-block; padding:10px; background:#fff; color:${card.suit === '♥' || card.suit === '♦' ? 'red' : 'black'}; border-radius:5px; margin:3px; font-weight:bold; font-size:1.2em;">${card.suit} ${card.rank}</span>`;
        }).join("");

        let playerCardsHtml = casinoState.playerCards.map(card =>
            `<span style="display:inline-block; padding:10px; background:#fff; color:${card.suit === '♥' || card.suit === '♦' ? 'red' : 'black'}; border-radius:5px; margin:3px; font-weight:bold; font-size:1.2em;">${card.suit} ${card.rank}</span>`
        ).join("");

        let actionBtns = "";
        if (!casinoState.gameOver) {
            actionBtns = `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:20px;">
                    <button class="btn-action" style="background:var(--accent); color:black; padding:12px;" onclick="hitCasino()">🃏 要牌 (Hit)</button>
                    <button class="btn-action" style="background:var(--quest); color:black; padding:12px;" onclick="standCasino()">🛑 停牌 (Stand)</button>
                    <button class="btn-action" style="background:var(--gold); color:black; padding:12px;" ${casinoState.isAllIn ? 'disabled' : ''} onclick="raiseCasino()">💰 加碼 (Raise)</button>
                    <button class="btn-action" style="background:#888; color:white; padding:12px;" ${casinoState.isAllIn ? 'disabled' : ''} onclick="surrenderCasino()">🏳️ 投降輸一半</button>
                </div>`;
        } else {
            actionBtns = `<button class="btn-action" style="width:100%; margin-top:20px; background:var(--gold); color:black; font-size:1.1em; padding:12px;" onclick="casinoState.active = false; renderCasino();">再來一局</button>`;
        }

        c.innerHTML = `<h3>🎲 暗室 21 點</h3>
            <div style="background:#111; padding:20px; border-radius:8px; border:1px solid #333;">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px dashed #555; padding-bottom:10px;">
                    <span style="color:#aaa;">目前押注：<b style="color:var(--gold); font-size:1.2em;">$${casinoState.bet.toLocaleString()}</b> ${casinoState.isAllIn ? '<span style="color:var(--danger); font-weight:bold; animation: flash 1s infinite;">(🔥 ALL IN)</span>' : ''}</span>
                </div>
                
                <div style="margin-bottom:20px; padding:15px; background:rgba(255,255,255,0.05); border-radius:8px; position:relative;">
                    <p style="margin:0 0 10px 0; color:#aaa;">老闆娘 ${casinoState.gameOver ? `<b style="color:white">[${casinoState.dealerTotal} 點]</b>` : ''}</p>
                    <div style="display:flex; justify-content:center; gap:5px;">${dealerCardsHtml}</div>
                </div>
                
                <div style="padding:15px; background:rgba(255,255,255,0.05); border-radius:8px; position:relative;">
                    <p style="margin:0 0 10px 0; color:#aaa;">玩家 (妳) <b style="color:white">[${casinoState.playerTotal} 點]</b></p>
                    <div style="display:flex; justify-content:center; gap:5px;">${playerCardsHtml}</div>
                </div>
                
                <div id="casino-msg" style="color:var(--gold); text-align:center; font-weight:bold; font-size:1.2em; margin-top:15px; min-height:1.5em; text-shadow: 1px 1px 2px black;">${casinoState.msg || ""}</div>
                ${actionBtns}
            </div>
            <button class="btn-action" style="width:100%; margin-top:15px; background:#444; color:white;" onclick="casinoState.active = false; showSubView('izakaya')">← 離開賭局</button>
            <style>@keyframes flash { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }</style>`;
    }
}

function renderTeahouse() {
    const c = el('sub-content'); if (!c) return;
    
    c.innerHTML = `<h3>🍵 茶屋「螢火」</h3>
        <p style="color:#aaa; font-style:italic; margin-bottom:20px;">老闆娘 瑩：「遠道而來的旅人，辛苦了。外面風沙大、霧氣也重...快進來歇歇腳，喝杯熱茶暖暖身子吧。」</p>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
            <div class="slot-card" style="width:auto; margin:0; border-color:var(--quest);" onclick="showToast('任務系統準備中...即將開放！', 'var(--quest)')">
                <h3 style="color:var(--quest); margin:5px 0;">📜 揭示板</h3><p style="margin:0; font-size:0.8em; color:#aaa;">承接委託與報酬</p>
            </div>
            <div class="slot-card" style="width:auto; margin:0; border-color:var(--accent);" onclick="showToast('玩家互動目前尚未開放', 'var(--danger)')">
                <h3 style="color:var(--accent); margin:5px 0;">👥 玩家互動</h3><p style="margin:0; font-size:0.8em; color:#aaa;">交流情報與傳聞</p>
            </div>
        </div>
        
        <button class="btn-action" style="width:100%; background:#444; color:white;" onclick="backToVillage()">← 離開茶屋</button>`;
}

function renderSect() {
    const c = el('sub-content');
    if (!c) return;

    if (!player.sect) {
        let sectHtml = "";
        const reqItems = { 'samurai': 'mat_samurai_proof', 'ninja': 'mat_ninja_scroll', 'shinto': 'mat_shinto_rope' };

        for (let key in SECT_DB) {
            let s = SECT_DB[key]; let reqItemId = reqItems[key];
            let hasItem = (player.mats[reqItemId] || 0) > 0;
            let isLvlOk = player.lvl >= 50;

            // ✨ 忍者試煉改為「主動發起」
            let actionBtn = "";
            if (key === 'ninja' && !hasItem) {
                // 🦅 忍者：維持妳要求的渡鴉試煉
                actionBtn = `<button class="btn-action" style="width:100%; background:var(--accent); color:black;" onclick="startNinjaTrial()">🦅 向渡鴉請求「影之考驗」</button>`;
            }
            else if (key === 'samurai' && !hasItem) {
                // 提示去打關卡
                actionBtn = `<button class="btn-action" style="width:100%; background:#444; color:#aaa;" onclick="startSamuraiTrial()">⚔️ 詢問如何獲得信物</button>`;
            }
            else if (key === 'shinto' && !hasItem) {
                // 提示去奉納
                actionBtn = `<button class="btn-action" style="width:100%; background:#444; color:#aaa;" onclick="startShintoTrial()">⛩️ 詢問如何獲得信物</button>`;
            }
            else if (key === 'shinto' && hasItem && !isLvlOk) {
                // ✨ 有信物但等级不足：禰宜 柊的劇情話
                actionBtn = `<button class="btn-action" style="width:100%; background:#888; color:#ddd;" onclick="openModal('⛩️ 柊的規勸', '禰宜 柊：「你的修行還不足呢。神明只會選擇經歷足夠的人。等你修行到50等再來吧。」', '了解')">
                    🎀 修行中...（需達 Lv.50）
                </button>`;
            }
            else {
                // 已持有信物且等级足够：入門按钮
                actionBtn = `<button class="btn-action" style="width:100%; background:${(isLvlOk && hasItem) ? 'var(--quest)' : '#444'}; color:${(isLvlOk && hasItem) ? 'black' : '#888'};" ${!(isLvlOk && hasItem) ? 'disabled' : ''} onclick="joinSect('${key}', '${reqItemId}')">
                    ${(isLvlOk && hasItem) ? '✨ 呈上信物，請求入門' : `🔒 需 Lv.50 以上`}
                </button>`;
            }

            sectHtml += `
                <div class="item-row" style="flex-direction:column; align-items:flex-start; padding:15px; margin-bottom:12px; background:rgba(0,0,0,0.5);">
                    <div style="display:flex; justify-content:space-between; width:100%; align-items:center; margin-bottom:8px;">
                        <b style="color:white; font-size:1.1em;">${s.name} <span style="font-size:0.8em; color:var(--gold);">(${s.roleName})</span></b>
                        <button style="background:none; border:1px solid #666; color:#888; font-size:0.75em; cursor:pointer; padding:2px 5px;" onclick="openModal('${s.guideNPC}的指引', '${s.joinHint}', '了解')">❓ 打聽情報</button>
                    </div>
                    <div style="font-size:0.9em; color:#aaa; margin-bottom:10px;">${s.desc}</div>
                    ${actionBtn}
                </div>`;
        }
        c.innerHTML = `<h3>⚔️ 流派門徑</h3>${sectHtml}`;
        return;
    }

    // 狀態 2：已有流派 (日系宗門大廳)
    let s = SECT_DB[player.sect];
    let rankName = s.ranks[player.sectRank];
    let nextRankReq = s.reqContrib[player.sectRank + 1] || null;
    let contribPct = nextRankReq ? Math.min(100, (player.sectContrib / nextRankReq) * 100) : 100;

    // 渲染技能列表 (根據階級鎖定)
    let skillRows = "";
    s.skills.forEach(sid => {
        let sk = skillDB[sid];
        let isLocked = player.sectRank < sk.rank;

        // ✨ 動態判定技能類型標籤與顏色
        let typeLabel = "";
        let themeColor = sk.color;
        if (sk.type === 'trait') {
            typeLabel = "🟢 常駐特性";
            themeColor = "#e67e22"; // 橘金色
        } else if (sk.type === 'passive') {
            typeLabel = "🟡 被動武學";
        } else {
            typeLabel = "🔴 主動武學 (Lv.1)";
        }

        skillRows += `
            <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:5px; margin-bottom:5px; border-left:3px solid ${isLocked ? '#444' : themeColor};">
                <div style="display:flex; justify-content:space-between; font-size:0.9em;">
                    <b style="color:${isLocked ? '#555' : themeColor};">${isLocked ? '🔒 秘傳武學' : sk.name}</b>
                    <span style="font-size:0.8em; color:#888;">${isLocked ? '未解鎖' : typeLabel}</span>
                </div>
                <div style="font-size:0.8em; color:${isLocked ? '#444' : '#aaa'}; margin-top:4px;">${isLocked ? `需達到【${s.ranks[sk.rank]}】位階方可領悟` : sk.desc}</div>
            </div>`;
    });

    c.innerHTML = `
        <div style="background:linear-gradient(180deg, #1a1a2e, #0a0a0f); border:1px solid var(--quest); border-radius:10px; padding:15px; margin-bottom:15px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div><b style="color:var(--gold); font-size:1.2em;">${s.name}</b><br><span style="color:var(--quest);">位階：【${rankName}】</span></div>
                <div style="text-align:right;"><small style="color:#888;">宗門貢獻度</small><br><b style="color:white;">${player.sectContrib}</b></div>
            </div>
            ${nextRankReq ? `
            <div class="bar-bg" style="height:8px; margin-bottom:5px;"><div class="exp-fill" style="width:${contribPct}%;"></div></div>
            <div style="text-align:center; font-size:0.75em; color:#888;">晉升【${s.ranks[player.sectRank + 1]}】進度: ${player.sectContrib} / ${nextRankReq}</div>
            ` : `<div style="text-align:center; color:var(--gold); font-size:0.85em;">★ 已達到流派巔峰 ★</div>`}
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
            <button class="btn-action" style="background:#222; color:var(--mat); border:1px solid var(--mat);" onclick="promptContribute()">🎁 上繳物資</button>
            <button class="btn-action" style="background:#222; color:var(--cherry); border:1px solid var(--cherry);" onclick="promptSectQuest()">📜 羈絆委託</button>
        </div>

        <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:8px;">
            <h4 style="margin:0 0 10px 0; color:#888; font-size:0.9em; border-bottom:1px solid #333; padding-bottom:5px;">⛩️ 秘笈參悟室</h4>
            ${skillRows}
        </div>
        
        <button class="btn-action" style="width:100%; margin-top:15px; background:#444; color:white;" onclick="backToVillage()">← 返回村莊</button>
    `;
}

// 上繳物資 
function promptContribute() {
    // 呼叫 script.js 裡的邏輯
    if (typeof window.promptContribute === 'function') {
        window.promptContribute();
    } else {
        showToast("系統載入中，請稍候...", "var(--gold)");
    }
}

// 羈絆委託暫時維持提示，這是我們下一次更新的重點！
function promptSectQuest() {
    let s = SECT_DB[player.sect];
    openModal("📜 羈絆委託", `目前的位階【${s.ranks[player.sectRank]}】尚無可接取的特殊任務。<br><br><span style="color:#888;">(提示：繼續提升貢獻度至最高位階，解鎖小師妹與大巫女的連環故事)</span>`, "了解");
}
// 預留函數：羈絆任務 (這就是妳說的連環故事起點)
function promptSectQuest() { showToast("【！羈絆】目前尚無新的委託。", "var(--cherry)"); }
function renderShrine() {
    const c = el('sub-content'); if (!c) return;
    player.shrineDonation = player.shrineDonation || 0;
    player.ascensionCount = player.ascensionCount || 0;

    let ascHtml = "";
    if (player.shrineDonation >= 50000) {
        let ascCost = 50000;
        let canAfford = player.gold >= ascCost;
        ascHtml = `
            <div style="margin-top:20px; padding:15px; background:rgba(255,215,0,0.1); border:1px solid var(--gold); border-radius:8px; text-align:center;">
                <h4 style="color:var(--gold); margin-top:0; font-size:1.2em;">🌸 盛大祈福 (上殿)</h4>
                <p style="font-size:0.9em; color:#aaa; line-height:1.5;">妳的虔誠已具備登殿資格。<br>支付 <b style='color:var(--gold)'>50,000 金幣</b> 祈求神蹟發生。</p>
                <p style="font-size:0.8em; color:var(--cherry);">目前神社好感度 (祈福次數)：${player.ascensionCount}</p>
                <button class="btn-action" style="width:100%; background:${canAfford ? 'var(--gold)' : '#444'}; color:black; font-weight:bold;" ${!canAfford ? 'disabled' : ''} onclick="ascendShrine(${ascCost})">
                    🙏 祈求神意 (50,000 金幣)
                </button>
            </div>`;
    } else {
        ascHtml = `
            <div style="margin-top:20px; padding:15px; background:rgba(255,255,255,0.05); border:1px solid #444; border-radius:8px; text-align:center; filter: grayscale(100%);">
                <h4 style="color:#888; margin-top:0;">🔒 盛大祈福</h4>
                <p style="font-size:0.85em; color:#666;">累積奉納達 50,000 後解鎖上殿資格。</p>
            </div>`;
    }

    c.innerHTML = `<h3>⛩️ 宵月神社</h3>
        <div style="display:flex; margin-bottom:15px;">
            <button class="tab-btn active">神明奉納</button>
            <button class="tab-btn" onclick="showSubView('shrine_shop')">御守授予</button>
        </div>
        
        <div style="background:#111; padding:15px; border-radius:8px; border:1px solid #333; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <p style="margin:0; font-size:0.9em; color:#aaa;">持有金幣</p>
                <b style="color:var(--gold); font-size:1.1em;">$${player.gold.toLocaleString()}</b>
            </div>
            <div style="text-align:right;">
                <p style="margin:0; font-size:0.9em; color:#aaa;">累積奉納</p>
                <b style="color:var(--quest); font-size:1.1em;">$${player.shrineDonation.toLocaleString()}</b>
            </div>
        </div>
        
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px; background:rgba(255,183,197,0.1); padding:10px; border-radius:8px; border:1px solid var(--cherry);">
            <span style="font-size:2em;">👘</span>
            <p style="margin:0; font-size:0.85em; color:#ddd; line-height:1.5;"><b>巫女 美香：</b>「參拜講究『御緣』（5円）與『好吉』（11円）。切記，千萬別用不吉利的數字（10円、500円）觸怒荒神大人喔。若獲得神德代幣，可以來旁邊的授予所找我。」</p>
        </div>

        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:15px;">
            <button class="btn-action" style="background:#555; color:white;" onclick="offerMoney(5)">5 円</button>
            <button class="btn-action" style="background:#555; color:white;" onclick="offerMoney(11)">11 円</button>
            <button class="btn-action" style="background:var(--danger); color:white;" onclick="offerMoney(10)">10 円</button>
            <button class="btn-action" style="background:#555; color:white;" onclick="offerMoney(485)">485 円</button>
            <button class="btn-action" style="background:var(--danger); color:white;" onclick="offerMoney(500)">500 円</button>
            <button class="btn-action" style="background:var(--gold); color:black;" onclick="offerMoney(1000)">1000 円</button>
        </div>
        <div id="shrine-msg" style="color:var(--quest); font-weight:bold; min-height:1.5em; text-align:center;"></div>
        ${ascHtml}`;
}

function renderShrineShop() {
    const c = el('sub-content'); if (!c) return;
    let currentDonation = player.shrineDonation || 0;

    let shrineItems = ['s_omikuji', 's_ema', 's_omiki', 's_hamaya', 'revive', 'mat_shinto_rope'];
    let shopHtml = shrineItems.map(id => {
        let item = getItem(id);
        let isUnlocked = currentDonation >= item.reqDonation;
        let canAfford = (player.mats.c_shrine || 0) >= item.cost;

        let borderColor = isUnlocked ? (id === 'revive' ? '#e74c3c' : 'var(--gold)') : '#333';
        let titleColor = isUnlocked ? (id === 'revive' ? '#e74c3c' : 'var(--gold)') : '#666';
        let btnBg = (isUnlocked && canAfford) ? 'var(--quest)' : '#444';
        let btnColor = (isUnlocked && canAfford) ? 'black' : '#888';
        let btnText = isUnlocked ? `${item.cost} 枚代幣` : `🔒 需奉納 ${item.reqDonation.toLocaleString()}`;

        return `
            <div class="item-row" style="border-left-color:${borderColor}; padding:12px; background:${isUnlocked ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.5)'};">
                <div style="flex:1; filter:${isUnlocked ? 'none' : 'grayscale(100%) opacity(0.5)'};">
                    <b style="color:${titleColor}; font-size:1.1em;">${item.name}</b> ${item.tag ? `<span style="font-size:0.8em; color:#aaa;">(${item.tag})</span>` : ''}<br>
                    <small style="color:#ddd;">${item.desc}</small>
                </div>
                <button class="btn-action" style="background:${btnBg}; color:${btnColor}; font-weight:bold; width:120px;" ${!(isUnlocked && canAfford) ? 'disabled' : ''} onclick="buyShrineItem('${id}')">
                    ${btnText}
                </button>
            </div>`;
    }).join("");

    c.innerHTML = `<h3>⛩️ 宵月神社</h3>
        <div style="display:flex; margin-bottom:15px;">
            <button class="tab-btn" onclick="showSubView('shrine')">神明奉納</button>
            <button class="tab-btn active">御守授予</button>
        </div>
        
        <div style="background:#111; padding:15px; border-radius:8px; border:1px solid #333; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <p style="margin:0; font-size:0.9em; color:#aaa;">累積奉納</p>
                <b style="color:var(--gold); font-size:1.1em;">$${currentDonation.toLocaleString()}</b>
            </div>
            <div style="text-align:right;">
                <p style="margin:0; font-size:0.9em; color:#aaa;">擁有神德</p>
                <b style="color:var(--quest); font-size:1.3em;">${(player.mats.c_shrine || 0)} 枚</b>
            </div>
        </div>
        
        <div style="display:grid; grid-template-columns:1fr; gap:10px; margin-bottom:20px;">
            ${shopHtml}
        </div>
        <p style="text-align:center; color:#666; font-size:0.85em;">(購買後將存放於右側「行囊」中，可視戰況隨時點擊 ✨使用 取用)</p>
    `;
}

function updateUI() {
    if (el('p-name')) el('p-name').innerText = player.name || "無名者";
    if (el('p-display-name')) el('p-display-name').innerText = player.name || "無名者";
    if (el('p-lvl')) el('p-lvl').innerText = player.lvl;
    if (el('p-gold')) el('p-gold').innerText = player.gold.toLocaleString();

    // ✨ 在這裡安插：更新頂部面板的流派名稱
    if (el('p-path-text')) {
        let sectName = (player.sect && typeof SECT_DB !== 'undefined' && SECT_DB[player.sect]) ? SECT_DB[player.sect].name : "無";
        el('p-path-text').innerText = sectName;
        el('p-path-text').style.color = player.sect ? "var(--quest)" : "var(--cherry)";
    }

    ['str', 'vit', 'agi'].forEach(s => { if (el(`p-${s}-val`)) el(`p-${s}-val`).innerText = player[s]; if (el(`stat-${s}`)) el(`stat-${s}`).innerText = player[s]; if (el(`pre-${s}`)) el(`pre-${s}`).innerText = statPreview[s] > 0 ? `+${statPreview[s]}` : ""; });

    if (el('stat-points')) { el('stat-points').innerText = player.statPoints; if (player.statPoints > 0) el('stat-points').classList.add('glow-pts'); else el('stat-points').classList.remove('glow-pts'); }
    if (el('alloc-btns')) el('alloc-btns').classList.toggle('hidden', (statPreview.str + statPreview.vit + statPreview.agi) === 0);

    let curAtk = getAtkVal();
    let curMatk = getMatkVal();
    let curSpd = Math.max(0.25, 1.5 / (1 + player.agi * 0.008)).toFixed(2);
    let curDef = getDefVal();
    let curEva = parseFloat(getEvaPercent()).toFixed(1);

    let tempStr = player.str + statPreview.str;
    let tempVit = player.vit + statPreview.vit;
    let tempAgi = player.agi + statPreview.agi;

    if (el('det-atk')) { let nAtk = curAtk + (statPreview.str * 2); let diff = nAtk - curAtk; el('det-atk').innerHTML = `${curAtk}${diff > 0 ? ` <span style="color:lime;">+${diff}</span>` : ""}`; }
    if (el('det-matk')) { let nMatk = Math.floor(tempVit * 0.5) + ((player.gear.arms || 0) * 3); let diff = nMatk - curMatk; el('det-matk').innerHTML = `${curMatk}${diff > 0 ? ` <span style="color:lime;">+${diff}</span>` : ""}`; }
    if (el('det-spd')) { let nSpd = Math.max(0.25, 1.5 / (1 + tempAgi * 0.008)).toFixed(2); let diff = (nSpd - curSpd).toFixed(2); el('det-spd').innerHTML = `${curSpd}${diff < 0 ? ` <span style="color:var(--accent);">${diff}s</span>` : ""}s`; }
    if (el('det-def')) { let nDefVal = curDef + (statPreview.vit * 1); let diff = nDefVal - curDef; el('det-def').innerHTML = `${curDef}${diff > 0 ? ` <span style="color:lime;">+${diff}</span>` : ""}`; }
    if (el('det-eva')) { let nEvaVal = Math.min(70, parseFloat(curEva) + (statPreview.agi * 0.1)); let diff = (nEvaVal - curEva).toFixed(1); el('det-eva').innerHTML = `${curEva}${diff > 0 ? ` <span style="color:lime;">+${diff}%</span>` : ""}%`; }

    // ✨ 動態生成與更新我方攻擊跑條 (Action Bar)
    let pAtkBar = el('p-atk-bar');
    let pHpBar = el('p-hp-bar');
    if (!pAtkBar && pHpBar) {
        let pContainer = pHpBar.parentNode;
        if (pContainer && pContainer.parentNode) {
            let barWrapper = document.createElement('div');
            // ✨ 減輕視覺壓力：降低高度、移除黑邊框，改用柔和底色
            barWrapper.style.cssText = "width:100%; height:3px; background:rgba(255,255,255,0.05); margin-bottom:4px; border-radius:2px; overflow:hidden;";
            // ✨ 拔除刺眼的發光 (box-shadow)，改用柔和的漸層色
            barWrapper.innerHTML = `<div id="p-atk-bar" style="height:100%; width:0%; background:linear-gradient(90deg, rgba(85,239,196,0.3) 0%, rgba(85,239,196,0.9) 100%); transition:width 0.1s linear;"></div>`;
            pContainer.parentNode.insertBefore(barWrapper, pContainer);
        }
    }

    // ✨ 動態生成與更新敵方攻擊跑條 (Action Bar)
    let mAtkBar = el('m-atk-bar');
    let mHpBar = el('m-hp-bar');
    if (!mAtkBar && mHpBar) {
        let mContainer = mHpBar.parentNode;
        if (mContainer && mContainer.parentNode) {
            let barWrapper = document.createElement('div');
            barWrapper.style.cssText = "width:100%; height:3px; background:rgba(255,255,255,0.05); margin-bottom:4px; border-radius:2px; overflow:hidden;";
            barWrapper.innerHTML = `<div id="m-atk-bar" style="height:100%; width:0%; background:linear-gradient(90deg, rgba(255,71,87,0.3) 0%, rgba(255,71,87,0.9) 100%); transition:width 0.1s linear;"></div>`;
            mContainer.parentNode.insertBefore(barWrapper, mContainer);
        }
    }

    // 更新我方跑條進度
    if (el('p-atk-bar')) {
        let pMax = Math.max(0.25, 1.5 / (1 + player.agi * 0.008));
        
        // ✨ 極速防閃爍機制：當攻速極快 (<= 0.4秒) 時，跑條不再頻繁歸零，改為常駐的「疾風狀態」
        if (pMax <= 0.4) {
            el('p-atk-bar').style.transition = "opacity 0.5s ease-in-out";
            el('p-atk-bar').style.width = "100%";
            el('p-atk-bar').style.opacity = "0.7"; // 半透明狀態，不刺眼
        } else {
            el('p-atk-bar').style.opacity = "1";
            let pCur = pMax - (combatState.playerAtkTimer || 0);
            let pct = Math.max(0, Math.min(100, (pCur / pMax) * 100));
            el('p-atk-bar').style.transition = pct < 5 ? "none" : "width 0.1s linear"; // 防止重置時產生倒退動畫
            el('p-atk-bar').style.width = pct + "%";
        }
    }

    // 更新敵方跑條進度
    if (el('m-atk-bar')) {
        let isDefendDummy = player.mapIdx === 0 && monster.id === 'm_dojo_defend';
        let mMax = isDefendDummy ? 2.5 : 2.0;
        if (monster && monster.atk > 0) {
            let mCur = mMax - (combatState.mobAtkTimer || 0);
            let pct = Math.max(0, Math.min(100, (mCur / mMax) * 100));
            el('m-atk-bar').style.transition = pct < 5 ? "none" : "width 0.1s linear";
            el('m-atk-bar').style.width = pct + "%";
        } else {
            el('m-atk-bar').style.width = "0%"; // 靜止木人或無攻擊力的怪物不跑條
        }
    }

    if (el('p-hp-bar')) el('p-hp-bar').style.width = (player.hp / getMaxHP() * 100) + "%";
    if (el('p-hp-text')) { if (isReviving) el('p-hp-text').innerHTML = `<span style="color:var(--gold);">💀 重塑中...</span>`; else el('p-hp-text').innerText = `${Math.floor(player.hp)} / ${getMaxHP()}`; }
    if (el('p-exp-bar')) el('p-exp-bar').style.width = (player.exp / player.next * 100) + "%";
    if (el('p-exp-text')) el('p-exp-text').innerText = `${player.exp} / ${player.next}`;

    let buffDisplay = el('buff-display');
    if (!buffDisplay && el('p-display-name')) {
        let pPanel = el('p-display-name').parentNode;
        buffDisplay = document.createElement('div');
        buffDisplay.id = 'buff-display';
        buffDisplay.style.cssText = 'margin-top: 8px; font-size: 0.85em; display: flex; gap: 5px; flex-wrap: wrap;';
        pPanel.appendChild(buffDisplay);
    }
    if (buffDisplay) {
        let buffHtml = "";
        if (player.buffs) {
            for (let key in player.buffs) {
                if (player.buffs[key] > 0) {
                    let effName = EFFECT_MAP[key] ? EFFECT_MAP[key].name : key;
                    let mins = Math.floor(player.buffs[key] / 60);
                    let secs = Math.floor(player.buffs[key] % 60);
                    buffHtml += `<span style="background:rgba(255,215,0,0.15); padding:2px 6px; border-radius:4px; border:1px solid var(--gold); color:var(--gold); text-shadow:1px 1px 2px #000;">🔥 ${effName} ${mins}:${secs < 10 ? '0' : ''}${secs}</span>`;
                }
            }
        }
        buffDisplay.innerHTML = buffHtml;
    }

    if (el('m-name')) el('m-name').innerHTML = monster.name;
    mHpBar = el('m-hp-bar'); let mHpText = el('m-hp-text'); let mSubInfo = el('m-sub-info');
    if (player.mapIdx === 0) {
        if (mHpBar) { mHpBar.className = 'zen-fill'; mHpBar.style.width = (combatState.zenTimer / 20 * 100) + "%"; } if (mHpText) mHpText.innerText = "修練中..."; if (mSubInfo) mSubInfo.innerHTML = `累積威力: <span style="color:var(--gold)">${combatState.zenDmgAccum}</span>`;

    } else { if (mHpBar) { mHpBar.className = 'hp-fill'; mHpBar.style.width = (monster.mhp > 0 ? (monster.hp / monster.mhp * 100) : 0) + "%"; } if (mHpText) mHpText.innerText = `${Math.floor(monster.hp)} / ${monster.mhp}`; if (mSubInfo) mSubInfo.innerHTML = `Lv. ${monster.lvl}`; }

    let hInfo = el('helper-info');
    if (hInfo) {
        if (player.activeHelper && HELPER_DB[player.activeHelper] && player.helperTimes[player.activeHelper] > 0) {
            hInfo.innerText = `⛩️ 夥伴：${HELPER_DB[player.activeHelper].name} (在線剩餘 ${formatHelperTime(player.helperTimes[player.activeHelper])})`;
            hInfo.style.color = player.helperTimes[player.activeHelper] < 60 ? "var(--danger)" : "#fdcb6e";
        } else {
            hInfo.innerText = "";
        }
    }

    document.querySelectorAll('.btn-plus').forEach(b => b.disabled = (player.statPoints <= 0 || isReviving));
    if (el('auto-boss-check')) el('auto-boss-check').checked = player.autoBoss;

    if (el('auto-boss-check') && !el('repeat-boss-check')) {
        let lbl = document.createElement('label');
        lbl.innerHTML = `<input type="checkbox" id="repeat-boss-check" onchange="player.repeatBoss = this.checked;" style="transform:scale(1.2);"> 重複本關`;
        lbl.style.cssText = "color:var(--quest); font-size: 0.95em; cursor: pointer; display:flex; align-items:center; gap:5px; margin-left:10px;";
        if (player.repeatBoss) lbl.querySelector('input').checked = true;
        
        let targetContainer = el('auto-boss-check').parentNode ? el('auto-boss-check').parentNode.parentNode : null;
        let reviveNode = el('revive-count');
        if (targetContainer) {
            if (reviveNode && reviveNode.parentNode && reviveNode.parentNode.parentNode === targetContainer) {
                targetContainer.insertBefore(lbl, reviveNode.parentNode);
            } else {
                targetContainer.appendChild(lbl);
            }
        }
    }

    let pCount = el('potion-count'); if (pCount && player.potions && player.potions[player.selectedPotion] !== undefined) pCount.innerText = player.potions[player.selectedPotion];

    let reviveCountEl = el('revive-count');
    if (reviveCountEl) {
        reviveCountEl.innerText = player.revives;
        let reviveParent = reviveCountEl.parentNode;
        if (reviveParent && reviveParent.innerHTML.includes("御守:")) {
            reviveParent.innerHTML = `🛡️ 替身御札: <span id="revive-count" style="color:var(--gold);">${player.revives}</span>`;
        }
    }

    let btnManual = el('btn-manual-heal'); if (btnManual) { if (combatState.potionCd > 0) { btnManual.innerText = `冷卻 ${Math.ceil(combatState.potionCd)}s`; btnManual.style.background = "#444"; } else { btnManual.innerText = "手動"; btnManual.style.background = "var(--cherry)"; } }
    if (el('kill-text')) { if (player.mapIdx === 0) el('kill-text').innerHTML = ''; else el('kill-text').innerHTML = `擊殺: ${player.kills}/10`; }
    let mInfo = el('map-info'); if (mInfo && mInfo.innerHTML === "") updateMapSelector();

    for (let i = 0; i < 6; i++) {
        let slotEl = el(`slot-${i}`);
        if (!slotEl) continue;

        let sid = player.equippedSkills[i];
        // If slot is empty or skill is invalid
        if (!sid || !skillDB[sid] || !isSkillValid(sid)) {
            slotEl.className = "skill-slot empty";
            slotEl.style.opacity = "1.0";

            if (i >= 4) { // Passive-only slots (5th and 6th)
                slotEl.innerHTML = `空 <br><small>(僅限被動)</small>`;
                slotEl.style.borderColor = "rgba(230, 126, 34, 0.6)";
            } else { // Active slots
                slotEl.innerHTML = `空 <br><small>(點擊配置)</small>`;
                slotEl.style.borderColor = ""; // Ensure border color is reset
            }
        } else { // If slot has a valid, equipped skill
            slotEl.style.borderColor = ""; // Reset any custom empty-slot styling

            let sk = skillDB[sid];
            let isAct = sk.type === 'active';
            let isOnCd = combatState.skillCds[i] > 0;
            slotEl.style.opacity = (isAct && isOnCd) ? "0.4" : "1.0";
            slotEl.className = `skill-slot ${isAct ? 'active' : 'passive'}`;
            let html = `<b style="color:${sk.color}">${sk.name}</b>`;
            if (isAct && combatState.skillCds[i] > 0) {
                html += `<div class="skill-cd-overlay" style="height:${(combatState.skillCds[i] / sk.cd) * 100}%;">${Math.ceil(combatState.skillCds[i])}s</div>`;
            }
            if (combatState.slotSetupCds[i] > 0) {
                html += `<div class="skill-setup-overlay">🔒</div>`;
            }
            slotEl.innerHTML = html;
        }
    }

    updateStatHints();
    if (currentLogTab === 'inv') { const activeEl = document.activeElement; const isEditing = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT'); if (!isEditing) renderBag(); }
    if (currentLogTab === 'skill') {
        // 技能列表已在上方顯示，此處無需重複處理
    }
    if (currentLogTab === 'helper') { renderHelper(); }
}

function updateStatHints() {
    const hintEl = el('stat-hint'); if (!hintEl) return; let minDist = Infinity; let targetMsg = "已掌握目前境界所有基礎招式。";
    for (let id in skillDB) {
        if (player.unlockedSkills.includes(id)) continue;
        if (skillDB[id].cat === 'job') continue;
        let req = skillDB[id].req; let isMet = true; let currentDist = 0; let mainStat = "";
        if (req) { for (let s in req) { let diff = req[s] - player[s]; if (diff > 0) { isMet = false; currentDist += diff; mainStat = s.toUpperCase(); } } }
        if (!isMet && currentDist < minDist) { minDist = currentDist; let statName = mainStat === 'STR' ? '力量' : mainStat === 'VIT' ? '體質' : '敏捷'; targetMsg = `【感悟】建議提升 ${statName} (相距 ${minDist} 點) 以領悟 ${skillDB[id].name}...`; }
    }
    hintEl.innerText = targetMsg;
}

// --- 1. 畫面上飄浮的數字 (恢復原本單純的功能) ---
function showDmg(tid, txt, col) {
    try {
        const b = el(tid); if (!b) return;
        const e = document.createElement('div'); e.className = 'dmg-text'; e.innerText = txt; e.style.color = col; b.appendChild(e);
        setTimeout(() => e.remove(), 800);
    } catch (err) { }
}

let currentCombatLogFilter = 'all';

function setCombatLogFilter(type) {
    currentCombatLogFilter = type;
    document.querySelectorAll('#combat-log-wrapper .f-btn').forEach(b => b.classList.remove('active'));
    let activeBtn = el(`cb-${type}`);
    if (activeBtn) activeBtn.classList.add('active');

    const items = document.querySelectorAll('.combat-log-item');
    items.forEach(item => {
        if (type === 'all' || item.dataset.type === type) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
    let cl = el('combat-log-area');
    if (cl && typeof currentLogTab !== 'undefined' && currentLogTab === 'combat') cl.scrollTop = 0;
}

// --- 2. ✨ 支援分類的「敘事型」戰鬥日誌寫入器 ---
function writeCombatLog(htmlMsg, type = 'system') {
    try {
        const cl = el('combat-log-area');
        if (!cl) return;
        if (cl.innerHTML.includes("戰鬥尚未開始")) cl.innerHTML = "";

        let displayStyle = (currentCombatLogFilter === 'all' || currentCombatLogFilter === type) ? 'block' : 'none';
        let logLine = `<div class="combat-log-item" data-type="${type}" style="display:${displayStyle}; font-size:0.9em; padding:5px 5px; border-bottom:1px solid rgba(255,255,255,0.05); line-height:1.5; color:#ccc;">${htmlMsg}</div>`;

        // ✨ 改變 1：'afterbegin' 代表把新的文字插在最上方
        cl.insertAdjacentHTML('afterbegin', logLine);

        // ✨ 改變 2：因為最舊的文字會被擠到最下面，所以超過 40 行時，要刪掉「最後一個 (last)」
        if (cl.children.length > 50) cl.lastElementChild.remove(); // 加大容量到 50 筆

        // ✨ 改變 3：讓捲軸永遠停留在最上方，不用往下滾
        if (typeof currentLogTab !== 'undefined' && currentLogTab === 'combat') cl.scrollTop = 0;
    } catch (err) { }
}
function log(m, color = "#888") { const l = el('log'); if (l) l.innerHTML = `<span style="color:${color}; font-size:1.05em;">> ${m}</span><br>` + l.innerHTML; }

function showToast(msg, color = "var(--gold)") {
    const toast = document.createElement('div');
    toast.innerHTML = msg;
    toast.style.cssText = `
        position: fixed; top: 30%; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.85); color: ${color}; padding: 15px 30px;
        border: 2px solid ${color}; border-radius: 10px; font-size: 1.2em; font-weight: bold;
        z-index: 999999; pointer-events: none; text-shadow: 1px 1px 3px black;
        box-shadow: 0 0 15px ${color}; animation: toastUp 2.5s forwards ease-out;
    `;

    if (!document.getElementById('toast-style')) {
        const style = document.createElement('style');
        style.id = 'toast-style';
        style.innerHTML = `@keyframes toastUp { 0% { opacity: 0; transform: translate(-50%, 20px); } 15% { opacity: 1; transform: translate(-50%, 0); } 80% { opacity: 1; transform: translate(-50%, -20px); } 100% { opacity: 0; transform: translate(-50%, -40px); } }`;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

// ✨ 升級版 openModal (支援不暫停與自動關閉)
function openModal(t, b, bt, cb, showCancel = false, autoCloseSec = 0) {
    // 如果沒有設定自動關閉，才暫停遊戲
    if (autoCloseSec === 0) isPaused = true;

    let titleEl = el('modal-title'); if (titleEl) titleEl.innerText = t;
    let bodyEl = el('modal-body'); if (bodyEl) bodyEl.innerHTML = b;
    const btn = el('modal-confirm-btn'); if (btn) btn.innerText = bt;
    const cBtn = el('modal-cancel-btn'); if (cBtn) cBtn.style.display = showCancel ? 'block' : 'none';

    let isMainMenu = false;
    let slotScreen = el('slot-screen');
    if (slotScreen) isMainMenu = !slotScreen.classList.contains('hidden');

    let closeModal = () => {
        let gm = el('game-modal'); if (gm) gm.style.display = 'none';
        if (!isMainMenu && autoCloseSec === 0) {
            isPaused = false;
            if (currentView === 'battle' && !player.workStartTime) startBattleLoop();
        }
    };

    if (btn) btn.onclick = () => { if (cb && cb() === false) return; closeModal(); };
    if (cBtn) cBtn.onclick = () => { closeModal(); };

    let gm = el('game-modal'); if (gm) gm.style.display = 'flex';

    // ✨ 如果有設定自動關閉，就啟動倒數計時
    if (autoCloseSec > 0) {
        let timeLeft = autoCloseSec;
        if (btn) btn.innerText = `${bt} (${timeLeft}s)`;

        let timer = setInterval(() => {
            timeLeft--;
            if (gm.style.display === 'none') { clearInterval(timer); return; } // 如果玩家提早按掉了就清除
            if (btn) btn.innerText = `${bt} (${timeLeft}s)`;

            if (timeLeft <= 0) {
                clearInterval(timer);
                if (gm.style.display !== 'none') {
                    if (cb) cb(); // 執行回調函數(例如領取獎勵)
                    closeModal();
                }
            }
        }, 1000);
    }
}

function clearCombatLog() {
    const cl = el('combat-log-area');
    if (cl) {
        cl.innerHTML = '<div style="color:#666; font-size:0.9em; text-align:center;">戰鬥尚未開始...</div>';
    }
}

// --- ✨ 全新的「動態浮動視窗」 (純 JS 生成，不影響原版 HTML) ---
function showFloatingLog(msg, color = "white") {
    let fw = document.getElementById('floating-hud');
    // 如果視窗還不存在，就動態創造一個
    if (!fw) {
        fw = document.createElement('div');
        fw.id = 'floating-hud';
        fw.style.cssText = `
            position: fixed; top: 20px; right: 20px; width: 220px;
            background: rgba(10, 10, 15, 0.85); border: 1px solid var(--accent);
            border-radius: 8px; padding: 10px; z-index: 99999;
            box-shadow: 0 0 10px rgba(112, 161, 255, 0.3); pointer-events: none;
            font-size: 0.85em; line-height: 1.6; text-shadow: 1px 1px 2px black;
            transition: all 0.3s;
        `;
        fw.innerHTML = `<div style="color:var(--accent); font-weight:bold; border-bottom:1px dashed #444; padding-bottom:5px; margin-bottom:5px; text-align:center;">📊 戰鬥監測儀</div><div id="fh-content"></div>`;
        document.body.appendChild(fw);
    }

    // 將新數據塞入視窗中
    let fc = document.getElementById('fh-content');
    let newLine = document.createElement('div');
    newLine.style.color = color;
    newLine.innerHTML = msg;

    // 加入動畫效果
    newLine.animate([{ opacity: 0, transform: 'translateX(20px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 300 });
    fc.appendChild(newLine);

    // 保持畫面整潔，超過 5 筆就刪掉最舊的
    if (fc.children.length > 5) fc.firstChild.remove();
}