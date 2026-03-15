/* ==========================================================================
   ⚙️ 遊戲主邏輯 V0.4.4
   ========================================================================== */

const CURRENT_VERSION = "0.4.4"; 

function formatHelperTime(totalSeconds) {
    if (totalSeconds <= 0) return "已到期";
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    if (days >= 1) return `${days} 天 ${hours} 小時`;
    if (hours >= 1) return `${hours} 小時 ${minutes} 分`;
    if (minutes >= 1) return `${minutes} 分 ${seconds} 秒`;
    return `${seconds} 秒`;
}

let currentSlotKey = "";
const defaultPlayer = {
    name: "", lvl: 1, exp: 0, next: 30, gold: 0, 
    str: 2, vit: 1, agi: 0, statPoints: 5, lockedStats: { str: 2, vit: 1, agi: 0 },
    hp: 100, mhp: 100, mapIdx: 1, maxMapIdx: 1, kills: 0, 
    autoBoss: false, revives: 0, lastSaveTime: Date.now(), workStartTime: null,
    potions: { p1: 5, p2: 0, p3: 0, p4: 0 }, mats: { m0: 0, m1: 0, m2: 0, m3: 0, m4: 0 }, gear: { arms: 0, body: 0, legs: 0 }, 
    selectedPotion: 'p1', autoHeal: 0, autoHealEnabled: false,
    unlockedSkills: [], equippedSkills: [null, null, null, null],
    skillGambits: [0, 0, 0, 0], skillGambitValues: [50, 50, 50, 50], skillGambitOps: ['<', '<', '<', '<'],
    helper: { id: null, remainSec: 0 }
};

let player = JSON.parse(JSON.stringify(defaultPlayer));
let monster = { id: "", name: "", hp: 0, mhp: 0, atk: 0, lvl: 1, isBoss: false, defVal: 0, dr: 0, eva: 0 };
let isPaused = true; let isReviving = false; let isResting = false;
let currentView = 'battle'; let battleTimer = null; 
let statPreview = { str: 0, vit: 0, agi: 0 };
let currentLogTab = 'log'; let currentInvFilter = 'all'; let currentSkillFilter = 'all'; 
let combatState = { mobAtkTimer: 2.0, skillCds: [0, 0, 0, 0], slotSetupCds: [0, 0, 0, 0], zenTimer: 0, zenDmgAccum: 0, potionCd: 0, helperSkillCd: 0 };
let initAllocatedStats = { str: 2, vit: 1, agi: 0 };

function el(id) { return document.getElementById(id); }

function initSlotScreen() {
    const container = el('slots-container'); container.innerHTML = "";
    for (let i = 1; i <= 3; i++) {
        const key = `RIN_SAVE_SLOT_${i}`;
        const s = localStorage.getItem(key);
        const card = document.createElement('div'); card.className = "slot-card";
        if(s) {
            try { 
                let d = JSON.parse(s); 
                card.innerHTML = `<button class="btn-del-slot" onclick="confirmDeleteSlot(event, '${key}')">刪除</button>
                    <div class="card-content"><h3 style="color:var(--cherry); margin-bottom:5px;">${d.name || "無名者"}</h3><p style="margin:0;">Lv.${d.lvl || 1}</p></div>`; 
            } catch(e) {}
        } else { card.innerHTML = `<div class="card-content"><h3>空白世界線 ${i}</h3><p style="color:#666">點擊開啟新旅程</p></div>`; }
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-del-slot')) return;
            currentSlotKey = key; startGame();
        });
        container.appendChild(card);
    }
}

function confirmDeleteSlot(e, key) { e.stopPropagation(); openModal("⚠️ 刪除確認", "確定要刪除這條世界線嗎？資料將永遠消失。", "確認刪除", () => { localStorage.removeItem(key); initSlotScreen(); }, true); }
function startGame() { el('slot-screen').classList.add('hidden'); el('main-game').classList.remove('hidden'); loadGame(); }
function allocInitStat(t, val) { if (player.statPoints > 0) { player.statPoints--; initAllocatedStats[t]++; } el(`init-${t}`).innerText = initAllocatedStats[t]; el('init-points').innerText = player.statPoints; }
function resetInitStats() { player.statPoints = 5; initAllocatedStats = { str: 2, vit: 1, agi: 0 }; ['str','vit','agi'].forEach(s => el(`init-${s}`).innerText = initAllocatedStats[s]); el('init-points').innerText = 5; el('init-error').style.display = 'none'; }

