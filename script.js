/* ===========================================================================
   ⚙️ 遊戲核心邏輯 (V0.7.3 忍者特性與跳字優化版)
   ========================================================================== */
const CURRENT_VERSION = "0.7.4";

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
const GEAR_MAX_LVL = 15;
const UPGRADE_RATES = [100, 95, 85, 75, 60, 50, 40, 30, 25, 20, 15, 10, 8, 5, 3];
let currentSlotKey = "";

const defaultPlayer = {
    sect: null,
    sectContrib: 0, // ✨ 新增：流派貢獻度
    sectRank: 0,    // ✨ 新增：流派階級 (對應 0, 1, 2)
    hasSeenIntro: false,
    hasSeenVillageIntro: false,
    hasSeenTeahouse: false,
    hasSeenShrineIntro: false,
    completedStories: [], // ✨ 升級：通用劇情進度清單 (取代原本繁瑣的 storyFlags)
    hasMetBlacksmith: false, // ✨ 新增：是否已見過鍛造屋師傅
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
    unlockedSkills: [], equippedSkills: [null, null, null, null, null, null],
    skillGambits: [0, 0, 0, 0, 0, 0], skillGambitValues: [50, 50, 50, 50, 50, 50], skillGambitOps: ['<', '<', '<', '<', '<', '<'],
    helperTimes: {},
    expeditions: [], // ✨ 新增：記錄進行中的遠征
    activeHelper: null,
    shrineDonation: 0, ascensionCount: 0,
    maxOfflineMinutes: 60, // ✨ 新增：預設離線掛機上限為 60 分鐘
    stamina: 100, maxStamina: 100, // ✨ 生活系統：體力機制
    staminaLastRefill: Date.now(),
    lifeSkills: { farm: { lvl: 1, exp: 0, next: 100 }, fish: { lvl: 1, exp: 0, next: 100 }, wood: { lvl: 1, exp: 0, next: 100 } },
    farmCrops: [null, null, null, null], // ✨ 擴建為 4 格農田
    fishingState: { active: false, startTime: 0, lastTick: 0, caught: { m1: 0, m2: 0, m3: 0, exp: 0, dura: 0 } }, // ✨ 漁場掛機狀態
    woodState: { active: false, startTime: 0, lastTick: 0, caught: { m1: 0, m2: 0, m3: 0, exp: 0, dura: 0, stam: 0 } }, // ✨ 伐木掛機狀態
    toolDura: {}, // ✨ 工具耐久度記錄
    blueprints: [] // ✨ 製作系統：已學習的製作圖 ID 清單
};

let player = JSON.parse(JSON.stringify(defaultPlayer));
let monster = { id: "", name: "", hp: 0, mhp: 0, atk: 0, lvl: 1, isBoss: false, defVal: 0, dr: 0, eva: 0, agi: 0, poisoned: 0 };
let isPaused = true; let isReviving = false; let isResting = false;
let currentView = 'battle'; let battleTimer = null;
let statPreview = { str: 0, vit: 0, agi: 0 };
// ✨ 新增 currentHelperFilter
let currentLogTab = 'log'; let currentInvFilter = 'all'; let currentSkillFilter = 'all'; let currentHelperFilter = 'all'; let testDummyType = 'static';

let combatState = { mobAtkTimer: 2.0, playerAtkTimer: 0, skillCds: [0, 0, 0, 0, 0, 0], slotSetupCds: [0, 0, 0, 0, 0, 0], zenTimer: 0, zenDmgAccum: 0, potionCd: 0, helperSkillCd: 0, testMode: false, skillDmgLog: [], testStartTime: 0, totalDmgDealt: 0, shintoHealTimer: 0, lastDmg: 0 };
let initAllocatedStats = { str: 2, vit: 1, agi: 0 };
let casinoState = { active: false, bet: 0, playerTotal: 0, dealerTotal: 0, isAllIn: false, msg: "", deck: [], playerCards: [], dealerCards: [], gameOver: false };

function el(id) { return document.getElementById(id); }

function initSlotScreen() {
    const container = el('slots-container'); container.innerHTML = "";
    for (let i = 1; i <= 3; i++) {
        const key = `RIN_SAVE_SLOT_${i}`;
        const s = localStorage.getItem(key);
        const card = document.createElement('div'); card.className = "slot-card";
        if (s) {
            try {
                let d = JSON.parse(s);
                card.innerHTML = `<button class="btn-del-slot" onclick="confirmDeleteSlot(event, '${key}')">刪除</button>
                    <div class="card-content"><h3 style="color:var(--cherry); margin-bottom:5px;">${d.name || "無名者"}</h3><p style="margin:0;">Lv.${d.lvl || 1}</p></div>`;
            } catch (e) { }
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

function resetInitStats() { player.statPoints = 5; initAllocatedStats = { str: 2, vit: 1, agi: 0 };['str', 'vit', 'agi'].forEach(s => el(`init-${s}`).innerText = initAllocatedStats[s]); el('init-points').innerText = 5; el('init-error').style.display = 'none'; }

function loadGame() {
    let s = localStorage.getItem(currentSlotKey);
    // 建立基礎模板
    player = JSON.parse(JSON.stringify(defaultPlayer));

    if (s) {
        try {
            let sd = JSON.parse(s);
            if (!sd) throw new Error("存檔為空");

            // 1. 安全合併：先把 sd 覆蓋到 player
            Object.assign(player, sd);

            // 2. 深度合併對象：確保物件不會整塊覆蓋
            player.potions = Object.assign({}, defaultPlayer.potions, sd.potions || {});
            player.mats = Object.assign({}, defaultPlayer.mats, sd.mats || {});
            player.gear = Object.assign({}, defaultPlayer.gear, sd.gear || {});
            player.allocatedStats = Object.assign({ str: 0, vit: 0, agi: 0 }, sd.allocatedStats || {});
            player.expeditions = sd.expeditions || []; // ✨ 安全載入遠征紀錄
            player.buffs = Object.assign({}, sd.buffs || {});

            // 3. 補齊新功能欄位
            if (player.sect === undefined) player.sect = null;
            if (player.sectContrib === undefined) player.sectContrib = 0;
            if (player.sectRank === undefined) player.sectRank = 0;
            if (!player.completedStories) player.completedStories = []; // ✨ 補齊通用劇情清單
            if (player.hasMetBlacksmith === undefined) player.hasMetBlacksmith = false;

            // ✨ 補齊舊存檔生活職人屬性
            if (player.stamina === undefined) player.stamina = defaultPlayer.stamina;
            if (player.maxStamina === undefined) player.maxStamina = defaultPlayer.maxStamina;
            if (!player.staminaLastRefill) player.staminaLastRefill = Date.now();
            if (!player.lifeSkills) player.lifeSkills = JSON.parse(JSON.stringify(defaultPlayer.lifeSkills));
            if (!player.blueprints) player.blueprints = [];

            // ✨ 補齊 4 格農田與釣魚狀態 (無縫轉移舊存檔的農作物)
            if (!player.farmCrops) {
                player.farmCrops = [null, null, null, null];
                if (player.farmCrop) {
                    player.farmCrops[0] = player.farmCrop;
                    delete player.farmCrop; // 刪除舊欄位
                }
            }
            if (!player.fishingState) player.fishingState = { active: false, startTime: 0, lastTick: 0, caught: { m1: 0, m2: 0, m3: 0, exp: 0, dura: 0 } };
            if (!player.fishingState.caught) player.fishingState.caught = { m1: 0, m2: 0, m3: 0, exp: 0, dura: 0 };
            if (player.fishingState.active && !player.fishingState.lastTick) player.fishingState.lastTick = Date.now();
            if (!player.toolDura) player.toolDura = {}; // ✨ 補齊耐久度屬性
            if (!player.woodState) player.woodState = { active: false, startTime: 0, lastTick: 0, caught: { m1: 0, m2: 0, m3: 0, exp: 0, dura: 0, stam: 0 } };
            if (!player.woodState.caught) player.woodState.caught = { m1: 0, m2: 0, m3: 0, exp: 0, dura: 0, stam: 0 };
            if (player.woodState.active && !player.woodState.lastTick) player.woodState.lastTick = Date.now();

            // 4. 補償機制：裝備超過 15 等
            let compensated = false;
            let compGold = 0; let compStar = 0;
            ['arms', 'body', 'legs'].forEach(g => {
                if (player.gear[g] > 15) {
                    let excess = player.gear[g] - 15;
                    compGold += excess * 50000;
                    compStar += excess * 5;
                    player.gear[g] = 15;
                    compensated = true;
                }
            });
            if (compensated) {
                player.gold += compGold;
                player.mats['wash_star'] = (player.mats['wash_star'] || 0) + compStar;
                player.mats['mat_perfect'] = (player.mats['mat_perfect'] || 0) + 3;
                setTimeout(() => openModal("⚖️ 天道校準補償",
                    `偵測到您的法器曾突破了凡人極限。<br>已壓制回 <b>Lv.15</b>。<br><br><b>補償：</b><br>💰 金幣 +${compGold.toLocaleString()}<br>✨ 遺忘星砂 x${compStar}<br>🏆 絕對真理 x3`,
                    "感謝神明"), 1500);
            }

            // 5. 地圖檢查
            if (player.mapIdx >= maps.length) player.mapIdx = maps.length - 1;
            if (player.maxMapIdx >= maps.length) player.maxMapIdx = maps.length - 1;
            if (player.repeatBoss === undefined) player.repeatBoss = false;

        } catch (e) {
            console.error("載入失敗，但已阻止自動刪檔:", e);
            // 不覆蓋存檔，保留原始資料
        }
    }

    // 初始化與檢查
    initPotionSelect();
    if (!player.name || player.name === "") {
        el('naming-area').classList.remove('hidden');
        resetInitStats();
        openModal("踏入輪迴", "名號一旦定下，便與靈魂綁定。", "開啟旅程", () => {
            let n = el('player-name-input').value.trim();
            if (n === "") n = "無名者";
            if (player.statPoints > 0) { el('init-error').style.display = 'block'; return false; }
            player.name = n;
            player.str = initAllocatedStats.str;
            player.vit = initAllocatedStats.vit;
            player.agi = initAllocatedStats.agi;
            player.allocatedStats.str = initAllocatedStats.str - 2;
            player.allocatedStats.vit = initAllocatedStats.vit - 1;
            player.allocatedStats.agi = initAllocatedStats.agi - 0;
            player.lockedStats = { str: 2, vit: 1, agi: 0 };
            el('naming-area').classList.add('hidden');
            checkSkillUnlocks();
            postLoadInit();
        });
    } else {
        checkSkillUnlocks();
        postLoadInit();
    }

    // 數值安全化
    player.gold = Number(player.gold) || 0;
    player.exp = Number(player.exp) || 0;
    player.lvl = Number(player.lvl) || 1;
    player.str = Number(player.str) || 2;
    player.vit = Number(player.vit) || 1;
    player.agi = Number(player.agi) || 0;
    player.mhp = getMaxHP();
    if (player.hp > player.mhp) player.hp = player.mhp;

    resetCombatState();
    updateUI();
}

// ✨ 高效能離線掉落物計算 (避免大量迴圈導致網頁卡頓)
function calcOfflineLoot(fakeKills, mobId) {
    let dbMob = typeof MOB_DB !== 'undefined' ? MOB_DB[mobId] : null;
    let offlineLoot = {};
    if (!dbMob || !dbMob.drops || fakeKills <= 0) return offlineLoot;

    dbMob.drops.forEach(drop => {
        let expectedDrops = fakeKills * drop.chance;
        let guaranteedDrops = Math.floor(expectedDrops);
        let fractionalChance = expectedDrops - guaranteedDrops;
        let finalCount = guaranteedDrops + (Math.random() < fractionalChance ? 1 : 0);

        let multiplier = drop.qty || 1;
        finalCount *= multiplier;

        if (finalCount > 0) {
            offlineLoot[drop.id] = (offlineLoot[drop.id] || 0) + finalCount;
        }
    });
    return offlineLoot;
}

function postLoadInit() {
    validateEquippedSkills();
    cleanupBackSlots(); // ✨ 確保後排只有被動技能
    updateMapSelector();
    spawn(false);
    updateUI();
    isPaused = false;
    log(`💡 【V${CURRENT_VERSION}】技能功能稍微修正、劇情模式陸續推出中`, "var(--accent)");
    if (player.lvl === 1 && player.exp === 0 && player.gold === 0 && player.potions.p1 === 5) log("🎁 新手物資已發放：生鮮野味 x5", "var(--quest)");
    if (player.name === "御雷神命") { let gmCard = el('card-gm'); if (gmCard) gmCard.classList.remove('hidden'); }

    let offlineSec = Math.floor((Date.now() - player.lastSaveTime) / 1000);
    // ✨ 實裝：計算離線時間上限
    let maxOfflineSec = (player.maxOfflineMinutes || 60) * 60;

    if (offlineSec > 300 && player.mapIdx > 0 && player.hp > 0 && !player.workStartTime) {
        let m = maps[player.mapIdx];
        if (m && m.mobs.length > 0) {
            let actualOfflineSec = Math.min(offlineSec, maxOfflineSec); // 取實際時間與上限的較小值
            let isCapped = offlineSec > maxOfflineSec; // 判斷是否爆掉

            let mobId = m.mobs[0];
            let fakeKills = Math.floor(actualOfflineSec / 10);
            if (fakeKills > 0 && MOB_DB[mobId]) {
                let expEarned = fakeKills * (MOB_DB[mobId].exp || 0);
                let goldEarned = fakeKills * (MOB_DB[mobId].gold || 0);
                player.exp += expEarned; player.gold += goldEarned;

                // ✨ 離線掉落物結算
                let loot = calcOfflineLoot(fakeKills, mobId);
                let dropHtml = "";
                for (let itemId in loot) {
                    addItemToBag(itemId, loot[itemId]);
                    let item = typeof getItem === 'function' ? getItem(itemId) : { name: itemId };
                    dropHtml += `${item.name} x${loot[itemId]} `;
                }
                if (dropHtml === "") dropHtml = "無";

                if (player.mapIdx === 0) { player.kills += fakeKills; }
                else { player.kills = Math.min(10, player.kills + fakeKills); }

                checkLevelUp();
                updateUI();

                // 動態生成提示訊息
                let timeMsg = formatHelperTime(actualOfflineSec);
                let warningHtml = isCapped ? `<br><span style="color:var(--danger); font-size:0.85em;">(已達掛機上限：${player.maxOfflineMinutes || 60} 分鐘。後續可透過道具擴充)</span>` : "";

                // ✨ 補上登入時的自動關閉秒數
                setTimeout(() => openModal("🌙 離線掛機結算", `妳離開了 ${formatHelperTime(offlineSec)}<br>系統自動為妳修練了 <b style="color:var(--quest);">${timeMsg}</b>${warningHtml}<br><br>斬殺約 ${fakeKills} 隻怪物。<br>獲得 <span style="color:var(--quest)">${expEarned} 經驗</span>, <span style="color:var(--gold)">${goldEarned} 金幣</span>。<br><br>🎁 搜刮物資：<br><span style="color:#aaa">${dropHtml}</span>`, "領取獎勵", null, false, 6), 1000);
            }
        }
    }

    // ✨ 新增：強制斷開掛機狀態 (F5 重新整理即視為中止)
    if (player.workStartTime) player.workStartTime = null;
    if (player.fishingState && player.fishingState.active) {
        player.fishingState.active = false;
        player.fishingState.startTime = 0;
        player.fishingState.caught = { m1: 0, m2: 0, m3: 0, exp: 0, dura: 0 };
    }
    if (player.woodState && player.woodState.active) {
        player.woodState.active = false;
        player.woodState.startTime = 0;
        player.woodState.caught = { m1: 0, m2: 0, m3: 0, exp: 0, dura: 0, stam: 0 };
    }
    saveGame(false);

    if (!player.hasSeenIntro) {
        isPaused = true;
        runIntro();
    } else {
        if (currentView === 'battle') startBattleLoop();
    }


}


let lastActiveTime = Date.now();
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        lastActiveTime = Date.now();
    } else {
        let elapsedSec = Math.floor((Date.now() - lastActiveTime) / 1000);
        let maxOfflineSec = (player.maxOfflineMinutes || 60) * 60; // ✨ 套用上限

        if (elapsedSec > 300 && currentView === 'battle' && !isPaused && !isReviving && player.hp > 0 && !player.workStartTime) {
            let actualElapsedSec = Math.min(elapsedSec, maxOfflineSec);
            let isCapped = elapsedSec > maxOfflineSec;

            let m = maps[player.mapIdx];
            if (m && m.mobs.length > 0 && player.mapIdx > 0) {
                let mobId = m.mobs[0];
                let fakeKills = Math.floor(actualElapsedSec / 8);
                if (fakeKills > 0 && MOB_DB[mobId]) {
                    let expEarned = fakeKills * (MOB_DB[mobId].exp || 0);
                    let goldEarned = fakeKills * (MOB_DB[mobId].gold || 0);
                    player.exp += expEarned; player.gold += goldEarned;

                    // ✨ 神遊掉落物結算
                    let loot = calcOfflineLoot(fakeKills, mobId);
                    let dropHtml = "";
                    let dropLog = [];
                    for (let itemId in loot) {
                        addItemToBag(itemId, loot[itemId]);
                        let item = typeof getItem === 'function' ? getItem(itemId) : { name: itemId };
                        dropHtml += `${item.name} x${loot[itemId]} `;
                        dropLog.push(`${item.name} x${loot[itemId]}`);
                    }
                    if (dropHtml === "") dropHtml = "無";
                    let dropLogStr = dropLog.length > 0 ? dropLog.join(", ") : "無";

                    if (player.mapIdx === 0) { player.kills += fakeKills; }
                    else { player.kills = Math.min(10, player.kills + fakeKills); }

                    checkLevelUp(); updateUI();

                    let timeMsg = formatHelperTime(actualElapsedSec);
                    let popMsg = `妳神遊了 ${formatHelperTime(elapsedSec)}<br>系統結算了 <b style="color:var(--quest);">${timeMsg}</b> 的收益。`;
                    if (isCapped) popMsg += `<br><span style="color:var(--danger); font-size:0.85em;">(已達掛機上限：${player.maxOfflineMinutes || 60} 分鐘)</span>`;
                    popMsg += `<br><br>獲得 <span style="color:var(--quest)">${expEarned} 經驗</span>, <span style="color:var(--gold)">${goldEarned} 金幣</span>。<br><br>🎁 搜刮物資：<br><span style="color:#aaa">${dropHtml}</span>`;

                    log(`🌙 【掛機結算】神遊了 ${formatHelperTime(elapsedSec)}，結算 ${timeMsg}。斬殺 ${fakeKills} 隻，獲得 ${expEarned} 經驗, ${goldEarned} 金幣。掉落：${dropLogStr}`, "var(--gold)");
                    // ✨ 呼叫不暫停且 3 秒自動關閉的彈窗 (參數 6 是 autoCloseSec，也就是 6 秒)
                    setTimeout(() => openModal("🌙 掛機結算", popMsg, "領取", null, false, 6), 500);
                }
            }
        }
        lastActiveTime = Date.now();
    }
});

