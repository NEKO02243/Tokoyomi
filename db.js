/* ==========================================================================
   📦 中央數據庫 (ITEM_DB, HELPER_DB, MOB_DB, maps, skillDB) - V0.7.2
   ========================================================================== */

const EFFECT_MAP = {
    'exp_boost': { field: 'exp', multiplier: 1.2, name: '經驗加成' },
    'gold_boost': { field: 'gold', multiplier: 1.3, name: '金幣加成' },
    'atk_boost': { field: 'atk', multiplier: 1.1, name: '攻擊加成' },
    'god_bless': { field: 'all', multiplier: 1.5, name: '神明降臨' } 
};

const ITEM_DB = {
    'p1': { id: 'p1', cat: 'rec', name: '生鮮野味', tag: '+50HP', cost: 15, value: 50, rate: 0, sellable: true, sellPrice: 3, shopAvailable: false, shopTab: 'rec', desc: '野外獲得的生肉，口感欠佳。' },
    'p2': { id: 'p2', cat: 'rec', name: '醃製獸肉', tag: '+250HP', cost: 60, value: 250, rate: 0, sellable: true, sellPrice: 20, shopAvailable: true, shopTab: 'rec', desc: '萬屋特製的乾肉，補給量較高。' },
    'p5': { id: 'p5', cat: 'rec', name: '百年靈芝', tag: '+800HP', cost: 400, value: 800, rate: 0, sellable: true, sellPrice: 150, shopAvailable: true, shopTab: 'rec', desc: '深山中採摘的靈藥，能迅速恢復大量體力。' },
    'p3': { id: 'p3', cat: 'rec', name: '行軍丸子', tag: '恢復30%', cost: 300, value: 0, rate: 0.3, sellable: true, sellPrice: 100, shopAvailable: true, shopTab: 'rec', desc: '專業配方煉製的補給，效果顯著。' },
    'p6': { id: 'p6', cat: 'rec', name: '妖血秘藥', tag: '+2500HP', cost: 1500, value: 2500, rate: 0, sellable: true, sellPrice: 400, shopAvailable: true, shopTab: 'rec', desc: '以大妖之血煉製，能瞬間恢復極大生命值。' },
    'p4': { id: 'p4', cat: 'rec', name: '天照御神露', tag: '全恢復', cost: 3000, value: 0, rate: 1.0, sellable: true, sellPrice: 1000, shopAvailable: true, shopTab: 'rec', desc: '傳說中的神水，完全恢復。' },
    
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

    'wash_star': { id: 'wash_star', cat: 'sp', name: '遺忘星砂', tag: '洗點', cost: 10, sellable: false, sellPrice: 0, shopAvailable: true, shopTab: 'oth', desc: '神秘的星砂。可在行囊中使用，精準洗退 1 點手動分配的屬性點。' },
    'c_shrine': { id: 'c_shrine', cat: 'sp', name: '神德代幣', tag: '信仰', cost: 0, sellable: false, sellPrice: 0, shopAvailable: false, shopTab: 'oth', desc: '奉納後獲得的神明恩賜，可用於兌換特殊物資。' },
    's_omikuji': { id: 's_omikuji', cat: 'sp', name: '御神籤', tag: '抽吉凶', cost: 1, reqDonation: 0, sellable: false, sellPrice: 0, shopAvailable: false, desc: '占卜吉凶的籤紙。使用後隨機獲得金幣或珍貴素材。' },
    's_ema': { id: 's_ema', cat: 'sp', name: '祈願絵馬', effect: 'gold_boost', duration: 1800, cost: 2, reqDonation: 5000, sellable: false, sellPrice: 0, shopAvailable: false, desc: '寫滿願望的木牌。使用後 30 分鐘內，金幣掉落增加。' },
    's_omiki': { id: 's_omiki', cat: 'sp', name: '御神酒', effect: 'exp_boost', duration: 1800, cost: 2, reqDonation: 5000, sellable: false, sellPrice: 0, shopAvailable: false, desc: '神明賜福的清酒。使用後 30 分鐘內，經驗值獲取增加。' },
    's_hamaya': { id: 's_hamaya', cat: 'sp', name: '破魔矢', effect: 'atk_boost', duration: 900, cost: 3, reqDonation: 10000, sellable: false, sellPrice: 0, shopAvailable: false, desc: '破除邪惡的神箭。使用後 15 分鐘內，物理攻擊威力增加。' },
    'revive': { id: 'revive', cat: 'sp', name: '替身御札', tag: '免死一次', cost: 5, reqDonation: 20000, sellable: false, sellPrice: 0, shopAvailable: false, desc: '蘊含強大靈力的護身符。持有時自動生效，抵擋一次致命傷害。' }
};

