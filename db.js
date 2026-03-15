/* ==========================================================================
   📦 中央數據庫 (ITEM_DB, HELPER_DB, MOB_DB, maps, skillDB)
   ========================================================================== */

const ITEM_DB = {
    'p1': { id: 'p1', cat: 'rec', name: '生鮮野味', tag: '+50HP', cost: 15, value: 50, rate: 0, sellable: true, sellPrice: 3, shopAvailable: false, shopTab: 'rec', desc: '野外獲得的生肉，口感欠佳。' },
    'p2': { id: 'p2', cat: 'rec', name: '醃製獸肉', tag: '+250HP', cost: 60, value: 250, rate: 0, sellable: true, sellPrice: 20, shopAvailable: true, shopTab: 'rec', desc: '萬屋特製的乾肉，補給量較高。' },
    'p3': { id: 'p3', cat: 'rec', name: '行軍丸子', tag: '恢復30%', cost: 300, value: 0, rate: 0.3, sellable: true, sellPrice: 100, shopAvailable: true, shopTab: 'rec', desc: '專業配方煉製的補給，效果顯著。' },
    'p4': { id: 'p4', cat: 'rec', name: '天照御神露', tag: '全恢復', cost: 2000, value: 0, rate: 1.0, sellable: true, sellPrice: 500, shopAvailable: true, shopTab: 'rec', desc: '傳說中的神水，完全恢復。' },
    
    'm0': { id: 'm0', cat: 'mat', name: '妖化鐵砂', sellable: true, sellPrice: 2, shopAvailable: false, shopTab: 'mat', desc: '受妖氣侵蝕的細砂。' },
    'm1': { id: 'm1', cat: 'mat', name: '竹妖的韌皮', sellable: true, sellPrice: 5, shopAvailable: false, shopTab: 'mat', desc: '竹妖身上最堅韌的部分。' },
    'm2': { id: 'm2', cat: 'mat', name: '怨念的木片', sellable: true, sellPrice: 15, shopAvailable: false, shopTab: 'mat', desc: '寄宿著森林亡魂的碎木。' },
    'm3': { id: 'm3', cat: 'mat', name: '染血的破傘', sellable: true, sellPrice: 35, shopAvailable: false, shopTab: 'mat', desc: '古道上遺落的殘破遺物。' },
    'm4': { id: 'm4', cat: 'mat', name: '雷精的碎核', sellable: true, sellPrice: 80, shopAvailable: false, shopTab: 'mat', desc: '強大雷電能量的結晶體。' },

    'revive': { id: 'revive', cat: 'oth', name: '不死御守', tag: '復活', cost: 5000, sellable: false, sellPrice: 0, shopAvailable: true, shopTab: 'oth', desc: '抵擋一次致命傷害。' },
    'wash_stats': { id: 'wash_stats', cat: 'oth', name: '忘卻之水', tag: '重置', cost: 100, sellable: false, sellPrice: 0, shopAvailable: true, shopTab: 'oth', desc: '重置所有已分配的屬性。' }
};

const HELPER_DB = {
    'h1': { 
        id: 'h1', name: '流浪浪人・伍丸', cost: 300, duration: 30,
        skillType: 'attack', skillVal: 15, skillCd: 6,
        passive: (p) => { return { atk: 3, def: 0, eva: 0 }; }, 
        workBonus: { rate: 1.2, label: "護衛：工錢提升 20%" },
        desc: '追求劍道的浪人。增加基礎攻擊 3 點，每 6 秒施放一次斬擊（15點真實傷害）。' 
    },
    'h2': { 
        id: 'h2', name: '見習巫女・小葵', cost: 300, duration: 30,
        skillType: 'heal', skillVal: 40, skillCd: 8,
        passive: (p) => { return { atk: 0, def: 2, eva: 0 }; }, 
        workBonus: { rate: 1.15, label: "人氣：小費提升 15%" },
        desc: '里中神社的修行者。增加減傷 2%，每 8 秒恢復 40 點生命值。' 
    },
    'h3': { 
        id: 'h3', name: '陰陽生・安倍才藏', cost: 300, duration: 30,
        skillType: 'seal', skillVal: 1.5, skillCd: 10,
        passive: (p) => { return { atk: 0, def: 0, eva: 2 }; }, 
        workBonus: { rate: 1.0, label: "無打工加成" },
        desc: '陰陽寮的學員。增加閃避率 2%，每 10 秒施放定身符，封印敵人攻擊 1.5 秒。' 
    }
};

