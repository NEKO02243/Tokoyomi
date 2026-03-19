/* ==========================================================================
   📦 中央數據庫 (ITEM_DB, HELPER_DB, MOB_DB, maps, skillDB) - V0.7.3 (首領結算修復版)
   ========================================================================== */

const EFFECT_MAP = {
    'exp_boost': { field: 'exp', multiplier: 1.2, name: '經驗加成' },
    'gold_boost': { field: 'gold', multiplier: 1.3, name: '金幣加成' },
    'atk_boost': { field: 'atk', multiplier: 1.1, name: '攻擊加成' },
    'god_bless': { field: 'all', multiplier: 1.5, name: '神明降臨' },
    'samurai_parry': { field: 'parry', multiplier: 0, name: '燕返招架' }
};

const ITEM_DB = {
    // --- 補品類型道具 ---
    'p1': { id: 'p1', cat: 'rec', name: '生鮮野味', tag: '+50HP', cost: 15, value: 50, rate: 0, sellable: true, sellPrice: 3, shopAvailable: false, shopTab: 'rec', desc: '野外獲得的生肉，口感欠佳。' },
    'p2': { id: 'p2', cat: 'rec', name: '醃製獸肉', tag: '+250HP', cost: 60, value: 250, rate: 0, sellable: true, sellPrice: 20, shopAvailable: true, shopTab: 'rec', desc: '萬屋特製的乾肉，補給量較高。' },
    'p5': { id: 'p5', cat: 'rec', name: '百年靈芝', tag: '+800HP', cost: 400, value: 800, rate: 0, sellable: true, sellPrice: 150, shopAvailable: true, shopTab: 'rec', desc: '深山中採摘的靈藥，能迅速恢復大量體力。' },
    'p3': { id: 'p3', cat: 'rec', name: '行軍丸子', tag: '恢復30%', cost: 300, value: 0, rate: 0.3, sellable: true, sellPrice: 100, shopAvailable: true, shopTab: 'rec', desc: '專業配方煉製的補給，效果顯著。' },
    'p6': { id: 'p6', cat: 'rec', name: '妖血秘藥', tag: '+2500HP', cost: 1500, value: 2500, rate: 0, sellable: true, sellPrice: 400, shopAvailable: true, shopTab: 'rec', desc: '以大妖之血煉製，能瞬間恢復極大生命值。' },
    'p4': { id: 'p4', cat: 'rec', name: '天照御神露', tag: '全恢復', cost: 3000, value: 0, rate: 1.0, sellable: true, sellPrice: 1000, shopAvailable: true, shopTab: 'rec', desc: '傳說中的神水，完全恢復。' },

    // --- 素材類型道具 ---

    'm0': { id: 'm0', cat: 'mat', name: '妖化鐵砂', sellable: true, sellPrice: 2, shopAvailable: false, shopTab: 'mat', desc: '受妖氣侵蝕的細砂，鍛造基礎素材。' },
    'm1': { id: 'm1', cat: 'mat', name: '竹妖的韌皮', sellable: true, sellPrice: 5, shopAvailable: false, shopTab: 'mat', desc: '竹妖身上最堅韌的部分，用於強化法器。' },
    'm2': { id: 'm2', cat: 'mat', name: '怨念的木片', sellable: true, sellPrice: 15, shopAvailable: false, shopTab: 'mat', desc: '寄宿著森林亡魂的碎木，用於強化法器。' },
    'm3': { id: 'm3', cat: 'mat', name: '染血的破傘', sellable: true, sellPrice: 35, shopAvailable: false, shopTab: 'mat', desc: '古道上遺落的殘破遺物，用於強化法器。' },
    'm4': { id: 'm4', cat: 'mat', name: '雷精的碎核', sellable: true, sellPrice: 80, shopAvailable: false, shopTab: 'mat', desc: '強大雷電能量的結晶體，用於強化法器。' },
    'm5': { id: 'm5', cat: 'mat', name: '幽冥靈骨粉', sellable: true, sellPrice: 150, shopAvailable: false, shopTab: 'mat', desc: '黃泉邊界的骨粉，帶有強烈的死亡氣息。' },
    'm6': { id: 'm6', cat: 'mat', name: '彼岸花瓣', sellable: true, sellPrice: 300, shopAvailable: false, shopTab: 'mat', desc: '三途川畔盛開的紅花，據說能連通陰陽。' },

    'mat_wolf': { id: 'mat_wolf', cat: 'sp', name: '狼王尖牙', sellable: false, sellPrice: 0, shopAvailable: false, desc: '飢餓野狼首領的尖牙，蘊含野性之力。' },
    'mat_lion': { id: 'mat_lion', cat: 'sp', name: '獅子石晶', sellable: false, sellPrice: 0, shopAvailable: false, desc: '荒廢石獅子崩壞後留下的核心。' },
    'mat_tengu': { id: 'mat_tengu', cat: 'sp', name: '天狗之羽', sellable: false, sellPrice: 0, shopAvailable: false, desc: '蒼雷大天狗落下的羽毛，帶有雷電之力。' },
    'mat_fox': { id: 'mat_fox', cat: 'sp', name: '邪染神木', sellable: false, sellPrice: 0, shopAvailable: false, desc: '邪染稻荷使守護的腐朽神木。' },
    'mat_yomi': { id: 'mat_yomi', cat: 'sp', name: '黃泉之血', sellable: false, sellPrice: 0, shopAvailable: false, desc: '黃泉衛士體內流淌的冥界之血。' },
    'mat_shield_break': { id: 'mat_shield_break', cat: 'sp', name: '替身符札', cost: 1500, sellable: false, sellPrice: 0, shopAvailable: true, shopTab: 'smith', desc: '【防護】強化失敗時抵銷懲罰，保護法器不降級、不歸零。' },
    'mat_shield_down': { id: 'mat_shield_down', cat: 'sp', name: '緩衝符札', cost: 500, sellable: false, sellPrice: 0, shopAvailable: true, shopTab: 'smith', desc: '【防護】Lv.6以上強化失敗時防止歸零，改為僅降1級。' },
    'mat_hammer_low': { id: 'mat_hammer_low', cat: 'sp', name: '匠人之錘', cost: 800, sellable: false, sellPrice: 0, shopAvailable: true, shopTab: 'smith', desc: '【輔助】強化時提升 10% 成功機率。' },
    'mat_hammer_high': { id: 'mat_hammer_high', cat: 'sp', name: '神匠之錘', cost: 3000, sellable: false, sellPrice: 0, shopAvailable: false, shopTab: 'smith', desc: '【輔助】強化時提升 25% 成功機率。' },
    'mat_gambler': { id: 'mat_gambler', cat: 'sp', name: '修羅之印', cost: 1200, sellable: false, sellPrice: 0, shopAvailable: true, shopTab: 'smith', desc: '【特殊】若強化成功，有 50% 機率連升 2 級；若失敗則必定降 1 級。' },
    'mat_perfect': { id: 'mat_perfect', cat: 'sp', name: '絕對真理', cost: 10000, sellable: false, sellPrice: 0, shopAvailable: false, shopTab: 'smith', desc: '【神物】無視機率，必定強化成功。' },
    'sp_samurai_scroll': { id: 'sp_samurai_scroll', cat: 'sp', name: '繪卷：天才小師妹・櫻', sellable: false, sellPrice: 0, desc: '【羈絆】呼喚小師妹永久加入陣容，提供極高的攻擊與破甲支援。' },
    'sp_ninja_scroll': { id: 'sp_ninja_scroll', cat: 'sp', name: '繪卷：暗部忍犬・疾風', sellable: false, sellPrice: 0, desc: '【羈絆】呼喚忍犬永久加入陣容，提供閃避與掉寶率加成。' },
    'sp_shinto_scroll': { id: 'sp_shinto_scroll', cat: 'sp', name: '繪卷：大巫女・千早', sellable: false, sellPrice: 0, desc: '【羈絆】呼喚大巫女永久加入陣容，提供生命恢復與神聖護盾。' },

    'wash_star': { id: 'wash_star', cat: 'sp', name: '遺忘星砂', tag: '洗點', cost: 10, sellable: false, sellPrice: 0, shopAvailable: true, shopTab: 'oth', desc: '神秘的星砂。可在行囊中使用，精準洗退 1 點手動分配的屬性點。' },
    'c_shrine': { id: 'c_shrine', cat: 'sp', name: '神德代幣', tag: '信仰', cost: 0, sellable: false, sellPrice: 0, shopAvailable: false, shopTab: 'oth', desc: '奉納後獲得的神明恩賜，可用於兌換特殊物資。' },
    's_omikuji': { id: 's_omikuji', cat: 'sp', name: '御神籤', tag: '抽吉凶', cost: 1, reqDonation: 0, sellable: false, sellPrice: 0, shopAvailable: false, desc: '占卜吉凶的籤紙。使用後隨機獲得金幣或珍貴素材。' },
    's_ema': { id: 's_ema', cat: 'sp', name: '祈願絵馬', effect: 'gold_boost', duration: 1800, cost: 2, reqDonation: 5000, sellable: false, sellPrice: 0, shopAvailable: false, desc: '寫滿願望的木牌。使用後 30 分鐘內，金幣掉落增加。' },
    's_omiki': { id: 's_omiki', cat: 'sp', name: '御神酒', effect: 'exp_boost', duration: 1800, cost: 2, reqDonation: 5000, sellable: false, sellPrice: 0, shopAvailable: false, desc: '神明賜福的清酒。使用後 30 分鐘內，經驗值獲取增加。' },
    's_hamaya': { id: 's_hamaya', cat: 'sp', name: '破魔矢', effect: 'atk_boost', duration: 900, cost: 3, reqDonation: 10000, sellable: false, sellPrice: 0, shopAvailable: false, desc: '破除邪惡的神箭。使用後 15 分鐘內，物理攻擊威力增加。' },
    'revive': { id: 'revive', cat: 'sp', name: '替身御札', tag: '免死一次', cost: 5, reqDonation: 20000, sellable: false, sellPrice: 0, shopAvailable: false, desc: '蘊含強大靈力的護身符。持有時自動生效，抵擋一次致命傷害。' },
    // --- ⚔️ 流派入門信物 (轉職道具) ---
    'mat_shinto_rope': {
        id: 'mat_shinto_rope', cat: 'sp', name: '神恩注連繩',
        cost: 10, reqDonation: 100000, sellable: false, sellPrice: 0,
        desc: '【神道信物】充滿神性的注連繩。可在神社以 10 枚代幣兌換（需累積奉納達 10 萬）。'
    },
    'mat_samurai_proof': {
        id: 'mat_samurai_proof', cat: 'sp', name: '染血的太刀',
        sellable: false, sellPrice: 0,
        desc: '【武士信物】山賊頭目的佩刀，證明了妳的武勇。'
    },
    'mat_ninja_scroll': {
        id: 'mat_ninja_scroll', cat: 'sp', name: '暗號卷軸',
        sellable: false, sellPrice: 0,
        desc: '【忍者信物】通過渡鴉試煉後獲得的神秘卷軸。'
    },
};




