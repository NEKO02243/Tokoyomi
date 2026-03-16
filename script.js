/* ==========================================================================
   ⚙️ 遊戲核心邏輯 (V0.7.2 夥伴編隊與清單化更新)
   ========================================================================== */
const CURRENT_VERSION = "0.7.2"; 

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

const MAX_STAT_POINT = 650;
let currentSlotKey = "";

const defaultPlayer = {
    name: "", lvl: 1, exp: 0, next: 30, gold: 0, 
    str: 2, vit: 1, agi: 0, statPoints: 5, 
    lockedStats: { str: 2, vit: 1, agi: 0 },
    allocatedStats: { str: 0, vit: 0, agi: 0 },
    buffs: {}, 
    critRate: 0, 
    hp: 100, mhp: 100, mapIdx: 1, maxMapIdx: 1, kills: 0, 
    autoBoss: false, repeatBoss: false, revives: 0, lastSaveTime: Date.now(), workStartTime: null,
    potions: { p1: 5, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 }, mats: { m0: 0, m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, c_shrine: 0, wash_star: 0 }, 
    gear: { arms: 0, body: 0, legs: 0 }, 
    selectedPotion: 'p1', autoHeal: 0, autoHealEnabled: false,
    unlockedSkills: [], equippedSkills: [null, null, null, null],
    skillGambits: [0, 0, 0, 0], skillGambitValues: [50, 50, 50, 50], skillGambitOps: ['<', '<', '<', '<'],
    helperTimes: {}, 
    activeHelper: null, 
    shrineDonation: 0, ascensionCount: 0
};

let player = JSON.parse(JSON.stringify(defaultPlayer));
let monster = { id: "", name: "", hp: 0, mhp: 0, atk: 0, lvl: 1, isBoss: false, defVal: 0, dr: 0, eva: 0, agi: 0, poisoned: 0 };
let isPaused = true; let isReviving = false; let isResting = false;
let currentView = 'battle'; let battleTimer = null; 
let statPreview = { str: 0, vit: 0, agi: 0 };
// ✨ 新增 currentHelperFilter
let currentLogTab = 'log'; let currentInvFilter = 'all'; let currentSkillFilter = 'all'; let currentHelperFilter = 'all';

let combatState = { mobAtkTimer: 2.0, skillCds: [0, 0, 0, 0], slotSetupCds: [0, 0, 0, 0], zenTimer: 0, zenDmgAccum: 0, potionCd: 0, helperSkillCd: 0 };
let initAllocatedStats = { str: 2, vit: 1, agi: 0 };
let casinoState = { active: false, bet: 0, playerTotal: 0, dealerTotal: 0, isAllIn: false, msg: "", deck: [], playerCards: [], dealerCards: [], gameOver: false };

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

function allocInitStat(t, val) { 
    if (player.statPoints > 0 && initAllocatedStats[t] < MAX_STAT_POINT) { 
        player.statPoints--; initAllocatedStats[t]++; 
    } 
    el(`init-${t}`).innerText = initAllocatedStats[t]; el('init-points').innerText = player.statPoints; 
}

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
            player.potions = Object.assign({}, defaultPlayer.potions, sd.potions || {}); 
            player.mats = Object.assign({}, defaultPlayer.mats, sd.mats || {}); 
            player.gear = Object.assign({}, defaultPlayer.gear, sd.gear || {});
            player.allocatedStats = Object.assign({str:0, vit:0, agi:0}, sd.allocatedStats || {}); 
            player.buffs = Object.assign({}, sd.buffs || {}); 
            player.critRate = sd.critRate || 0;
            player.unlockedSkills = sd.unlockedSkills || []; 
            player.equippedSkills = sd.equippedSkills || [null, null, null, null];
            player.skillGambits = sd.skillGambits || [0, 0, 0, 0]; 
            player.skillGambitValues = sd.skillGambitValues || [50, 50, 50, 50]; 
            player.skillGambitOps = sd.skillGambitOps || ['<', '<', '<', '<'];
            
            player.helperTimes = Object.assign({}, sd.helperTimes || {});
            player.activeHelper = sd.activeHelper || null;
            if (sd.helper && sd.helper.id && sd.helper.remainSec > 0 && !player.helperTimes[sd.helper.id]) {
                player.helperTimes[sd.helper.id] = sd.helper.remainSec;
                if(!player.activeHelper) player.activeHelper = sd.helper.id;
            }
            delete player.helper;

            Object.assign(player, sd); 
            player.gameVersion = CURRENT_VERSION; player.lockedStats = { str: 2, vit: 1, agi: 0 }; 
            if(player.mapIdx >= maps.length) player.mapIdx = maps.length - 1; if(player.maxMapIdx >= maps.length) player.maxMapIdx = maps.length - 1;
            if(player.repeatBoss === undefined) player.repeatBoss = false;
        } catch(e) { player = JSON.parse(JSON.stringify(defaultPlayer)); saveGame(false); }
    }
    
    initPotionSelect();
    if(!player.name || player.name === "") { 
        el('naming-area').classList.remove('hidden'); resetInitStats();
        openModal("踏入輪迴", "名號一旦定下，便與靈魂綁定。", "開啟旅程", () => { 
            let n = el('player-name-input').value.trim(); if(n === "") n = "無名者"; 
            if(player.statPoints > 0) { el('init-error').style.display = 'block'; return false; }
            player.name = n; player.str = initAllocatedStats.str; player.vit = initAllocatedStats.vit; player.agi = initAllocatedStats.agi;
            player.allocatedStats.str = initAllocatedStats.str - 2;
            player.allocatedStats.vit = initAllocatedStats.vit - 1;
            player.allocatedStats.agi = initAllocatedStats.agi - 0;
            player.lockedStats = { str: 2, vit: 1, agi: 0 }; el('naming-area').classList.add('hidden'); checkSkillUnlocks(); postLoadInit();
        }); 
    } else { checkSkillUnlocks(); postLoadInit(); }

    player.gold = Number(player.gold) || 0; player.exp = Number(player.exp) || 0; player.lvl = Number(player.lvl) || 1;
    player.str = Number(player.str) || 2; player.vit = Number(player.vit) || 1; player.agi = Number(player.agi) || 0;
    player.mhp = getMaxHP(); if(player.hp > player.mhp) player.hp = player.mhp; 
    resetCombatState(); updateUI(); 
}