function loadGame() { 
    let s = localStorage.getItem(currentSlotKey); 
    player = JSON.parse(JSON.stringify(defaultPlayer));
    
    if(s) {
        try {
            let sd = JSON.parse(s); 
            let isDataCorrupted = (sd.gold === null || isNaN(Number(sd.gold))) || (isNaN(Number(sd.lvl)) || sd.lvl < 1) || (isNaN(Number(sd.str)) || isNaN(Number(sd.vit)));
            if (isDataCorrupted) {
                let oldLvl = Number(sd.lvl) || 1; if (isNaN(oldLvl)) oldLvl = 1; let compensationGold = (oldLvl * 500) + 2000;
                player = JSON.parse(JSON.stringify(defaultPlayer)); player.name = sd.name || "重生者"; player.gameVersion = CURRENT_VERSION; player.gold = compensationGold; player.revives = 5;
                openModal("🌌 時空裂縫修補", `偵測到損毀，已重塑肉身。補償：$${compensationGold.toLocaleString()}，不死御守x5`, "重塑靈魂", () => { saveGame(false); location.reload(); });
                return; 
            }
            player.potions = Object.assign({}, defaultPlayer.potions, sd.potions || {}); player.mats = Object.assign({}, defaultPlayer.mats, sd.mats || {}); player.gear = Object.assign({}, defaultPlayer.gear, sd.gear || {});
            player.unlockedSkills = sd.unlockedSkills || []; player.equippedSkills = sd.equippedSkills || [null, null, null, null];
            player.skillGambits = sd.skillGambits || [0, 0, 0, 0]; player.skillGambitValues = sd.skillGambitValues || [50, 50, 50, 50]; player.skillGambitOps = sd.skillGambitOps || ['<', '<', '<', '<'];
            player.helper = Object.assign({}, defaultPlayer.helper, sd.helper || {}); Object.assign(player, sd); player.gameVersion = CURRENT_VERSION; player.lockedStats = { str: 2, vit: 1, agi: 0 }; 
            if(player.mapIdx >= maps.length) player.mapIdx = maps.length - 1; if(player.maxMapIdx >= maps.length) player.maxMapIdx = maps.length - 1;
        } catch(e) { player = JSON.parse(JSON.stringify(defaultPlayer)); saveGame(false); }
    }
    
    initPotionSelect();
    if(!player.name || player.name === "") { 
        el('naming-area').classList.remove('hidden'); resetInitStats();
        openModal("踏入輪迴", "名號一旦定下，便與靈魂綁定。", "開啟旅程", () => { 
            let n = el('player-name-input').value.trim(); if(n === "") n = "無名者"; 
            if(player.statPoints > 0) { el('init-error').style.display = 'block'; return false; }
            player.name = n; player.str = initAllocatedStats.str; player.vit = initAllocatedStats.vit; player.agi = initAllocatedStats.agi;
            player.lockedStats = { str: 2, vit: 1, agi: 0 }; el('naming-area').classList.add('hidden'); checkSkillUnlocks(); postLoadInit();
        }); 
    } else { checkSkillUnlocks(); postLoadInit(); }

    player.gold = Number(player.gold) || 0; player.exp = Number(player.exp) || 0; player.lvl = Number(player.lvl) || 1;
    player.str = Number(player.str) || 2; player.vit = Number(player.vit) || 1; player.agi = Number(player.agi) || 0;
    if (player.helper) player.helper.remainSec = Number(player.helper.remainSec) || 0;
    resetCombatState(); updateUI(); 
}