function saveGame(manual) {
    if (statPreview.str > 0 || statPreview.vit > 0 || statPreview.agi > 0) { if (manual) log("⚠️ 請先確定或取消配點後再進行存檔。", "var(--danger)"); return; }
    player.gold = Number(player.gold) || 0; player.exp = Number(player.exp) || 0; player.lvl = Number(player.lvl) || 1; player.hp = Number(player.hp) || 100;
    player.lastSaveTime = Date.now(); localStorage.setItem(currentSlotKey, JSON.stringify(player));
    if (manual) log("✔ 靈魂記憶已封存於石碑之中。", "var(--quest)");
}

function saveGameWithFeedback() { saveGame(true); let btn = el('btn-save-game'); if (btn) { btn.innerText = "✔ 存檔成功"; btn.style.background = "var(--quest)"; setTimeout(() => { btn.innerText = "手存存檔"; btn.style.background = "var(--cherry)"; }, 1500); } }

function generateImportCode() {
    saveGame(false);
    let code = btoa(encodeURIComponent(JSON.stringify(player)));
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(code).then(() => {
            openModal("📤 靈魂引繼", `引繼碼已自動複製到剪貼簿！<br><textarea readonly style="width:90%;height:80px;background:#000;color:var(--gold);margin-top:10px;" onclick="this.select()">${code}</textarea>`, "了解");
        }).catch(() => { openModal("📤 靈魂引繼", `複製失敗，請手動複製：<br><textarea readonly style="width:90%;height:80px;background:#000;color:var(--gold);margin-top:10px;" onclick="this.select()">${code}</textarea>`, "了解"); });
    } else { openModal("📤 靈魂引繼", `請手動複製：<br><textarea readonly style="width:90%;height:80px;background:#000;color:var(--gold);margin-top:10px;" onclick="this.select()">${code}</textarea>`, "了解"); }
}

function promptImportCode() {
    let code = prompt("請貼上您的引繼碼："); if (!code) return;
    try {
        let d = JSON.parse(decodeURIComponent(atob(code)));
        if (d && d.name !== undefined) { openModal("📥 確認繼承", `覆蓋為 <b>${d.name}</b> (Lv.${d.lvl}) 嗎？`, "確認覆蓋", () => { localStorage.setItem(currentSlotKey, JSON.stringify(d)); location.reload(); }, true); }
    } catch (e) { alert("❌ 引繼碼解析失敗！"); }
}

function logoutGame() { saveGame(false); location.reload(); }

function checkSkillUnlocks() {
    let newlyUnlocked = false;
    let addSkill = (id) => { if (!player.unlockedSkills.includes(id)) { player.unlockedSkills.push(id); log(`✨ 突破界限！領悟新秘技：【${skillDB[id].name}】`, "var(--quest)"); newlyUnlocked = true; } };
    if (player.agi >= 5) addSkill('agi_combo1'); if (player.agi >= 15) addSkill('agi_combo2');
    if (player.vit >= 5) addSkill('vit_strike'); if (player.vit >= 15) addSkill('vit_thorns');
    if (player.str >= 15) addSkill('str_cleave');
    if (newlyUnlocked && !isPaused) { updateUI(); if (currentLogTab === 'skill') renderPath(); }
}

function isSkillValid(sid) {
    let sk = skillDB[sid]; if (!sk || !sk.req) return true;
    for (let s in sk.req) { if (player[s] < sk.req[s]) return false; }
    return true;
}

function validateEquippedSkills() {
    let changed = false;
    for (let i = 0; i < 6; i++) {
        let sid = player.equippedSkills[i];
        // ✨ 清理污染的值（null、空字符串、undefined、不存在的技能）
        if (!sid || !skillDB[sid]) {
            if (sid !== null) {
                console.warn(`清理污染數據：SLOT ${i + 1} 包含無效技能ID: ${sid}`);
                player.equippedSkills[i] = null;
                player.skillGambits[i] = 0;
                combatState.skillCds[i] = 0;
                combatState.slotSetupCds[i] = 0;
                changed = true;
            }
        } else if (!isSkillValid(sid)) {
            // 屬性不足時卸下技能
            player.equippedSkills[i] = null;
            player.skillGambits[i] = 0;
            combatState.skillCds[i] = 0;
            combatState.slotSetupCds[i] = 0;
            log(`⚠️ 體魄虛弱，秘技【${skillDB[sid].name}】已被自動卸除。`, "var(--danger)");
            changed = true;
        } else {
            // ✨ 額外驗證：SLOT 4~5 只能裝被動技能
            if ((i === 4 || i === 5) && skillDB[sid].type !== 'passive') {
                console.warn(`清理：SLOT ${i + 1} 包含主動技能，應為被動技能`);
                player.equippedSkills[i] = null;
                player.skillGambits[i] = 0;
                combatState.skillCds[i] = 0;
                combatState.slotSetupCds[i] = 0;
                changed = true;
            }
        }
    }
    if (changed) { if (currentLogTab === 'skill') renderPath(); saveGame(false); }
}

function equipSkill(sid) {
    let sk = skillDB[sid];

    // 1. ✨ 阻擋特性 (Trait) 進入格子
    if (sk.type === 'trait') {
        return openModal("常駐天賦", `【${sk.name}】是流派常駐特性，只要學會就會永遠生效，不需要裝備。`, "了解");
    }

    // 2. 驗證流派位階
    if (sk.cat === 'job' && sk.rank > player.sectRank) {
        return openModal("層次不足", `此秘傳武學需要達到【${SECT_DB[player.sect].ranks[sk.rank]}】位階方可領悟！`, "了解");
    }

    let targetIdx = -1;

    // 🎯 邏輯 A：如果是裝備「主動技能 (Active)」
    if (sk.type === 'active') {
        // 先找前 4 格有沒有空位
        for (let i = 0; i < 4; i++) { if (player.equippedSkills[i] === null) { targetIdx = i; break; } }

        // ✨【智慧擠退】：如果前 4 格滿了，檢查是否有「被動技能」佔用了前排，且 5-6 格有空位
        if (targetIdx === -1) {
            for (let i = 0; i < 4; i++) {
                let checkSid = player.equippedSkills[i];
                if (checkSid && skillDB[checkSid].type === 'passive') {
                    // 找到前排被動！檢查後排 (index 4-5) 有空位嗎？
                    let backIdx = -1;
                    for (let j = 4; j < 6; j++) { if (player.equippedSkills[j] === null) { backIdx = j; break; } }

                    if (backIdx !== -1) {
                        // 執行位移：被動退到後排，主動遞補前排
                        player.equippedSkills[backIdx] = player.equippedSkills[i];
                        // ✨ (修正) 繼承戰術設定
                        player.skillGambits[backIdx] = player.skillGambits[i];
                        player.skillGambitValues[backIdx] = player.skillGambitValues[i];
                        player.skillGambitOps[backIdx] = player.skillGambitOps[i];
                        combatState.slotSetupCds[backIdx] = combatState.slotSetupCds[i]; // 繼承冷卻
                        targetIdx = i;
                        log(`🔄 智慧位移：將被動武學【${skillDB[checkSid].name}】移往後排被動槽。`, "var(--accent)");
                        break;
                    }
                }
            }
        }

        if (targetIdx === -1) {
            return openModal("主動槽已滿", "主動技能最多只能裝備 4 個，且後兩格（5、6槽）嚴禁裝備主動招式！", "了解");
        }
    }
    // 🎯 邏輯 B：如果是裝備「被動技能 (Passive)」
    else if (sk.type === 'passive') {
        // 優先填滿後排 (4-5 槽)，其次才填前排
        for (let i = 4; i < 6; i++) { if (player.equippedSkills[i] === null) { targetIdx = i; break; } }
        if (targetIdx === -1) {
            for (let i = 0; i < 4; i++) { if (player.equippedSkills[i] === null) { targetIdx = i; break; } }
        }

        if (targetIdx === -1) {
            return openModal("槽位已滿", "所有 6 個技能槽皆已滿，請先卸下其他技能。", "了解");
        }
    }

    // 3. 執行裝備
    if (targetIdx !== -1) {
        player.equippedSkills[targetIdx] = sid;
        player.skillGambits[targetIdx] = 0;
        player.skillGambitValues[targetIdx] = 50;
        player.skillGambitOps[targetIdx] = '<';
        combatState.slotSetupCds[targetIdx] = 10.0;

        if (typeof renderPath === 'function') renderPath();
        updateUI();
        log(`📜 裝備了秘技：${sk.name}`, "var(--quest)");
        cleanupBackSlots(); // ✨ (新增) 增加一道保險，確保後排槽位規則被嚴格遵守
        saveGame(false);
    }
}

// ✨ 新增：指定槽位裝備技能 (用於處理特殊交換邏輯)
function equipSkillToSlot(sid, slotIdx) {
    let sk = skillDB[sid];
    if (!sk) return false;

    // 驗證：SLOT 4~5 只能裝被動技能
    if ((slotIdx === 4 || slotIdx === 5) && sk.type !== 'passive') {
        // ✨ 新需求：如果在 SLOT 4~5 點擊主動技能，檢查 SLOT 0~3 有沒有被動技能
        let passiveInFront = -1;
        for (let i = 0; i < 4; i++) {
            let frontSid = player.equippedSkills[i];
            if (frontSid && skillDB[frontSid].type === 'passive') {
                passiveInFront = i;
                break;
            }
        }

        if (passiveInFront !== -1) {
            // 找到被動技能了！進行交換
            let passiveSid = player.equippedSkills[passiveInFront];
            let passiveStats = {
                gambit: player.skillGambits[passiveInFront],
                gambitVal: player.skillGambitValues[passiveInFront],
                gambitOp: player.skillGambitOps[passiveInFront],
                cd: combatState.slotSetupCds[passiveInFront]
            };

            // 1. 主動技能裝到 SLOT 4~5
            player.equippedSkills[slotIdx] = sid;
            player.skillGambits[slotIdx] = 0;
            player.skillGambitValues[slotIdx] = 50;
            player.skillGambitOps[slotIdx] = '<';
            combatState.slotSetupCds[slotIdx] = 10.0;

            // 2. 被動技能換到原來的 SLOT (0~3)
            player.equippedSkills[passiveInFront] = passiveSid;
            player.skillGambits[passiveInFront] = passiveStats.gambit;
            player.skillGambitValues[passiveInFront] = passiveStats.gambitVal;
            player.skillGambitOps[passiveInFront] = passiveStats.gambitOp;
            combatState.slotSetupCds[passiveInFront] = passiveStats.cd;

            log(`🔄 自動交換：【${sk.name}】(主動) → SLOT ${slotIdx + 1}、【${skillDB[passiveSid].name}】(被動) → SLOT ${passiveInFront + 1}`, "var(--accent)");

            if (typeof renderPath === 'function') renderPath();
            updateUI();
            saveGame(false);
            return true;
        } else {
            // SLOT 4~5 只能裝被動技能
            return openModal("禁止操作", `第 ${slotIdx + 1} 槽位只能裝備 <b>【被動技能】</b>。<br><span style="color:#aaa; font-size:0.9em;">前排 (1~4 槽) 暫無被動技能可交換。</span>`, "了解");
        }
    }

    // 正常裝備流程
    player.equippedSkills[slotIdx] = sid;
    player.skillGambits[slotIdx] = 0;
    player.skillGambitValues[slotIdx] = 50;
    player.skillGambitOps[slotIdx] = '<';
    combatState.slotSetupCds[slotIdx] = 10.0;

    if (typeof renderPath === 'function') renderPath();
    updateUI();
    log(`📜 裝備了秘技：${skillDB[sid].name}`, "var(--quest)");
    saveGame(false);
    return true;
}

function unequipSkill(idx) {
    if (combatState.slotSetupCds[idx] > 0) return openModal("調息中", `此技能尚需 ${Math.ceil(combatState.slotSetupCds[idx])} 秒方可卸除！`, "了解");
    player.equippedSkills[idx] = null; player.skillGambits[idx] = 0; combatState.skillCds[idx] = 0; combatState.slotSetupCds[idx] = 0;
    renderPath(); updateUI(); log("📜 已卸下秘技。", "#aaa");
    cleanupBackSlots(); // ✨ 確保後排只有被動技能
    saveGame(false);
}

function updateGambit(slotIdx, val) { player.skillGambits[slotIdx] = parseInt(val); updateUI(); renderPath(); saveGame(false); }
function updateGambitVal(idx, val) { let n = parseInt(val); if (isNaN(n)) n = 0; player.skillGambitValues[idx] = Math.max(0, Math.min(100, n)); saveGame(false); }
function toggleGambitOp(idx) { player.skillGambitOps[idx] = (player.skillGambitOps[idx] === '<') ? '>' : '<'; renderPath(); saveGame(false); }
function hasPassive(sid) {
    let sk = skillDB[sid];
    // ✨ 修正：特性技能（trait）只需在 unlockedSkills 中，不需裝備
    if (sk && sk.type === 'trait') {
        return player.unlockedSkills && player.unlockedSkills.includes(sid) && isSkillValid(sid);
    }
    // 普通被動技能需要裝備
    return player.equippedSkills.includes(sid) && isSkillValid(sid);
}

// ✨ 新增：聰慧裝備函數 (自動判斷是否需要交換被動技能)
function smartEquipSkill(sid) {
    let sk = skillDB[sid];
    if (!sk) return;

    // ✨ 被動技能：直接優先裝到後排 (SLOT 4-5)
    if (sk.type === 'passive') {
        equipSkill(sid);
        return;
    }

    // 主動技能：檢查前4格
    let isFrontFull = true;
    for (let i = 0; i < 4; i++) {
        if (player.equippedSkills[i] === null) {
            isFrontFull = false;
            break;
        }
    }

    // 前4格都滿，檢查有沒有被動技能可以交換
    if (isFrontFull) {
        let passiveIdx = -1;
        for (let i = 0; i < 4; i++) {
            if (player.equippedSkills[i] && skillDB[player.equippedSkills[i]].type === 'passive') {
                passiveIdx = i;
                break;
            }
        }

        // 如果有被動技能，查詢是否有空後排槽位可以移放
        if (passiveIdx !== -1) {
            let hasBackSlot = false;
            for (let i = 4; i < 6; i++) {
                if (player.equippedSkills[i] === null) {
                    hasBackSlot = true;
                    break;
                }
            }

            // 有空後排，自動執行交換邏輯
            if (hasBackSlot) {
                equipSkill(sid);
                return;
            }
        }
    }

    // 普通主動技能裝備
    equipSkill(sid);
}

// ✨ 新增：強制整理 SLOT 4-5，確保只能裝被動技能
function cleanupBackSlots() {
    let changed = false;
    for (let i = 4; i < 6; i++) {
        let sid = player.equippedSkills[i];
        if (sid && skillDB[sid] && skillDB[sid].type !== 'passive') {
            // 發現主動技能在後排，移除它
            console.warn(`發現主動技能在 SLOT ${i + 1}，正在清理...`);
            player.equippedSkills[i] = null;
            player.skillGambits[i] = 0;
            combatState.skillCds[i] = 0;
            combatState.slotSetupCds[i] = 0;
            log(`⚠️ SLOT ${i + 1} 不能裝備主動技能，已清除。`, "var(--danger)");
            changed = true;
        }
    }
    if (changed) {
        saveGame(false);
    }
    return changed;
}

function handleSlotClick(idx) {
    if (currentView === 'battle' && player.equippedSkills[idx]) {
        let sid = player.equippedSkills[idx];
        let sk = skillDB[sid];
        if (sk && sk.type === 'active') {
            if (combatState.skillCds[idx] > 0) return typeof showToast === 'function' ? showToast(`${sk.name} 還在冷卻中！`, "var(--danger)") : null;
            if (executeSkill(idx)) {
                combatState.skillCds[idx] = sk.cd;
                updateUI();
                return;
            }
        }
    }
    switchLogTab('skill');
    el('skill-area').scrollIntoView({ behavior: 'smooth', block: 'center' });
    log(`[戰術配置] 已聚焦至第 ${idx + 1} 槽位。`, "var(--accent)");
}

function checkGambit(idx) {
    let g = player.skillGambits[idx]; let val = player.skillGambitValues[idx]; let op = player.skillGambitOps[idx];
    if (g === 99) return false; // ✨ 99 為手動施放，絕對不自動觸發
    if (g === 0) return true; if (g === 3) return monster.isBoss === true;
    if (g === 4) { let curPct = (player.hp / getMaxHP()) * 100; return op === '<' ? curPct < val : curPct > val; }
    if (g === 5) { if (monster.mhp <= 0) return false; let curPct = (monster.hp / monster.mhp) * 100; return op === '<' ? curPct < val : curPct > val; }
    return false;
}

function initPotionSelect() {
    const sel = el('potion-select'); if (!sel) return; sel.innerHTML = "";
    Object.values(ITEM_DB).filter(i => i.cat === 'rec').forEach(item => { let label = item.tag ? `(${item.tag})` : ""; sel.innerHTML += `<option value="${item.id}">${item.name} ${label}</option>`; });
    sel.value = player.selectedPotion; if (el('auto-heal-input')) el('auto-heal-input').value = Math.floor(player.autoHeal * 100) || 1; if (el('auto-heal-check')) el('auto-heal-check').checked = player.autoHealEnabled;
}
function updateAutoHeal(val) { let num = parseInt(val); if (isNaN(num)) num = 1; if (num < 1) num = 1; if (num > 100) num = 100; if (el('auto-heal-input')) el('auto-heal-input').value = num; player.autoHeal = num / 100; }

function usePotion(isManual = false) {
    if (player.hp <= 0 || isReviving) {
        if (isManual) log("💀 靈魂重塑中，無法飲用藥水！", "var(--danger)");
        return false;
    }
    if (combatState.potionCd > 0) { if (isManual) log(`🍵 藥效吸收中... (${Math.ceil(combatState.potionCd)}s)`, "var(--danger)"); return false; }
    let pid = player.selectedPotion; let pItem = getItem(pid);
    if (player.potions[pid] > 0) {
        if (player.hp >= getMaxHP() && isManual) return log("生命值已滿！");

        if (pItem.regen) {
            player.potions[pid]--;
            combatState.potionCd = 5.0;
            if (!player.buffs) player.buffs = {};
            player.buffs['f_regen'] = pItem.duration;
            player.buffs['f_regen_val'] = pItem.regen;
            showDmg('p-box', `持續恢復`, '#e67e22');
            if (currentView === 'battle' && !isPaused) {
                writeCombatLog(`🍲 <span style="color:#4a90e2">${player.name || "妳"}</span> 吃下了 <b style="color:#e67e22">${pItem.name}</b>，體力開始持續恢復！`, 'player');
            }
        } else {
            player.potions[pid]--; let heal = pItem.value > 0 ? pItem.value : Math.floor(getMaxHP() * pItem.rate); player.hp = Math.min(getMaxHP(), player.hp + heal);
            combatState.potionCd = 5.0; showDmg('p-box', `+${heal}`, 'lime');
            if (currentView === 'battle' && !isPaused) {
                writeCombatLog(`🍵 <span style="color:#4a90e2">${player.name || "妳"}</span> 飲用了 <b style="color:lime">${pItem.name}</b>，恢復了 <b style="color:white">${heal}</b> 點體力！`, 'player');
            }
        }
        if (player.potions[pid] === 0) { log(`【系統】${pItem.name} 耗盡！`, "var(--danger)"); if (isManual) autoHealLogic(true); }
        updateUI(); return true;
    } else { if (isManual) openModal("補給耗盡", "補給品不足！請前往商店購買。", "知道了"); return false; }
}