const HELPER_DB = {
    'h1': { id: 'h1', role: 'phy', roleName: '武術', name: '流浪浪人・伍丸', cost: 300, duration: 30, skillType: 'attack', skillVal: 15, skillCd: 6, passive: (p) => { return { atk: 3, def: 0, eva: 0 }; }, workBonus: { rate: 1.2, label: "護衛：工錢提升 20%" }, desc: '追求劍道的浪人。增加基礎攻擊 3 點，每 6 秒施放一次斬擊（15點真實傷害）。' },
    'h2': { id: 'h2', role: 'mag', roleName: '法術', name: '見習巫女・小葵', cost: 300, duration: 30, skillType: 'heal', skillVal: 40, skillCd: 8, passive: (p) => { return { atk: 0, def: 2, eva: 0 }; }, workBonus: { rate: 1.15, label: "人氣：小費提升 15%" }, desc: '里中神社的修行者。增加護甲 2 點，每 8 秒恢復 40 點生命值。' },
    'h3': { id: 'h3', role: 'agi', roleName: '奇術', name: '陰陽生・安倍才藏', cost: 300, duration: 30, skillType: 'seal', skillVal: 1.5, skillCd: 10, passive: (p) => { return { atk: 0, def: 0, eva: 2 }; }, workBonus: { rate: 1.0, label: "無打工加成" }, desc: '陰陽寮的學員。增加閃避率 2%，每 10 秒施放定身符，封印敵人攻擊 1.5 秒。' },
    'h4': { id: 'h4', role: 'phy', roleName: '武術', name: '怪力僧・權助', cost: 500, duration: 60, skillType: 'defend', skillVal: 20, skillCd: 15, passive: (p) => { return { atk: 0, def: 8, eva: 0 }; }, workBonus: { rate: 1.3, label: "苦力：工錢提升 30%" }, desc: '遊歷四方的破戒僧。增加護甲 8 點，每 15 秒施放金剛罩，吸收 20 點傷害。' },
    'h5': { id: 'h5', role: 'agi', roleName: '奇術', name: '賞金獵人・燕', cost: 600, duration: 60, skillType: 'hunt', skillVal: 1.5, skillCd: 0, passive: (p) => { return { atk: 5, def: 0, eva: 5 }; }, workBonus: { rate: 1.5, label: "暴利：工錢提升 50%" }, desc: '認錢不認人的殺手。增加攻擊 5 點、閃避 5%，並使戰鬥掉落的金幣提升 50%。' }
};