function postLoadInit() { 
    updateMapSelector(); spawn(false); updateUI(); isPaused = false; 
    log(`💡 【V${CURRENT_VERSION}】：已成功載入！`, "var(--accent)");
    if(player.lvl === 1 && player.exp === 0 && player.gold === 0 && player.potions.p1 === 5) log("🎁 新手物資已發放：生鮮野味 x5", "var(--quest)");
    if(currentView === 'battle' && !player.workStartTime) startBattleLoop(); 
    if(player.workStartTime) { isPaused = true; switchView('village'); showSubView('work'); }
}

function saveGame(manual) { 
    if (statPreview.str > 0 || statPreview.vit > 0 || statPreview.agi > 0) { if(manual) log("⚠️ 請先確定或取消配點後再進行存檔。", "var(--danger)"); return; }
    player.gold = Number(player.gold) || 0; player.exp = Number(player.exp) || 0; player.lvl = Number(player.lvl) || 1; player.hp = Number(player.hp) || 100;
    if (player.helper) { player.helper.remainSec = Number(player.helper.remainSec) || 0; if (player.helper.remainSec <= 0) { player.helper.remainSec = 0; player.helper.id = null; } }
    player.lastSaveTime = Date.now(); localStorage.setItem(currentSlotKey, JSON.stringify(player)); 
    if(manual) log("✔ 靈魂記憶已封存於石碑之中。", "var(--quest)"); 
}

function generateImportCode() { saveGame(false); let code = btoa(encodeURIComponent(JSON.stringify(player))); openModal("📤 靈魂引繼", `引繼碼：<br><textarea readonly style="width:90%;height:80px;background:#000;color:var(--gold);margin-top:10px;" onclick="this.select()">${code}</textarea>`, "了解"); }
function promptImportCode() {
    let code = prompt("請貼上您的引繼碼："); if(!code) return;
    try {
        let d = JSON.parse(decodeURIComponent(atob(code)));
        if(d && d.name) { openModal("📥 確認繼承", `覆蓋為 <b>${d.name}</b> (Lv.${d.lvl}) 嗎？`, "確認覆蓋", () => { localStorage.setItem(currentSlotKey, JSON.stringify(d)); location.reload(); }, true); }
    } catch(e) { alert("❌ 引繼碼解析失敗！"); }
}

function logoutGame() { saveGame(false); location.reload(); }

// ✨ [新功能 1] 技能解鎖後，即時刷新秘技介面
function checkSkillUnlocks() {
    let newlyUnlocked = false;
    let addSkill = (id) => { if(!player.unlockedSkills.includes(id)) { player.unlockedSkills.push(id); log(`✨ 突破界限！領悟新秘技：【${skillDB[id].name}】`, "var(--quest)"); newlyUnlocked = true; } };
    
    if(player.agi >= 5) addSkill('agi_combo1'); if(player.agi >= 10) addSkill('agi_combo2');
    if(player.vit >= 5) addSkill('vit_strike'); if(player.vit >= 15) addSkill('vit_thorns');
    if(player.str >= 15) addSkill('str_cleave');
    
    if(newlyUnlocked && !isPaused) {
        updateUI();
        if(currentLogTab === 'skill') renderPath(); // 即時重繪
    }
}

// ✨ [新功能 3] 判斷技能屬性是否達標 (用於反灰顯示)
function isSkillValid(sid) {
    let sk = skillDB[sid];
    if (!sk || !sk.req) return true;
    for (let s in sk.req) { if (player[s] < sk.req[s]) return false; }
    return true;
}