function autoHealLogic(onlySearch = false) {
    if (player.potions[player.selectedPotion] > 0 && !onlySearch) usePotion(false);
    else {
        let order = ['p1', 'p2', 'p5', 'p3', 'p6', 'p4']; let found = false;
        for (let key of order) { if (player.potions[key] > 0) { player.selectedPotion = key; initPotionSelect(); if (!onlySearch) { log(`【系統】自動切換為 ${getItem(key).name}。`, "var(--accent)"); usePotion(false); } found = true; break; } }
        if (!found && !onlySearch) log(`【警告】所有補給均已耗盡！`, "var(--danger)");
    }
}

function hireHelper(id) {
    let hdb = HELPER_DB[id];
    if (!hdb) return;
    if (player.gold < hdb.cost) {
        if (typeof showToast === 'function') showToast("❌ 金幣不足！", "var(--danger)");
        return;
    }
    player.gold -= hdb.cost;

    if (!player.helperTimes) player.helperTimes = {};
    player.helperTimes[id] = (player.helperTimes[id] || 0) + (hdb.duration * 60);

    log(`🤝 成功購買合約！【${hdb.name}】可用時數增加 ${hdb.duration} 分鐘。`, "var(--quest)");
    if (typeof showToast === 'function') showToast(`獲得 ${hdb.duration} 分鐘合約`, "var(--quest)");

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
        // ✨ 檢查是否正在遠征中
        if (player.expeditions && player.expeditions.find(e => e.helperId === id)) {
            return typeof showToast === 'function' ? showToast("該夥伴正在遠征中，無法上陣！", "var(--danger)") : null;
        }
        player.activeHelper = id;
        combatState.helperSkillCd = HELPER_DB[id].skillCd;
        log(`✨ 【${HELPER_DB[id].name}】已加入戰鬥！`, "var(--quest)");
    }
    updateUI();
    if (typeof renderHelper === 'function' && currentLogTab === 'helper') renderHelper();
    if (typeof renderIzakayaMenu === 'function' && currentView === 'village') renderIzakayaMenu();
}

function getAtkVal() {
    let base = Math.floor(player.str * 2) + ((player.gear.arms || 0) * 3);
    if (player.activeHelper && HELPER_DB[player.activeHelper]) { base += HELPER_DB[player.activeHelper].passive(player).atk || 0; }
    if (hasPassive('sect_samurai_p1')) base = Math.floor(base * 1.1); // ✨ 武士：劍氣護體 (+10%物攻)
    if (player.buffs && player.buffs['atk_boost'] > 0) base *= EFFECT_MAP['atk_boost'].multiplier;
    if (player.buffs && player.buffs['samurai_frenzy'] > 0) base = Math.floor(base * EFFECT_MAP['samurai_frenzy'].multiplier); // ✨ 鬼人狂暴
    return Math.floor(base);
}
function getDefVal() {
    let base = player.vit * 1 + ((player.gear.body || 0) * 1.5);
    if (player.activeHelper && HELPER_DB[player.activeHelper]) { base += HELPER_DB[player.activeHelper].passive(player).def || 0; }
    if (player.buffs && player.buffs['def_boost'] > 0) base = Math.floor(base * EFFECT_MAP['def_boost'].multiplier);
    return base;
}
function getMatkVal() {
    return Math.floor(player.vit * 0.5) + ((player.gear.arms || 0) * 3);
}
function getSpdVal() {
    return Math.floor(player.agi * 1);
}
// ✨ 忍者特性更新：如果流派是忍者，天生 +10% 閃避
function getEvaPercent() {
    // 1. 屬性點閃避 (AGI)：最高鎖定在 55%
    let agiDodge = Math.min(55, player.agi * 0.1);

    // 2. 裝備閃避 (足具)：最高鎖定在 15%
    let gearDodge = Math.min(15, (player.gear.legs || 0) * 1.0);

    // 3. 流派特性加成
    let sectDodge = (player.sect === 'ninja') ? 10 : 0; // 忍者額外 10%

    let base = agiDodge + gearDodge + sectDodge;

    // 夥伴加成
    try {
        if (player.activeHelper && HELPER_DB[player.activeHelper]) {
            base += HELPER_DB[player.activeHelper].passive(player).eva || 0;
        }
    } catch (e) { }

    if (player.buffs && player.buffs['eva_boost'] > 0) base += EFFECT_MAP['eva_boost'].additive;

    // 最終天花板鎖定在 80% (確保滿裝滿敏的忍者不浪費屬性)
    return Math.min(80, base);
}
function getMaxHP() {
    let base = Math.floor(player.vit * 20 + 100);
    if (hasPassive('sect_shinto_p1')) base = Math.floor(base * 1.15); // ✨ 神道：神明庇佑 (+15%HP)
    if (player.buffs && player.buffs['hp_boost'] > 0) base = Math.floor(base * EFFECT_MAP['hp_boost'].multiplier);
    return base;
}

function executeSkill(slotIdx) {
    let sid = player.equippedSkills[slotIdx];
    if (!sid || !skillDB[sid] || skillDB[sid].type !== 'active' || combatState.skillCds[slotIdx] > 0 || player.hp <= 0) return false;
    if (!isSkillValid(sid)) return false;
    if (player.mapIdx !== 0 && monster.hp <= 0) return false;

    let sk = skillDB[sid]; combatState.skillCds[slotIdx] = sk.cd;
    let isDummy = player.mapIdx === 0; let finalDmg = 0;
    let pName = player.name || "妳";
    let skillStartHp = combatState.testMode ? monster.hp : 0; // ✨ 記錄技能前的怪物血量

    // ----------------------------------------------------
    // 🥷 【夜叉隱秘眾】技能邏輯
    // ----------------------------------------------------
    if (sid === 'sect_ninja_a1') { // 忍具・苦無微塵
        // ✨ 新機制：重製苦無微塵
        let pName = player.name || "妳";
        if (monster.poisoned > 0) {
            // 狀態 1: 已中毒 -> 引爆
            let poisonDmgPerTick = Math.floor(getSpdVal() * (hasPassive('sect_ninja_p2') ? 1.0 : 1.5));
            let remainingTicks = Math.ceil(monster.poisoned / (hasPassive('sect_ninja_p2') ? 0.6 : 1.0));
            finalDmg = poisonDmgPerTick * remainingTicks;
            monster.poisoned = 0; // 移除中毒
            writeCombatLog(`💥 ${pName} 的苦無引爆了猛毒，對 ${monster.name} 造成 <b style="color:white">${finalDmg}</b> 點巨大傷害！`, 'player');
        } else {
            // 狀態 2: 未中毒 -> 上毒
            finalDmg = Math.floor(getSpdVal() * 1.0); // 造成少量初始傷害
            monster.poisoned = 8.0; // 強制上毒，持續8秒
            monster.poisonTick = 1.0;
            writeCombatLog(`🐍 ${pName} 的苦無淬上了劇毒，使 ${monster.name} 陷入 <b style="color:#2ecc71">中毒</b> 狀態！`, 'player');
        }
        if (!isDummy) monster.hp -= finalDmg;
        showDmg('m-box', finalDmg, sk.color);
        showDmg('p-box', "【苦無微塵】", sk.color);
    }
    else if (sid === 'sect_ninja_a2') { // 忍法・影分身 (瞬間連砍三次)
        let hitDmg = Math.floor(getSpdVal() * 1.5 + getAtkVal() * 0.8);
        finalDmg = hitDmg * 3;
        if (!isDummy) {
            monster.hp -= finalDmg;
            monster.poisoned = 8.0; // ✨ 必定上毒
            monster.poisonTick = 1.0;
        }
        setTimeout(() => showDmg('m-box', hitDmg, '#fff'), 0);
        setTimeout(() => showDmg('m-box', hitDmg, '#ccc'), 150);
        setTimeout(() => showDmg('m-box', hitDmg, '#888'), 300);
        showDmg('p-box', "【影分身】", sk.color);
        writeCombatLog(`👥 ${pName} 施放 <b style="color:${sk.color}">【影分身】</b>，發動疾風連斬造成 <b style="color:white">${finalDmg}</b> 點傷害，並使目標陷入<b style="color:#2ecc71">劇毒</b>！`, 'player');
    }
    else if (sid === 'sect_ninja_ult') { // 秘傳・黃泉送葬
        applyBuff('yomi_shrine', 5.0); // 賦予 5 秒黃泉狀態 (需在戰鬥迴圈配合，這裡先上 Buff)
        showDmg('p-box', "【黃泉送葬】", sk.color);
        writeCombatLog(`💀 ${pName} 展開了 <b style="color:${sk.color}">【黃泉領域】</b>，準備反殺！`, 'player');
    }

    // ----------------------------------------------------
    // 🗡️ 【無明一刀流】技能邏輯
    // ----------------------------------------------------
    else if (sid === 'sect_samurai_a1') { // 秘劍・居合
        finalDmg = Math.floor(getAtkVal() * 3.0);
        if (!isDummy && monster.hp < monster.mhp * 0.3) finalDmg *= 2; // 斬殺效果
        if (!isDummy) monster.hp -= finalDmg;
        showDmg('m-box', finalDmg, sk.color); showDmg('p-box', "【居合】", sk.color);
        writeCombatLog(`⚔️ ${pName} 拔刀施放 <b style="color:${sk.color}">【居合】</b>，造成 <b style="color:white">${finalDmg}</b> 點致命斬擊！`, 'player');
    }
    else if (sid === 'sect_samurai_a2') { // 燕返
        applyBuff('samurai_parry', 5.0); // 招架狀態維持 5 秒
        showDmg('p-box', "【燕返架勢】", sk.color);
        writeCombatLog(`🛡️ ${pName} 擺出 <b style="color:${sk.color}">【燕返】</b> 架勢，準備反擊！`, 'player');
        // 燕返本身不造成直接傷害
    }
    else if (sid === 'sect_samurai_ult') { // 奧義・修羅一閃
        let hpCost = Math.floor(player.hp * 0.1);
        player.hp -= hpCost; // 扣血
        finalDmg = Math.floor(getAtkVal() * 4.0 + player.vit * 1.5); // ✨ 套用乾淨的新公式：物攻x4 + 體質x1.5
        if (!isDummy) monster.hp -= finalDmg;
        showDmg('p-box', `-${hpCost}`, 'var(--danger)');
        showDmg('m-box', finalDmg, sk.color); showDmg('p-box', "【修羅一閃】", sk.color);
        writeCombatLog(`🩸 ${pName} 燃燒生命施放 <b style="color:${sk.color}">【修羅一閃】</b>，造成 <b style="color:white">${finalDmg}</b> 點毀滅傷害！`, 'player');
    }

    // ----------------------------------------------------
    // ⛩️ 【高天原神道】技能邏輯
    // ----------------------------------------------------
    else if (sid === 'sect_shinto_a1') { // 破魔矢
        finalDmg = Math.floor(player.vit * 1.8 + getMatkVal() * 1.0);
        if (!isDummy) {
            monster.hp -= finalDmg;
            monster.atk = Math.floor(monster.atk * 0.9); // ✨ 降敵方 10% 攻擊力
        }
        showDmg('m-box', finalDmg, sk.color); showDmg('p-box', "【破魔矢】", sk.color);
        writeCombatLog(`🏹 ${pName} 射出 <b style="color:${sk.color}">【破魔矢】</b>，造成 <b style="color:white">${finalDmg}</b> 點神聖傷害！`, 'player');
    }
    else if (sid === 'sect_shinto_a2') { // 天狐結界
        applyBuff('shinto_shield', 5.0); // 賦予 5 秒結界狀態
        showDmg('p-box', "【天狐結界】", sk.color);
        writeCombatLog(`🦊 ${pName} 展開了 <b style="color:${sk.color}">【天狐結界】</b>，準備將苦難轉化為治癒！`, 'player');
    }
    else if (sid === 'sect_shinto_ult') { // 神威・天照
        let healAmt = Math.floor(getMaxHP() * 0.4);
        player.hp = Math.min(getMaxHP(), player.hp + healAmt); // 補血 40%
        finalDmg = Math.floor(player.vit * 2.5);
        if (!isDummy) monster.hp -= finalDmg;
        showDmg('p-box', `+${healAmt}`, 'var(--quest)');
        showDmg('m-box', finalDmg, sk.color); showDmg('p-box', "【神威・天照】", sk.color);
        writeCombatLog(`☀️ ${pName} 呼喚 <b style="color:${sk.color}">【天照之光】</b>，恢復自身體力並對敵人造成 <b style="color:white">${finalDmg}</b> 點灼燒傷害！`, 'player');
    }

    // (保留原本的通用技能)
    else if (sid === 'vit_strike') {
        let d = getMatkVal() * 8.0;
        if (isDummy) { finalDmg = d; } else { finalDmg = Math.max(1, (d - (monster.defVal || 0) / 2)) * (1 - (monster.dr || 0)); }
        finalDmg = Math.floor(finalDmg); if (isDummy) combatState.zenDmgAccum += finalDmg; else monster.hp -= finalDmg;
        combatState.mobAtkTimer += 1.5;
        showDmg('m-box', finalDmg, sk.color); showDmg('m-box', "[暈眩]", '#e1b12c'); showDmg('p-box', "【靈氣爆發】", sk.color);
        writeCombatLog(`🌀 ${pName} 施放了 <b style="color:${sk.color}">【靈氣爆發】</b>，造成 <b style="color:white">${finalDmg}</b> 點傷害並附帶暈眩！`, 'player');
    }
    else if (sid === 'str_cleave') {
        let d = Math.floor(getAtkVal() * 2.5);
        finalDmg = d;
        if (isDummy) combatState.zenDmgAccum += finalDmg; else monster.hp -= finalDmg;
        showDmg('m-box', finalDmg, sk.color); showDmg('p-box', "【蓄力】", sk.color);
        writeCombatLog(`💥 ${pName} 施放了 <b style="color:${sk.color}">【蓄力】</b>，造成 <b style="color:white">${finalDmg}</b> 點傷害！`, 'player');
    }

    // ✨ 測試模式傷害記錄
    if (combatState.testMode && finalDmg > 0) {
        combatState.skillDmgLog.push({
            skillId: sid,
            skillName: sk.name,
            damage: finalDmg,
            timestamp: Date.now() - combatState.testStartTime
        });
        combatState.totalDmgDealt += finalDmg;
        combatState.lastDmg = finalDmg; // ✨ 記錄當前傷害
    }

    return true;
}