const MOB_DB = {
    'm_dummy': { name: '朽木樁', hp: 1, atk: 0, defVal: 0, dr: 0, eva: 0, agi: 0, exp: 0, gold: 0, drops: [] },
    'm_dojo_static': { name: '【試驗】靜止木人', hp: 999999, atk: 0, defVal: 0, dr: 0, eva: 0, agi: 0, exp: 0, gold: 0, drops: [], isTestDummy: true },
    'm_dojo_defend': { name: '【試驗】攻擊木人', hp: 999999, atk: 50, defVal: 30, dr: 0.1, eva: 20, agi: 25, exp: 0, gold: 0, drops: [], isTestDummy: true },
    'm_rabbit': { name: '野生長耳兔', hp: 35, atk: 2, defVal: 0, dr: 0.02, eva: 5, agi: 10, exp: 3, gold: 2, drops: [{ id: 'p1', chance: 0.25 }, { id: 'm0', chance: 0.05 }] },
    'm_fox_cub': { name: '落單幼狐', hp: 40, atk: 3, defVal: 0, dr: 0.02, eva: 8, agi: 15, exp: 4, gold: 3, drops: [{ id: 'p1', chance: 0.30 }, { id: 'm0', chance: 0.05 }] },
    // ✨ 修復：為所有首領補上豐厚的 exp 和 gold 屬性
    'b_wolf': { name: '飢餓的野狼', hp: 250, atk: 14, defVal: 5, dr: 0.10, eva: 10, agi: 30, exp: 50, gold: 30, isBoss: true, drops: [{ id: 'p5', chance: 0.50 }, { id: 'mat_wolf', chance: 1.0 }] },
    'r_gold_rabbit': { name: '✨ 貪婪金兔', hp: 120, atk: 5, defVal: 2, dr: 0.05, eva: 30, agi: 150, exp: 20, gold: 50, isBoss: false, drops: [{ id: 'p2', chance: 1.0 }, { id: 'm0', chance: 1.0 }] },
    'm_dog': { name: '迷途犬', hp: 60, atk: 5, defVal: 3, dr: 0.05, eva: 10, agi: 20, exp: 6, gold: 5, drops: [{ id: 'p1', chance: 0.10 }, { id: 'm1', chance: 0.15 }] },
    'm_bamboo': { name: '竹林小鬼', hp: 75, atk: 7, defVal: 5, dr: 0.08, eva: 5, agi: 15, exp: 7, gold: 6, drops: [{ id: 'm1', chance: 0.15 }, { id: 'm0', chance: 0.10 }] },
    'b_lion': { name: '荒廢石獅子', hp: 500, atk: 22, defVal: 15, dr: 0.15, eva: 5, agi: 15, exp: 120, gold: 80, isBoss: true, drops: [{ id: 'p2', chance: 0.80 }, { id: 'mat_lion', chance: 1.0 }] },
    'm_tengu': { name: '天狗', hp: 150, atk: 10, defVal: 10, dr: 0.10, eva: 20, agi: 45, exp: 15, gold: 15, drops: [{ id: 'p2', chance: 0.10 }, { id: 'm2', chance: 0.15 }] },
    'm_yama': { name: '山童', hp: 180, atk: 13, defVal: 18, dr: 0.12, eva: 5, agi: 20, exp: 18, gold: 18, drops: [{ id: 'm2', chance: 0.15 }, { id: 'm0', chance: 0.10 }] },
    'b_spirit': { name: '怨念木靈', hp: 1200, atk: 30, defVal: 25, dr: 0.20, eva: 15, agi: 35, exp: 350, gold: 200, isBoss: true, drops: [{ id: 'p5', chance: 0.50 }, { id: 'm2', chance: 1.0 }] },
    'm_fox': { name: '白狐', hp: 350, atk: 18, defVal: 20, dr: 0.15, eva: 25, agi: 60, exp: 40, gold: 35, drops: [{ id: 'p5', chance: 0.15 }, { id: 'm3', chance: 0.15 }] },
    'm_umbrella': { name: '紙傘怪', hp: 380, atk: 22, defVal: 25, dr: 0.18, eva: 15, agi: 40, exp: 45, gold: 40, drops: [{ id: 'm3', chance: 0.15 }, { id: 'm0', chance: 0.10 }] },
    'b_inari': { name: '邪染稻荷使', hp: 3000, atk: 45, defVal: 40, dr: 0.25, eva: 20, agi: 80, exp: 800, gold: 450, isBoss: true, drops: [{ id: 'p3', chance: 0.20 }, { id: 'mat_fox', chance: 1.0 }] },
    'm_thunder': { name: '雷精', hp: 900, atk: 30, defVal: 35, dr: 0.20, eva: 20, agi: 70, exp: 100, gold: 70, drops: [{ id: 'p3', chance: 0.10 }, { id: 'm4', chance: 0.15 }] },
    'm_bird': { name: '雷震子', hp: 1000, atk: 35, defVal: 40, dr: 0.22, eva: 25, agi: 90, exp: 110, gold: 80, drops: [{ id: 'm4', chance: 0.15 }, { id: 'm0', chance: 0.10 }] },
    'b_tengu': { name: '蒼雷大天狗', hp: 8000, atk: 70, defVal: 60, dr: 0.30, eva: 30, agi: 120, exp: 2000, gold: 1000, isBoss: true, drops: [{ id: 'p6', chance: 0.50 }, { id: 'mat_tengu', chance: 1.0 }] },
    'm_ghoul': { name: '飢餓的餓鬼', hp: 2500, atk: 65, defVal: 45, dr: 0.25, eva: 15, agi: 50, exp: 250, gold: 120, drops: [{ id: 'p3', chance: 0.20 }, { id: 'm5', chance: 0.15 }] },
    'm_skel': { name: '遊蕩骸骨兵', hp: 2800, atk: 75, defVal: 55, dr: 0.28, eva: 10, agi: 40, exp: 280, gold: 140, drops: [{ id: 'm5', chance: 0.20 }, { id: 'm0', chance: 0.15 }] },
    'b_yomi': { name: '黃泉衛士', hp: 25000, atk: 120, defVal: 80, dr: 0.35, eva: 15, agi: 90, exp: 6000, gold: 3000, isBoss: true, drops: [{ id: 'p4', chance: 0.60 }, { id: 'mat_yomi', chance: 1.0 }] },
    'm_hag': { name: '三途川奪衣婆', hp: 6500, atk: 90, defVal: 60, dr: 0.30, eva: 30, agi: 110, exp: 600, gold: 250, drops: [{ id: 'p6', chance: 0.20 }, { id: 'm6', chance: 0.15 }] },
    'm_wheel': { name: '業火車', hp: 8000, atk: 110, defVal: 70, dr: 0.32, eva: 15, agi: 80, exp: 750, gold: 300, drops: [{ id: 'm6', chance: 0.20 }, { id: 'm0', chance: 0.20 }] },
    'b_sanzu': { name: '冥河擺渡人', hp: 60000, atk: 180, defVal: 100, dr: 0.40, eva: 25, agi: 150, exp: 15000, gold: 8000, isBoss: true, drops: [{ id: 'p4', chance: 1.0 }, { id: 'm6', chance: 1.0 }] },
    // ✨ 新增武士試煉 Boss
    'b_bandit': { name: '山賊頭目', hp: 35000, atk: 140, defVal: 80, dr: 0.25, eva: 10, agi: 60, exp: 8000, gold: 4000, isBoss: true, drops: [{ id: 'mat_samurai_proof', chance: 1.0 }] },
    'm_spider': { name: '絡新婦', hp: 9000, atk: 130, defVal: 70, dr: 0.30, eva: 40, agi: 160, exp: 1100, gold: 380, drops: [{ id: 'p6', chance: 0.20 }, { id: 'm6', chance: 0.20 }] },
    'm_oni': { name: '狂暴赤鬼', hp: 12000, atk: 160, defVal: 85, dr: 0.35, eva: 10, agi: 100, exp: 1200, gold: 400, drops: [{ id: 'p6', chance: 0.25 }, { id: 'm6', chance: 0.20 }] },
    'b_shuten': { name: '酒吞童子', hp: 100000, atk: 280, defVal: 140, dr: 0.45, eva: 30, agi: 200, exp: 25000, gold: 12000, isBoss: true, drops: [{ id: 'p4', chance: 1.0 }, { id: 'm6', chance: 1.0 }] },

    // ✨ 新增常規關卡 2：無間奈落
    'm_gozu': { name: '牛頭獄卒', hp: 20000, atk: 240, defVal: 120, dr: 0.40, eva: 15, agi: 120, exp: 2200, gold: 600, drops: [{ id: 'p4', chance: 0.10 }, { id: 'm6', chance: 0.30 }] },
    'm_mezu': { name: '馬面獄卒', hp: 18000, atk: 260, defVal: 110, dr: 0.38, eva: 25, agi: 180, exp: 2200, gold: 600, drops: [{ id: 'p4', chance: 0.10 }, { id: 'm6', chance: 0.30 }] },
    'b_enma': { name: '閻魔大王', hp: 250000, atk: 450, defVal: 200, dr: 0.50, eva: 40, agi: 250, exp: 50000, gold: 25000, isBoss: true, drops: [{ id: 'p4', chance: 1.0 }, { id: 'mat_perfect', chance: 0.05 }] },
    // 🗡️ 武士試煉專用：強盜小弟與首領
    'm_trial_bandit': {
        id: 'm_trial_bandit', name: '【試煉】囂張的盜匪',
        hp: 10, mhp: 10, lvl: 1, atk: 0, defVal: 0, dr: 0, eva: 0, agi: 0, exp: 0, gold: 0, poisoned: 0, drops: []
    },
    'm_trial_bandit_boss': {
        id: 'm_trial_bandit_boss', name: '【試煉】盜匪大頭目',
        hp: 2500, mhp: 2500, lvl: 50,
        atk: 45, defVal: 15, dr: 0, eva: 5, agi: 25, exp: 0, gold: 0, isBoss: true, poisoned: 0,
        drops: [{ id: 'mat_samurai_proof', chance: 1.0 }]
    },

    // 🥷 忍者試煉專用：引路人 渡鴉
    'm_raven_trial': {
        id: 'm_raven_trial', name: '【試煉】引路人 渡鴉',
        hp: 999999, mhp: 999999, lvl: 99, // ✨ 補上 mhp 與 lvl
        atk: 0, defVal: 999, dr: 0.95, eva: 99, agi: 500, exp: 0, gold: 0, isBoss: true, poisoned: 0,
        drops: []
    },


};