function initPotionSelect() {
    const sel = el('potion-select'); if(!sel) return; sel.innerHTML = "";
    Object.values(ITEM_DB).filter(i => i.cat === 'rec').forEach(item => { let label = item.tag ? `(${item.tag})` : ""; sel.innerHTML += `<option value="${item.id}">${item.name} ${label}</option>`; });
    sel.value = player.selectedPotion; if(el('auto-heal-input')) el('auto-heal-input').value = Math.floor(player.autoHeal * 100) || 1; if(el('auto-heal-check')) el('auto-heal-check').checked = player.autoHealEnabled;
}
function updateAutoHeal(val) { let num = parseInt(val); if(isNaN(num)) num = 1; if(num < 1) num = 1; if(num > 100) num = 100; if(el('auto-heal-input')) el('auto-heal-input').value = num; player.autoHeal = num / 100; }
function usePotion(isManual = false) {
    if (combatState.potionCd > 0) { if (isManual) log(`🍵 藥效吸收中... (${Math.ceil(combatState.potionCd)}s)`, "var(--danger)"); return false; }
    let pid = player.selectedPotion; let pItem = getItem(pid); 
    if(player.potions[pid] > 0) {
        if(player.hp >= getMaxHP() && isManual) return log("生命值已滿！");
        player.potions[pid]--; let heal = pItem.value > 0 ? pItem.value : Math.floor(getMaxHP() * pItem.rate); player.hp = Math.min(getMaxHP(), player.hp + heal); 
        combatState.potionCd = 5.0; showDmg('p-box', `+${heal}`, 'lime');
        if(player.potions[pid] === 0) { log(`【系統】${pItem.name} 耗盡！`, "var(--danger)"); if(isManual) autoHealLogic(true); }
        updateUI(); return true;
    } else { if(isManual) openModal("補給耗盡", "補給品不足！請前往荒野打獵或商店購買。", "知道了"); return false; }
}

function autoHealLogic(onlySearch = false) {
    if(player.potions[player.selectedPotion] > 0 && !onlySearch) usePotion(false);
    else {
        let order = ['p1', 'p2', 'p3', 'p4']; let found = false;
        for(let key of order) { if(player.potions[key] > 0) { player.selectedPotion = key; initPotionSelect(); if(!onlySearch) { log(`【系統】自動切換為 ${getItem(key).name}。`, "var(--accent)"); usePotion(false); } found = true; break; } }
        if(!found && !onlySearch) log(`【警告】所有補給均已耗盡！`, "var(--danger)");
    }
}

function getAtkVal() { let base = Math.floor(player.str * 1.5) + ((player.gear.arms || 0) * 3); if (player.helper && player.helper.id && HELPER_DB[player.helper.id] && HELPER_DB[player.helper.id].passive) { base += HELPER_DB[player.helper.id].passive(player).atk || 0; } return base; }
function getDefPercent(vit) { let base = vit <= 100 ? vit * 0.5 : vit <= 300 ? 50 + (vit - 100) * 0.1 : 70 + (vit - 300) * 0.05; let total = base + ((player.gear.body || 0) * 1.5); if (player.helper && player.helper.id && HELPER_DB[player.helper.id] && HELPER_DB[player.helper.id].passive) { total += HELPER_DB[player.helper.id].passive(player).def || 0; } return Math.min(90, total); }
function getEvaPercent(agi) { let base = agi <= 50 ? agi * 0.6 : 30 + (agi - 50) * 0.2; let total = base + ((player.gear.legs || 0) * 1.0); if (player.helper && player.helper.id && HELPER_DB[player.helper.id] && HELPER_DB[player.helper.id].passive) { total += HELPER_DB[player.helper.id].passive(player).eva || 0; } return Math.min(70, total); }

function executeSkill(slotIdx) {
    let sid = player.equippedSkills[slotIdx];
    if(!sid || !skillDB[sid] || skillDB[sid].type !== 'active' || combatState.skillCds[slotIdx] > 0 || player.hp <= 0) return false;
    
    // ✨ 檢查屬性是否依然達標
    if (!isSkillValid(sid)) return false; 
    
    if(player.mapIdx !== 0 && monster.hp <= 0) return false; 
    let sk = skillDB[sid]; combatState.skillCds[slotIdx] = sk.cd; let baseDmg = getAtkVal(); let isDummy = player.mapIdx === 0; let finalDmg = 0;
    
    if(sid === 'vit_strike') { 
        let d = baseDmg + (player.vit * 2); 
        if(isDummy) { finalDmg = d; } else { finalDmg = Math.max(1, (d - (monster.defVal || 0))) * (1 - (monster.dr || 0)); }
        finalDmg = Math.floor(finalDmg); if(isDummy) combatState.zenDmgAccum += finalDmg; else monster.hp -= finalDmg; 
        showDmg('m-box', finalDmg, sk.color); showDmg('p-box', "【震擊】", sk.color); 
    } else if(sid === 'str_cleave') { 
        let d = Math.floor(baseDmg * 2.5); 
        if(isDummy) { finalDmg = d; } else { finalDmg = Math.max(1, (d - (monster.defVal || 0))) * (1 - Math.max(0, (monster.dr || 0) - 0.15)); }
        finalDmg = Math.floor(finalDmg); if(isDummy) combatState.zenDmgAccum += finalDmg; else monster.hp -= finalDmg; 
        showDmg('m-box', finalDmg, sk.color); showDmg('p-box', "【重劈】", sk.color); 
    }
    updateUI(); return true;
}