function postLoadInit() { 
    validateEquippedSkills(); updateMapSelector(); spawn(false); updateUI(); isPaused = false; 
    log(`💡 【V${CURRENT_VERSION}】：專屬夥伴編隊與休整面板上線！`, "var(--accent)");
    if(player.lvl === 1 && player.exp === 0 && player.gold === 0 && player.potions.p1 === 5) log("🎁 新手物資已發放：生鮮野味 x5", "var(--quest)");
    if(player.name === "御雷神命") { let gmCard = el('card-gm'); if(gmCard) gmCard.classList.remove('hidden'); }
    
    let offlineSec = Math.floor((Date.now() - player.lastSaveTime) / 1000);
    if (offlineSec > 60 && player.mapIdx > 0 && player.hp > 0 && !player.workStartTime) {
        let m = maps[player.mapIdx];
        if (m && m.mobs.length > 0) {
            let mobId = m.mobs[0]; 
            let fakeKills = Math.floor(offlineSec / 10);
            if (fakeKills > 0 && MOB_DB[mobId]) {
                let expEarned = fakeKills * (MOB_DB[mobId].exp || 0);
                let goldEarned = fakeKills * (MOB_DB[mobId].gold || 0);
                player.exp += expEarned; player.gold += goldEarned; player.kills += fakeKills;
                
                checkLevelUp(); 
                updateUI();
                
                setTimeout(() => openModal("🌙 離線掛機結算", `妳離開了 ${formatHelperTime(offlineSec)}<br><br>斬殺約 ${fakeKills} 隻怪物。<br>獲得 <span style="color:var(--quest)">${expEarned} 經驗</span>, <span style="color:var(--gold)">${goldEarned} 金幣</span>。`, "領取獎勵"), 1000);
            }
        }
    }
    
    if(currentView === 'battle' && !player.workStartTime) startBattleLoop(); 
    if(player.workStartTime) { isPaused = true; switchView('village'); showSubView('work'); }
}

let lastActiveTime = Date.now();
document.addEventListener("visibilitychange", () => {
    if (document.hidden) { lastActiveTime = Date.now(); } else {
        let elapsedSec = Math.floor((Date.now() - lastActiveTime) / 1000);
        if (elapsedSec > 30 && currentView === 'battle' && !isPaused && !isReviving && player.hp > 0 && !player.workStartTime) {
            let m = maps[player.mapIdx];
            if (m && m.mobs.length > 0 && player.mapIdx > 0) {
                let mobId = m.mobs[0]; let fakeKills = Math.floor(elapsedSec / 8); 
                if (fakeKills > 0 && MOB_DB[mobId]) {
                    let expEarned = fakeKills * (MOB_DB[mobId].exp || 0);
                    let goldEarned = fakeKills * (MOB_DB[mobId].gold || 0);
                    player.exp += expEarned; player.gold += goldEarned; player.kills += fakeKills;
                    checkLevelUp(); updateUI();     
                    log(`🌙 【掛機結算】神遊了 ${formatHelperTime(elapsedSec)}。斬殺 ${fakeKills} 隻怪物，獲得 ${expEarned} 經驗, ${goldEarned} 金幣。`, "var(--gold)");
                    setTimeout(() => openModal("🌙 掛機結算", `妳離開了 ${formatHelperTime(elapsedSec)}<br><br>獲得 <span style="color:var(--quest)">${expEarned} 經驗</span>, <span style="color:var(--gold)">${goldEarned} 金幣</span>。`, "領取"), 500);
                }
            }
        }
        lastActiveTime = Date.now();
    }
});

function saveGame(manual) { 
    if (statPreview.str > 0 || statPreview.vit > 0 || statPreview.agi > 0) { if(manual) log("⚠️ 請先確定或取消配點後再進行存檔。", "var(--danger)"); return; }
    player.gold = Number(player.gold) || 0; player.exp = Number(player.exp) || 0; player.lvl = Number(player.lvl) || 1; player.hp = Number(player.hp) || 100;
    player.lastSaveTime = Date.now(); localStorage.setItem(currentSlotKey, JSON.stringify(player)); 
    if(manual) log("✔ 靈魂記憶已封存於石碑之中。", "var(--quest)"); 
}

function saveGameWithFeedback() { saveGame(true); let btn = el('btn-save-game'); if(btn) { btn.innerText = "✔ 存檔成功"; btn.style.background = "var(--quest)"; setTimeout(() => { btn.innerText = "手存存檔"; btn.style.background = "var(--cherry)"; }, 1500); } }

function generateImportCode() { 
    saveGame(false); 
    let code = btoa(encodeURIComponent(JSON.stringify(player))); 
    if(navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(code).then(() => { openModal("📤 靈魂引繼", `引繼碼已自動複製到剪貼簿！<br><textarea readonly style="width:90%;height:80px;background:#000;color:var(--gold);margin-top:10px;" onclick="this.select()">${code}</textarea>`, "了解");
        }).catch(() => { openModal("📤 靈魂引繼", `複製失敗，請手動複製：<br><textarea readonly style="width:90%;height:80px;background:#000;color:var(--gold);margin-top:10px;" onclick="this.select()">${code}</textarea>`, "了解"); });
    } else { openModal("📤 靈魂引繼", `請手動複製：<br><textarea readonly style="width:90%;height:80px;background:#000;color:var(--gold);margin-top:10px;" onclick="this.select()">${code}</textarea>`, "了解"); }
}

function promptImportCode() {
    let code = prompt("請貼上您的引繼碼："); if(!code) return;
    try {
        let d = JSON.parse(decodeURIComponent(atob(code)));
        if(d && d.name !== undefined) { openModal("📥 確認繼承", `覆蓋為 <b>${d.name}</b> (Lv.${d.lvl}) 嗎？`, "確認覆蓋", () => { localStorage.setItem(currentSlotKey, JSON.stringify(d)); location.reload(); }, true); }
    } catch(e) { alert("❌ 引繼碼解析失敗！"); }
}

function logoutGame() { saveGame(false); location.reload(); }

function checkSkillUnlocks() {
    let newlyUnlocked = false;
    let addSkill = (id) => { if(!player.unlockedSkills.includes(id)) { player.unlockedSkills.push(id); log(`✨ 突破界限！領悟新秘技：【${skillDB[id].name}】`, "var(--quest)"); newlyUnlocked = true; } };
    if(player.agi >= 5) addSkill('agi_combo1'); if(player.agi >= 15) addSkill('agi_combo2');
    if(player.vit >= 5) addSkill('vit_strike'); if(player.vit >= 15) addSkill('vit_thorns');
    if(player.str >= 15) addSkill('str_cleave');
    if(newlyUnlocked && !isPaused) { updateUI(); if(currentLogTab === 'skill') renderPath(); }
}

function isSkillValid(sid) {
    let sk = skillDB[sid]; if (!sk || !sk.req) return true;
    for (let s in sk.req) { if (player[s] < sk.req[s]) return false; }
    return true;
}

function validateEquippedSkills() {
    let changed = false;
    for(let i=0; i<4; i++) {
        let sid = player.equippedSkills[i];
        if(sid && skillDB[sid] && !isSkillValid(sid)) {
            player.equippedSkills[i] = null; player.skillGambits[i] = 0; combatState.skillCds[i] = 0; combatState.slotSetupCds[i] = 0; 
            log(`⚠️ 體魄虛弱，秘技【${skillDB[sid].name}】已被自動卸除。`, "var(--danger)"); changed = true; 
        }
    }
    if(changed) { if(currentLogTab === 'skill') renderPath(); saveGame(false); }
}

function equipSkill(sid) { 
    let emptyIdx = player.equippedSkills.indexOf(null); 
    if(emptyIdx !== -1) { 
        player.equippedSkills[emptyIdx] = sid; player.skillGambits[emptyIdx] = 0; player.skillGambitValues[emptyIdx] = 50; player.skillGambitOps[emptyIdx] = '<'; 
        combatState.slotSetupCds[emptyIdx] = 10.0;
        renderPath(); updateUI(); log(`📜 裝備了秘技：${skillDB[sid].name}`, "var(--quest)"); saveGame(false); 
    } else { openModal("槽位已滿", "4個技能槽已滿，請先卸下其他技能。", "知道了"); } 
}