const maps = [
    { name: "[修行] 幽靜道場", minLvl: 1, maxLvl: 999, mobs: ["m_dummy"], rareMob: null, boss: null },
    { name: "靜謐荒野", minLvl: 1, maxLvl: 5, mobs: ["m_rabbit", "m_fox_cub"], boss: "b_wolf", rareMob: { id: "r_gold_rabbit", chance: 0.05 } },
    { name: "遺忘的竹林", minLvl: 1, maxLvl: 9, mobs: ["m_dog", "m_bamboo"], boss: "b_lion", rareMob: null },
    { name: "靜謐之森", minLvl: 10, maxLvl: 19, mobs: ["m_tengu", "m_yama"], boss: "b_spirit", rareMob: null },
    { name: "伏見古道", minLvl: 20, maxLvl: 29, mobs: ["m_fox", "m_umbrella"], boss: "b_inari", rareMob: null },
    { name: "鳴神大社殘跡", minLvl: 30, maxLvl: 39, mobs: ["m_thunder", "m_bird"], boss: "b_tengu", rareMob: null },
    { name: "黃泉平坂．入口", minLvl: 40, maxLvl: 49, mobs: ["m_ghoul", "m_skel"], boss: "b_yomi", rareMob: null },
    { name: "三途川畔", minLvl: 50, maxLvl: 59, mobs: ["m_hag", "m_wheel"], boss: "b_sanzu", rareMob: null },
    { name: "賊寇營地", minLvl: 50, maxLvl: 99, mobs: ["m_ghoul", "m_skel"], boss: "b_bandit", rareMob: null },
    { name: "大江山．鬼族巢穴", minLvl: 60, maxLvl: 69, mobs: ["m_spider", "m_oni"], boss: "b_shuten", rareMob: null },
    { name: "無間奈落", minLvl: 70, maxLvl: 999, mobs: ["m_gozu", "m_mezu"], boss: "b_enma", rareMob: null }
];