function handleSlotClick(idx) { switchLogTab('skill'); el('skill-area').scrollIntoView({ behavior: 'smooth', block: 'center' }); log(`[戰術配置] 已聚焦至第 ${idx+1} 槽位。`, "var(--accent)"); }
function hasPassive(sid) { return player.equippedSkills.includes(sid) && isSkillValid(sid); }
function checkGambit(idx) {
    let g = player.skillGambits[idx]; let val = player.skillGambitValues[idx]; let op = player.skillGambitOps[idx];
    if(g === 0) return true; if(g === 3) return monster.isBoss === true;
    if(g === 4) { let curPct = (player.hp / getMaxHP()) * 100; return op === '<' ? curPct < val : curPct > val; }
    if(g === 5) { if (monster.mhp <= 0) return false; let curPct = (monster.hp / monster.mhp) * 100; return op === '<' ? curPct < val : curPct > val; }
    return false;
}

function startBattleLoop() {
    if(battleTimer) { clearTimeout(battleTimer); battleTimer = null; } 
    if(isPaused || currentView !== 'battle' || isReviving) return;
    let delay = Math.max(200, 1500 / (1 + player.agi * 0.025)); let tickSec = Number((delay / 1000).toFixed(3)); 

    if (combatState.potionCd > 0) combatState.potionCd = Math.max(0, combatState.potionCd - tickSec);
    for(let i=0; i<4; i++) {
        if(combatState.skillCds[i] > 0) combatState.skillCds[i] = Math.max(0, combatState.skillCds[i] - tickSec);
        if(combatState.slotSetupCds[i] > 0) combatState.slotSetupCds[i] = Math.max(0, combatState.slotSetupCds[i] - tickSec);
    }
    if (player.autoHealEnabled && player.hp < (getMaxHP() * player.autoHeal) && combatState.potionCd <= 0) autoHealLogic(false);
    
    if (player.helper && player.helper.id && player.helper.remainSec > 0) {
        player.helper.remainSec = Math.max(0, player.helper.remainSec - tickSec);
        if (player.helper.remainSec <= 0) { log(`⛩️ 夥伴的合約已到期。`, "var(--cherry)"); player.helper.id = null; player.helper.remainSec = 0; updateUI(); }
    }
    if (player.hp < getMaxHP()) player.hp = Math.min(getMaxHP(), player.hp + (player.vit * 0.1 * tickSec));

    let isDummy = player.mapIdx === 0;
    if (isDummy) { combatState.zenTimer += tickSec; if(combatState.zenTimer >= 20) { handleZenComplete(); combatState.zenTimer = 0; combatState.zenDmgAccum = 0; } }

    let baseAtk = getAtkVal(); let skillUsed = false;
    if(!isDummy ? monster.hp > 0 : true) {
        for(let i=0; i<4; i++) { let sid = player.equippedSkills[i]; if(sid && skillDB[sid].type === 'active' && combatState.skillCds[i] <= 0) { if(checkGambit(i)) { if(executeSkill(i)) { skillUsed = true; break; } } } }
    }

    if(!skillUsed && baseAtk > 0) { 
        let hits = 1; let currentAtk = baseAtk;
        if(hasPassive('agi_combo2') && Math.random() < 0.10) { hits = 2; currentAtk = Math.floor(currentAtk * 1.2); log(`⚡ 觸發殘影！`, "var(--accent)"); }
        else if(hasPassive('agi_combo1') && Math.random() < 0.10) { currentAtk = Math.floor(currentAtk * 1.5); log(`⚡ 觸發速擊！`, "var(--accent)"); }
        let skillHit = Math.random() < 1.0; let targetEva = isDummy ? 0 : (monster.eva || 0);

        for(let i=0; i<hits; i++) {
            if (skillHit && (Math.random() * 100 >= targetEva)) {
                let mDr = hasPassive('str_cleave') ? Math.max(0, (monster.dr || 0) - 0.15) : (monster.dr || 0); 
                let finalDmg = Math.floor(Math.max(1, (currentAtk - (monster.defVal || 0))) * (1 - mDr));
                if (isDummy) { combatState.zenDmgAccum += finalDmg; setTimeout(()=>showDmg('m-box', finalDmg, 'white'), i*150);
                } else if(monster.hp > 0) { monster.hp -= finalDmg; setTimeout(()=>showDmg('m-box', finalDmg, 'white'), i*150); }
            } else { setTimeout(()=>showDmg('m-box', "MISS", '#888'), i*150); }
        }
    }

    if(player.helper && player.helper.id && HELPER_DB[player.helper.id]) {
        let hdb = HELPER_DB[player.helper.id];
        if(!combatState.helperSkillCd) combatState.helperSkillCd = hdb.skillCd;
        combatState.helperSkillCd -= tickSec;
        if(combatState.helperSkillCd <= 0) {
            combatState.helperSkillCd = hdb.skillCd; 
            if(hdb.skillType === 'heal') { player.hp = Math.min(getMaxHP(), player.hp + hdb.skillVal); showDmg('p-box', `+${hdb.skillVal}`, 'var(--quest)');
            } else if(hdb.skillType === 'attack' && (!isDummy ? monster.hp > 0 : true)) {
                if(isDummy) { combatState.zenDmgAccum += hdb.skillVal; showDmg('m-box', hdb.skillVal, '#fdcb6e'); } 
                else { monster.hp -= hdb.skillVal; showDmg('m-box', hdb.skillVal, '#fdcb6e'); log(`💥 夥伴施放了援護攻擊！`, "var(--danger)"); }
            } else if(hdb.skillType === 'seal' && !isDummy && monster.hp > 0) {
                combatState.mobAtkTimer = Math.min(5.0, combatState.mobAtkTimer + hdb.skillVal); showDmg('m-box', "封印", 'var(--accent)'); log(`📜 夥伴施放定身符！`, "var(--accent)");
            }
        }
    }
    
    if (!isDummy) {
        if (monster.hp <= 0) { handleVictory(); } else if (monster.atk > 0) { 
            combatState.mobAtkTimer -= tickSec;
            if (combatState.mobAtkTimer <= 0) {
                combatState.mobAtkTimer = 2.0; let myEva = Math.min(70, getEvaPercent(player.agi)); 
                if (Math.random() * 100 >= myEva) { 
                    let mDmg = Math.floor(Math.max(1, (monster.atk - Math.floor(player.vit * 0.5))) * (1 - (getDefPercent(player.vit) / 100)));
                    if(hasPassive('vit_thorns') && Math.random() < 0.20 && mDmg > 1) { monster.hp -= mDmg; showDmg('m-box', `反震 ${mDmg}`, 'var(--cherry)'); }
                    player.hp -= mDmg; showDmg('p-box', mDmg, '#ff4757');
                } else { showDmg('p-box', "MISS", 'skyblue'); }
            }
        }
    }

    if(player.hp <= 0) handleDeath(); 
    updateUI(); battleTimer = setTimeout(startBattleLoop, delay);
}