function unequipSkill(idx) { 
    if (combatState.slotSetupCds[idx] > 0) return openModal("調息中", `此技能尚需 ${Math.ceil(combatState.slotSetupCds[idx])} 秒方可卸除！`, "了解");
    player.equippedSkills[idx] = null; player.skillGambits[idx] = 0; combatState.skillCds[idx] = 0; combatState.slotSetupCds[idx] = 0; 
    renderPath(); updateUI(); log("📜 已卸下秘技。", "#aaa"); saveGame(false); 
}

function updateGambit(slotIdx, val) { player.skillGambits[slotIdx] = parseInt(val); updateUI(); renderPath(); saveGame(false); }
function updateGambitVal(idx, val) { let n = parseInt(val); if(isNaN(n)) n = 0; player.skillGambitValues[idx] = Math.max(0, Math.min(100, n)); saveGame(false); }
function toggleGambitOp(idx) { player.skillGambitOps[idx] = (player.skillGambitOps[idx] === '<') ? '>' : '<'; renderPath(); saveGame(false); }
function hasPassive(sid) { return player.equippedSkills.includes(sid) && isSkillValid(sid); }
function handleSlotClick(idx) { switchLogTab('skill'); el('skill-area').scrollIntoView({ behavior: 'smooth', block: 'center' }); log(`[戰術配置] 已聚焦至第 ${idx+1} 槽位。`, "var(--accent)"); }

function checkGambit(idx) {
    let g = player.skillGambits[idx]; let val = player.skillGambitValues[idx]; let op = player.skillGambitOps[idx];
    if(g === 0) return true; if(g === 3) return monster.isBoss === true;
    if(g === 4) { let curPct = (player.hp / getMaxHP()) * 100; return op === '<' ? curPct < val : curPct > val; }
    if(g === 5) { if (monster.mhp <= 0) return false; let curPct = (monster.hp / monster.mhp) * 100; return op === '<' ? curPct < val : curPct > val; }
    return false;
}

function initPotionSelect() {
    const sel = el('potion-select'); if(!sel) return; sel.innerHTML = "";
    Object.values(ITEM_DB).filter(i => i.cat === 'rec').forEach(item => { let label = item.tag ? `(${item.tag})` : ""; sel.innerHTML += `<option value="${item.id}">${item.name} ${label}</option>`; });
    sel.value = player.selectedPotion; if(el('auto-heal-input')) el('auto-heal-input').value = Math.floor(player.autoHeal * 100) || 1; if(el('auto-heal-check')) el('auto-heal-check').checked = player.autoHealEnabled;
}
function updateAutoHeal(val) { let num = parseInt(val); if(isNaN(num)) num = 1; if(num < 1) num = 1; if(num > 100) num = 100; if(el('auto-heal-input')) el('auto-heal-input').value = num; player.autoHeal = num / 100; }

function usePotion(isManual = false) {
    if (player.hp <= 0 || isReviving) { 
        if (isManual) log("💀 靈魂重塑中，無法飲用藥水！", "var(--danger)"); 
        return false; 
    }
    if (combatState.potionCd > 0) { if (isManual) log(`🍵 藥效吸收中... (${Math.ceil(combatState.potionCd)}s)`, "var(--danger)"); return false; }
    let pid = player.selectedPotion; let pItem = getItem(pid); 
    if(player.potions[pid] > 0) {
        if(player.hp >= getMaxHP() && isManual) return log("生命值已滿！");
        
        player.potions[pid]--; let heal = pItem.value > 0 ? pItem.value : Math.floor(getMaxHP() * pItem.rate); player.hp = Math.min(getMaxHP(), player.hp + heal); 
        combatState.potionCd = 5.0; showDmg('p-box', `+${heal}`, 'lime');
        if(player.potions[pid] === 0) { log(`【系統】${pItem.name} 耗盡！`, "var(--danger)"); if(isManual) autoHealLogic(true); }
        updateUI(); return true;
    } else { if(isManual) openModal("補給耗盡", "補給品不足！請前往商店購買。", "知道了"); return false; }
}

function autoHealLogic(onlySearch = false) {
    if(player.potions[player.selectedPotion] > 0 && !onlySearch) usePotion(false);
    else {
        let order = ['p1', 'p2', 'p5', 'p3', 'p6', 'p4']; let found = false;
        for(let key of order) { if(player.potions[key] > 0) { player.selectedPotion = key; initPotionSelect(); if(!onlySearch) { log(`【系統】自動切換為 ${getItem(key).name}。`, "var(--accent)"); usePotion(false); } found = true; break; } }
        if(!found && !onlySearch) log(`【警告】所有補給均已耗盡！`, "var(--danger)");
    }
}

function hireHelper(id) {
    let hdb = HELPER_DB[id];
    if (!hdb) return;
    if (player.gold < hdb.cost) {
        if(typeof showToast === 'function') showToast("❌ 金幣不足！", "var(--danger)");
        return;
    }
    player.gold -= hdb.cost;
    
    if (!player.helperTimes) player.helperTimes = {};
    player.helperTimes[id] = (player.helperTimes[id] || 0) + (hdb.duration * 60);
    
    log(`🤝 成功購買合約！【${hdb.name}】可用時數增加 ${hdb.duration} 分鐘。`, "var(--quest)");
    if(typeof showToast === 'function') showToast(`獲得 ${hdb.duration} 分鐘合約`, "var(--quest)");
    
    updateUI(); saveGame(false);
    if (currentView === 'village' && !el('sub-view').classList.contains('hidden') && typeof renderIzakaya === 'function') {
        renderIzakaya('helper');
    }
}

function toggleHelper(id) {
    if (player.activeHelper === id) {
        player.activeHelper = null;
        log(`☕ 【${HELPER_DB[id].name}】已退下休息。`, "#aaa");
    } else {
        player.activeHelper = id;
        combatState.helperSkillCd = HELPER_DB[id].skillCd; 
        log(`✨ 【${HELPER_DB[id].name}】已加入戰鬥！`, "var(--quest)");
    }
    updateUI();
    if(typeof renderHelper === 'function' && currentLogTab === 'helper') renderHelper();
    if(typeof renderIzakayaMenu === 'function' && currentView === 'village') renderIzakayaMenu();
}