// --- ⛩️ 永夜之境：流派宗門資料庫 ---
const SECT_DB = {
    'samurai': {
        id: 'samurai', name: '天辰一刀流', roleName: '武士道', mainStat: 'str',
        guideNPC: '【師範代】 劍之介', leaderNPC: '【宗主】 柳生',
        desc: '追求極致的單發破壞力與暴擊，放棄無謂的防禦。',
        joinHint: '需要展現純粹的武力。前往賊寇營地，提著頭目的刀來見我。',
        ranks: ['門下生', '目錄', '免許皆傳'],
        reqContrib: [0, 500, 2000], // 晉升下一階所需貢獻度
        skills: ['sect_samurai_p1', 'sect_samurai_a1', 'sect_samurai_p2', 'sect_samurai_a2', 'sect_samurai_ult']
    },
    'ninja': {
        id: 'ninja', name: '夜叉隱秘眾', roleName: '忍者', mainStat: 'agi',
        guideNPC: '【引路人】 渡鴉', leaderNPC: '【首領】 霧影',
        desc: '如影隨形，用劇毒與極限的閃避折磨對手。',
        joinHint: '夜叉不收死人。在幻影竹林的試煉中，證明妳能活過 60 秒。',
        ranks: ['下忍', '中忍', '上忍'],
        reqContrib: [0, 500, 2000],
        skills: ['sect_ninja_p1', 'sect_ninja_a1', 'sect_ninja_p2', 'sect_ninja_poison_synergy', 'sect_ninja_a2', 'sect_ninja_ult']
    },
    'shinto': {
        id: 'shinto', name: '高天原神道', roleName: '神道', mainStat: 'vit',
        guideNPC: '【禰宜】 柊', leaderNPC: '【大宮司】 宗像',
        desc: '借用神明之力，雖然攻擊緩慢，但擁有極高的生存力與法術爆發。',
        joinHint: '神明只庇佑虔誠之人。捐獻十萬香油錢，並呈上神恩注連繩吧。',
        ranks: ['見習', '正階', '齋王'],
        reqContrib: [0, 500, 2000],
        skills: ['sect_shinto_p1', 'sect_shinto_a1', 'sect_shinto_p2', 'sect_shinto_a2', 'sect_shinto_ult']
    }
};