// ✨ 夥伴資料庫新增 role 與 roleName 分類
const HELPER_DB = {
    'h1': { id: 'h1', role: 'phy', roleName: '武術', name: '流浪浪人・伍丸', cost: 300, duration: 30, skillType: 'attack', skillVal: 15, skillCd: 6, passive: (p) => { return { atk: 3, def: 0, eva: 0 }; }, workBonus: { rate: 1.2, label: "護衛：工錢提升 20%" }, desc: '追求劍道的浪人。增加基礎攻擊 3 點，每 6 秒施放一次斬擊（15點真實傷害）。' },
    'h2': { id: 'h2', role: 'mag', roleName: '法術', name: '見習巫女・小葵', cost: 300, duration: 30, skillType: 'heal', skillVal: 40, skillCd: 8, passive: (p) => { return { atk: 0, def: 2, eva: 0 }; }, workBonus: { rate: 1.15, label: "人氣：小費提升 15%" }, desc: '里中神社的修行者。增加護甲 2 點，每 8 秒恢復 40 點生命值。' },
    'h3': { id: 'h3', role: 'agi', roleName: '奇術', name: '陰陽生・安倍才藏', cost: 300, duration: 30, skillType: 'seal', skillVal: 1.5, skillCd: 10, passive: (p) => { return { atk: 0, def: 0, eva: 2 }; }, workBonus: { rate: 1.0, label: "無打工加成" }, desc: '陰陽寮的學員。增加閃避率 2%，每 10 秒施放定身符，封印敵人攻擊 1.5 秒。' },
    'h4': { id: 'h4', role: 'phy', roleName: '武術', name: '怪力僧・權助', cost: 500, duration: 60, skillType: 'defend', skillVal: 20, skillCd: 15, passive: (p) => { return { atk: 0, def: 8, eva: 0 }; }, workBonus: { rate: 1.3, label: "苦力：工錢提升 30%" }, desc: '遊歷四方的破戒僧。增加護甲 8 點，每 15 秒施放金剛罩，吸收 20 點傷害。' },
    'h5': { id: 'h5', role: 'agi', roleName: '奇術', name: '賞金獵人・燕', cost: 600, duration: 60, skillType: 'hunt', skillVal: 1.5, skillCd: 0, passive: (p) => { return { atk: 5, def: 0, eva: 5 }; }, workBonus: { rate: 1.5, label: "暴利：工錢提升 50%" }, desc: '認錢不認人的殺手。增加攻擊 5 點、閃避 5%，並使戰鬥掉落的金幣提升 50%。' }
};