function getAtkVal() { 
    let base = Math.floor(player.str * 2) + ((player.gear.arms || 0) * 3); 
    if (player.activeHelper && HELPER_DB[player.activeHelper]) { base += HELPER_DB[player.activeHelper].passive(player).atk || 0; } 
    if (player.buffs && player.buffs['atk_boost'] > 0) base *= EFFECT_MAP['atk_boost'].multiplier;
    return Math.floor(base);
}
function getDefVal() { 
    let base = player.vit * 1 + ((player.gear.body || 0) * 1.5); 
    if (player.activeHelper && HELPER_DB[player.activeHelper]) { base += HELPER_DB[player.activeHelper].passive(player).def || 0; } 
    return base; 
}
function getMatkVal() { 
    return Math.floor(player.vit * 0.5) + ((player.gear.arms || 0) * 3); 
}
function getSpdVal() { 
    return Math.floor(player.agi * 1); 
}
function getEvaPercent() { 
    let base = player.agi * 0.1 + ((player.gear.legs || 0) * 1.0); 
    if (player.activeHelper && HELPER_DB[player.activeHelper]) { base += HELPER_DB[player.activeHelper].passive(player).eva || 0; } 
    return base; 
}
function getMaxHP() { return Math.floor(player.vit * 10 + 50); }

function executeSkill(slotIdx) {
    let sid = player.equippedSkills[slotIdx];
    if(!sid || !skillDB[sid] || skillDB[sid].type !== 'active' || combatState.skillCds[slotIdx] > 0 || player.hp <= 0) return false;
    if (!isSkillValid(sid)) return false; 
    if(player.mapIdx !== 0 && monster.hp <= 0) return false; 
    
    let sk = skillDB[sid]; combatState.skillCds[slotIdx] = sk.cd; 
    let isDummy = player.mapIdx === 0; let finalDmg = 0;
    
    if(sid === 'vit_strike') { 
        let d = getMatkVal() * 8.0; 
        if(isDummy) { finalDmg = d; } else { finalDmg = Math.max(1, (d - (monster.defVal || 0)/2)) * (1 - (monster.dr || 0)); }
        finalDmg = Math.floor(finalDmg); if(isDummy) combatState.zenDmgAccum += finalDmg; else monster.hp -= finalDmg; 
        combatState.mobAtkTimer += 1.5;
        showDmg('m-box', finalDmg, sk.color); showDmg('m-box', "[暈眩]", '#e1b12c'); showDmg('p-box', "【靈氣爆發】", sk.color); 
    } 
    else if(sid === 'str_cleave') { 
        let d = Math.floor(getAtkVal() * 2.5); 
        finalDmg = d; 
        if(isDummy) combatState.zenDmgAccum += finalDmg; else monster.hp -= finalDmg; 
        showDmg('m-box', finalDmg, sk.color); showDmg('p-box', "【蓄力】", sk.color); 
    }
    else if(sid === 'agi_combo1') {
        let d = Math.floor(getAtkVal() * 1.2);
        if(isDummy) { finalDmg = d; } else { finalDmg = Math.max(0, (d - (monster.defVal || 0)/2)) * (1 - (monster.dr || 0)); }
        finalDmg = Math.floor(finalDmg); if(isDummy) combatState.zenDmgAccum += finalDmg; else monster.hp -= finalDmg; 
        if (!isDummy && Math.random() < 0.1) { monster.poisoned = 5.0; showDmg('m-box', "中毒", '#2ecc71'); }
        showDmg('m-box', finalDmg, sk.color);
    }
    updateUI(); return true;
}