function handleZenComplete() {
    let totalExp = Math.max(1, Math.floor(player.next * 0.02)) + Math.floor(combatState.zenDmgAccum * 0.05); let goldEarn = Math.floor(player.lvl * 0.5) + 1;
    player.exp += totalExp; player.gold += goldEarn; player.kills++; log(`🧘 冥想完成。獲得 <span style="color:var(--quest)">${totalExp} 經驗</span>, ${goldEarn} 金幣。`, "#aaa"); checkLevelUp();
}

function handleVictory() {
    let m = maps[player.mapIdx]; let dbMob = MOB_DB[monster.id]; if(!m || !dbMob) return;
    let isOverLeveled = player.lvl > m.maxLvl; let expGained = isOverLeveled ? 0 : (Number(dbMob.exp) || 0); let goldGained = isOverLeveled ? Math.max(1, Math.floor((Number(dbMob.gold) || 0) * 0.3)) : (Number(dbMob.gold) || 0);
    player.exp = (Number(player.exp) || 0) + expGained; player.gold = (Number(player.gold) || 0) + goldGained;
    
    let dropMsgs = []; dbMob.drops.forEach(l => { if(Math.random() < l.chance) { let amount = l.qty || 1; addItemToBag(l.id, amount); dropMsgs.push(`${getItem(l.id).name}x${amount}`); } });

    if(monster.isBoss) {
        if(dropMsgs.length === 0) dropMsgs.push("無特別物品");
        log(`🏆 擊敗首領！獲得 ${expGained} 經驗, ${goldGained} 金幣。<br>🎁 戰利品：${dropMsgs.join("，")}`, "var(--gold)");
        if (player.mapIdx < maps.length - 1) { player.mapIdx++; player.maxMapIdx = Math.max(player.maxMapIdx, player.mapIdx); saveGame(false); openModal("🗺️ 領域擴張", `【${maps[player.mapIdx].name}】已解鎖。`, "前進"); }
        player.kills = 0; updateMapSelector();
    } else {
        if(isOverLeveled && Math.random() < 0.05) log("⚠️ 怪物過弱，無修行經驗。", "var(--danger)");
        if(dropMsgs.length > 0) log(`🎁 獲得：${dropMsgs.join(", ")}`, "var(--quest)");
        if(player.mapIdx == player.maxMapIdx && player.kills < 10) player.kills++;
        if (player.autoBoss && player.kills >= 10 && maps[player.mapIdx].boss) { log("⚔️ 擊殺達標，自動開啟首領戰！", "var(--danger)"); checkLevelUp(); spawn(true); return; }
    }
    checkLevelUp(); spawn();
}