let lastTickTime = Date.now();
function startBattleLoop() {
    if (battleTimer) { clearTimeout(battleTimer); battleTimer = null; }
    if (isPaused || currentView !== 'battle' || isReviving) { lastTickTime = Date.now(); return; }

    let delay = 100; // ✨ 將底層迴圈固定為 100ms (10 FPS)，用於平滑渲染跑條
    let now = Date.now(); let tickSec = (now - lastTickTime) / 1000; lastTickTime = now;
    if (tickSec > 10) tickSec = 10;

    if (combatState.potionCd > 0) combatState.potionCd = Math.max(0, combatState.potionCd - tickSec);

    // ✨ 神明庇佑被動恢復：每 5 秒回復 5% 最大 HP
    if (hasPassive('sect_shinto_p1') && player.hp < getMaxHP()) {
        combatState.shintoHealTimer += tickSec;
        if (combatState.shintoHealTimer >= 5.0) {
            let healAmount = Math.floor(getMaxHP() * 0.05);
            player.hp = Math.min(getMaxHP(), player.hp + healAmount);
            showDmg('p-box', `+${healAmount}`, 'var(--quest)');
            writeCombatLog(`✨ <b style="color:var(--quest)">【神明庇佑】</b> 發揮作用，恢復了 <b style="color:white">${healAmount}</b> 點生命值。`, 'player');
            combatState.shintoHealTimer = 0;
        }
    } else {
        combatState.shintoHealTimer = 0; // 沒有特性時重置計時器
    }

    if (player.buffs) {
        for (let key in player.buffs) {
            if (key === 'f_regen' && player.buffs[key] > 0) {
                let prevTick = Math.ceil(player.buffs[key]);
                player.buffs[key] = Math.max(0, player.buffs[key] - tickSec);
                let currTick = Math.ceil(player.buffs[key]);
                if (prevTick > currTick && currTick >= 0) {
                    let heal = player.buffs['f_regen_val'] || 0;
                    player.hp = Math.min(getMaxHP(), player.hp + heal);
                    showDmg('p-box', `+${heal}`, '#2ecc71');
                    writeCombatLog(`🍲 <b style="color:#2ecc71">【料理恢復】</b> 恢復了 <b style="color:white">${heal}</b> 點生命值。`, 'player');
                }
            } else {
                if (player.buffs[key] > 0) player.buffs[key] = Math.max(0, player.buffs[key] - tickSec);
            }
        }
    }

    let setupCdJustFinished = false;
    for (let i = 0; i < 6; i++) {
        if (combatState.skillCds[i] > 0) combatState.skillCds[i] = Math.max(0, combatState.skillCds[i] - tickSec);
        if (combatState.slotSetupCds[i] > 0) {
            combatState.slotSetupCds[i] = Math.max(0, combatState.slotSetupCds[i] - tickSec);
            if (combatState.slotSetupCds[i] === 0) setupCdJustFinished = true;
        }
    }

    // ✨ Bug 修復：當技能裝備的冷卻(調息)結束時，如果玩家剛好在技能分頁，主動重繪該分頁來更新按鈕狀態
    if (setupCdJustFinished && currentLogTab === 'skill' && typeof renderPath === 'function') {
        renderPath();
    }
    if (player.autoHealEnabled && player.hp < (getMaxHP() * player.autoHeal) && combatState.potionCd <= 0) autoHealLogic(false);

    if (player.activeHelper && player.helperTimes && player.helperTimes[player.activeHelper] > 0) {
        player.helperTimes[player.activeHelper] = Math.max(0, player.helperTimes[player.activeHelper] - tickSec);
        if (player.helperTimes[player.activeHelper] <= 0) {
            log(`⛩️ 【${HELPER_DB[player.activeHelper].name}】的合約已到期，已離開隊伍。`, "var(--cherry)");
            player.activeHelper = null;
            updateUI();
            if (currentLogTab === 'helper' && typeof renderHelper === 'function') renderHelper();
        }
    }

    let isDummy = player.mapIdx === 0;
    // ✨ 測試模式下禁用冥想讀條和獎勵
    if (isDummy && !combatState.testMode) { combatState.zenTimer += tickSec; if (combatState.zenTimer >= 20) { handleZenComplete(); combatState.zenTimer = 0; combatState.zenDmgAccum = 0; } }
    else if (isDummy && combatState.testMode) { combatState.zenDmgAccum = 0; combatState.zenTimer = 0; } // 測試模式清空冥想相關數據

    // --- ✨ 測試模式木人的血量恢復與傷害記錄 ---
    if (combatState.testMode && monster.hp < monster.mhp) {
        monster.hp = monster.mhp; // 恢復至滿血
    }

    // --- ✨ 猛毒跳字與頻率優化（道場測試模式也生效）---
    if (monster.poisoned > 0 && (isDummy || monster.hp > 0)) {
        monster.poisoned -= tickSec;
        monster.poisonTick = (monster.poisonTick || 0) + tickSec;

        // 若有裝備紫藤，頻率加快到 0.6秒，否則 1.0秒
        let isWisteria = hasPassive('sect_ninja_p2');
        let poisonInterval = isWisteria ? 0.6 : 1.0;

        if (monster.poisonTick >= poisonInterval) {
            monster.poisonTick -= poisonInterval;

            // 毒傷公式：配合加快的頻率稍微下修基數，確保 DPS 穩定
            let poisonBase = isWisteria ? 1.0 : 1.5;
            let poisonDmg = Math.max(1, Math.floor(getSpdVal() * poisonBase));

            if (!isDummy) {
                monster.hp -= poisonDmg; // 真實戰鬥才扣血
            } else if (combatState.testMode) {
                // 道場測試：毒傷計入 DPS 統計
                combatState.totalDmgDealt += poisonDmg;
                combatState.lastDmg = poisonDmg;
            }

            let poisonLogName = isWisteria ? "紫藤劇毒" : "猛毒";
            showDmg('m-box', `${poisonLogName} ${poisonDmg}`, '#2ecc71');
            writeCombatLog(`🐍 <b style="color:#2ecc71">[${poisonLogName}]</b> 持續對 <span style="color:#e74c3c">${monster.name}</span> 造成 <b style="color:#2ecc71">${poisonDmg}</b> 點真實傷害。`, 'player');
        }
    }

    // ✨ 玩家攻擊計時器邏輯
    let pMaxDelay = Math.max(0.25, 1.5 / (1 + player.agi * 0.008));
    if (combatState.playerAtkTimer === undefined) combatState.playerAtkTimer = pMaxDelay;
    combatState.playerAtkTimer -= tickSec;

    if (combatState.playerAtkTimer <= 0) {
        combatState.playerAtkTimer = pMaxDelay; // 重置攻擊計時

        let baseAtk = getAtkVal(); let skillUsed = false;
        if (!isDummy ? monster.hp > 0 : true) {
            for (let i = 0; i < 6; i++) { let sid = player.equippedSkills[i]; if (sid && skillDB[sid].type === 'active' && combatState.skillCds[i] <= 0) { if (checkGambit(i)) { if (executeSkill(i)) { skillUsed = true; break; } } } }
        }

        if (!skillUsed && baseAtk > 0) {
            // 1. ✨ 力量命中補正 (STR Hit Bonus)
            // 戰士靠氣勢與重武器壓制對方閃避，每 10 點 STR 抵銷 1% 閃避
            let strHitBonus = player.str * 0.1;
            let rawDodge = (monster.eva || 0) + ((monster.agi || 0) - player.agi) * 0.1;

            // 最終閃避判定：至少保留 5% 的隨機性，最高不超過 70%
            let finalDodge = Math.max(5, Math.min(70, rawDodge - strHitBonus));

            let critChance = Math.min(30, player.critRate || 0);
            if (hasPassive('sect_samurai_p2')) critChance += 15; // ✨ 武士被動：鬼人化 (+15%爆擊率)
            let isCrit = (Math.random() * 100) < critChance;

            // 判定是否命中
            if (isCrit || (Math.random() * 100 >= finalDodge)) {
                let mDef = monster.defVal || 0;

                // ✨ 新增：紫藤被動的破甲效果
                if (monster.poisoned > 0 && hasPassive('sect_ninja_p2')) {
                    mDef *= 0.7; // 降低 30% 防禦
                }

                if (isCrit && hasPassive('sect_samurai_p2')) {
                    mDef *= 0.8; // ✨ 武士被動：鬼人化 (爆擊無視20%護甲)
                    applyBuff('samurai_frenzy', 3.0); // ✨ 賦予 3 秒狂暴 (+10%物攻)
                }

                // 2. ✨ 普攻傷害 (不帶自動破甲，回歸標準公式)
                let finalDmg = Math.max(0, baseAtk - (mDef / 2));
                finalDmg = Math.floor(finalDmg * (1 - (monster.dr || 0)));

                // 力量流戰士的保底傷害：即便沒破甲，重兵器砸下去還是有保底感
                let minDmg = Math.floor(player.str * 0.5);
                if (finalDmg < minDmg) finalDmg = minDmg;

                if (isCrit) finalDmg = Math.floor(finalDmg * 1.5);
                let triggeredPoison = false;
                let triggeredWind = false;
                let windDmg = 0; // ✨ 獨立宣告風刃傷害

                // ✨ 猛毒刃觸發判定
                let poisonSourceName = "";
                // ✨ 新機制：精確分辨是誰上的毒
                if (player.sect === 'ninja' && Math.random() < 0.20) {
                    monster.poisoned = 8.0; monster.poisonTick = 1.0;
                    triggeredPoison = true;
                    poisonSourceName = "【忍法・幻影】";
                } else if (hasPassive('agi_combo1') && Math.random() < 0.15) {
                    monster.poisoned = 8.0; monster.poisonTick = 1.0;
                    triggeredPoison = true;
                    poisonSourceName = "【猛毒刃】";
                }

                // ✨ 優化 3：風刃 (加入專屬的視覺跳字)
                if (hasPassive('agi_combo2') && Math.random() < 0.20) {
                    windDmg = Math.floor(baseAtk * 0.5 + getSpdVal() * 1.0);
                    finalDmg += windDmg;
                    triggeredWind = true;
                }

                // ✨ 新增：毒刃・暴發 (Ninja Synergy 聯動被動)
                if (monster.poisoned > 0 && hasPassive('sect_ninja_poison_synergy') && Math.random() < 0.25) {
                    // 將剩餘毒傷秒數視為「毒層數」來計算真實傷害
                    let remainingTicks = Math.ceil(monster.poisoned / (hasPassive('sect_ninja_p2') ? 0.6 : 1.0));
                    let detonateDmg = Math.floor(remainingTicks * getSpdVal() * 0.8);
                    if (detonateDmg > 0) {
                        finalDmg += detonateDmg; // 追加真實傷害 (直接加進結算)
                        monster.poisoned = 0;    // 引爆後清空狀態
                        showDmg('m-box', "毒爆 " + detonateDmg, '#2ecc71');
                        writeCombatLog(`💥 <span style="color:#4a90e2">${player.name || "妳"}</span> 觸發 <b style="color:#2ecc71">【毒刃・暴發】</b>，瞬間引爆目標體內毒素，追加 ${detonateDmg} 點真實傷害！`, 'player');
                    }
                }

                if (finalDmg <= 0) { finalDmg = 0; if (Math.random() < 0.05) log(`[警告] 攻擊無法穿透敵方護甲，傷害為 0！`, "#888"); }

                if (isDummy) {
                    combatState.zenDmgAccum += finalDmg;
                    showDmg('m-box', finalDmg === 0 ? '0' : finalDmg, finalDmg === 0 ? '#666' : (isCrit ? '#ffeb3b' : 'white'));
                    // ✨ 測試模式下記錄普通攻擊傷害並輸出日誌
                    if (combatState.testMode && finalDmg > 0) {
                        combatState.totalDmgDealt += finalDmg;
                        combatState.lastDmg = finalDmg;
                    }
                    // ✨ 道場模式：輸出攻擊日誌到戰況分頁
                    let pName = player.name || "妳";
                    let dmgTxt = isCrit ? `<b style="color:#ffeb3b">爆擊！${finalDmg}</b>` : `<b style="color:white">${finalDmg}</b>`;
                    writeCombatLog(`🗡️ <span style="color:#4a90e2">${pName}</span> 發動 <b style="color:#aaa">普攻</b>，對 <span style="color:#e74c3c">${monster.name}</span> 造成 ${dmgTxt} 點傷害。`, 'player');
                    if (triggeredWind) {
                        setTimeout(() => writeCombatLog(`🌪️ <span style="color:#4a90e2">${pName}</span> 觸發 <b style="color:#81ecec">風刃</b>，追加 ${windDmg} 點撕裂傷害！`, 'player'), 150);
                    }
                    if (triggeredPoison) {
                        let d2 = triggeredWind ? 300 : 150;
                        setTimeout(() => writeCombatLog(`🐍 <span style="color:#4a90e2">${pName}</span> 觸發 <b style="color:#2ecc71">${poisonSourceName}</b>，使木人陷入中毒狀態！`, 'player'), d2);
                    }
                } else if (monster.hp > 0) {
                    monster.hp -= finalDmg;

                    // ✨ 把忍者判定加在這裡！只要命中，強制把血量歸零
                    if (combatState.isNinjaEvent && monster.id === 'm_raven_trial') {
                        monster.hp = 0;
                    }



                    // 💥 第 1 段：普攻跳字與日誌
                    showDmg('m-box', finalDmg === 0 ? '0' : finalDmg, finalDmg === 0 ? '#666' : (isCrit ? '#ffeb3b' : 'white'));
                    let dmgTxt = isCrit ? `<b style="color:#ffeb3b">爆擊！${finalDmg}</b>` : `<b style="color:white">${finalDmg}</b>`;
                    writeCombatLog(`🗡️ <span style="color:#4a90e2">${player.name || "妳"}</span> 發動 <b style="color:#aaa">普攻</b>，對 <span style="color:#e74c3c">${monster.name}</span> 造成 ${dmgTxt} 點傷害。`, 'player');

                    // 🌪️ 第 2 段：風刃跳字與日誌 (延遲 150 毫秒)
                    if (triggeredWind) {
                        setTimeout(() => {
                            showDmg('m-box', "風刃 " + windDmg, '#81ecec');
                            writeCombatLog(`🌪️ <span style="color:#4a90e2">${player.name || "妳"}</span> 觸發 <b style="color:#81ecec">風刃</b>，追加了 ${windDmg} 點撕裂傷害！`, 'player');
                        }, 150);
                    }

                    // 🐍 第 3 段：毒刃跳字與日誌 
                    if (triggeredPoison) {
                        let poisonDelay = triggeredWind ? 300 : 150;
                        setTimeout(() => {
                            showDmg('m-box', "劇毒附著", '#2ecc71');
                            writeCombatLog(`🐍 <span style="color:#4a90e2">${player.name || "妳"}</span> 觸發 <b style="color:#2ecc71">${poisonSourceName}</b>，使 <span style="color:#e74c3c">${monster.name}</span> 陷入中毒狀態！`, 'player');
                        }, poisonDelay);
                    }
                }
            } else {
                // 💨 閃避跳字與日誌
                showDmg('m-box', "MISS", '#888');
                writeCombatLog(`💨 <span style="color:#4a90e2">${player.name || "妳"}</span> 的攻擊被 <span style="color:#e74c3c">${monster.name}</span> <b style="color:#888">閃避</b> 了！`, 'player');
            }
        }
    } // ✨ 玩家攻擊區塊結束

    if (player.activeHelper && HELPER_DB[player.activeHelper]) {
        let hdb = HELPER_DB[player.activeHelper];
        if (!combatState.helperSkillCd) combatState.helperSkillCd = hdb.skillCd;
        combatState.helperSkillCd -= tickSec;
        if (combatState.helperSkillCd <= 0) {
            combatState.helperSkillCd = hdb.skillCd;
            if (hdb.skillType === 'heal') {
                player.hp = Math.min(getMaxHP(), player.hp + hdb.skillVal); showDmg('p-box', `+${hdb.skillVal}`, 'var(--quest)');
                writeCombatLog(`✨ <span style="color:#fdcb6e">【夥伴】 ${hdb.name}</span> 為妳恢復了 <b style="color:white">${hdb.skillVal}</b> 點生命值！`, 'player');
            } else if (hdb.skillType === 'attack' && (!isDummy ? monster.hp > 0 : true)) {
                if (isDummy) {
                    combatState.zenDmgAccum += hdb.skillVal;
                    showDmg('m-box', hdb.skillVal, '#fdcb6e');
                    // ✨ 測試模式下記錄夥伴傷害
                    if (combatState.testMode) {
                        combatState.totalDmgDealt += hdb.skillVal;
                        combatState.lastDmg = hdb.skillVal;
                    }
                    writeCombatLog(`💥 <span style="color:#fdcb6e">【夥伴】 ${hdb.name}</span> 的攻擊對 <span style="color:#e74c3c">${monster.name}</span> 造成 <b style="color:white">${hdb.skillVal}</b> 點傷害。`, 'player');
                }
                else {
                    monster.hp -= hdb.skillVal;
                    showDmg('m-box', hdb.skillVal, '#fdcb6e');
                    writeCombatLog(`💥 <span style="color:#fdcb6e">【夥伴】 ${hdb.name}</span> 的攻擊對 <span style="color:#e74c3c">${monster.name}</span> 造成 <b style="color:white">${hdb.skillVal}</b> 點傷害。`, 'player');
                }
            } else if (hdb.skillType === 'seal' && !isDummy && monster.hp > 0) {
                combatState.mobAtkTimer = Math.min(5.0, combatState.mobAtkTimer + hdb.skillVal); showDmg('m-box', "封印", 'var(--accent)');
                writeCombatLog(`📜 <span style="color:#fdcb6e">【夥伴】 ${hdb.name}</span> 施放定身符，成功封印了 <span style="color:#e74c3c">${monster.name}</span> 的行動！`, 'player');
            } else if (hdb.skillType === 'defend') {
                player.hp = Math.min(getMaxHP(), player.hp + hdb.skillVal);
                showDmg('p-box', "[金剛罩]", 'var(--gold)');
                writeCombatLog(`🛡️ <span style="color:#fdcb6e">【夥伴】 ${hdb.name}</span> 施放了金剛罩！`, 'player');
            }
        }
    }

    // ✨ 攻擊木人特殊邏輯：攻擊木人(m_dojo_defend) 可以攻擊玩家
    let isDefendDummy = isDummy && monster.id === 'm_dojo_defend';

    if (!isDummy || isDefendDummy) {
        if (!isDummy && monster.hp <= 0) { handleVictory(); }
        if (monster.atk > 0) {
            combatState.mobAtkTimer -= tickSec;
            if (combatState.mobAtkTimer <= 0) {
                combatState.mobAtkTimer = isDefendDummy ? 2.5 : 2.0;  // 攻擊木人攻速略慢
                // 將實際戰鬥的閃避上限解放到 80（道場攻擊木人也套用玩家閃避）
                let myEva = Math.max(0, Math.min(80, getEvaPercent() + (player.agi - (monster.agi || 0)) * 0.1));
                if (Math.random() * 100 >= myEva) {
                    let pDef = getDefVal();
                    let mDmg = Math.floor(Math.max(0, monster.atk - (pDef / 2)));
                    let pName = player.name || "妳";

                    // ✨ 燕返招架判定
                    if (player.buffs && player.buffs['samurai_parry'] > 0 && mDmg > 0) {
                        player.buffs['samurai_parry'] = 0; // 反擊後解除架勢
                        let counterDmg = Math.floor(getAtkVal() * 2.0); // 200% 反擊傷害

                        if (!isDefendDummy) monster.hp -= counterDmg;
                        else if (combatState.testMode) {
                            combatState.totalDmgDealt += counterDmg;
                            combatState.lastDmg = counterDmg;
                        }

                        showDmg('m-box', counterDmg, '#e74c3c');
                        showDmg('p-box', "格擋反擊", '#e74c3c');
                        writeCombatLog(`⚔️ <b style="color:#e74c3c">【燕返】</b> 觸發！${pName} 完美格擋了攻擊，並造成 <b style="color:white">${counterDmg}</b> 點反擊傷害！`, 'player');
                    } else {
                        if (hasPassive('vit_thorns') && mDmg > 0) {
                            let refDmg = Math.floor(monster.atk * 0.5 + pDef * 1.5);
                            if (!isDefendDummy) monster.hp -= refDmg; // 真實戰鬥才扣木人血
                            showDmg('m-box', `反制 ${refDmg}`, '#e1b12c');
                            writeCombatLog(`🛡️ <b style="color:#e1b12c">【反擊架勢】</b> 觸發！反彈了 <b style="color:white">${refDmg}</b> 點震懾傷害！`, 'player');
                        }

                        // ✨ 武士：劍氣護體 5% 減傷
                        if (hasPassive('sect_samurai_p1')) mDmg = Math.floor(mDmg * 0.95);

                        // ✨ 神道：天狐結界 40% 減傷並轉化為治療
                        if (player.buffs && player.buffs['shinto_shield'] > 0) {
                            let absorb = Math.floor(mDmg * 0.4);
                            mDmg -= absorb;
                            player.hp = Math.min(getMaxHP(), player.hp + absorb);
                            if (absorb > 0) {
                                showDmg('p-box', `+${absorb} 結界吸收`, 'var(--quest)');
                                writeCombatLog(`🦊 <b style="color:var(--quest)">【天狐結界】</b> 運轉，將 <b style="color:white">${absorb}</b> 點敵方傷害轉化為治癒！`, 'player');
                            }
                        }

                        player.hp -= mDmg;
                        showDmg('p-box', mDmg === 0 ? '0' : mDmg, mDmg === 0 ? '#888' : '#ff4757');
                        if (isDefendDummy) {
                            // ✨ 攻擊木人攻擊後自動恢復玩家HP，讓測試可以持續進行
                            writeCombatLog(`🪵 <span style="color:#e74c3c">【攻擊木人】</span> 發動攻擊，造成 <b style="color:#ff4757">${mDmg}</b> 點傷害。`, 'enemy');
                            // 道場模式：每次受擊後自動 50% 回血，確保測試能持續
                            setTimeout(() => {
                                if (combatState.testMode && player.hp > 0) {
                                    let healBack = Math.floor(getMaxHP() * 0.5);
                                    player.hp = Math.min(getMaxHP(), player.hp + healBack);
                                    if (healBack > 0) showDmg('p-box', `+${healBack}`, 'var(--quest)');
                                }
                            }, 500);
                        } else {
                            writeCombatLog(`🩸 <span style="color:#e74c3c">${monster.name}</span> 發動攻擊，對妳造成 <b style="color:#ff4757">${mDmg}</b> 點傷害。`, 'enemy');
                        }

                        // ✨ 神道被動：禍津反轉
                        if (mDmg > 0 && hasPassive('sect_shinto_p2') && Math.random() < 0.20) {
                            let healAmt = player.vit;
                            player.hp = Math.min(getMaxHP(), player.hp + healAmt);
                            showDmg('p-box', `+${healAmt} 反轉`, 'var(--quest)');
                            writeCombatLog(`🌸 <span style="color:#4a90e2">${pName}</span> 觸發 <b style="color:var(--quest)">【禍津反轉】</b>，將苦難化為恩惠，回復了 <b style="color:white">${healAmt}</b> 點體力！`, 'player');
                        }
                    }
                } else {
                    showDmg('p-box', "MISS", 'skyblue');
                    if (isDefendDummy) {
                        writeCombatLog(`💨 <span style="color:#4a90e2">${player.name || "妳"}</span> 成功閃避了木人的攻擊！`, 'player');
                    } else {
                        writeCombatLog(`💨 <span style="color:#4a90e2">${player.name || "妳"}</span> 成功閃避了 <span style="color:#e74c3c">${monster.name}</span> 的攻擊！`, 'player');
                    }

                    // ✨ 修復：【秘傳・黃泉送葬】閃避反擊邏輯
                    if (player.buffs && player.buffs['yomi_shrine'] > 0) {
                        // 忍者的反擊：以速度為主，搭配部分基礎攻擊力
                        let counterDmg = Math.floor(getSpdVal() * 2.5 + getAtkVal() * 1.0);
                        let pName = player.name || "妳";

                        if (!isDummy) monster.hp -= counterDmg;
                        else if (combatState.testMode) {
                            combatState.totalDmgDealt += counterDmg;
                            combatState.lastDmg = counterDmg;
                        }

                        showDmg('m-box', counterDmg, '#2ecc71');
                        showDmg('p-box', "黃泉反擊", '#2ecc71');
                        writeCombatLog(`💀 <b style="color:#2ecc71">【黃泉送葬】</b> 觸發！${pName} 幽影閃動，發動致命反擊造成 <b style="color:white">${counterDmg}</b> 點傷害！`, 'player');
                    }
                }
            }
        }

        // ✨ 忍者試煉計時器：獨立持續計時（不受敵方攻擊影響）
        if (!isDummy && combatState.isNinjaEvent) {
            combatState.ninjaTimer -= tickSec;
            if (combatState.ninjaTimer <= 0) {
                combatState.isNinjaEvent = false;
                log("🦅 渡鴉：「時間到了... 妳太慢了。」試煉失敗！", "var(--danger)");
                openModal("試煉失敗", "妳未能在 60 秒內擊中渡鴉。", "返回");
                spawn(false);
                return;
            }
        }
    }

    if (player.hp <= 0) handleDeath();
    updateTestStatsPanel(); // ✨ 更新測試統計面板
    updateUI(); battleTimer = setTimeout(startBattleLoop, delay);
}