let lastTickTime = Date.now();
function startBattleLoop() {
    if(battleTimer) { clearTimeout(battleTimer); battleTimer = null; } 
    if(isPaused || currentView !== 'battle' || isReviving) { lastTickTime = Date.now(); return; }
    
    let delay = Math.max(250, 1500 / (1 + player.agi * 0.008)); 
    let now = Date.now(); let tickSec = (now - lastTickTime) / 1000; lastTickTime = now;
    if(tickSec > 10) tickSec = 10; 

    if (combatState.potionCd > 0) combatState.potionCd = Math.max(0, combatState.potionCd - tickSec);
    
    if (player.buffs) {
        for(let key in player.buffs) {
            if(player.buffs[key] > 0) player.buffs[key] = Math.max(0, player.buffs[key] - tickSec);
        }
    }

    for(let i=0; i<4; i++) {
        if(combatState.skillCds[i] > 0) combatState.skillCds[i] = Math.max(0, combatState.skillCds[i] - tickSec);
        if(combatState.slotSetupCds[i] > 0) combatState.slotSetupCds[i] = Math.max(0, combatState.slotSetupCds[i] - tickSec);
    }
    if (player.autoHealEnabled && player.hp < (getMaxHP() * player.autoHeal) && combatState.potionCd <= 0) autoHealLogic(false);
    
    if (player.activeHelper && player.helperTimes && player.helperTimes[player.activeHelper] > 0) {
        player.helperTimes[player.activeHelper] = Math.max(0, player.helperTimes[player.activeHelper] - tickSec);
        if (player.helperTimes[player.activeHelper] <= 0) { 
            log(`⛩️ 【${HELPER_DB[player.activeHelper].name}】的合約已到期，已離開隊伍。`, "var(--cherry)"); 
            player.activeHelper = null; 
            updateUI(); 
            if(currentLogTab === 'helper' && typeof renderHelper === 'function') renderHelper();
        }
    }

    let isDummy = player.mapIdx === 0;
    if (isDummy) { combatState.zenTimer += tickSec; if(combatState.zenTimer >= 20) { handleZenComplete(); combatState.zenTimer = 0; combatState.zenDmgAccum = 0; } }

    if (!isDummy && monster.hp > 0 && monster.poisoned > 0) {
        monster.poisoned -= tickSec;
        let maxPoison = getSpdVal() * 1.5; 
        let poisonDmg = Math.floor(monster.mhp * 0.05 * tickSec); 
        if (monster.isBoss) poisonDmg = Math.floor(poisonDmg / 2); 
        if (poisonDmg > maxPoison) poisonDmg = maxPoison;
        if (poisonDmg < 1) poisonDmg = 1;
        monster.hp -= poisonDmg;
        if (Math.random() < 0.2) showDmg('m-box', poisonDmg, '#2ecc71'); 
    }

    let baseAtk = getAtkVal(); let skillUsed = false;
    if(!isDummy ? monster.hp > 0 : true) {
        for(let i=0; i<4; i++) { let sid = player.equippedSkills[i]; if(sid && skillDB[sid].type === 'active' && combatState.skillCds[i] <= 0) { if(checkGambit(i)) { if(executeSkill(i)) { skillUsed = true; break; } } } }
    }

    if(!skillUsed && baseAtk > 0) { 
        let mDodge = Math.max(0, Math.min(70, (monster.eva || 0) + ((monster.agi || 0) - player.agi) * 0.1));
        let critChance = Math.min(30, player.critRate || 0);
        let isCrit = (Math.random() * 100) < critChance;

        if (isCrit || (Math.random() * 100 >= mDodge)) {
            let mDef = monster.defVal || 0;
            let finalDmg = Math.max(0, baseAtk - (mDef / 2));
            finalDmg = Math.floor(finalDmg * (1 - (monster.dr || 0)));
            if (isCrit) finalDmg = Math.floor(finalDmg * 1.5);
            
            if (hasPassive('agi_combo2') && Math.random() < 0.20) {
                let windDmg = Math.floor(getSpdVal() * 1.5);
                finalDmg += windDmg;
                log(`🌪️ 風刃發動！追加 ${windDmg} 點傷害。`, "var(--quest)");
            }
            
            if (finalDmg <= 0) { finalDmg = 0; if(Math.random() < 0.05) log(`[警告] 攻擊無法穿透敵方護甲，傷害為 0！`, "#888"); }

            if (isDummy) { combatState.zenDmgAccum += finalDmg; showDmg('m-box', finalDmg===0 ? '0' : finalDmg, finalDmg===0 ? '#666' : (isCrit?'#ffeb3b':'white'));
            } else if(monster.hp > 0) { 
                monster.hp -= finalDmg; 
                showDmg('m-box', finalDmg===0 ? '0' : finalDmg, finalDmg===0 ? '#666' : (isCrit?'#ffeb3b':'white')); 
            }
        } else { showDmg('m-box', "MISS", '#888'); }
    }

    if(player.activeHelper && HELPER_DB[player.activeHelper]) {
        let hdb = HELPER_DB[player.activeHelper];
        if(!combatState.helperSkillCd) combatState.helperSkillCd = hdb.skillCd;
        combatState.helperSkillCd -= tickSec;
        if(combatState.helperSkillCd <= 0) {
            combatState.helperSkillCd = hdb.skillCd; 
            if(hdb.skillType === 'heal') { player.hp = Math.min(getMaxHP(), player.hp + hdb.skillVal); showDmg('p-box', `+${hdb.skillVal}`, 'var(--quest)');
            } else if(hdb.skillType === 'attack' && (!isDummy ? monster.hp > 0 : true)) {
                if(isDummy) { combatState.zenDmgAccum += hdb.skillVal; showDmg('m-box', hdb.skillVal, '#fdcb6e'); } 
                else { monster.hp -= hdb.skillVal; showDmg('m-box', hdb.skillVal, '#fdcb6e'); log(`💥 夥伴援護攻擊！`, "var(--danger)"); }
            } else if(hdb.skillType === 'seal' && !isDummy && monster.hp > 0) {
                combatState.mobAtkTimer = Math.min(5.0, combatState.mobAtkTimer + hdb.skillVal); showDmg('m-box', "封印", 'var(--accent)'); log(`📜 夥伴施放定身符！`, "var(--accent)");
            } else if(hdb.skillType === 'defend') { 
                player.hp = Math.min(getMaxHP(), player.hp + hdb.skillVal); 
                showDmg('p-box', "[金剛罩]", 'var(--gold)'); log(`🛡️ 權助施放了金剛罩！`, "var(--gold)");
            }
        }
    }
    
    if (!isDummy) {
        if (monster.hp <= 0) { handleVictory(); } else if (monster.atk > 0) { 
            combatState.mobAtkTimer -= tickSec;
            if (combatState.mobAtkTimer <= 0) {
                combatState.mobAtkTimer = 2.0; 
                let myEva = Math.max(0, Math.min(70, getEvaPercent() + (player.agi - (monster.agi || 0)) * 0.1)); 
                if (Math.random() * 100 >= myEva) { 
                    let pDef = getDefVal();
                    let mDmg = Math.floor(Math.max(0, monster.atk - (pDef / 2)));
                    if(hasPassive('vit_thorns') && mDmg > 0) { 
                        let refDmg = Math.floor(monster.atk * 0.5 + pDef * 1.5);
                        monster.hp -= refDmg; 
                        showDmg('m-box', `反制 ${refDmg}`, '#e1b12c'); 
                    }
                    player.hp -= mDmg; showDmg('p-box', mDmg===0 ? '0' : mDmg, mDmg===0?'#888':'#ff4757');
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
    let expGained = (Number(dbMob.exp) || 0); let goldGained = (Number(dbMob.gold) || 0);
    
    if (!player.buffs) player.buffs = {};
    if (player.buffs['exp_boost'] > 0) expGained = Math.floor(expGained * EFFECT_MAP['exp_boost'].multiplier);
    if (player.buffs['gold_boost'] > 0) goldGained = Math.floor(goldGained * EFFECT_MAP['gold_boost'].multiplier);
    if (player.buffs['god_bless'] > 0) {
        expGained = Math.floor(expGained * EFFECT_MAP['god_bless'].multiplier);
        goldGained = Math.floor(goldGained * EFFECT_MAP['god_bless'].multiplier);
    }

    player.exp = (Number(player.exp) || 0) + expGained; player.gold = (Number(player.gold) || 0) + goldGained;
    let dropMsgs = []; dbMob.drops.forEach(l => { if(Math.random() < l.chance) { let amount = l.qty || 1; addItemToBag(l.id, amount); dropMsgs.push(`${getItem(l.id).name}x${amount}`); } });

    if(monster.isBoss) {
        if(dropMsgs.length === 0) dropMsgs.push("無特別物品");
        log(`🏆 擊敗首領！獲得 ${expGained} 經驗, ${goldGained} 金幣。<br>🎁 戰利品：${dropMsgs.join("，")}`, "var(--gold)");
        
        if (!player.repeatBoss && player.mapIdx < maps.length - 1) { 
            player.mapIdx++; player.maxMapIdx = Math.max(player.maxMapIdx, player.mapIdx); saveGame(false); 
            if(typeof showToast === 'function') showToast(`🗺️ 【領域擴張】已解鎖新地圖！`, "var(--quest)");
            player.kills = 0; 
        } else {
            if (player.repeatBoss) log(`⚔️ 循環挑戰開啟，繼續留在原地圖！`, "var(--accent)");
            player.kills = 10; 
        }
        updateMapSelector();
    } else {
        if(dropMsgs.length > 0) log(`🎁 獲得：${dropMsgs.join(", ")}`, "var(--quest)");
        if(player.kills < 10) player.kills++;
    }
    
    checkLevelUp(); 
    
    if (player.autoBoss && player.kills >= 10 && maps[player.mapIdx].boss) { 
        if(!monster.isBoss) log("⚔️ 擊殺達標，首領降臨！", "var(--danger)"); 
        spawn(true); 
    } else {
        spawn(false);
    }
}

function addItemToBag(id, qty) { let item = getItem(id); if(item.cat === 'rec') { if(!player.potions[id]) player.potions[id] = 0; player.potions[id] += qty; } else if(item.cat === 'mat' || item.cat === 'sp' || item.cat === 'oth') { if(!player.mats[id]) player.mats[id] = 0; player.mats[id] += qty; } }
function resetCombatState() { combatState = { mobAtkTimer: 2.0, skillCds: [0, 0, 0, 0], slotSetupCds: [0, 0, 0, 0], zenTimer: 0, zenDmgAccum: 0, potionCd: 0, helperSkillCd: 0, nextHitCrit: false }; }

function handleDeath() { 
    if(player.revives > 0) { player.revives--; log("🛡️ 替身御札發效！靈魂回歸肉身。", "var(--gold)"); player.hp = getMaxHP(); updateUI(); return; } 
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
        let mName = (boss || dbMob.isBoss) ? `【首領】${dbMob.name}` : dbMob.name;
        monster = { id: mobId, name: mName, hp: dbMob.hp, mhp: dbMob.hp, atk: dbMob.atk, defVal: dbMob.defVal || 0, dr: dbMob.dr || 0, eva: dbMob.eva || 0, agi: dbMob.agi || 0, lvl: autoLvl, isBoss: dbMob.isBoss || false, poisoned: 0 };
    }
    let btn = el('btn-boss'); if(btn) btn.disabled = (player.kills < 10 || monster.isBoss || isReviving || !m.boss);
}

function changeMap() { const sel = el('map-selector'); if(!sel) return; player.mapIdx = parseInt(sel.value); player.kills=0; combatState.zenTimer = 0; combatState.zenDmgAccum = 0; spawn(); updateMapSelector(); }
function manualBoss() { spawn(true); }

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
        cb.checked = false;
    });
    if(totalEarned > 0) { player.gold += totalEarned; log(`💰 變賣清單：${soldSummary.join(", ")}，共入帳 ${totalEarned} 金幣！`, "var(--gold)"); if(typeof showToast === 'function') showToast(`+ $${totalEarned} 金幣`, "var(--gold)"); updateUI(); renderBag(); }
}