const MOB_DB = {
    'm_dummy': { name: '朽木樁', hp: 1, atk: 0, defVal: 0, dr: 0, eva: 0, agi: 0, exp: 0, gold: 0, drops: [] },
    'm_rabbit': { name: '野生長耳兔', hp: 35, atk: 2, defVal: 0, dr: 0.02, eva: 5, agi: 10, exp: 3, gold: 2, drops: [{id:'p1', chance:0.25}, {id:'m0', chance:0.05}] },
    'm_fox_cub': { name: '落單幼狐', hp: 40, atk: 3, defVal: 0, dr: 0.02, eva: 8, agi: 15, exp: 4, gold: 3, drops: [{id:'p1', chance:0.30}, {id:'m0', chance:0.05}] },
    'b_wolf': { name: '飢餓的野狼', hp: 250, atk: 14, defVal: 5, dr: 0.10, eva: 10, agi: 30, isBoss: true, drops: [{id:'p5', chance:0.50}, {id:'mat_wolf', chance:1.0}] },
    'r_gold_rabbit': { name: '✨ 貪婪金兔', hp: 120, atk: 5, defVal: 2, dr: 0.05, eva: 30, agi: 150, isBoss: false, drops: [{id:'p2', chance:1.0}, {id:'m0', chance:1.0}] },
    'm_dog': { name: '迷途犬', hp: 60, atk: 5, defVal: 3, dr: 0.05, eva: 10, agi: 20, exp: 6, gold: 5, drops: [{id:'p1', chance:0.10}, {id:'m1', chance:0.15}] },
    'm_bamboo': { name: '竹林小鬼', hp: 75, atk: 7, defVal: 5, dr: 0.08, eva: 5, agi: 15, exp: 7, gold: 6, drops: [{id:'m1', chance:0.15}, {id:'m0', chance:0.10}] },
    'b_lion': { name: '荒廢石獅子', hp: 500, atk: 22, defVal: 15, dr: 0.15, eva: 5, agi: 15, isBoss: true, drops: [{id:'p2', chance:0.80}, {id:'mat_lion', chance:1.0}] },
    'm_tengu': { name: '天狗', hp: 150, atk: 10, defVal: 10, dr: 0.10, eva: 20, agi: 45, exp: 15, gold: 15, drops: [{id:'p2', chance:0.10}, {id:'m2', chance:0.15}] },
    'm_yama': { name: '山童', hp: 180, atk: 13, defVal: 18, dr: 0.12, eva: 5, agi: 20, exp: 18, gold: 18, drops: [{id:'m2', chance:0.15}, {id:'m0', chance:0.10}] },
    'b_spirit': { name: '怨念木靈', hp: 1200, atk: 30, defVal: 25, dr: 0.20, eva: 15, agi: 35, isBoss: true, drops: [{id:'p5', chance:0.50}, {id:'m2', chance:1.0}] },
    'm_fox': { name: '白狐', hp: 350, atk: 18, defVal: 20, dr: 0.15, eva: 25, agi: 60, exp: 40, gold: 35, drops: [{id:'p5', chance:0.15}, {id:'m3', chance:0.15}] },
    'm_umbrella': { name: '紙傘怪', hp: 380, atk: 22, defVal: 25, dr: 0.18, eva: 15, agi: 40, exp: 45, gold: 40, drops: [{id:'m3', chance:0.15}, {id:'m0', chance:0.10}] },
    'b_inari': { name: '邪染稻荷使', hp: 3000, atk: 45, defVal: 40, dr: 0.25, eva: 20, agi: 80, isBoss: true, drops: [{id:'p3', chance:0.20}, {id:'mat_fox', chance:1.0}] },
    'm_thunder': { name: '雷精', hp: 900, atk: 30, defVal: 35, dr: 0.20, eva: 20, agi: 70, exp: 100, gold: 70, drops: [{id:'p3', chance:0.10}, {id:'m4', chance:0.15}] },
    'm_bird': { name: '雷震子', hp: 1000, atk: 35, defVal: 40, dr: 0.22, eva: 25, agi: 90, exp: 110, gold: 80, drops: [{id:'m4', chance:0.15}, {id:'m0', chance:0.10}] },
    'b_tengu': { name: '蒼雷大天狗', hp: 8000, atk: 70, defVal: 60, dr: 0.30, eva: 30, agi: 120, isBoss: true, drops: [{id:'p6', chance:0.50}, {id:'mat_tengu', chance:1.0}] },
    'm_ghoul': { name: '飢餓的餓鬼', hp: 2500, atk: 65, defVal: 45, dr: 0.25, eva: 15, agi: 50, exp: 250, gold: 120, drops: [{id:'p3', chance:0.20}, {id:'m5', chance:0.15}] },
    'm_skel': { name: '遊蕩骸骨兵', hp: 2800, atk: 75, defVal: 55, dr: 0.28, eva: 10, agi: 40, exp: 280, gold: 140, drops: [{id:'m5', chance:0.20}, {id:'m0', chance:0.15}] },
    'b_yomi': { name: '黃泉衛士', hp: 25000, atk: 120, defVal: 80, dr: 0.35, eva: 15, agi: 90, isBoss: true, drops: [{id:'p4', chance:0.60}, {id:'mat_yomi', chance:1.0}] },
    'm_hag': { name: '三途川奪衣婆', hp: 6500, atk: 90, defVal: 60, dr: 0.30, eva: 30, agi: 110, exp: 600, gold: 250, drops: [{id:'p6', chance:0.20}, {id:'m6', chance:0.15}] },
    'm_wheel': { name: '業火車', hp: 8000, atk: 110, defVal: 70, dr: 0.32, eva: 15, agi: 80, exp: 750, gold: 300, drops: [{id:'m6', chance:0.20}, {id:'m0', chance:0.20}] },
    'b_sanzu': { name: '冥河擺渡人', hp: 60000, atk: 180, defVal: 100, dr: 0.40, eva: 25, agi: 150, isBoss: true, drops: [{id:'p4', chance:1.0}, {id:'m6', chance:1.0}] }
};