function handleZenComplete() {
    let totalExp = Math.max(1, Math.floor(player.next * 0.02)) + Math.floor(combatState.zenDmgAccum * 0.05); let goldEarn = Math.floor(player.lvl * 0.5) + 1;
    player.exp += totalExp; player.gold += goldEarn; player.kills++; log(`🧘 冥想完成。獲得 <span style="color:var(--quest)">${totalExp} 經驗</span>, ${goldEarn} 金幣。`, "#aaa"); checkLevelUp();
}

// ✨ 更新測試統計面板
function updateTestStatsPanel() {
    let panel = el('test-stats-panel');
    if (!panel) return;

    let m = maps[player.mapIdx];
    // 不在幽靜道場時隱藏
    if (!m || m.name !== "[修行] 幽靜道場" || !combatState.testMode) {
        panel.style.display = 'none';
        return;
    }

    // 在道場且 testMode = true 時，立即顯示（不需要等有傷害記錄）
    panel.style.display = 'block';
    let elapsedSec = (Date.now() - combatState.testStartTime) / 1000;
    let dps = (elapsedSec > 0 && combatState.totalDmgDealt > 0)
        ? (combatState.totalDmgDealt / elapsedSec).toFixed(2)
        : '0.00';

    el('current-dmg').textContent = combatState.lastDmg > 0 ? combatState.lastDmg : '—';
    el('total-dmg').textContent = combatState.totalDmgDealt > 0 ? combatState.totalDmgDealt : '0';
    el('dps-value').textContent = dps;
    el('test-timer').textContent = `時長: ${elapsedSec.toFixed(1)}s`;
}

function handleVictory() {
    // ✨ 忍者試煉成功判定
    if (combatState.isNinjaEvent) {
        combatState.isNinjaEvent = false;
        log("🦅 渡鴉：「不錯的反應。這卷軸歸妳了，別讓我失望。」", "var(--quest)");
        addItemToBag('mat_ninja_scroll', 1);
        if (typeof showToast === 'function') showToast("✨ 獲得：暗號卷軸", "var(--quest)");
        spawn(false);
        return;
    }

    // ✨ 武士試煉連戰邏輯
    if (combatState.isSamuraiTrial && monster.id === 'm_trial_bandit_boss') {
        combatState.isSamuraiTrial = false;
        log("🗡️ 妳在決鬥中勝出！惡徒倒下，妳奪回了【染血的太刀】。", "var(--quest)");
        addItemToBag('mat_samurai_proof', 1);
        if (typeof showToast === 'function') showToast("✨ 獲得：染血的太刀", "var(--quest)");
        spawn(false);
        return;
    }

    let m = maps[player.mapIdx]; let dbMob = MOB_DB[monster.id]; if (!m || !dbMob) return;
    let expGained = (Number(dbMob.exp) || 0); let goldGained = (Number(dbMob.gold) || 0);

    if (!player.buffs) player.buffs = {};
    if (player.buffs['exp_boost'] > 0) expGained = Math.floor(expGained * EFFECT_MAP['exp_boost'].multiplier);
    if (player.buffs['gold_boost'] > 0) goldGained = Math.floor(goldGained * EFFECT_MAP['gold_boost'].multiplier);
    if (player.buffs['god_bless'] > 0) {
        expGained = Math.floor(expGained * EFFECT_MAP['god_bless'].multiplier);
        goldGained = Math.floor(goldGained * EFFECT_MAP['god_bless'].multiplier);
    }

    player.exp = (Number(player.exp) || 0) + expGained; player.gold = (Number(player.gold) || 0) + goldGained;
    let dropMsgs = []; dbMob.drops.forEach(l => { if (Math.random() < l.chance) { let amount = l.qty || 1; addItemToBag(l.id, amount); dropMsgs.push(`${getItem(l.id).name}x${amount}`); } });

    if (monster.isBoss) {
        if (dropMsgs.length === 0) dropMsgs.push("無特別物品");
        log(`🏆 擊敗首領！獲得 ${expGained} 經驗, ${goldGained} 金幣。<br>🎁 戰利品：${dropMsgs.join("，")}`, "var(--gold)");

        // 判定是否通關並前往下一張地圖
        if (!player.repeatBoss && player.mapIdx < maps.length - 1) {
            player.mapIdx++; player.maxMapIdx = Math.max(player.maxMapIdx, player.mapIdx); saveGame(false);
            if (typeof showToast === 'function') showToast(`🗺️ 【領域擴張】已解鎖新地圖！`, "var(--quest)");
        } else {
            if (player.repeatBoss) log(`🔁 循環探索開啟，繼續留在原地圖！`, "var(--accent)");
        }

        // ✨ 核心修改 1：打完首領，擊殺數一律歸零，重新從第一隻小怪開始打！
        player.kills = 0;
        updateMapSelector();
    } else {
        if (dropMsgs.length > 0) log(`🎁 獲得：${dropMsgs.join(", ")}`, "var(--quest)");
        if (player.kills < 10) player.kills++;
    }

    checkLevelUp();

    // ✨ 劇情攔截：無論是自動挑戰還是手動，只要打滿10隻就強制進入劇情
    if (player.mapIdx === 2 && player.kills >= 10 && checkStory('seiichi_encounter_lite')) {
        if (!player.hasMetBlacksmith) {
            player.kills = 9; // 把擊殺數卡在 9
            log("⚠️ 前方傳來極其狂暴的妖氣... 還是先回村莊的【鍛冶屋】弄點護具比較好。", "var(--danger)");
            if (player.autoBoss) {
                player.autoBoss = false; // 關閉自動挑戰，避免無限卡死
                log("⚠️ 自動挑戰已暫停，請先返回結界之里。", "var(--danger)");
                updateUI();
            }
            spawn(false);
            return; // 中斷後續刷怪邏輯
        } else {
            isPaused = true;
            log("📜 劇情觸發：前方傳來了激烈的戰鬥聲...", "var(--quest)");
            if (typeof runSeiichiEncounterLite === 'function') runSeiichiEncounterLite();
            else { isPaused = false; spawn(true); log("⚠️ 劇情模組未載入，已強制刷出首領。", "var(--danger)"); }
            return; // 中斷後續刷怪邏輯
        }
    }

    // ✨ 劇情攔截：擊敗石獅子後的結算對話 (條件: 打死的怪是b_lion，且前置對話已觸發過)
    if (monster.id === 'b_lion' && checkStory('seiichi_victory_lite', 'seiichi_encounter_lite')) {
        isPaused = true;
        log("📜 劇情觸發：石獅子轟然倒塌...", "var(--quest)");
        if (typeof runSeiichiVictoryLite === 'function') runSeiichiVictoryLite();
        return; // 中斷後續刷怪邏輯，等待對話完畢再繼續
    }

    // ✨ 核心修改 2：分離「自動挑戰」與「重複本關」。只有「自動挑戰」才會自動生王。
    if (player.autoBoss && player.kills >= 10 && maps[player.mapIdx].boss) {
        if (!monster.isBoss) log("⚔️ 擊殺達標，首領降臨！", "var(--danger)");
        spawn(true);
    } else {
        spawn(false);
    }
}

function addItemToBag(id, qty) { let item = getItem(id); if (item.cat === 'rec') { if (!player.potions[id]) player.potions[id] = 0; player.potions[id] += qty; } else if (item.cat === 'mat' || item.cat === 'sp' || item.cat === 'oth') { if (!player.mats[id]) player.mats[id] = 0; player.mats[id] += qty; } }
function resetCombatState() {
    // 使用 Object.assign 保留原有的試煉進度 (isSamuraiTrial 等)
    combatState = Object.assign(combatState || {}, { mobAtkTimer: 2.0, skillCds: [0, 0, 0, 0, 0, 0], slotSetupCds: [0, 0, 0, 0, 0, 0], zenTimer: 0, zenDmgAccum: 0, potionCd: 0, helperSkillCd: 0, nextHitCrit: false });
}

// ============================================================================
// ✨ 通用劇情指令系統 (Story Progression System)
// ============================================================================

function checkStory(storyId, reqStoryId = null) {
    if (!player.completedStories) player.completedStories = [];
    if (player.completedStories.includes(storyId)) return false; // 已經觸發過，不再觸發
    if (reqStoryId && !player.completedStories.includes(reqStoryId)) return false; // 前置劇情未完成，不能觸發
    return true; // 條件滿足，可以觸發！
}

function markStoryDone(storyId) {
    if (!player.completedStories) player.completedStories = [];
    if (!player.completedStories.includes(storyId)) player.completedStories.push(storyId);
    saveGame(false);
}

function handleDeath() {
    if (player.revives > 0) { player.revives--; log("🛡️ 替身御札發效！靈魂回歸肉身。", "var(--gold)"); player.hp = getMaxHP(); updateUI(); return; }
    log(`💀 魂火熄滅... 正在等待靈魂重塑。`, "var(--danger)"); player.hp = 0; isReviving = true; if (combatState.isSamuraiTrial || combatState.isNinjaEvent) {
        combatState.isSamuraiTrial = false;
        combatState.isNinjaEvent = false;
        log("⚠️ 試煉失敗！劍之介：「這點能耐也敢逞強... 失敗了就從頭來過吧。」", "var(--danger)");
    } resetCombatState();


    if (monster.isBoss) { player.autoBoss = false; log("⚠️ 首領戰敗北，自動挑戰已關閉。", "var(--danger)"); setTimeout(() => spawn(false), 500); }
    let sec = 5; const ov = el('revive-timer-overlay'); const txt = el('revive-seconds'); if (ov) ov.classList.remove('hidden'); if (txt) txt.innerText = sec;
    const timer = setInterval(() => {
        sec--; if (txt) txt.innerText = sec; updateUI();
        if (sec <= 0) { clearInterval(timer); if (ov) ov.classList.add('hidden'); isReviving = false; player.hp = getMaxHP(); log("✨ 靈魂重塑完成，修行繼續。", "var(--quest)"); if (currentView === 'battle') { isPaused = false; startBattleLoop(); } updateUI(); }
    }, 1000);
}

// ✨ V0.7.5：實裝 Lv.200 等級硬上限與 100等後地獄級經驗曲線
function checkLevelUp() {
    // 如果已經達到 200 等上限，經驗值鎖死滿管，不執行升級判定
    if (player.lvl >= 200) {
        player.exp = player.next;
        return;
    }

    player.exp = Number(player.exp) || 0;
    player.next = Number(player.next) || 30;

    while (player.exp >= player.next && player.next > 0 && player.lvl < 200) {
        player.lvl = (Number(player.lvl) || 1) + 1;
        player.exp -= player.next;

        // 📈 動態經驗曲線計算
        let multi = 1.1;
        let flatBonus = player.lvl * 5;

        if (player.lvl < 20) {
            multi = 1.2;  // 【新手期】1~19等：快速過渡
        } else if (player.lvl < 100) {
            multi = 1.1;  // 【平穩期】20~99等：標準農怪節奏
        } else if (player.lvl < 150) {
            multi = 1.15; // 【困難期】100~149等：倍率提升，基數增加
            flatBonus = player.lvl * 50;
        } else {
            multi = 1.25; // 【地獄期】150~199等：宗師苦練之路，經驗海量暴增
            flatBonus = player.lvl * 200;
        }

        player.next = Math.floor(player.next * multi) + flatBonus;
        player.statPoints += 3;
        player.hp = getMaxHP();

        log(`🎉 境界提升！目前等級：Lv.${player.lvl}，體力已恢復。`, "var(--cherry)");
        checkSkillUnlocks();

        // 如果在連升數級的過程中剛好達到 200 級，強制中斷並鎖死經驗
        if (player.lvl >= 200) {
            player.lvl = 200;
            player.exp = player.next;
            log("👑 恭喜！您已達到凡人巔峰 (Lv.200)！等待轉生機緣...", "var(--gold)");
            break;
        }
    }
    updateUI();
}

function spawn(boss = false) {
    let m = maps[player.mapIdx]; if (!m) return; combatState.mobAtkTimer = 2.0; let mobId = "";
    if (m.name === "[修行] 幽靜道場") {
        // ✨ 測試模式：根據選擇生成不同木人
        mobId = testDummyType === 'defend' ? 'm_dojo_defend' : 'm_dojo_static';
        combatState.testMode = true;
        combatState.skillDmgLog = [];
        combatState.testStartTime = Date.now();
        combatState.totalDmgDealt = 0;
        combatState.lastDmg = 0; // ✨ 初始化當前傷害
    } else if (boss && m.boss) {
        mobId = m.boss;
        combatState.testMode = false;
    } else {
        combatState.testMode = false;
        if (m.rareMob && Math.random() < m.rareMob.chance) { mobId = m.rareMob.id; log(`⚠️ 遭遇稀有怪物！`, "var(--gold)"); }
        else { mobId = m.mobs[Math.floor(Math.random() * m.mobs.length)]; }
    }
    let dbMob = MOB_DB[mobId];
    if (dbMob) {
        let autoLvl = Math.max(1, Math.ceil(((dbMob.hp / 15) + (dbMob.atk * 2.2) + ((dbMob.defVal || 0) * 3.5) + ((dbMob.eva || 0) * 1.5)) / 10));
        let mName = (boss || dbMob.isBoss) ? `【首領】${dbMob.name}` : dbMob.name;
        monster = { id: mobId, name: mName, hp: dbMob.hp, mhp: dbMob.hp, atk: dbMob.atk, defVal: dbMob.defVal || 0, dr: dbMob.dr || 0, eva: dbMob.eva || 0, agi: dbMob.agi || 0, lvl: autoLvl, isBoss: dbMob.isBoss || false, poisoned: 0 };
    }
    let btn = el('btn-boss'); if (btn) btn.disabled = (player.kills < 10 || monster.isBoss || isReviving || !m.boss);
}

function changeMap() { const sel = el('map-selector'); if (!sel) return; player.mapIdx = parseInt(sel.value); player.kills = 0; combatState.zenTimer = 0; combatState.zenDmgAccum = 0; spawn(); updateMapSelector(); }
function manualBoss() {
    // ✨ 攔截：如果滿足主線劇情條件，強制攔截「挑戰BOSS」按鈕並轉換為觸發劇情
    if (player.mapIdx === 2 && player.kills >= 10 && checkStory('seiichi_encounter_lite')) {
        if (!player.hasMetBlacksmith) {
            openModal("缺乏護具", "前方傳來極其狂暴的妖氣... 還是先回村莊的【鍛冶屋】弄點護具比較好。", "我知道了");
            return;
        }
        isPaused = true;
        log("📜 劇情觸發：前方傳來了激烈的戰鬥聲...", "var(--quest)");
        if (typeof runSeiichiEncounterLite === 'function') runSeiichiEncounterLite();
        return;
    }
    spawn(true);
}

// ✨ 新增：測試模式切換
function switchTestDummy(type) {
    testDummyType = type;
    resetTestData();
}

function resetTestData() {
    combatState.skillDmgLog = [];
    combatState.testStartTime = Date.now();
    combatState.totalDmgDealt = 0;
    combatState.lastDmg = 0; // ✨ 重置當前傷害
    if (monster) monster.hp = monster.mhp;
    updateMapSelector();
}

function executeSelectedSell() {
    let checkBoxes = document.querySelectorAll('.bag-check:checked');
    if (checkBoxes.length === 0) return log("❌ 請先勾選要賣出的物品。", "var(--danger)");
    let totalEarned = 0; let soldSummary = [];
    checkBoxes.forEach(cb => {
        let id = cb.getAttribute('data-id'); let db = getItem(id); let qtyInput = document.querySelector(`.bag-qty-input[data-id="${id}"]`); let sellQty = parseInt(qtyInput.value);
        let currentOwn = (db.cat === 'rec') ? (player.potions[id] || 0) : (player.mats[id] || 0);
        if (isNaN(sellQty) || sellQty <= 0) return; if (sellQty > currentOwn) sellQty = currentOwn;
        totalEarned += db.sellPrice * sellQty;
        if (db.cat === 'rec') player.potions[id] -= sellQty; else player.mats[id] -= sellQty;
        soldSummary.push(`${db.name}x${sellQty}`);
        cb.checked = false;
    });
    if (totalEarned > 0) { player.gold += totalEarned; log(`💰 變賣清單：${soldSummary.join(", ")}，共入帳 ${totalEarned} 金幣！`, "var(--gold)"); if (typeof showToast === 'function') showToast(`+ $${totalEarned} 金幣`, "var(--gold)"); updateUI(); renderBag(); }
}