function startWork() { player.workStartTime = Date.now(); isPaused = true; log("🏃 換上圍裙，開始在居酒屋幫忙...", "var(--gold)"); showSubView('work'); }
function stopWork() { let now = Date.now(); if (!player.workStartTime) player.workStartTime = now; let hourlyRate = 1200 + (player.lvl * 100); if (player.activeHelper && HELPER_DB[player.activeHelper] && HELPER_DB[player.activeHelper].workBonus) { hourlyRate *= HELPER_DB[player.activeHelper].workBonus.rate; } let elapsedSecs = Math.floor((now - player.workStartTime) / 1000); if (isNaN(elapsedSecs) || elapsedSecs < 0) elapsedSecs = 0; if (elapsedSecs > 43200) elapsedSecs = 43200; let earn = Math.floor((elapsedSecs / 3600) * hourlyRate); if (earn > 0) { player.gold = (Number(player.gold) || 0) + earn; log(`💰 老闆：「辛苦啦！」獲得了 $${earn.toLocaleString()}。`, "var(--gold)"); if(typeof showToast === 'function') showToast(`+ $${earn} 金幣`, "var(--gold)"); } else { log("💨 工作時間太短，老闆揮揮手叫你趕快走。", "#888"); } player.workStartTime = null; isPaused = false; updateUI(); showSubView('izakaya'); }
function innRest(cost) { if(player.hp >= getMaxHP()) return openModal("精神飽滿", "妳精神好得很！", "知道了"); if(player.gold >= cost) { player.gold -= cost; isResting = true; let area = el('btn-inn-rest'); if(area) area.disabled = true; let btnBack = el('btn-back-village'); if(btnBack) btnBack.classList.add('hidden'); let sec = 3; const timer = setInterval(() => { sec--; if(sec <= 0) { clearInterval(timer); isResting = false; player.hp = getMaxHP(); updateUI(); if(btnBack) btnBack.classList.remove('hidden'); openModal("✨ 休息完畢", "體力已完全恢復！", "出發", () => showSubView('inn')); } }, 1000); } else openModal("金幣不足", "錢不夠喔。", "知道了"); }

function offerMoney(amt) {
    if(player.gold < amt) return log("❌ 金幣不足，無法奉納...");
    player.gold -= amt; player.shrineDonation = (player.shrineDonation || 0) + amt;
    let msg = ""; let tokenGot = 0;

    if(amt === 5) { 
        if(Math.random() < 0.05) tokenGot = 1; 
        msg = tokenGot ? "✨ 緣分結下了！(獲得 1 枚神德代幣)" : "🪙 神明默默收下了 5 円。"; 
    } 
    else if(amt === 11) { 
        if(Math.random() < 0.15) tokenGot = 1; 
        msg = tokenGot ? "✨ 感受到了好吉兆！(獲得 1 枚神德代幣)" : "🪙 祈願的聲音傳達到了。"; 
    } 
    else if(amt === 10 || amt === 500) { 
        msg = "<span style='color:var(--danger)'>💀 觸怒了荒神！(體力流失)</span>"; 
        log(`⛩️ 您奉納了 ${amt} 金幣，這似乎是個不吉利的數字...`, "var(--danger)"); 
        player.hp = Math.max(1, player.hp - (amt === 10 ? 30 : 150)); 
    } 
    else if(amt === 485) { 
        tokenGot = 1; msg = "✨ 神明對你的誠意感到滿意。(獲得 1 枚神德代幣)"; 
    }
    else if(amt === 1000) { 
        tokenGot = 3; msg = "✨ 【大吉】神像金光大作！(獲得 3 枚神德代幣)"; 
    }

    if (tokenGot > 0) {
        player.mats.c_shrine = (player.mats.c_shrine || 0) + tokenGot;
        log(`⛩️ 奉納觸發神恩！獲得神德代幣 x${tokenGot}`, "var(--quest)");
        if(typeof showToast === 'function') showToast(`獲得 神德代幣 x${tokenGot}`, "var(--quest)");
    } else if (amt !== 10 && amt !== 500) {
        log(`⛩️ 奉納了 ${amt} 金幣。`, "#aaa");
    }

    updateUI(); 
    if(typeof renderShrine === 'function') renderShrine(); 
    el('shrine-msg').innerHTML = msg;
}

function applyBuff(effKey, duration) {
    if(!player.buffs) player.buffs = {};
    player.buffs[effKey] = (player.buffs[effKey] || 0) + duration;
}

function ascendShrine(cost) {
    if(player.gold < cost) return showToast("❌ 金幣不足以奉納上殿！", "var(--danger)");
    
    player.gold -= cost;
    player.ascensionCount = (player.ascensionCount || 0) + 1;
    if(!player.buffs) player.buffs = {};

    let roll = Math.random();
    let msg = ""; let title = "";

    if (roll < 0.05) { 
        applyBuff('god_bless', 86400); 
        title = "✨【神明降臨】";
        msg = "天照之光籠罩大地！<br>獲得 24 小時 <b style='color:var(--gold)'>金幣與經驗大幅加成</b>！";
        log("⛩️ 祈福觸發極稀有大獎：神明降臨！", "var(--gold)");
    } 
    else if (roll < 0.45) { 
        if (Math.random() < 0.5) {
            applyBuff('atk_boost', 7200); 
            title = "🦊【神使巡迴】";
            msg = "稻荷神使在妳身邊徘徊。<br>獲得 2 小時 <b style='color:var(--danger)'>物理攻擊力提升</b>！";
        } else {
            applyBuff('exp_boost', 7200);
            title = "🦊【神使巡迴】";
            msg = "文殊菩薩點化智慧。<br>獲得 2 小時 <b style='color:var(--quest)'>經驗值提升</b>！";
        }
        log("⛩️ 祈福獲得增益：神使巡迴。", "var(--quest)");
    }
    else if (roll < 0.85) { 
        let getGold = 10000 + (player.lvl * 500);
        player.gold += getGold;
        title = "🪙【凡心所向】";
        msg = `神明聽到了妳的聲音，但目前正忙於他處。<br>賜予妳一點修行金：<b style='color:var(--gold)'>$${getGold.toLocaleString()}</b>`;
        log("⛩️ 祈福效果普通：獲得修行金。", "#aaa");
    }
    else { 
        for(let k in player.buffs) player.buffs[k] = 0; 
        player.hp = Math.max(1, player.hp - 200);
        title = "💀【厄神作祟】";
        msg = "妳的舉止粗魯，驚擾了沉睡的荒神！<br><b style='color:var(--danger)'>所有增益消失，且體力大幅流失！</b>";
        log("⛩️ 祈福大失敗：觸怒荒神！", "var(--danger)");
    }

    openModal(title, msg, "領受神意");
    updateUI();
    if(typeof renderShrine === 'function') renderShrine();
}