const skillDB = {
    'agi_combo1': { id: 'agi_combo1', req: { agi: 5 }, cat: 'init', name: '猛毒刃', type: 'passive', desc: '【被動】普通攻擊時有 15% 機率使目標中毒，每秒造成 (速度 x 1.5) 的真實傷害，持續 4 秒。', color: '#2ecc71' },
    'agi_combo2': { id: 'agi_combo2', req: { agi: 15 }, cat: 'init', name: '風刃', type: 'passive', desc: '【被動】普通攻擊時有 20% 機率喚起微風，追加 (物理攻擊 x 0.5 + 速度 x 1.0) 的風屬性傷害。', color: '#2ecc71' },
    'vit_strike': { id: 'vit_strike', req: { vit: 5 }, cat: 'init', name: '靈氣爆發', type: 'active', desc: '將體內真氣瞬間外放，造成 (魔法攻擊 x 8.0) 點魔法傷害並震暈敵方 1.5 秒。', cd: 12, color: '#e1b12c' },
    'vit_thorns': { id: 'vit_thorns', req: { vit: 10 }, cat: 'init', name: '反擊架勢', type: 'passive', desc: '受到攻擊時，必定反彈 50% 減傷前的物理傷害，並附加 (護甲防禦 x 1.5) 的震懾傷害。', color: '#e1b12c' },
    'str_cleave': { id: 'str_cleave', req: { str: 15 }, cat: 'init', name: '蓄力一擊', type: 'active', desc: '造成 (物理攻擊 x 2.5) 點物理傷害，且該次攻擊完全無視敵方防禦。', cd: 15, color: '#ff4757' },
    // --- 🗡️ 無明一刀流 (力量/爆擊/瞬間爆發) ---
    'sect_samurai_p1': { id: 'sect_samurai_p1', rank: 0, req: { str: 50 }, cat: 'job', name: '劍氣護體', type: 'trait', desc: '【流派特性】武士的霸氣不言而喻。轉職後永久提升 10% 基礎物理攻擊力與 5% 減傷。(無須裝備)', color: '#e74c3c' },
    'sect_samurai_a1': { id: 'sect_samurai_a1', rank: 0, req: { str: 60 }, cat: 'job', name: '秘劍・居合', type: 'active', desc: '【初傳】拔刀術的極致！造成極高物理傷害，若目標血量低於 30%，傷害翻倍。', cd: 10, color: '#e74c3c' },
    'sect_samurai_p2': { id: 'sect_samurai_p2', rank: 1, req: { str: 100 }, cat: 'job', name: '鬼人化', type: 'passive', desc: '【核心被動】捨棄防禦追求極致殺戮。爆擊率提升 15%，且爆擊時無視目標 20% 護甲。', color: '#e74c3c' },
    'sect_samurai_a2': { id: 'sect_samurai_a2', rank: 1, req: { str: 120 }, cat: 'job', name: '燕返', type: 'active', desc: '【主動】擺出招架架勢，接下來的 5 秒內若受到物理攻擊，將完全格擋並造成 200% 的反擊傷害！', cd: 18, color: '#e74c3c' },
    'sect_samurai_ult': { id: 'sect_samurai_ult', rank: 2, req: { str: 180 }, cat: 'job', name: '奧義・修羅一閃', type: 'active', desc: '【終極奧義】燃燒生命力發動的絕命一擊。消耗 10% 當前生命，對全體敵人造成毀滅性物理斬擊！', cd: 25, color: '#e74c3c' },

    // --- 🥷 夜叉隱秘眾 (敏捷/毒殺/閃避反擊) ---
    'sect_ninja_p1': { id: 'sect_ninja_p1', rank: 0, req: { agi: 50 }, cat: 'job', name: '忍法・幻影', type: 'trait', desc: '【流派特性】忍者天生身輕如燕，攻擊淬有劇毒。轉職後永久提升 10% 基礎閃避率，且普通攻擊有 20% 機率使目標中毒，持續 8 秒。(無須裝備於技能槽)', color: '#2ecc71' },
    'sect_ninja_a1': { id: 'sect_ninja_a1', rank: 0, req: { agi: 60 }, cat: 'job', name: '忍具・苦無微塵', type: 'active', desc: '【下忍】投擲苦無，對目標造成傷害並強制附加中毒效果。若目標已中毒，則改為引爆所有剩餘毒傷，造成大量真實傷害。', cd: 12, color: '#2ecc71' },
    'sect_ninja_p2': { id: 'sect_ninja_p2', rank: 1, req: { agi: 100 }, cat: 'job', name: '毒術・紫藤', type: 'passive', desc: '【核心被動】精通毒的奧義。毒素發作頻率提升，並且會腐蝕目標護甲，使其防禦力降低 30%。', color: '#2ecc71' },
    'sect_ninja_poison_synergy': { id: 'sect_ninja_poison_synergy', rank: 1, req: { agi: 85 }, cat: 'job', name: '毒刃・暴發', type: 'passive', desc: '【毒忍強化】對已中毒的敵方，每次普通攻擊有 25% 機率引爆毒液，造成 (當前毒層數 × 速度 × 0.8) 真實傷害。', color: '#2ecc71' },
    'sect_ninja_a2': { id: 'sect_ninja_a2', rank: 1, req: { agi: 120 }, cat: 'job', name: '忍法・影分身', type: 'active', desc: '【主動】召喚殘影協同作戰，發動瞬間進行三次疾風連斬！', cd: 15, color: '#2ecc71' },
    'sect_ninja_ult': { id: 'sect_ninja_ult', rank: 2, req: { agi: 180 }, cat: 'job', name: '秘傳・黃泉送葬', type: 'active', desc: '【終極奧義】進入 5 秒黃泉領域。期間只要成功閃避敵方攻擊，必定無視冷卻發動強力反擊！', cd: 20, color: '#2ecc71' },

    // --- ⛩️ 高天原神道 (體質/回復/法術反傷) ---
    'sect_shinto_p1': { id: 'sect_shinto_p1', rank: 0, req: { vit: 50 }, cat: 'job', name: '神明庇佑', type: 'trait', desc: '【流派特性】受神明眷顧之軀。轉職後最大生命值 (HP) 永久提升 15%，且每 5 秒自動回復最大生命值的 5%。(無須裝備)', color: '#e1b12c' },
    'sect_shinto_a1': { id: 'sect_shinto_a1', rank: 0, req: { vit: 60 }, cat: 'job', name: '破魔矢', type: 'active', desc: '【祝詞】發射蘊含神力的箭矢，造成基於 VIT (體質) 的魔法傷害，並降低敵方 10% 攻擊力。', cd: 10, color: '#e1b12c' },
    'sect_shinto_p2': { id: 'sect_shinto_p2', rank: 1, req: { vit: 100 }, cat: 'job', name: '禍津反轉', type: 'passive', desc: '【核心被動】將受到的苦難轉為恩惠。每次受到攻擊時，有 20% 機率回復等同自身 VIT 數值的生命。', color: '#e1b12c' },
    'sect_shinto_a2': { id: 'sect_shinto_a2', rank: 1, req: { vit: 120 }, cat: 'job', name: '天狐結界', type: 'active', desc: '【主動】展開結界。5 秒內受到的所有傷害降低 40%，並將減免的傷害轉化為治療波輻射自身。', cd: 20, color: '#e1b12c' },
    'sect_shinto_ult': { id: 'sect_shinto_ult', rank: 2, req: { vit: 180 }, cat: 'job', name: '神威・天照', type: 'active', desc: '【終極奧義】召喚太陽神之光！瞬間淨化所有負面狀態，恢復 40% 生命，並對敵人造成神聖灼燒傷害。', cd: 30, color: '#e1b12c' }
};

function getItem(id) { return ITEM_DB[id] || { name: "不明物體", cost: 0, val: 0, rate: 0, value: 0, sellable: false, sellPrice: 0 }; }