function startWork() { player.workStartTime = Date.now(); isPaused = true; log("🏃 換上圍裙，開始在居酒屋幫忙...", "var(--gold)"); showSubView('work'); }
function stopWork(isAbort = false) {
    let now = Date.now();
    if (!player.workStartTime) player.workStartTime = now;
    
    if (isAbort) {
        log("🏃 妳中途翹班逃走了，老闆在後頭大罵...", "#888");
        player.workStartTime = null;
        isPaused = false;
        updateUI();
        if (currentView === 'village') showSubView('izakaya');
        return;
    }

    let hourlyRate = 1200 + (player.lvl * 100);
    if (player.activeHelper && HELPER_DB[player.activeHelper] && HELPER_DB[player.activeHelper].workBonus) {
        hourlyRate *= HELPER_DB[player.activeHelper].workBonus.rate;
    }
    let elapsedSecs = Math.floor((now - player.workStartTime) / 1000);
    if (isNaN(elapsedSecs) || elapsedSecs < 0) elapsedSecs = 0;
    if (elapsedSecs > 43200) elapsedSecs = 43200;
    let earn = Math.floor((elapsedSecs / 3600) * hourlyRate);
    if (earn > 0) {
        player.gold = (Number(player.gold) || 0) + earn;
        log(`💰 老闆：「辛苦啦！」獲得了 $${earn.toLocaleString()}。`, "var(--gold)");
        if (typeof showToast === 'function') showToast(`+ $${earn} 金幣`, "var(--gold)");

        let workMinutes = Math.floor(elapsedSecs / 60);
        if (workMinutes >= 10) {
            let dropChance = player.lvl <= 30 ? 1.0 : Math.min(1.0, 0.3 + workMinutes * 0.05);
            if (Math.random() < dropChance) {
                let extraStone = player.lvl <= 30 ? (Math.floor(Math.random() * 3) + 2) : Math.floor(workMinutes / 10);
                player.mats['m0'] = (player.mats['m0'] || 0) + extraStone;
                log(`🎁 【老闆的犒賞】老闆偷偷塞了 ${extraStone} 塊強化石給妳當作獎勵！`, "var(--quest)");
                if (typeof showToast === 'function') showToast(`額外獲得 妖化鐵砂 x${extraStone}`, "var(--quest)");
            }
        }
    } else {
        log("💨 工作時間太短，老闆揮揮手叫你趕快走。", "#888");
    }
    player.workStartTime = null;
    isPaused = false;
    updateUI();
    showSubView('izakaya');
}
function innRest(cost) { if (player.hp >= getMaxHP()) return openModal("精神飽滿", "妳精神好得很！", "知道了"); if (player.gold >= cost) { player.gold -= cost; isResting = true; let area = el('btn-inn-rest'); if (area) area.disabled = true; let btnBack = el('btn-back-village'); if (btnBack) btnBack.classList.add('hidden'); let sec = 3; const timer = setInterval(() => { sec--; if (sec <= 0) { clearInterval(timer); isResting = false; player.hp = getMaxHP(); updateUI(); if (btnBack) btnBack.classList.remove('hidden'); openModal("✨ 休息完畢", "體力已完全恢復！", "出發", () => showSubView('inn')); } }, 1000); } else openModal("金幣不足", "錢不夠喔。", "知道了"); }

function offerMoney(amt) {
    if (player.gold < amt) return log("❌ 金幣不足，無法奉納...");
    player.gold -= amt; player.shrineDonation = (player.shrineDonation || 0) + amt;
    let msg = ""; let tokenGot = 0;

    if (amt === 5) {
        if (Math.random() < 0.05) tokenGot = 1;
        msg = tokenGot ? "✨ 緣分結下了！(獲得 1 枚神德代幣)" : "🪙 神明默默收下了 5 円。";
    }
    else if (amt === 11) {
        if (Math.random() < 0.15) tokenGot = 1;
        msg = tokenGot ? "✨ 感受到了好吉兆！(獲得 1 枚神德代幣)" : "🪙 祈願的聲音傳達到了。";
    }
    else if (amt === 10 || amt === 500) {
        msg = "<span style='color:var(--danger)'>💀 觸怒了荒神！(體力流失)</span>";
        log(`⛩️ 您奉納了 ${amt} 金幣，這似乎是個不吉利的數字...`, "var(--danger)");
        player.hp = Math.max(1, player.hp - (amt === 10 ? 30 : 150));
    }
    else if (amt === 485) {
        tokenGot = 1; msg = "✨ 神明對你的誠意感到滿意。(獲得 1 枚神德代幣)";
    }
    else if (amt === 1000) {
        tokenGot = 3; msg = "✨ 【大吉】神像金光大作！(獲得 3 枚神德代幣)";
    }

    if (tokenGot > 0) {
        player.mats.c_shrine = (player.mats.c_shrine || 0) + tokenGot;
        log(`⛩️ 奉納觸發神恩！獲得神德代幣 x${tokenGot}`, "var(--quest)");
        if (typeof showToast === 'function') showToast(`獲得 神德代幣 x${tokenGot}`, "var(--quest)");
    } else if (amt !== 10 && amt !== 500) {
        log(`⛩️ 奉納了 ${amt} 金幣。`, "#aaa");
    }

    updateUI();
    if (typeof renderShrine === 'function') renderShrine();
    el('shrine-msg').innerHTML = msg;
}

function applyBuff(effKey, duration) {
    if (!player.buffs) player.buffs = {};
    player.buffs[effKey] = (player.buffs[effKey] || 0) + duration;
}

function ascendShrine(cost) {
    if (player.gold < cost) return typeof showToast === 'function' ? showToast("❌ 金幣不足以奉納上殿！", "var(--danger)") : null;

    player.gold -= cost;
    player.ascensionCount = (player.ascensionCount || 0) + 1;
    if (!player.buffs) player.buffs = {};

    let roll = Math.random();
    let msg = ""; let title = "";

    if (roll < 0.05) {
        applyBuff('god_bless', 86400);
        title = "✨【天照大御神 降臨】";
        msg = "至高無上的太陽神之光籠罩大地！<br>獲得 24 小時 <b style='color:var(--gold)'>金幣與經驗大幅加成</b>！";
        log("⛩️ 祈福觸發極稀有大獎：天照大御神降臨！", "var(--gold)");
    }
    else if (roll < 0.45) {
        if (Math.random() < 0.5) {
            applyBuff('atk_boost', 7200);
            title = "⚡【建御雷神 戰意】";
            msg = "武神的力量湧入體內。<br>獲得 2 小時 <b style='color:var(--danger)'>物理攻擊力提升</b>！";
        } else {
            applyBuff('exp_boost', 7200);
            title = "🦊【宇迦之御魂神 豐收】";
            msg = "稻荷神使賜予豐收之福。<br>獲得 2 小時 <b style='color:var(--quest)'>經驗值提升</b>！";
        }
        log(`⛩️ 祈福獲得神明加護：${title}`, "var(--quest)");
    }
    else if (roll < 0.85) {
        let getGold = 10000 + (player.lvl * 500);
        player.gold += getGold;
        title = "🪙【大國主命 賜福】";
        msg = `建國之神聽到了妳的聲音，賜予妳修行金：<b style='color:var(--gold)'>$${getGold.toLocaleString()}</b>`;
        log("⛩️ 祈福效果普通：獲得大國主命的修行金。", "#aaa");
    }
    else {
        // ✨ 拔除清空 BUFF 邏輯，改為扣除當前血量 20%
        player.hp = Math.max(1, Math.floor(player.hp * 0.8));
        title = "🌑【禍津日神 厄運】";
        msg = "妳驚擾了沉睡的災厄之神！<br><b style='color:var(--danger)'>體力受到反噬流失了 20%！</b><br><small style='color:#aaa;'>(增益效果未受影響)</small>";
        log("⛩️ 祈福大失敗：禍津日神作祟！", "var(--danger)");
    }

    openModal(title, msg, "領受神意");
    updateUI();
    if (typeof renderShrine === 'function') renderShrine();
}

function getUpgradeCost(level) {
    let tier = Math.floor(level / 3) + 1;
    tier = Math.min(4, tier);
    let matKey = `m${tier}`;
    let goldCost = 50 + (level * 100);
    let ironCost = 5 + (level * 2);
    let specialCost = 1 + (level % 3);
    return { matKey, goldCost, ironCost, specialCost };
}

function upgradeGear(gid) {
    let lv = player.gear[gid] || 0;
    if (lv >= (typeof GEAR_MAX_LVL !== 'undefined' ? GEAR_MAX_LVL : 15)) {
        showToast("此法器已達極限！", "var(--danger)");
        return;
    }

    let req = getUpgradeCost(lv);
    const useHammer = document.getElementById('use-hammer')?.checked;
    const useShield = document.getElementById('use-shield')?.checked;
    const useShieldDown = document.getElementById('use-shield-down')?.checked; // ✨ 新增：緩衝符札
    const useGambler = document.getElementById('use-gambler')?.checked;
    const usePerfect = document.getElementById('use-perfect')?.checked;

    if (player.gold < req.goldCost || (player.mats.m0 || 0) < req.ironCost || (player.mats[req.matKey] || 0) < req.specialCost) {
        showToast("❌ 素材或金幣不足！", "var(--danger)");
        return;
    }

    // 輔助道具檢查
    if (useHammer && (player.mats.mat_hammer_low || 0) <= 0) return showToast("❌ 匠人之錘不足！", "var(--danger)");
    if (useShield && (player.mats.mat_shield_break || 0) <= 0) return showToast("❌ 替身符札不足！", "var(--danger)");
    if (useShieldDown && (player.mats.mat_shield_down || 0) <= 0) return showToast("❌ 緩衝符札不足！", "var(--danger)"); // ✨ 檢查數量
    if (useGambler && (player.mats.mat_gambler || 0) <= 0) return showToast("❌ 修羅之印不足！", "var(--danger)");
    if (usePerfect && (player.mats.mat_perfect || 0) <= 0) return showToast("❌ 絕對真理不足！", "var(--danger)");

    player.gold -= req.goldCost;
    player.mats.m0 -= req.ironCost;
    player.mats[req.matKey] -= req.specialCost;

    let rate = (typeof UPGRADE_RATES !== 'undefined') ? (UPGRADE_RATES[lv] || 10) : 10;
    if (useHammer) { rate += 10; player.mats.mat_hammer_low--; }
    if (usePerfect) { rate = 100; player.mats.mat_perfect--; }

    if (Math.random() * 100 <= rate) {
        let up = (useGambler && Math.random() < 0.5) ? 2 : 1;
        if (useGambler) player.mats.mat_gambler--;
        player.gear[gid] = Math.min(15, lv + up);
        showToast(`✨ 強化成功！Lv.${player.gear[gid]}`, "lime");
    } else {
        // ❌ 失敗判定優先級：修羅 > 替身 > 緩衝 > 無防護
        if (useGambler) {
            player.mats.mat_gambler--;
            player.gear[gid] = Math.max(0, lv - 1);
            showToast("💥 修羅反噬！必定降級", "var(--danger)");
        } else if (useShield) {
            player.mats.mat_shield_break--;
            showToast("🛡️ 替身符生效，等級維持", "var(--gold)");
        } else if (useShieldDown) {
            // ✨ 新增：緩衝符札發揮作用，即使 Lv.6 以上也只降 1 級，不會歸零
            player.mats.mat_shield_down--;
            player.gear[gid] = Math.max(0, lv - 1);
            showToast("🛡️ 緩衝符生效，僅降一級", "var(--gold)");
        } else {
            // 無防護的殘酷懲罰
            player.gear[gid] = (lv >= 6) ? 0 : Math.max(0, lv - 1);
            showToast((lv >= 6) ? "💀 靈脈崩塌，等級歸零！" : "💥 強化失敗，降級！", "var(--danger)");
        }
    }
    updateUI();
    if (typeof renderSmithy === 'function') renderSmithy();
}

// --- 洗點系統核心 ---
function useWashStar(statType, qty) {
    qty = parseInt(qty);
    if (isNaN(qty) || qty <= 0) return;

    // 1. 檢查星砂數量
    if ((player.mats['wash_star'] || 0) < qty) {
        if (typeof showToast === 'function') showToast("❌ 遺忘星砂數量不足。", "var(--danger)");
        return;
    }

    // 2. 檢查屬性點是否夠扣
    const baseStats = { str: 2, vit: 1, agi: 0 };
    if ((player[statType] - baseStats[statType]) < qty) {
        if (typeof showToast === 'function') showToast("❌ 點數不足以洗退。", "var(--danger)");
        return;
    }

    // 3. 執行洗點邏輯 (不再呼叫第二次 openModal)
    player.mats['wash_star'] -= qty;
    player[statType] -= qty;

    // ✨ 同步扣除已分配點數紀錄 (保護存檔不崩潰)
    if (!player.allocatedStats) player.allocatedStats = { str: 0, vit: 0, agi: 0 };
    player.allocatedStats[statType] = Math.max(0, player.allocatedStats[statType] - qty);

    player.statPoints += qty;
    player.hp = Math.min(player.hp, getMaxHP()); // 避免體質洗掉後血量溢出

    // 4. 視覺與介面更新
    if (typeof showToast === 'function') showToast(`✨ 成功洗退 ${qty} 點 ${statType.toUpperCase()}`, "var(--gold)");

    updateUI();
    if (typeof renderBag === 'function') renderBag();
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
    if (typeof renderShrineShop === 'function') renderShrineShop();
}

function useShrineBuffItem(id) {
    let item = getItem(id);
    if ((player.mats[id] || 0) <= 0) return typeof showToast === 'function' ? showToast("行囊中沒有該道具。", "var(--danger)") : null;

    // ✨ 攔截製作圖的點擊使用
    if (id.startsWith('bp_')) {
        if (useBlueprint(id)) {
            player.mats[id]--;
            updateUI();
            if (typeof renderBag === 'function') renderBag();
        }
        return;
    }

    player.mats[id]--;

    if (id === 's_omikuji') {
        let n = 1; // ✨ 神社等級參數
        let roll = Math.random();

        // 1. 【大吉】 (15%) - 財運爆發
        if (roll < 0.15) {
            let gain = (n * 500) + 200; // 等級越高，獎金加乘越恐怖
            player.gold += gain;
            showToast(`✨ 【大吉】「神櫻飛舞，心想事成！」獲得 ${gain} 金幣！`, "var(--gold)");
        }
        // 2. 【吉】 (35%) - 穩健收益
        else if (roll < 0.50) {
            let gain = (n * 150) + 80;
            player.gold += gain;
            // 隨機贈送 T0 或 T1 素材
            let matId = Math.random() < 0.7 ? 'm0' : 'm1';
            addItemToBag(matId, 1 * n);
            showToast(`⛩️ 【吉】「諸事皆宜，靈氣充盈。」獲得 ${gain} 金幣與素材！`, "lime");
        }
        // 3. 【平】 (35%) - 安全過渡
        else if (roll < 0.85) {
            showToast(`🍃 【平】「風平浪靜，隨遇而安。」神明給了妳一個微笑。`, "white");
        }
        // 4. 【凶】 (12%) - 小懲大誡
        else if (roll < 0.97) {
            let loss = (n * 50) + 10; // 罰金大幅調低，不讓玩家肉痛
            player.gold = Math.max(0, player.gold - loss);
            showToast(`🌧️ 【凶】「雲霧遮月，步步留神。」遺失了 ${loss} 金幣。`, "#aaa");
        }
        // 5. 【大凶】 (3%) - 極低機率的災厄
        else {
            let loss = (n * 100) + 50;
            player.gold = Math.max(0, player.gold - loss);
            player.hp = Math.max(1, player.hp - 30); // 體力扣除也減少了
            showToast(`💀 【大凶】「荒神之怒，避之則吉！」損失 ${loss} 金幣且體力流失。`, "var(--danger)");
        }
    } else if (item.effect && EFFECT_MAP[item.effect]) {
        let eff = EFFECT_MAP[item.effect];
        applyBuff(item.effect, item.duration || 1800);
        log(`✨ 使用了【${item.name}】，獲得了 ${eff.name} 效果！`, "var(--gold)");
        if (typeof showToast === 'function') showToast(`獲得 ${eff.name} 效果`, "var(--quest)");
    }

    updateUI();
    if (typeof renderBag === 'function') renderBag();
}
function buyShopItem(tab) {
    let selId = `shop-${tab}-sel`; let cntId = `shop-${tab}-cnt`; let itemId = el(selId).value; let count = parseInt(el(cntId).value); if (isNaN(count) || count < 1) count = 1; let item = getItem(itemId); let unitCost = item.cost;
    let totalCost = unitCost * count; let maxAffordable = Math.floor(player.gold / unitCost);
    let onBuySuccess = (buyCount) => {
        if (item.cat === 'rec') { if (!player.potions[itemId]) player.potions[itemId] = 0; player.potions[itemId] += buyCount; }
        else if (item.id === 'revive') { player.revives += buyCount; }
        else if (item.id === 'wash_star') { player.mats['wash_star'] = (player.mats['wash_star'] || 0) + buyCount; }
        else { player.mats[itemId] = (player.mats[itemId] || 0) + buyCount; } // ✨ 修復：支援製作圖與工具等一般素材入袋
    };
    if (player.gold >= totalCost) {
        player.gold -= totalCost; onBuySuccess(count); updateUI(); if (typeof updateShopInvDisplay === 'function') updateShopInvDisplay(); log(`🛍️ 購買成功！獲得 ${item.name} x${count}`, "var(--quest)"); if (typeof showToast === 'function') showToast(`- $${totalCost} 金幣`, "var(--danger)"); openModal("交易完成", `萬屋老闆點了點頭。<br><br>獲得：<span style="color:var(--quest); font-weight:bold;">${item.name} x${count}</span>`, "確認");
    } else {
        if (maxAffordable > 0 && tab === 'rec') {
            openModal("金幣不足", `妳的金幣最多只能購買 <b>${maxAffordable}</b> 個。<br>確定要將剩下的錢全部買入嗎？`, "確定購買", () => { player.gold -= (unitCost * maxAffordable); onBuySuccess(maxAffordable); updateUI(); if (typeof updateShopInvDisplay === 'function') updateShopInvDisplay(); showSubView('shop'); log(`🛍️ 購買成功！獲得 ${item.name} x${maxAffordable}`, "var(--quest)"); if (typeof showToast === 'function') showToast(`- $${unitCost * maxAffordable} 金幣`, "var(--danger)"); openModal("交易完成", `萬屋老闆笑著收下所有零錢。<br><br>獲得：<span style="color:var(--quest); font-weight:bold;">${item.name} x${maxAffordable}</span>`, "確認"); }, true);
        } else openModal("金幣不足", "萬屋老闆：錢不夠喔，去多打點怪吧！", "知道了");
    }
}