function getUpgradeCost(level) { let tier = Math.floor(level / 3) + 1; tier = Math.min(4, tier); let matKey = `m${tier}`; let goldCost = 50 + (level * 100); let ironCost = 5 + (level * 2); let specialCost = 1 + (level % 3); return { matKey, goldCost, ironCost, specialCost }; }
function upgradeGear(gid) { let lv = player.gear[gid]; let req = getUpgradeCost(lv); if(player.gold >= req.goldCost && player.mats.m0 >= req.ironCost && player.mats[req.matKey] >= req.specialCost) { player.gold -= req.goldCost; player.mats.m0 -= req.ironCost; player.mats[req.matKey] -= req.specialCost; player.gear[gid]++; log(`⚒️ 靈脈法器強化成功！${gid} 提升至 Lv.${player.gear[gid]}`, "var(--mat)"); updateUI(); if(typeof renderSmithy === 'function') renderSmithy(); } }

function useWashStar(statType, qty) {
    qty = parseInt(qty);
    if(isNaN(qty) || qty <= 0) return;
    if ((player.mats['wash_star'] || 0) < qty) return openModal("數量不足", "行囊中的遺忘星砂數量不足。", "了解");
    if (player.allocatedStats[statType] < qty) return openModal("無法洗鍊", `您手動分配的 ${statType.toUpperCase()} 點數不足 ${qty} 點，無法洗退先天或系統強化點數！`, "了解");
    
    player.mats['wash_star'] -= qty;
    player[statType] -= qty;
    player.allocatedStats[statType] -= qty;
    player.statPoints += qty;
    
    player.hp = Math.min(player.hp, getMaxHP());
    validateEquippedSkills();
    updateUI();
    log(`✨ 使用遺忘星砂 x${qty}，洗退了 ${qty} 點 ${statType.toUpperCase()}，獲得自由點數。`, "var(--quest)");
    if(typeof renderBag === 'function') renderBag();
}

function buyShrineItem(id) {
    let item = getItem(id);
    let cost = item.cost;
    if ((player.shrineDonation || 0) < item.reqDonation) return showToast("🔒 累積奉納不足，神明尚未認可您的虔誠。", "var(--danger)");
    if ((player.mats.c_shrine || 0) < cost) return showToast("❌ 神德代幣不足！", "var(--danger)");
    
    player.mats.c_shrine -= cost;
    if (id === 'revive') { player.revives = (player.revives || 0) + 1; } 
    else { player.mats[id] = (player.mats[id] || 0) + 1; }
    
    log(`⛩️ 神明賜予了加護：獲得 ${item.name}！`, "var(--gold)");
    showToast(`獲得 ${item.name}`, "var(--quest)");
    updateUI();
    if(typeof renderShrineShop === 'function') renderShrineShop();
}

function useShrineBuffItem(id) {
    let item = getItem(id);
    if ((player.mats[id] || 0) <= 0) return openModal("數量不足", "行囊中沒有該道具。", "了解");
    
    player.mats[id]--;

    if (id === 's_omikuji') {
        let roll = Math.random();
        if (roll < 0.1) {
            let getGold = player.lvl * 200; player.gold += getGold;
            openModal("✨ 【大吉】", `神光庇護！獲得 ${getGold} 金幣！`, "收下");
        } else if (roll < 0.4) {
            addItemToBag('m0', 5); addItemToBag('m1', 2);
            openModal("⛩️ 【吉】", `獲得了一些鍛造素材！`, "收下");
        } else if (roll < 0.8) {
            let getGold = player.lvl * 50; player.gold += getGold;
            openModal("🪙 【小吉】", `獲得了 ${getGold} 金幣。`, "收下");
        } else {
            player.hp = Math.max(1, player.hp - 50);
            openModal("💀 【凶】", `抽到了下下籤... 體力流失了。`, "無奈");
        }
    } else if (item.effect && EFFECT_MAP[item.effect]) {
        let eff = EFFECT_MAP[item.effect];
        applyBuff(item.effect, item.duration || 1800);
        log(`✨ 使用了【${item.name}】，獲得了 ${eff.name} 效果！`, "var(--gold)");
    }

    updateUI();
    if(typeof renderBag === 'function') renderBag();
}

function buyShopItem(tab) {
    let selId = `shop-${tab}-sel`; let cntId = `shop-${tab}-cnt`; let itemId = el(selId).value; let count = parseInt(el(cntId).value); if (isNaN(count) || count < 1) count = 1; let item = getItem(itemId); let unitCost = item.cost;
    let totalCost = unitCost * count; let maxAffordable = Math.floor(player.gold / unitCost);
    let onBuySuccess = (buyCount) => { 
        if(item.cat === 'rec') { if(!player.potions[itemId]) player.potions[itemId]=0; player.potions[itemId] += buyCount; } 
        else if (item.id === 'revive') { player.revives += buyCount; } 
        else if (item.id === 'wash_star') { player.mats['wash_star'] = (player.mats['wash_star'] || 0) + buyCount; }
        else { log("尚未實裝該類道具存入邏輯。"); } 
    };
    if (player.gold >= totalCost) { player.gold -= totalCost; onBuySuccess(count); updateUI(); if(typeof updateShopInvDisplay === 'function') updateShopInvDisplay(); log(`🛍️ 購買成功！獲得 ${item.name} x${count}`, "var(--quest)"); if(typeof showToast === 'function') showToast(`- $${totalCost} 金幣`, "var(--danger)"); openModal("交易完成", `萬屋老闆點了點頭。<br><br>獲得：<span style="color:var(--quest); font-weight:bold;">${item.name} x${count}</span>`, "確認");
    } else {
        if (maxAffordable > 0 && tab === 'rec') { openModal("金幣不足", `妳的金幣最多只能購買 <b>${maxAffordable}</b> 個。<br>確定要將剩下的錢全部買入嗎？`, "確定購買", () => { player.gold -= (unitCost * maxAffordable); onBuySuccess(maxAffordable); updateUI(); if(typeof updateShopInvDisplay === 'function') updateShopInvDisplay(); showSubView('shop'); log(`🛍️ 購買成功！獲得 ${item.name} x${maxAffordable}`, "var(--quest)"); if(typeof showToast === 'function') showToast(`- $${unitCost * maxAffordable} 金幣`, "var(--danger)"); openModal("交易完成", `萬屋老闆笑著收下所有零錢。<br><br>獲得：<span style="color:var(--quest); font-weight:bold;">${item.name} x${maxAffordable}</span>`, "確認"); }, true);
        } else openModal("金幣不足", "萬屋老闆：錢不夠喔，去多打點怪吧！", "知道了");
    }
}