function addItemToBag(id, qty) { let item = getItem(id); if(item.cat === 'rec') { if(!player.potions[id]) player.potions[id] = 0; player.potions[id] += qty; } else if(item.cat === 'mat') { if(!player.mats[id]) player.mats[id] = 0; player.mats[id] += qty; } }
function resetCombatState() { combatState = { mobAtkTimer: 2.0, skillCds: [0, 0, 0, 0], slotSetupCds: [0, 0, 0, 0], zenTimer: 0, zenDmgAccum: 0, potionCd: 0, helperSkillCd: 0 }; }

function handleDeath() { 
    if(player.revives > 0) { player.revives--; log("🛡️ 不死御守發效！靈魂回歸肉身。", "var(--gold)"); player.hp = getMaxHP(); updateUI(); return; } 
    log(`💀 魂火熄滅... 正在等待靈魂重塑。`, "var(--danger)"); player.hp = 0; isReviving = true; resetCombatState(); 
    if(monster.isBoss) { player.autoBoss = false; log("⚠️ 首領戰敗北，自動挑戰已關閉。", "var(--danger)"); setTimeout(() => spawn(false), 500); } 
    let sec = 5; const ov = el('revive-timer-overlay'); const txt = el('revive-seconds'); if(ov) ov.classList.remove('hidden'); if(txt) txt.innerText = sec; 
    const timer = setInterval(() => { 
        sec--; if(txt) txt.innerText = sec; updateUI(); 
        if(sec <= 0) { clearInterval(timer); if(ov) ov.classList.add('hidden'); isReviving = false; player.hp = getMaxHP(); log("✨ 靈魂重塑完成，修行繼續。", "var(--quest)"); if(currentView === 'battle') { isPaused = false; startBattleLoop(); } updateUI(); } 
    }, 1000); 
}