function applyGM() {
    player.lvl = parseInt(el('gm-lvl').value) || 1; player.gold = parseInt(el('gm-gold').value) || 0;
    player.str = parseInt(el('gm-str').value) || 2; player.vit = parseInt(el('gm-vit').value) || 1;
    player.agi = parseInt(el('gm-agi').value) || 0; player.statPoints = parseInt(el('gm-pts').value) || 0;
    player.hp = getMaxHP();

    // ✨ GM 神明特權：強制切換流派
    let selectedSect = el('gm-sect').value;
    if (selectedSect !== (player.sect || "")) {
        // 1. 如果原本有流派，把舊流派的技能從身上「拔除」
        if (player.sect && SECT_DB[player.sect]) {
            let oldSkills = SECT_DB[player.sect].skills;
            player.unlockedSkills = player.unlockedSkills.filter(sid => !oldSkills.includes(sid));
            // 同時從已經裝備的格子裡卸下
            for (let i = 0; i < 6; i++) {
                if (oldSkills.includes(player.equippedSkills[i])) {
                    player.equippedSkills[i] = null;
                    player.skillGambits[i] = 0;
                    combatState.skillCds[i] = 0;
                    combatState.slotSetupCds[i] = 0;
                }
            }
        }

        // 2. 寫入新流派
        player.sect = selectedSect === "" ? null : selectedSect;

        // 3. 如果選擇了新流派，直接「灌頂」學會該流派所有技能
        if (player.sect && SECT_DB[player.sect]) {
            if (!player.unlockedSkills) player.unlockedSkills = [];
            SECT_DB[player.sect].skills.forEach(sid => {
                if (!player.unlockedSkills.includes(sid)) player.unlockedSkills.push(sid);
            });
        }
    }

    updateUI(); checkSkillUnlocks();
    log('🛠️ 神明特權：各項數值與流派已重新校準。', 'var(--gm)');
    if (typeof showToast === 'function') showToast("✅ 數值與流派套用成功", "var(--gm)");
}
function gmUnlockMaps() {
    player.maxMapIdx = maps.length - 1;
    if (typeof updateMapSelector === 'function') updateMapSelector();
    updateUI();
    if (typeof showToast === 'function') showToast("🗺️ 已開啟所有荒野地圖", "var(--accent)");
}

