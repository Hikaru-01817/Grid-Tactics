const CARD_DEFINITIONS = [
  {
    id: "unit_001",
    name: "見習い騎士",
    type: "unit",
    cost: 1,
    attack: 1,
    hp: 2,
    rarity: "bronze",
    text: "",
    effect: null
  },
  {
    id: "unit_002",
    name: "斧の戦士",
    type: "unit",
    cost: 2,
    attack: 2,
    hp: 2,
    rarity: "bronze",
    text: "",
    effect: null
  },
  {
    id: "unit_003",
    name: "盾の兵士",
    type: "unit",
    cost: 2,
    attack: 1,
    hp: 4,
    rarity: "bronze",
    text: "",
    effect: null
  },
  {
    id: "unit_004",
    name: "白銀の騎士",
    type: "unit",
    cost: 3,
    attack: 3,
    hp: 3,
    rarity: "silver",
    text: "",
    effect: null
  },
  {
    id: "unit_005",
    name: "突撃兵",
    type: "unit",
    cost: 3,
    attack: 4,
    hp: 2,
    rarity: "silver",
    text: "",
    effect: null
  },
  {
    id: "unit_006",
    name: "鋼の守護者",
    type: "unit",
    cost: 4,
    attack: 2,
    hp: 5,
    rarity: "gold",
    text: "",
    effect: null
  },
  {
    id: "unit_007",
    name: "戦場の指揮官",
    type: "unit",
    cost: 4,
    attack: 3,
    hp: 4,
    rarity: "gold",
    text: "登場時：味方ユニット1体を+1/+1。",
    effect: "battlecry_buff_ally"
  },
  {
    id: "unit_008",
    name: "巨大兵",
    type: "unit",
    cost: 5,
    attack: 5,
    hp: 5,
    rarity: "silver",
    text: "",
    effect: null
  },
  {
    id: "spell_001",
    name: "火炎弾",
    type: "spell",
    cost: 2,
    rarity: "bronze",
    text: "相手ユニット1体か相手プレイヤーに2ダメージ。",
    effect: "deal_2_damage"
  },
  {
    id: "spell_002",
    name: "治癒の光",
    type: "spell",
    cost: 2,
    rarity: "bronze",
    text: "自分プレイヤーを3回復。",
    effect: "heal_3"
  },
  {
    id: "spell_003",
    name: "戦術補給",
    type: "spell",
    cost: 2,
    rarity: "bronze",
    text: "カードを1枚引く。",
    effect: "draw_1"
  },
  {
    id: "spell_004",
    name: "力の紋章",
    type: "spell",
    cost: 1,
    rarity: "bronze",
    text: "味方ユニット1体を+1/+1。",
    effect: "buff_ally_1"
  },
  {
    id: "extra_001",
    name: "覚醒竜グランヴェイル",
    type: "extra_unit",
    cost: 5,
    attack: 5,
    hp: 5,
    rarity: "legend",
    condition: "graveyard_units_5",
    text: "自分の墓地のユニットが5体以上なら召喚できる。登場時、相手ユニット1体に3ダメージ。",
    effect: "battlecry_enemy_3"
  },
  {
    id: "extra_002",
    name: "終焉の魔弾",
    type: "extra_spell",
    cost: 4,
    rarity: "legend",
    condition: "low_hp_10",
    text: "自分の体力が10以下なら使用できる。相手ユニットすべてに2ダメージ。",
    effect: "enemy_all_2"
  }
];

const FIXED_DECK_LIST = [
  ["unit_001", 3],
  ["unit_002", 3],
  ["unit_003", 3],
  ["unit_004", 3],
  ["unit_005", 3],
  ["unit_006", 3],
  ["unit_007", 3],
  ["unit_008", 3],
  ["spell_001", 2],
  ["spell_002", 1],
  ["spell_003", 2],
  ["spell_004", 1]
];

window.CardGameData = {
  cards: CARD_DEFINITIONS,
  fixedDeck: FIXED_DECK_LIST,
  extra: ["extra_001", "extra_002"]
};