const maps = [
    { name: "[修行] 幽靜道場", minLvl: 1, maxLvl: 999, mobs: ["m_dummy"], rareMob: null, boss: null },
    { name: "[補給] 靜謐荒野", minLvl: 1, maxLvl: 5, mobs: ["m_rabbit", "m_fox_cub"], boss: "b_wolf", rareMob: {id: "r_gold_rabbit", chance: 0.05} },
    { name: "遺忘的竹林", minLvl: 1, maxLvl: 9, mobs: ["m_dog", "m_bamboo"], boss: "b_lion", rareMob: null },
    { name: "靜謐之森", minLvl: 10, maxLvl: 19, mobs: ["m_tengu", "m_yama"], boss: "b_spirit", rareMob: null },
    { name: "伏見古道", minLvl: 20, maxLvl: 29, mobs: ["m_fox", "m_umbrella"], boss: "b_inari", rareMob: null },
    { name: "鳴神大社殘跡", minLvl: 30, maxLvl: 39, mobs: ["m_thunder", "m_bird"], boss: "b_tengu", rareMob: null },
    { name: "黃泉平坂．入口", minLvl: 40, maxLvl: 49, mobs: ["m_ghoul", "m_skel"], boss: "b_yomi", rareMob: null }, 
    { name: "三途川畔", minLvl: 50, maxLvl: 999, mobs: ["m_hag", "m_wheel"], boss: "b_sanzu", rareMob: null }       
];

const skillDB = {
    'agi_combo1': { id: 'agi_combo1', req: { agi: 5 }, cat: 'init', name: '猛毒刃', type: 'active', desc: '攻擊時有 10% 機率使目標中毒，每秒扣除怪物最大生命值 5% (最高不超過玩家 速度 x 1.5 的傷害)。(持續 5 秒)', cd: 0, color: '#2ecc71' },
    'agi_combo2': { id: 'agi_combo2', req: { agi: 15 }, cat: 'init', name: '風刃', type: 'passive', desc: '每次攻擊有 20% 機率附帶 (速度 x 1.5) 的真實傷害。', color: '#2ecc71' },
    'vit_strike': { id: 'vit_strike', req: { vit: 5 }, cat: 'init', name: '靈氣爆發', type: 'active', desc: '將體內真氣瞬間外放，造成 (魔法攻擊 x 8.0) 點魔法傷害並震暈敵方 1.5 秒。', cd: 12, color: '#e1b12c' },
    'vit_thorns': { id: 'vit_thorns', req: { vit: 15 }, cat: 'init', name: '反擊架勢', type: 'passive', desc: '受到攻擊時，必定反彈 50% 減傷前的物理傷害，並附加 (護甲防禦 x 1.5) 的震懾傷害。', color: '#e1b12c' },
    'str_cleave': { id: 'str_cleave', req: { str: 15 }, cat: 'init', name: '蓄力一擊', type: 'active', desc: '造成 (物理攻擊 x 2.5) 點物理傷害，且該次攻擊完全無視敵方防禦。', cd: 15, color: '#ff4757' },
    'sect_samurai_1': { id: 'sect_samurai_1', req: { str: 20, vit: 10 }, cat: 'job', name: '一之型．櫻斬', type: 'active', desc: '武士秘傳。造成 (物理攻擊 x 1.5 + 最大生命值 x 0.05) 的物理傷害。(開發中)', cd: 12, color: '#ff4757' },
    'sect_shinto_1': { id: 'sect_shinto_1', req: { vit: 20, agi: 10 }, cat: 'job', name: '天照神罰', type: 'active', desc: '神道秘傳。以真氣轉化為法術，造成 (魔法攻擊 x 3.5) 的毀滅性魔法傷害。(開發中)', cd: 15, color: '#e1b12c' },
    'sect_onmyoji_1': { id: 'sect_onmyoji_1', req: { agi: 20, str: 10 }, cat: 'job', name: '五星雷符', type: 'active', desc: '陰陽秘傳。施放符咒引雷，造成 (魔法攻擊 x 1.0 + 速度 x 2.0) 的混合傷害。(開發中)', cd: 10, color: '#2ecc71' },
    'sect_ronin_1': { id: 'sect_ronin_1', req: { str: 30 }, cat: 'job', name: '血剎刃', type: 'active', desc: '浪人秘傳。消耗 10% 當前生命值，造成 (物理攻擊 x 3.0) 的物理傷害，並吸血 50%。(開發中)', cd: 8, color: '#8b0000' }
};

function getItem(id) { return ITEM_DB[id] || { name: "不明物體", cost: 0, val: 0, rate: 0, value: 0, sellable: false, sellPrice: 0 }; }