function gmAddMats() {
    for (let k in player.mats) player.mats[k] = (player.mats[k] || 0) + 100;
    updateUI();
    if (typeof showToast === 'function') showToast("🎁 已獲得所有素材 +100", "var(--quest)");
}
function previewStat(t) {
    if (player.statPoints > 0) {
        if (player[t] + statPreview[t] >= MAX_STAT_POINT) {
            if (typeof showToast === 'function') showToast(`❌ 單一屬性已達凡人極限 (${MAX_STAT_POINT}點)！`, "var(--danger)");
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
    let suits = ['♠', '♥', '♦', '♣']; let ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = []; suits.forEach(s => ranks.forEach(r => deck.push({ suit: s, rank: r })));
    for (let i = deck.length - 1; i > 0; i--) { let j = Math.floor(Math.random() * (i + 1));[deck[i], deck[j]] = [deck[j], deck[i]]; }
    return deck;
}
function calcCards(cards) {
    let total = 0; let aces = 0;
    cards.forEach(c => { if (['J', 'Q', 'K'].includes(c.rank)) total += 10; else if (c.rank === 'A') { total += 11; aces += 1; } else total += parseInt(c.rank); });
    while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
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
        saveGame(false);
    }
    if (typeof renderCasino === 'function') renderCasino();
}

function hitCasino() {
    casinoState.playerCards.push(casinoState.deck.pop()); casinoState.playerTotal = calcCards(casinoState.playerCards);
    if (casinoState.playerTotal > 21) { casinoState.msg = "💥 爆牌 (Bust)！籌碼被老闆娘笑納了。"; casinoState.gameOver = true; updateUI(); saveGame(false); }
    if (typeof renderCasino === 'function') renderCasino();
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

    if (casinoState.playerTotal > 21) { casinoState.msg = "💥 加碼後爆牌！血本無歸。"; casinoState.gameOver = true; updateUI(); saveGame(false); }
    else { casinoState.msg = `💰 成功加注 $${addAmt.toLocaleString()}！(總注 $${casinoState.bet.toLocaleString()})`; }
    if (typeof renderCasino === 'function') renderCasino();
}

function surrenderCasino() {
    let back = Math.floor(casinoState.bet * 0.5); player.gold += back;
    casinoState.msg = `🏳️ 投降輸一半。退回 ${back.toLocaleString()} 金幣。`; casinoState.gameOver = true; updateUI(); saveGame(false); if (typeof renderCasino === 'function') renderCasino();
}

function checkCasinoWinner() {
    let pt = casinoState.playerTotal; let dt = casinoState.dealerTotal;
    if (dt > 21) { let win = casinoState.bet * (casinoState.isAllIn ? 3 : 2); casinoState.msg = `🎉 莊家爆牌！贏得 ${win.toLocaleString()} 金幣！`; player.gold += win; }
    else if (pt > dt) { let win = casinoState.bet * (casinoState.isAllIn ? 3 : 2); casinoState.msg = `🎉 點數壓制！贏得 ${win.toLocaleString()} 金幣！`; player.gold += win; }
    else if (pt < dt) { casinoState.msg = `💸 莊家點數較大，籌碼沒收。`; }
    else { casinoState.msg = `🤝 平手，退回押注金。`; player.gold += casinoState.bet; }
    casinoState.gameOver = true; updateUI(); saveGame(false); if (typeof renderCasino === 'function') renderCasino();
}

// --- ✨ 流派系統：拜師入門 ---
function joinSect(sectId, reqItemId) {
    if (player.lvl < 50) return typeof showToast === 'function' ? showToast("等級不足 50，宗門不予受理。", "var(--danger)") : null;
    if ((player.mats[reqItemId] || 0) <= 0) return typeof showToast === 'function' ? showToast("缺少入門信物！", "var(--danger)") : null;

    // 1. 扣除信物
    player.mats[reqItemId]--;

    // 2. 記錄玩家的流派
    player.sect = sectId;
    player.sectRank = 0; // 確保從 0 階開始
    let sectData = SECT_DB[sectId];

    // 3. 解鎖流派專屬技能
    sectData.skills.forEach(sid => {
        let sk = skillDB[sid];
        if (sk && sk.rank === 0 && !player.unlockedSkills.includes(sid)) {
            player.unlockedSkills.push(sid);
        }
    });

    // 4. 彈出拜師成功的超帥氣提示
    log(`⛩️ 【系統】恭喜！妳已正式拜入【${sectData.name}】！專屬秘技已解鎖。`, "var(--quest)");
    openModal("🎉 拜師成功",
        `<b style="color:var(--gold);">${sectData.leaderNPC}</b>：「從今天起，妳就是我【${sectData.name}】的弟子了。切記，不可辱沒了宗門的名聲！」<br><br><span style="color:var(--quest); font-size:0.9em;">（已解鎖流派專屬被動與主動技能，請至右側秘技介面查看與裝備）</span>`,
        "弟子明白"
    );

    updateUI();
    if (typeof renderSect === 'function') renderSect();
    saveGame(false);
}

// --- 預留的叛宗函數 (避免點擊報錯) ---
function promptBetraySect() {
    openModal("🩸 叛離宗門", "叛宗系統尚未開放。一日為師，終身為父，妳還是再考慮一下吧！", "知道了");
}



// --- 🗡️ 武士流派：任務引導 ---
function startSamuraiTrial() {
    if (player.mapIdx === 0) return openModal("行動受阻", "幽靜道場是專注修練的地點，無法在此進行實戰任務。<br><br>請先移動至其他地區後再試。", "我知道了");
    if (player.lvl < 50) return showToast("劍之介：「實力不足者，去了也只是送死。」", "var(--danger)");

    openModal("⚔️ 劍之介的委託",
        "劍之介：「本門的太刀被一名叛逃的惡徒偷走了，他現在就躲在後山。去吧，找到他，進行一對一的對決，把刀帶回來。」<br><br><span style='color:var(--gold);'>目標：在一對一的決鬥中擊敗【盜匪大頭目】。</span>",
        "接受決鬥！",
        () => {
            switchView('battle');
            combatState.isSamuraiTrial = true;

            // ✨ 直接刷出 Boss，不打小兵了！
            monster = JSON.parse(JSON.stringify(MOB_DB['m_trial_bandit_boss']));
            resetCombatState();
            let btn = el('btn-boss'); if (btn) btn.disabled = true;
            log("🗡️ 妳找到了惡徒，雙方拔刀相向，一觸即發！", "var(--danger)");
        },
        true
    );
}

// --- 🌸 神道流派：任務引導 ---
function startShintoTrial() {
    openModal("⛩️ 禰宜 柊的指引",
        `柊：「神明只庇佑虔誠之人。當妳在神社的【累積奉納】達到 10 萬金幣時，神德商店便會賜予妳入職必備的<b>【神恩注連繩】</b>。目前妳已奉納：${player.shrineDonation.toLocaleString()} 金幣。」`,
        "了解"
    );
}

// --- ✨ 忍者流派：主動發起影之考驗 ---
function startNinjaTrial() {
    if (player.mapIdx === 0) return openModal("行動受阻", "幽靜道場是專注修練的地點，無法在此進行實戰任務。<br><br>請先移動至其他地區後再試。", "我知道了");
    if (player.lvl < 50) return showToast("渡鴉：「妳的氣息太過混亂，Lv.50 後再來找我。」", "var(--danger)");

    openModal("🦅 渡鴉的考驗",
        "渡鴉：「夜叉不收平庸之輩。我不會還手，但在這片黑影中，妳若能在 60 秒內擊中我的衣角一次，我便承認妳的資質。」<br><br><span style='color:var(--gold);'>目標：在 60 秒內成功對渡鴉造成 1 次傷害（渡鴉擁有 99% 閃避）。</span>",
        "影之試煉，開始",
        () => {
            switchView('battle');
            combatState.isNinjaEvent = true;
            combatState.ninjaTimer = 60.0; // 倒數 60 秒

            monster = JSON.parse(JSON.stringify(MOB_DB['m_raven_trial']));
            let btn = el('btn-boss'); if (btn) btn.disabled = true;
            log("🦅 渡鴉融入了陰影：「來吧，捉住我的影子。」", "var(--accent)");
        },
        true
    );
}

// --- ⛩️ 宗門養成：上繳物資與階級晉升指令 ---

// 1. 彈出上繳介面
function promptContribute() {
    let matIds = ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6'];
    let html = `<p style="font-size:0.9em; color:#aaa;">上繳妖物素材來提升宗門貢獻度。</p>
                <div style="max-height:200px; overflow-y:auto; background:rgba(0,0,0,0.3); padding:10px; border-radius:5px; margin-bottom:15px;">`;

    let hasAny = false;
    matIds.forEach(mid => {
        let count = player.mats[mid] || 0;
        if (count > 0) {
            hasAny = true;
            let item = getItem(mid);
            // 貢獻值權重：等級越高加越多
            let values = { m0: 1, m1: 2, m2: 5, m3: 10, m4: 20, m5: 40, m6: 100 };
            let val = values[mid];
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:5px;">
                    <span style="color:var(--mat);">${item.name} (持有 ${count})</span>
                    <button class="btn-action" style="padding:4px 10px; font-size:0.8em;" onclick="doContribute('${mid}', ${val})">上繳 (+${val})</button>
                </div>`;
        }
    });

    if (!hasAny) html += `<p style="color:#666; text-align:center;">行囊中目前沒有可上繳的素材。</p>`;
    html += `</div>`;

    openModal("🎁 宗門資助", html, "關閉");
}

// 2. 執行上繳
function doContribute(mid, val) {
    if ((player.mats[mid] || 0) <= 0) return;

    // ✨ 紀錄目前的捲軸位置
    let scrollContainer = document.querySelector('#modal-body div');
    let currentScroll = scrollContainer ? scrollContainer.scrollTop : 0;

    player.mats[mid]--;
    player.sectContrib += val;
    if (typeof showToast === 'function') showToast(`🎁 上繳成功！貢獻度 +${val}`, "var(--quest)");

    checkSectRankUp();
    updateUI();
    if (typeof renderSect === 'function') renderSect();

    promptContribute(); // 重新渲染清單

    // ✨ 瞬間還原捲軸位置，讓玩家可以無縫狂點
    setTimeout(() => {
        let newScrollContainer = document.querySelector('#modal-body div');
        if (newScrollContainer) newScrollContainer.scrollTop = currentScroll;
    }, 10);
}

// 3. 晉升判定與自動領悟
function checkSectRankUp() {
    let s = SECT_DB[player.sect];
    if (!s) return;

    let nextRank = player.sectRank + 1;
    let req = s.reqContrib[nextRank];

    if (req !== undefined && player.sectContrib >= req) {
        player.sectRank = nextRank;
        log(`🎊 恭喜！妳在【${s.name}】中的位階提升為：【${s.ranks[nextRank]}】！`, "var(--gold)");

        openModal("🎊 宗門晉升",
            `<b style="color:var(--gold);">${s.leaderNPC}</b>：「做得好。妳的貢獻大家有目共睹，從今天起，妳正式晉升為 <b style="color:var(--quest);">【${s.ranks[nextRank]}】</b> 位階！」`,
            "領受榮耀"
        );

        // 晉升後自動解鎖該階級的新技能
        s.skills.forEach(sid => {
            let sk = skillDB[sid];
            if (sk.rank <= player.sectRank && !player.unlockedSkills.includes(sid)) {
                player.unlockedSkills.push(sid);
                log(`✨ 晉升獎勵：領悟了武學【${sk.name}】！`, "var(--quest)");
            }
        });
        saveGame(false);
    }
}


// ✨ 夥伴遠征系統核心邏輯
const ALLOWED_EXPEDITION_HELPERS = ['h1', 'h4'];

function startExpedition() {
    let helperId = el('exp-helper-sel').value;
    let mapIdx = parseInt(el('exp-map-sel').value);
    let hours = parseInt(el('exp-time-sel').value);

    if (!helperId || !mapIdx || !hours) return showToast("請完整選擇派遣資訊！", "var(--danger)");

    if (!ALLOWED_EXPEDITION_HELPERS.includes(helperId)) return showToast("該夥伴目前不開放遠征。", "var(--danger)");
    if (player.activeHelper === helperId) return showToast("該夥伴正在出戰中！", "var(--danger)");
    if (player.expeditions && player.expeditions.find(e => e.helperId === helperId)) return showToast("該夥伴已經在遠征中！", "var(--danger)");

    let requiredSecs = hours * 3600;
    let currentSecs = player.helperTimes ? (player.helperTimes[helperId] || 0) : 0;
    if (currentSecs < requiredSecs) return openModal("時數不足", "夥伴剩餘的合約時間不足以完成此次遠征。", "關閉");

    player.helperTimes[helperId] -= requiredSecs;
    if (!player.expeditions) player.expeditions = [];
    player.expeditions.push({ helperId: helperId, mapIdx: mapIdx, startTime: Date.now(), duration: requiredSecs });

    saveGame(false);
    showToast("🏕️ 夥伴已出發遠征！", "var(--quest)");
    if (typeof renderExpedition === 'function') renderExpedition();
}

function claimExpedition(eIdx) {
    if (!player.expeditions || !player.expeditions[eIdx]) return;
    let exp = player.expeditions[eIdx];

    let elapsed = Math.floor((Date.now() - exp.startTime) / 1000);
    if (elapsed < exp.duration) return showToast("遠征尚未完成！", "var(--danger)");

    let m = maps[exp.mapIdx];
    let killCount = Math.floor((exp.duration / 60) * 1.5);
    let totalExp = 0, totalGold = 0, drops = {};

    for (let i = 0; i < killCount; i++) {
        let mobId = m.mobs[Math.floor(Math.random() * m.mobs.length)];
        let dbMob = MOB_DB[mobId];
        if (!dbMob) continue;

        totalExp += (Number(dbMob.exp) || 0);
        totalGold += (Number(dbMob.gold) || 0);
        if (dbMob.drops) {
            dbMob.drops.forEach(l => {
                if (Math.random() < l.chance) {
                    let amount = l.qty || 1;
                    drops[l.id] = (drops[l.id] || 0) + amount;
                }
            });
        }
    }

    player.exp = (Number(player.exp) || 0) + totalExp;
    player.gold = (Number(player.gold) || 0) + totalGold;

    let dropStrs = [];
    for (let id in drops) {
        addItemToBag(id, drops[id]);
        dropStrs.push(`${getItem(id).name}x${drops[id]}`);
    }

    player.expeditions.splice(eIdx, 1);
    saveGame(false);

    let resultMsg = `遠征歸來，共斬殺 ${killCount} 體妖魔。<br><br>獲得經驗：${totalExp}<br>獲得金幣：$${totalGold}`;
    resultMsg += `<br><br>📝 搜刮物資：<br>${dropStrs.length > 0 ? dropStrs.join(", ") : "無"}`;
    openModal("🎁 遠征大豐收", resultMsg, "確認");
    if (typeof renderExpedition === 'function') renderExpedition();
}

function cancelExpedition(eIdx) {
    // ✨ 根據新設定，遠征不再允許緊急召回
    if (typeof showToast === 'function') showToast("遠征一旦出發便無法召回。", "var(--danger)");
}

// --- 🍲 料理代工系統 ---
function cookRecipe(idx) {
    let recipe = typeof COOKING_RECIPES !== 'undefined' ? COOKING_RECIPES[idx] : null;
    if (!recipe) return;

    if (player.gold < recipe.cost) return typeof showToast === 'function' ? showToast("代工費不足！", "var(--danger)") : null;

    // 檢查食材是否足夠 (會自動判斷是在 potions 分類還是 mats 分類)
    for (let k in recipe.req) {
        let item = getItem(k);
        let own = item.cat === 'rec' ? (player.potions[k] || 0) : (player.mats[k] || 0);
        if (own < recipe.req[k]) return typeof showToast === 'function' ? showToast("食材不足！", "var(--danger)") : null;
    }

    // 扣除費用與食材
    player.gold -= recipe.cost;
    for (let k in recipe.req) {
        let item = getItem(k);
        if (item.cat === 'rec') player.potions[k] -= recipe.req[k];
        else player.mats[k] -= recipe.req[k];
    }

    addItemToBag(recipe.result, 1);

    log(`🍲 烹飪完成！獲得了 【${getItem(recipe.result).name}】。`, "var(--quest)");
    if (typeof showToast === 'function') showToast(`獲得 ${getItem(recipe.result).name}`, "lime");

    saveGame(false);
    updateUI();
    if (typeof renderCook === 'function') renderCook();
}

window.onload = () => {
    initSlotScreen();
    setInterval(() => { if (!isPaused && currentSlotKey && player.name && !player.workStartTime) saveGame(false); }, 5000);
    setInterval(() => { if (player.workStartTime && currentView === 'village' && !el('sub-view').classList.contains('hidden')) showSubView('work'); }, 1000);

    // ✨ 遠征完成全局檢查
    setInterval(() => {
        if (!player.expeditions || player.expeditions.length === 0 || !player.name) return;
        let now = Date.now();
        let shouldSave = false;
        player.expeditions.forEach(exp => {
            if (!exp.notified) {
                let elapsed = Math.floor((now - exp.startTime) / 1000);
                if (elapsed >= exp.duration) {
                    exp.notified = true;
                    shouldSave = true;
                    let hName = (typeof HELPER_DB !== 'undefined' && HELPER_DB[exp.helperId]) ? HELPER_DB[exp.helperId].name : "夥伴";
                    
                    // ✨ 防卡死機制：判斷玩家是否處於無法中斷的掛機狀態
                    let isBusy = (player.fishingState && player.fishingState.active) || 
                                 (player.woodState && player.woodState.active) || 
                                 player.workStartTime || isResting;
                    let btnText = isBusy ? "我知道了" : "前往領取";

                    openModal("🏕️ 遠征完成", `【${hName}】已完成遠征探索！<br>請前往茶屋領取豐厚物資。`, btnText, () => {
                        if (isBusy) return; // 如果在釣魚/伐木/打工中，不強制切換畫面，避免 UI 覆蓋卡死
                        
                        if (typeof switchView === 'function') switchView('village');
                        if (typeof showSubView === 'function') {
                            showSubView('teahouse');
                            setTimeout(() => showSubView('expedition'), 100);
                        }
                    });
                }
            }
        });
        if (shouldSave) saveGame(false);
    }, 5000);

    // ✨ 漁場掛機實時結算與 UI 刷新器
    setInterval(() => {
        if (player.fishingState && player.fishingState.active) {
            let now = Date.now();
            if (!player.fishingState.lastTick) player.fishingState.lastTick = now;
            let mins = Math.floor((now - player.fishingState.lastTick) / 60000);

            if (mins > 0) {
                player.fishingState.lastTick += mins * 60000;
                let totalMins = Math.floor((now - player.fishingState.startTime) / 60000);

                if (totalMins <= 480) { // 最高掛機 8 小時
                    let fLvl = player.lifeSkills.fish.lvl;
                    let fish1 = 0, fish2 = 0, fish3 = 0;
                    let broken = false;

                    for (let i = 0; i < mins; i++) {
                        if (Math.random() < 0.40) {
                            if (!consumeToolDura('tool_rod_1', 1)) { broken = true; break; }
                            let roll = Math.random();
                            if (fLvl >= 5 && roll < 0.10) fish3++;
                            else if (fLvl >= 3 && roll < 0.35) fish2++;
                            else fish1++;
                            
                            // ✨ 每次消耗耐久後，檢查是否已經沒有備用釣竿了，如果沒有就立刻中斷
                            if ((player.mats['tool_rod_1'] || 0) <= 0) { broken = true; break; }
                        }
                    }

                    let totalFish = fish1 + fish2 + fish3;
                    if (totalFish > 0) {
                        player.fishingState.caught.m1 += fish1; 
                        player.fishingState.caught.m2 += fish2; 
                        player.fishingState.caught.m3 += fish3;
                        player.fishingState.caught.exp += (fish1 * 5 + fish2 * 15 + fish3 * 50); 
                        player.fishingState.caught.dura += totalFish;
                        
                        // ✨ 不再於此處 addItemToBag，改由 stopFishing 結算一次發給
                        // 不再自動升級 exp，改由 stopFishing 處理
                        saveGame(false);

                        if (currentView === 'village' && typeof showToast === 'function') {
                            if (fish3) showToast(`🎣 釣到了 ${getItem('mat_fish_3').name}！(尚未結算)`, "var(--accent)");
                            else if (totalFish > 0) showToast(`🎣 魚兒上鉤了！`, "var(--accent)");
                        }
                    }

                    if (broken) { showToast("🎣 釣竿徹底損壞，自動收竿！", "var(--danger)"); stopFishing(); return; }
                    if (broken) { 
                        showToast("🎣 釣竿徹底損壞，自動收竿！", "var(--danger)"); 
                        stopFishing(); 
                        if (currentView === 'village') showSubView('lifeSkills'); // ✨ 自動跳轉回領地畫面
                        return; 
                    }
                }
            }

            if (currentView === 'village' && !el('sub-view').classList.contains('hidden') && el('sub-content').innerHTML.includes('悠閒漁場')) { if (typeof renderFish === 'function') renderFish(); }
        }

        // ✨ 迷霧林場伐木掛機結算
        if (player.woodState && player.woodState.active) {
            let now = Date.now();
            if (!player.woodState.lastTick) player.woodState.lastTick = now;
            let mins = Math.floor((now - player.woodState.lastTick) / 60000);

            if (mins > 0) {
                player.woodState.lastTick += mins * 60000;
                let totalMins = Math.floor((now - player.woodState.startTime) / 60000);
                if (totalMins <= 480) {
                    let wLvl = player.lifeSkills.wood.lvl;
                    let w1 = 0, w2 = 0, w3 = 0; let broken = false; let outOfStam = false;
                    for (let i = 0; i < mins; i++) {
                        if (player.stamina < 5) { outOfStam = true; break; } // 每分鐘消耗 5 點體力
                        if (!consumeToolDura('tool_axe_1', 1)) { broken = true; break; }
                        player.stamina -= 5; player.woodState.caught.stam += 5; player.woodState.caught.dura += 1;
                        let roll = Math.random();
                        if (wLvl >= 5 && roll < 0.10) w3++; else if (wLvl >= 3 && roll < 0.35) w2++; else w1++;
                        
                        // ✨ 每次消耗耐久後，檢查是否已經沒有備用斧頭了，如果沒有就立刻中斷
                        if ((player.mats['tool_axe_1'] || 0) <= 0) { broken = true; break; }
                    }
                    let totalWood = w1 + w2 + w3;
                    if (totalWood > 0) {
                        player.woodState.caught.m1 += w1; 
                        player.woodState.caught.m2 += w2; 
                        player.woodState.caught.m3 += w3;
                        let expGain = (w1 * 10 + w2 * 20 + w3 * 50); 
                        player.woodState.caught.exp += expGain;
                        
                        // ✨ 工具包不再此處更新，改由 stopWoodchopping 處理
                        saveGame(false);
                        
                        if (currentView === 'village' && typeof showToast === 'function') {
                            if (w3) showToast(`🪓 砍到了 ${getItem('mat_wood_3').name}！(尚未結算)`, "var(--mat)");
                            else if (totalWood > 0) showToast(`🪓 獲得木材了！`, "var(--mat)");
                        }
                    }
                    if (outOfStam) { showToast("🪓 體力耗盡，自動收工！", "var(--danger)"); stopWoodchopping(); return; }
                    if (broken) { showToast("🪓 斧頭徹底損壞，自動收工！", "var(--danger)"); stopWoodchopping(); return; }
                    if (outOfStam) { 
                        showToast("🪓 體力耗盡，自動收工！", "var(--danger)"); 
                        stopWoodchopping(); 
                        if (currentView === 'village') showSubView('lifeSkills'); // ✨ 自動跳轉回領地畫面
                        return; 
                    }
                    if (broken) { 
                        showToast("🪓 斧頭徹底損壞，自動收工！", "var(--danger)"); 
                        stopWoodchopping(); 
                        if (currentView === 'village') showSubView('lifeSkills'); // ✨ 自動跳轉回領地畫面
                        return; 
                    }
                }
            }
            if (currentView === 'village' && !el('sub-view').classList.contains('hidden') && el('sub-content').innerHTML.includes('迷霧林場')) { if (typeof renderWood === 'function') renderWood(); }
        }
    }, 1000);
};

// --- ✨ 製作圖與藍圖系統 ---
function checkBlueprint(id) {
    return player.blueprints && player.blueprints.includes(id);
}

function useBlueprint(id) {
    if (!player.blueprints) player.blueprints = [];
    if (player.blueprints.includes(id)) {
        if (typeof showToast === 'function') showToast("已經領悟過這個製作圖了！", "var(--danger)");
        return false;
    }
    player.blueprints.push(id);
    if (typeof showToast === 'function') showToast("✨ 成功領悟新的工具製作法！", "var(--quest)");
    saveGame(false);
    return true;
}

// --- ✨ 工具耐久度消耗系統 ---
function consumeToolDura(toolId, amount = 1) {
    if ((player.mats[toolId] || 0) <= 0) return false;
    let item = typeof getItem === 'function' ? getItem(toolId) : null;
    if (!item || !item.maxDura) return true; // 沒有耐久設定的工具直接通行

    if (player.toolDura[toolId] === undefined) player.toolDura[toolId] = item.maxDura;
    player.toolDura[toolId] -= amount;

    if (player.toolDura[toolId] <= 0) {
        player.mats[toolId]--; // 壞掉一把
        if (player.mats[toolId] > 0) {
            player.toolDura[toolId] = item.maxDura; // 自動換上新的一把
            if (typeof showToast === 'function') showToast(`一把【${item.name}】損壞了，已自動更換備用工具。`, "var(--danger)");
        } else {
            player.toolDura[toolId] = 0;
            if (typeof showToast === 'function') showToast(`【${item.name}】已徹底損壞，請至萬屋重新購買！`, "var(--danger)");
        }
    }
    return true;
}

// --- ✨ 農田種植與收穫邏輯 ---
function plantSeed(seedId, slotIdx) {
    let seed = typeof getItem === 'function' ? getItem(seedId) : null;
    if (!seed || seed.cat !== 'seed') return;
    if ((player.mats['tool_hoe_1'] || 0) <= 0) return typeof showToast === 'function' ? showToast("缺少農具！無法播種", "var(--danger)") : null;

    player.mats[seedId]--;
    consumeToolDura('tool_hoe_1', 1); // ✨ 播種扣除 1 點鋤頭耐久

    let durationMs = (seed.growTime || 60) * 60 * 1000;
    let now = Date.now();

    if (!player.farmCrops) player.farmCrops = [null, null, null, null];
    player.farmCrops[slotIdx] = { seedId: seedId, startTime: now, endTime: now + durationMs };

    if (typeof showToast === 'function') showToast(`🌱 成功種下 ${seed.name}！`, "lime");
    saveGame(false);
    if (typeof renderFarm === 'function') renderFarm();
}

// --- ✨ 生活職人與體力機制 (Stamina System) ---
function checkStaminaRegen() {
    if (!player.staminaLastRefill) player.staminaLastRefill = Date.now();
    let now = Date.now();
    let elapsed = now - player.staminaLastRefill;
    let fourHours = 4 * 60 * 60 * 1000; // 現實時間 4 小時 (毫秒)

    if (elapsed >= fourHours) {
        player.stamina = player.maxStamina;
        player.staminaLastRefill = now;
        if (typeof updateUI === 'function') updateUI();
    }
}

function useStamina(amount) {
    checkStaminaRegen(); // 使用前先檢查是否已經可以補滿
    if (player.stamina >= amount) {
        player.stamina -= amount;
        if (typeof updateUI === 'function') updateUI();
        saveGame(false);
        return true;
    } else {
        if (typeof showToast === 'function') showToast("❌ 體力不足！請等待恢復或至旅籠屋歇息。", "var(--danger)");
        return false;
    }
}

function harvestCrop(slotIdx) {
    if (!player.farmCrops || !player.farmCrops[slotIdx]) return;
    let crop = player.farmCrops[slotIdx];
    if (Date.now() < crop.endTime) return typeof showToast === 'function' ? showToast("作物還沒成熟！", "var(--danger)") : null;

    let seed = typeof getItem === 'function' ? getItem(crop.seedId) : null;
    if (!seed) { player.farmCrops[slotIdx] = null; return; }
    let resultItem = seed.yieldId || 'p1';
    let yieldQty = seed.yieldQty || 1;

    addItemToBag(resultItem, yieldQty);
    if (typeof showToast === 'function') showToast(`🌾 收穫了 ${getItem(resultItem).name} x${yieldQty}`, "var(--quest)");

    player.lifeSkills.farm.exp += (seed.exp || 10);
    while (player.lifeSkills.farm.exp >= player.lifeSkills.farm.next) {
        player.lifeSkills.farm.lvl++;
        player.lifeSkills.farm.exp -= player.lifeSkills.farm.next;
        player.lifeSkills.farm.next = Math.floor(player.lifeSkills.farm.next * 1.5);
        log(`🌾 【生活職人】農田等級提升至 Lv.${player.lifeSkills.farm.lvl}！`, "var(--gold)");
    }

    player.farmCrops[slotIdx] = null;
    saveGame(false);
    if (typeof renderFarm === 'function') renderFarm();
}

// --- ✨ 掛機釣魚邏輯 ---
function startFishing() {
    if ((player.mats['tool_rod_1'] || 0) <= 0) return typeof showToast === 'function' ? showToast("請先裝備【簡易釣竿】！", "var(--danger)") : null;
    player.fishingState = { active: true, startTime: Date.now(), lastTick: Date.now(), caught: { m1: 0, m2: 0, m3: 0, exp: 0, dura: 0 } };
    if (typeof showToast === 'function') showToast("🎣 已拋下釣竿，開始靜心垂釣...", "var(--accent)");
    saveGame(false);
    if (typeof renderFish === 'function') renderFish();
}

function stopFishing(isAbort = false) {
    if (!player.fishingState || !player.fishingState.active) return;
    
    if (isAbort) {
        player.fishingState.active = false;
        player.fishingState.startTime = 0;
        player.fishingState.caught = { m1: 0, m2: 0, m3: 0, exp: 0, dura: 0 };
        log("🎣 妳心不在焉地收起了釣竿，這次垂釣一無所獲。", "#888");
        saveGame(false);
        if (typeof renderFish === 'function') renderFish();
        return;
    }

    let elapsedMins = Math.floor((Date.now() - player.fishingState.startTime) / 60000);
    let caught = player.fishingState.caught || { m1: 0, m2: 0, m3: 0, exp: 0, dura: 0 };
    
    // ✨ 正式結算：將漁獲加入行囊
    if (caught.m1) addItemToBag('mat_fish_1', caught.m1);
    if (caught.m2) addItemToBag('mat_fish_2', caught.m2);
    if (caught.m3) addItemToBag('mat_fish_3', caught.m3);
    
    // 增加經驗值與等級
    if (caught.exp > 0) {
        player.lifeSkills.fish.exp += caught.exp;
        while (player.lifeSkills.fish.exp >= player.lifeSkills.fish.next) {
            player.lifeSkills.fish.lvl++; 
            player.lifeSkills.fish.exp -= player.lifeSkills.fish.next; 
            player.lifeSkills.fish.next = Math.floor(player.lifeSkills.fish.next * 1.5);
            log(`🎣 【生活職人】漁場等級提升至 Lv.${player.lifeSkills.fish.lvl}！`, "var(--gold)");
        }
    }

    player.fishingState.active = false;
    player.fishingState.startTime = 0;

    if (caught.m1 === 0 && caught.m2 === 0 && caught.m3 === 0) {
        if (elapsedMins < 1) {
            if (typeof showToast === 'function') showToast("時間太短，連水草都沒釣到。", "#888");
        } else {
            openModal("🎣 毫無所獲", `妳在水邊靜坐了 ${elapsedMins} 分鐘，但似乎運氣不佳，什麼都沒釣到...`, "真倒楣");
        }
    } else {
        let logMsg = `釣魚歸來 (掛機 ${elapsedMins} 分鐘)：`;
        if (caught.m1) logMsg += ` 鰷魚x${caught.m1}`;
        if (caught.m2) logMsg += ` 香魚x${caught.m2}`;
        if (caught.m3) logMsg += ` 錦鯉x${caught.m3}`;
        logMsg += ` (消耗耐久 ${caught.dura}，漁場經驗 +${caught.exp})`;

        openModal("🎣 滿載而歸", logMsg.replace(/：/, "：<br><br><span style='color:var(--accent);'>").replace(/\(/, "</span><br><br><span style='color:#aaa; font-size:0.85em;'>(") + "</span>", "收下漁獲");
    }

    saveGame(false);
    if (typeof renderFish === 'function') renderFish();
}

// --- ✨ 林場伐木邏輯 ---
function startWoodchopping() {
    if ((player.mats['tool_axe_1'] || 0) <= 0) return typeof showToast === 'function' ? showToast("缺少斧具！請先購買", "var(--danger)") : null;
    if (player.stamina < 5) return typeof showToast === 'function' ? showToast("體力不足以進入林場！", "var(--danger)") : null;
    player.woodState = { active: true, startTime: Date.now(), lastTick: Date.now(), caught: { m1: 0, m2: 0, m3: 0, exp: 0, dura: 0, stam: 0 } };
    if (typeof showToast === 'function') showToast("🪓 已進入迷霧林場，開始伐木...", "var(--mat)");
    saveGame(false);
    if (typeof renderWood === 'function') renderWood();
}

function stopWoodchopping(isAbort = false) {
    if (!player.woodState || !player.woodState.active) return;

    if (isAbort) {
        player.woodState.active = false;
        player.woodState.startTime = 0;
        player.woodState.caught = { m1: 0, m2: 0, m3: 0, exp: 0, dura: 0, stam: 0 };
        log("🪓 妳中途離開了林場，看來今天的體力都白費了。", "#888");
        saveGame(false);
        if (typeof renderWood === 'function') renderWood();
        return;
    }

    let elapsedMins = Math.floor((Date.now() - player.woodState.startTime) / 60000);
    let caught = player.woodState.caught || { m1: 0, m2: 0, m3: 0, exp: 0, dura: 0, stam: 0 };
    
    // ✨ 正式結算：將木材加入行囊
    if (caught.m1) addItemToBag('mat_wood_1', caught.m1);
    if (caught.m2) addItemToBag('mat_wood_2', caught.m2);
    if (caught.m3) addItemToBag('mat_wood_3', caught.m3);
    
    // 增加經驗值與等級
    if (caught.exp > 0) {
        player.lifeSkills.wood.exp += caught.exp;
        while (player.lifeSkills.wood.exp >= player.lifeSkills.wood.next) {
            player.lifeSkills.wood.lvl++; 
            player.lifeSkills.wood.exp -= player.lifeSkills.wood.next; 
            player.lifeSkills.wood.next = Math.floor(player.lifeSkills.wood.next * 1.5);
            log(`🪓 【生活職人】林場等級提升至 Lv.${player.lifeSkills.wood.lvl}！`, "var(--gold)");
        }
    }

    player.woodState.active = false;
    player.woodState.startTime = 0;

    if (caught.m1 === 0 && caught.m2 === 0 && caught.m3 === 0) {
        if (elapsedMins < 1) typeof showToast === 'function' ? showToast("時間太短，還沒砍倒樹。", "#888") : null;
        else openModal("🪓 毫無所獲", `妳在林場奮力揮砍了 ${elapsedMins} 分鐘，但沒獲取到有用的木材...`, "真累人");
    } else {
        let logMsg = `伐木歸來 (掛機 ${elapsedMins} 分鐘)：`;
        if (caught.m1) logMsg += ` 朽木x${caught.m1}`; if (caught.m2) logMsg += ` 堅韌原木x${caught.m2}`; if (caught.m3) logMsg += ` 靈氣神木x${caught.m3}`;
        logMsg += ` (消耗體力 ${caught.stam}，耐久 ${caught.dura}，林場經驗 +${caught.exp})<br><br><span style="color:#aaa; font-size:0.85em;">(※取得的木材未來可用於鍛造高階武器與裝備)</span>`;
        openModal("🪓 滿載而歸", logMsg.replace(/：/, "：<br><br><span style='color:var(--mat);'>").replace(/\(/, "</span><br><br><span style='color:#aaa; font-size:0.85em;'>(") + "</span>", "收下木材");
    }
    saveGame(false);
    if (typeof renderWood === 'function') renderWood();
}