function applyGM() { player.lvl = parseInt(el('gm-lvl').value) || 1; player.gold = parseInt(el('gm-gold').value) || 0; player.str = parseInt(el('gm-str').value) || 2; player.vit = parseInt(el('gm-vit').value) || 1; player.agi = parseInt(el('gm-agi').value) || 0; player.statPoints = parseInt(el('gm-pts').value) || 0; player.hp = getMaxHP(); updateUI(); checkSkillUnlocks(); showSubView('gm'); log('🛠️ 神明特權：各項數值已重新校準。', 'var(--gm)'); }
function previewStat(t) { 
    if(player.statPoints > 0) { 
        if (player[t] + statPreview[t] >= MAX_STAT_POINT) {
            if(typeof showToast === 'function') showToast(`❌ 單一屬性已達凡人極限 (${MAX_STAT_POINT}點)！`, "var(--danger)");
            return;
        }
        player.statPoints--; statPreview[t]++; updateUI(); 
    } 
}
function cancelPreview() { player.statPoints += (statPreview.str + statPreview.vit + statPreview.agi); statPreview = { str: 0, vit: 0, agi: 0 }; updateUI(); }

function confirmStats() { 
    player.str += statPreview.str; player.vit += statPreview.vit; player.agi += statPreview.agi; 
    player.allocatedStats.str += statPreview.str; player.allocatedStats.vit += statPreview.vit; player.allocatedStats.agi += statPreview.agi;
    player.hp = getMaxHP(); statPreview = { str: 0, vit: 0, agi: 0 }; 
    log("✔ 屬性已固化。", "var(--quest)"); checkSkillUnlocks(); updateUI(); switchLogTab('log'); 
}

function getDeck() {
    let suits = ['♠', '♥', '♦', '♣']; let ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    let deck = []; suits.forEach(s => ranks.forEach(r => deck.push({suit: s, rank: r})));
    for(let i=deck.length-1; i>0; i--) { let j = Math.floor(Math.random()*(i+1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    return deck;
}
function calcCards(cards) {
    let total = 0; let aces = 0;
    cards.forEach(c => { if(['J','Q','K'].includes(c.rank)) total += 10; else if(c.rank === 'A') { total += 11; aces += 1; } else total += parseInt(c.rank); });
    while(total > 21 && aces > 0) { total -= 10; aces -= 1; }
    return total;
}

function startCasino(isAllIn) {
    let betInput = parseInt(el('casino-bet').value);
    if (isAllIn) betInput = player.gold;
    if (isNaN(betInput) || betInput <= 0) return showToast("❌ 押注金額無效！", "var(--danger)");
    if (player.gold < betInput) return showToast("❌ 金幣不足！", "var(--danger)");
    
    player.gold -= betInput; updateUI();
    casinoState = { active: true, bet: betInput, isAllIn: isAllIn, gameOver: false, msg: "", deck: getDeck(), playerCards: [], dealerCards: [] };
    casinoState.playerCards.push(casinoState.deck.pop(), casinoState.deck.pop());
    casinoState.dealerCards.push(casinoState.deck.pop(), casinoState.deck.pop());
    casinoState.playerTotal = calcCards(casinoState.playerCards);
    casinoState.dealerTotal = calcCards(casinoState.dealerCards);
    
    if (casinoState.playerTotal === 21) {
        if (casinoState.dealerTotal === 21) { casinoState.msg = "🤝 雙方 Blackjack，平手退回本金！"; player.gold += casinoState.bet; }
        else { let win = isAllIn ? (casinoState.bet * 4) : Math.floor(casinoState.bet * 2.5); casinoState.msg = `🔥 Blackjack！神仙難救！狂賺 ${win.toLocaleString()} 金幣！`; player.gold += win; }
        casinoState.gameOver = true; updateUI();
    }
    if(typeof renderCasino === 'function') renderCasino();
}

function hitCasino() {
    casinoState.playerCards.push(casinoState.deck.pop()); casinoState.playerTotal = calcCards(casinoState.playerCards);
    if (casinoState.playerTotal > 21) { casinoState.msg = "💥 爆牌 (Bust)！籌碼被老闆娘笑納了。"; casinoState.gameOver = true; updateUI(); }
    if(typeof renderCasino === 'function') renderCasino();
}

function standCasino() {
    while (calcCards(casinoState.dealerCards) < 17) { casinoState.dealerCards.push(casinoState.deck.pop()); }
    casinoState.dealerTotal = calcCards(casinoState.dealerCards); checkCasinoWinner();
}

function raiseCasino() {
    let inputStr = prompt(`請輸入加注金額 (目前底注: $${casinoState.bet.toLocaleString()}，持有現金: $${player.gold.toLocaleString()})\n加注後將發一張牌，若未爆牌可繼續操作！`, casinoState.bet);
    if (inputStr === null) return; 
    let addAmt = parseInt(inputStr);
    if (isNaN(addAmt) || addAmt <= 0) return;
    if (player.gold < addAmt) return showToast("❌ 金幣不足以加碼！", "var(--danger)");
    
    player.gold -= addAmt; casinoState.bet += addAmt; updateUI();
    casinoState.playerCards.push(casinoState.deck.pop()); casinoState.playerTotal = calcCards(casinoState.playerCards);
    
    if (casinoState.playerTotal > 21) { casinoState.msg = "💥 加碼後爆牌！血本無歸。"; casinoState.gameOver = true; updateUI(); } 
    else { casinoState.msg = `💰 成功加注 $${addAmt.toLocaleString()}！(總注 $${casinoState.bet.toLocaleString()})`; }
    if(typeof renderCasino === 'function') renderCasino();
}

function surrenderCasino() {
    let back = Math.floor(casinoState.bet * 0.5); player.gold += back;
    casinoState.msg = `🏳️ 投降輸一半。退回 ${back.toLocaleString()} 金幣。`; casinoState.gameOver = true; updateUI(); if(typeof renderCasino === 'function') renderCasino();
}

function checkCasinoWinner() {
    let pt = casinoState.playerTotal; let dt = casinoState.dealerTotal;
    if (dt > 21) { let win = casinoState.bet * (casinoState.isAllIn ? 3 : 2); casinoState.msg = `🎉 莊家爆牌！贏得 ${win.toLocaleString()} 金幣！`; player.gold += win; }
    else if (pt > dt) { let win = casinoState.bet * (casinoState.isAllIn ? 3 : 2); casinoState.msg = `🎉 點數壓制！贏得 ${win.toLocaleString()} 金幣！`; player.gold += win; }
    else if (pt < dt) { casinoState.msg = `💸 莊家點數較大，籌碼沒收。`; }
    else { casinoState.msg = `🤝 平手，退回押注金。`; player.gold += casinoState.bet; }
    casinoState.gameOver = true; updateUI(); if(typeof renderCasino === 'function') renderCasino();
}

window.onload = () => { 
    initSlotScreen(); 
    setInterval(() => { if(!isPaused && currentSlotKey && player.name && !player.workStartTime) saveGame(false); }, 5000); 
    setInterval(() => { if (player.workStartTime && currentView === 'village' && !el('sub-view').classList.contains('hidden')) showSubView('work'); }, 1000); 
};