const MOB_DB = {
    'm_dummy': { name: '朽木樁', hp: 1, atk: 0, defVal: 0, dr: 0, eva: 0, exp: 0, gold: 0, drops: [] },
    'm_rabbit': { name: '野生長耳兔', hp: 35, atk: 2, defVal: 0, dr: 0.02, eva: 5, exp: 3, gold: 2, drops: [{id:'p1', chance:0.25}, {id:'m0', chance:0.05}] },
    'm_fox_cub': { name: '落單幼狐', hp: 40, atk: 3, defVal: 0, dr: 0.02, eva: 8, exp: 4, gold: 3, drops: [{id:'p1', chance:0.30}, {id:'m0', chance:0.05}] },
    'b_wolf': { name: '飢餓的野狼', hp: 250, atk: 14, defVal: 5, dr: 0.10, eva: 10, isBoss: true, drops: [{id:'p2', chance:0.50}, {id:'m0', chance:0.50}] },
    'r_gold_rabbit': { name: '✨ 貪婪金兔', hp: 120, atk: 5, defVal: 2, dr: 0.05, eva: 30, isBoss: false, drops: [{id:'p2', chance:1.0}, {id:'m0', chance:1.0}] },
    'm_dog': { name: '迷途犬', hp: 60, atk: 5, defVal: 3, dr: 0.05, eva: 10, exp: 6, gold: 5, drops: [{id:'p1', chance:0.10}, {id:'m1', chance:0.15}] },
    'm_bamboo': { name: '竹林小鬼', hp: 75, atk: 7, defVal: 5, dr: 0.08, eva: 5, exp: 7, gold: 6, drops: [{id:'m1', chance:0.15}, {id:'m0', chance:0.10}] },
    'b_lion': { name: '荒廢石獅子', hp: 500, atk: 22, defVal: 15, dr: 0.15, eva: 5, isBoss: true, drops: [{id:'p2', chance:0.80}, {id:'m1', chance:1.0}] },
    'm_tengu': { name: '天狗', hp: 150, atk: 10, defVal: 10, dr: 0.10, eva: 20, exp: 15, gold: 15, drops: [{id:'p2', chance:0.10}, {id:'m2', chance:0.15}] },
    'm_yama': { name: '山童', hp: 180, atk: 13, defVal: 18, dr: 0.12, eva: 5, exp: 18, gold: 18, drops: [{id:'m2', chance:0.15}, {id:'m0', chance:0.10}] },
    'b_spirit': { name: '怨念木靈', hp: 1200, atk: 30, defVal: 25, dr: 0.20, eva: 15, isBoss: true, drops: [{id:'p3', chance:0.50}, {id:'m2', chance:1.0}] },
    'm_fox': { name: '白狐', hp: 350, atk: 18, defVal: 20, dr: 0.15, eva: 25, exp: 40, gold: 35, drops: [{id:'p2', chance:0.15}, {id:'m3', chance:0.15}] },
    'm_umbrella': { name: '紙傘怪', hp: 380, atk: 22, defVal: 25, dr: 0.18, eva: 15, exp: 45, gold: 40, drops: [{id:'m3', chance:0.15}, {id:'m0', chance:0.10}] },
    'b_inari': { name: '邪染稻荷使', hp: 3000, atk: 45, defVal: 40, dr: 0.25, eva: 20, isBoss: true, drops: [{id:'p4', chance:0.10}, {id:'m3', chance:1.0}] },
    'm_thunder': { name: '雷精', hp: 900, atk: 30, defVal: 35, dr: 0.20, eva: 20, exp: 100, gold: 70, drops: [{id:'p3', chance:0.10}, {id:'m4', chance:0.15}] },
    'm_bird': { name: '雷震子', hp: 1000, atk: 35, defVal: 40, dr: 0.22, eva: 25, exp: 110, gold: 80, drops: [{id:'m4', chance:0.15}, {id:'m0', chance:0.10}] },
    'b_tengu': { name: '蒼雷大天狗', hp: 8000, atk: 70, defVal: 60, dr: 0.30, eva: 30, isBoss: true, drops: [{id:'p4', chance:0.50}, {id:'m4', chance:1.0}] }
};

const maps = [
    { name: "[修行] 幽靜道場", minLvl: 1, maxLvl: 999, mobs: ["m_dummy"], rareMob: null, boss: null },
    { name: "[補給] 靜謐荒野", minLvl: 1, maxLvl: 5, mobs: ["m_rabbit", "m_fox_cub"], boss: "b_wolf", rareMob: {id: "r_gold_rabbit", chance: 0.05} },
    { name: "遺忘的竹林", minLvl: 1, maxLvl: 9, mobs: ["m_dog", "m_bamboo"], boss: "b_lion", rareMob: null },
    { name: "靜謐之森", minLvl: 10, maxLvl: 19, mobs: ["m_tengu", "m_yama"], boss: "b_spirit", rareMob: null },
    { name: "伏見古道", minLvl: 20, maxLvl: 29, mobs: ["m_fox", "m_umbrella"], boss: "b_inari", rareMob: null },
    { name: "鳴神大社殘跡", minLvl: 30, maxLvl: 999, mobs: ["m_thunder", "m_bird"], boss: "b_tengu", rareMob: null }
];

const skillDB = {
    'agi_combo1': { id: 'agi_combo1', req: { agi: 5 }, cat: 'init', name: '速擊', type: 'passive', desc: '攻擊時10%機率造成1.5倍傷害', color: '#70a1ff' },
    'agi_combo2': { id: 'agi_combo2', req: { agi: 10 }, cat: 'init', name: '殘影', type: 'passive', desc: '攻擊時10%機率觸發二連擊', color: '#70a1ff' },
    'vit_strike': { id: 'vit_strike', req: { vit: 5 }, cat: 'init', name: '剛力震擊', type: 'active', desc: '造成(攻擊+體質x2)的傷害', cd: 8, color: '#e1b12c' },
    'vit_thorns': { id: 'vit_thorns', req: { vit: 15 }, cat: 'init', name: '震怒', type: 'passive', desc: '受傷時20%機率反彈所有傷害', color: '#e1b12c' },
    'str_cleave': { id: 'str_cleave', req: { str: 15 }, cat: 'init', name: '破甲重劈', type: 'active', desc: '造成2.5倍傷害，且破防15%', cd: 10, color: '#ff4757' }
};

function getItem(id) { return ITEM_DB[id] || { name: "不明物體", cost: 0, val: 0, rate: 0, value: 0, sellable: false, sellPrice: 0 }; }