function checkLevelUp() { 
    player.exp = Number(player.exp) || 0; player.next = Number(player.next) || 30;
    while(player.exp >= player.next && player.next > 0) { 
        player.lvl = (Number(player.lvl) || 1) + 1; player.exp -= player.next; player.next = Math.floor(player.next * (player.lvl < 20 ? 1.2 : 1.1)) + (player.lvl * 5); 
        player.statPoints += 3; player.hp = getMaxHP(); log("🎉 境界提升！體力已恢復。", "var(--cherry)"); checkSkillUnlocks(); 
    } 
    updateUI();
}

function spawn(boss = false) {
    let m = maps[player.mapIdx]; if(!m) return; combatState.mobAtkTimer = 2.0; let mobId = "";
    if(m.name === "[修行] 幽靜道場") { mobId = "m_dummy"; } else if (boss && m.boss) { mobId = m.boss; } else { if (m.rareMob && Math.random() < m.rareMob.chance) { mobId = m.rareMob.id; log(`⚠️ 遭遇稀有怪物！`, "var(--gold)"); } else { mobId = m.mobs[Math.floor(Math.random() * m.mobs.length)]; } }
    let dbMob = MOB_DB[mobId]; 
    if(dbMob) {
        let autoLvl = Math.max(1, Math.ceil(((dbMob.hp / 15) + (dbMob.atk * 2.2) + ((dbMob.defVal || 0) * 3.5) + ((dbMob.eva || 0) * 1.5)) / 10));
        monster = { id: mobId, name: dbMob.name, hp: dbMob.hp, mhp: dbMob.hp, atk: dbMob.atk, defVal: dbMob.defVal || 0, dr: dbMob.dr || 0, eva: dbMob.eva || 0, lvl: autoLvl, isBoss: dbMob.isBoss || false };
    }
    let btn = el('btn-boss'); if(btn) btn.disabled = (player.kills < 10 || monster.isBoss || isReviving || !m.boss);
}

function getMaxHP() { return player.vit * 50 + 50; }

function updateMapSelector() { 
    const mapArea = el('map-ui-area');
    if(mapArea) {
        mapArea.innerHTML = `<select id="map-selector" onchange="changeMap()" style="font-size:1.05em; padding:4px;"></select>`;
        const sel = el('map-selector');
        if(sel) { for(let i=0; i<=player.maxMapIdx; i++) { let opt = document.createElement('option'); opt.value = i; opt.innerText = maps[i].name; if(player.mapIdx === i) opt.selected = true; sel.appendChild(opt); } }
    }
    let mInfo = el('map-info');
    if(mInfo && maps[player.mapIdx]) {
        let m = maps[player.mapIdx];
        if (m.name === "[修行] 幽靜道場") mInfo.innerHTML = `安全區域：每 20 秒結算一次經驗。`;
        else { 
            let penaltyTxt = player.lvl > m.maxLvl ? `<span style="color:var(--danger); font-weight:bold;"> (經驗衰減)</span>` : ""; 
            let lvlLimitTxt = m.maxLvl === 999 ? "MAX" : m.maxLvl; 
            let dropSet = new Set();
            if(m.mobs) m.mobs.forEach(mobId => MOB_DB[mobId].drops.forEach(d => dropSet.add(getItem(d.id).name)));
            if(m.boss) MOB_DB[m.boss].drops.forEach(d => dropSet.add(getItem(d.id).name));
            if(m.rareMob) MOB_DB[m.rareMob.id].drops.forEach(d => dropSet.add(getItem(d.id).name));
            let dropStr = Array.from(dropSet).join("、 ") || "無";
            mInfo.innerHTML = `適合等級: ${m.minLvl}~${lvlLimitTxt}${penaltyTxt}<br>報酬: <span style="color:var(--quest);">${dropStr}</span>`; 
        }
    }
}