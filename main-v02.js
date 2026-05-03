const dataById = Object.fromEntries(window.CardGameData.cards.map((card) => [card.id, card]));
const lanes = ["left", "center", "right"];
const keywordNames = {
  charge: "疾走",
  rush: "突進",
  guard: "守護"
};
const typeNames = {
  all: "すべて",
  unit: "ユニット",
  spell: "スペル",
  field: "フィールド",
  extra: "エクストラ",
  extra_unit: "エクストラユニット",
  extra_spell: "エクストラスペル"
};
const classNames = window.CardGameData.cardClasses;
const tribeNames = window.CardGameData.tribes;
const rarityNames = {
  all: "すべて",
  bronze: "ブロンズ",
  silver: "シルバー",
  gold: "ゴールド",
  legend: "レジェンド"
};
const deckRules = window.CardGameData.deckRules;
const extraDeckRules = window.CardGameData.extraDeckRules;

let game = null;
let selected = null;
let previewCard = null;
let messageId = 1;
let currentScreen = "home";
let builderDeck = { classId: deckRules.defaultClassId, cards: [], extra: [] };
let builderMode = "main";
let selectedCpuDeckId = "knight";

const els = {
  turnLabel: document.querySelector("#turnLabel"),
  enemyHp: document.querySelector("#enemyHp"),
  enemyCost: document.querySelector("#enemyCost"),
  enemyHandCount: document.querySelector("#enemyHandCount"),
  enemyDeckCount: document.querySelector("#enemyDeckCount"),
  enemyField: document.querySelector("#enemyField"),
  playerHp: document.querySelector("#playerHp"),
  playerCost: document.querySelector("#playerCost"),
  playerAwaken: document.querySelector("#playerAwaken"),
  playerDeckCount: document.querySelector("#playerDeckCount"),
  playerField: document.querySelector("#playerField"),
  enemyBoard: document.querySelector("#enemyBoard"),
  playerBoard: document.querySelector("#playerBoard"),
  hand: document.querySelector("#hand"),
  extraZone: document.querySelector("#extraZone"),
  cardPreview: document.querySelector("#cardPreview"),
  log: document.querySelector("#battleLog"),
  endTurnButton: document.querySelector("#endTurnButton"),
  newGameButton: document.querySelector("#newGameButton"),
  awakenButton: document.querySelector("#awakenButton"),
  enemyHero: document.querySelector("#enemyHero"),
  playerHero: document.querySelector("#playerHero")
};

const ui = {
  screens: {
    home: document.querySelector("#homeScreen"),
    battle: document.querySelector("#battleScreen"),
    deckBuilder: document.querySelector("#deckBuilderScreen"),
    cardLibrary: document.querySelector("#cardLibraryScreen")
  },
  navButtons: [...document.querySelectorAll("[data-screen-button]")],
  homeActions: [...document.querySelectorAll("[data-home-action]")],
  librarySearchInput: document.querySelector("#librarySearchInput"),
  libraryTypeFilter: document.querySelector("#libraryTypeFilter"),
  libraryRarityFilter: document.querySelector("#libraryRarityFilter"),
  libraryCostFilter: document.querySelector("#libraryCostFilter"),
  cardLibraryGrid: document.querySelector("#cardLibraryGrid"),
  deckSearchInput: document.querySelector("#deckSearchInput"),
  deckTypeFilter: document.querySelector("#deckTypeFilter"),
  deckClassFilter: document.querySelector("#deckClassFilter"),
  deckTribeFilter: document.querySelector("#deckTribeFilter"),
  deckRarityFilter: document.querySelector("#deckRarityFilter"),
  deckCostFilter: document.querySelector("#deckCostFilter"),
  deckClassSelect: document.querySelector("#deckClassSelect"),
  deckCardPool: document.querySelector("#deckCardPool"),
  deckList: document.querySelector("#deckList"),
  deckCount: document.querySelector("#deckCount"),
  deckMessage: document.querySelector("#deckMessage"),
  saveDeckButton: document.querySelector("#saveDeckButton"),
  playWithDeckButton: document.querySelector("#playWithDeckButton"),
  resetDeckButton: document.querySelector("#resetDeckButton"),
  homeDeckInfo: document.querySelector("#homeDeckInfo"),
  homeCpuDeckSelect: document.querySelector("#homeCpuDeckSelect"),
  battleCpuDeckSelect: document.querySelector("#battleCpuDeckSelect"),
  libraryClassFilter: document.querySelector("#libraryClassFilter"),
  libraryTribeFilter: document.querySelector("#libraryTribeFilter"),
  libraryImageFilter: document.querySelector("#libraryImageFilter"),
  deckImageFilter: document.querySelector("#deckImageFilter"),
  homeClassIcon: document.querySelector("#homeClassIcon"),
  homeDeckTitle: document.querySelector("#homeDeckTitle"),
  enemyClassIcon: document.querySelector("#enemyClassIcon"),
  playerClassIcon: document.querySelector("#playerClassIcon"),
  deckClassIcon: document.querySelector("#deckClassIcon"),
  resultModal: document.querySelector("#resultModal"),
  resultTitle: document.querySelector("#resultTitle"),
  resultSubTitle: document.querySelector("#resultSubTitle"),
  resultReason: document.querySelector("#resultReason"),
  rematchButton: document.querySelector("#rematchButton"),
  resultHomeButton: document.querySelector("#resultHomeButton"),
  resultDeckButton: document.querySelector("#resultDeckButton"),
  resultLibraryButton: document.querySelector("#resultLibraryButton"),
  effectLayer: document.querySelector("#effectLayer"),
  howToButton: document.querySelector("#howToButton"),
  howToModal: document.querySelector("#howToModal"),
  closeHowToButton: document.querySelector("#closeHowToButton"),
  battleHomeButton: document.querySelector("#battleHomeButton"),
  battleMenuButton: document.querySelector("#battleMenuButton"),
  battleMenuOverlay: document.querySelector("#battleMenuOverlay"),
  battleSideMenu: document.querySelector("#battleSideMenu"),
  closeBattleMenuButton: document.querySelector("#closeBattleMenuButton"),
  menuDeckButton: document.querySelector("#menuDeckButton"),
  menuLibraryButton: document.querySelector("#menuLibraryButton"),
  menuHowToButton: document.querySelector("#menuHowToButton"),
  menuRetireButton: document.querySelector("#menuRetireButton")
};

ui.mainDeckTab = document.querySelector("#mainDeckTab");
ui.extraDeckTab = document.querySelector("#extraDeckTab");
ui.extraModal = document.querySelector("#extraModal");
ui.extraModalList = document.querySelector("#extraModalList");
ui.closeExtraModalButton = document.querySelector("#closeExtraModalButton");
ui.hoverPreview = document.querySelector("#hoverPreview");

function cloneCard(id) {
  return {
    ...dataById[id],
    keywords: [...(dataById[id].keywords || [])],
    abilities: { ...(dataById[id].abilities || {}) },
    image: dataById[id].image || "",
    fullImage: dataById[id].fullImage || "",
    numberLayout: dataById[id].numberLayout,
    uid: `${id}_${Math.random().toString(36).slice(2)}`
  };
}

function createDeck(deckList = getActiveDeckList().cards) {
  const deck = [];
  deckList.forEach(([id, count]) => {
    for (let i = 0; i < count; i += 1) deck.push(cloneCard(id));
  });
  return shuffle(deck);
}

function shuffle(cards) {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function makePlayer(name, awakenPoints, deckList = getActiveDeckList().cards, classId = deckRules.defaultClassId, extraList = getDefaultExtraDeck(classId)) {
  return {
    name,
    classId,
    hp: 20,
    maxCost: 0,
    cost: 0,
    deck: createDeck(deckList),
    hand: [],
    board: { front: [null, null, null], back: [null, null, null] },
    graveyard: [],
    extra: normalizeExtraDeckList(extraList, classId).map((id) => cloneCard(id)),
    field: null,
    awaken: awakenPoints,
    awakenUsed: 0,
    spellsCast: 0
  };
}

function getActiveDeckList() {
  const savedDeck = loadSavedDeck();
  const validation = validateDeckList(savedDeck);
  return validation.valid
    ? normalizeSavedDeck(savedDeck)
    : { classId: deckRules.defaultClassId, cards: window.CardGameData.fixedDeck, extra: getDefaultExtraDeck(deckRules.defaultClassId) };
}

function getCpuDeckConfig() {
  const deck = window.CardGameData.cpuDecks[selectedCpuDeckId] || window.CardGameData.cpuDecks.knight;
  if (deck.id === "random") {
    const candidates = Object.values(window.CardGameData.cpuDecks).filter((item) => item.cards);
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    const classId = selected.classId || "knight";
    return { classId, cards: selected.cards, extra: selected.extra || getDefaultExtraDeck(classId) };
  }
  const classId = deck.classId || "knight";
  return { classId, cards: deck.cards || window.CardGameData.fixedDeck, extra: deck.extra || getDefaultExtraDeck(classId) };
}

function loadSavedDeck() {
  try {
    const raw = localStorage.getItem(deckRules.storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveDeckList(deck) {
  localStorage.setItem(deckRules.storageKey, JSON.stringify(normalizeSavedDeck(deck)));
}

function removeSavedDeck() {
  localStorage.removeItem(deckRules.storageKey);
}

function normalizeDeckList(deckList) {
  if (!Array.isArray(deckList)) return [];
  return deckList
    .map(([id, count]) => [id, Number(count)])
    .filter(([id, count]) => dataById[id] && Number.isInteger(count) && count > 0);
}

function normalizeSavedDeck(savedDeck) {
  if (Array.isArray(savedDeck)) {
    return { classId: deckRules.defaultClassId, cards: normalizeDeckList(savedDeck), extra: getDefaultExtraDeck(deckRules.defaultClassId) };
  }
  if (savedDeck && typeof savedDeck === "object") {
    const classId = savedDeck.classId || deckRules.defaultClassId;
    return {
      classId,
      cards: normalizeDeckList(savedDeck.cards),
      extra: normalizeExtraDeckList(savedDeck.extra, classId)
    };
  }
  return { classId: deckRules.defaultClassId, cards: [], extra: getDefaultExtraDeck(deckRules.defaultClassId) };
}

function getDefaultExtraDeck(classId) {
  return [...(window.CardGameData.defaultExtraDecks[classId] || window.CardGameData.defaultExtraDecks[deckRules.defaultClassId] || window.CardGameData.extra.slice(0, extraDeckRules.size))];
}

function normalizeExtraDeckList(extraList, classId = deckRules.defaultClassId) {
  const source = Array.isArray(extraList) ? extraList : getDefaultExtraDeck(classId);
  const result = [];
  source.forEach((id) => {
    const card = dataById[id];
    if (!card) return;
    if (!extraDeckRules.allowedTypes.includes(card.type)) return;
    if (!["neutral", classId].includes(card.cardClass)) return;
    if (result.includes(id)) return;
    result.push(id);
  });
  return result;
}

function deckListToCounts(deckList) {
  const counts = {};
  normalizeDeckList(deckList).forEach(([id, count]) => {
    counts[id] = (counts[id] || 0) + count;
  });
  return counts;
}

function countsToDeckList(counts) {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => cardSortValue(dataById[a]) - cardSortValue(dataById[b]))
    .map(([id, count]) => [id, count]);
}

function cardSortValue(card) {
  return card.cost * 1000 + window.CardGameData.cards.findIndex((item) => item.id === card.id);
}

function validateDeckList(deck) {
  const normalizedDeck = normalizeSavedDeck(deck);
  const normalized = normalizeDeckList(normalizedDeck.cards);
  const counts = deckListToCounts(normalized);
  const errors = [];
  const classId = normalizedDeck.classId;
  if (!window.CardGameData.classes[classId]) errors.push("使用クラスが不正です。");
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (total !== deckRules.size) errors.push(`デッキ枚数は${deckRules.size}枚ちょうどにしてください。現在は${total}枚です。`);

  Object.entries(counts).forEach(([id, count]) => {
    const card = dataById[id];
    if (!card) {
      errors.push(`不明なカードIDがあります: ${id}`);
      return;
    }
    if (deckRules.excludedTypes.includes(card.type)) {
      errors.push(`${card.name}は通常デッキに追加できません。`);
    }
    if (deckRules.excludedClasses.includes(card.cardClass)) {
      errors.push(`${card.name}はトークンのため通常デッキに追加できません。`);
    }
    if (card.collectible === false) {
      errors.push(`${card.name}はデッキ編集で使用できません。`);
    }
    if (!["neutral", classId].includes(card.cardClass)) {
      errors.push(`${card.name}は${window.CardGameData.classes[classId]}デッキに追加できません。`);
    }
    const limit = deckRules.rarityLimits[card.rarity] ?? 3;
    if (count > limit) errors.push(`${card.name}は${limit}枚までです。`);
  });

  const extraValidation = validateExtraDeckList(normalizedDeck.extra, classId);
  errors.push(...extraValidation.errors);
  return { valid: errors.length === 0, errors, total, counts, classId, extraTotal: extraValidation.total };
}

function validateExtraDeckList(extraList, classId) {
  const errors = [];
  const ids = Array.isArray(extraList) ? extraList : [];
  if (ids.length !== extraDeckRules.size) {
    errors.push(`エクストラデッキは${extraDeckRules.size}枚ちょうどにしてください。現在は${ids.length}枚です。`);
  }
  const seen = new Set();
  ids.forEach((id) => {
    const card = dataById[id];
    if (!card) {
      errors.push(`不明なエクストラカードIDがあります: ${id}`);
      return;
    }
    if (!extraDeckRules.allowedTypes.includes(card.type)) errors.push(`${card.name}はエクストラデッキに追加できません。`);
    if (!["neutral", classId].includes(card.cardClass)) errors.push(`${card.name}は${window.CardGameData.classes[classId]}のエクストラデッキに追加できません。`);
    if (seen.has(id)) errors.push(`${card.name}はエクストラデッキに1枚までです。`);
    seen.add(id);
  });
  return { valid: errors.length === 0, errors, total: ids.length };
}

function newGame() {
  selected = null;
  previewCard = null;
  messageId = 1;
  closeResultModal();
  const activeDeck = getActiveDeckList();
  const cpuDeck = getCpuDeckConfig();
  game = {
    active: "player",
    turn: 0,
    winner: null,
    player: makePlayer("PLAYER", 2, activeDeck.cards, activeDeck.classId, activeDeck.extra),
    enemy: makePlayer("CPU", 3, cpuDeck.cards, cpuDeck.classId, cpuDeck.extra)
  };
  draw(game.player, 3);
  draw(game.enemy, 4);
  els.log.innerHTML = "";
  log("Ver.0.7対戦開始。あなたが先攻です。");
  startTurn("player");
}

function getPlayer(side) {
  return game[side];
}

function opponentSide(side) {
  return side === "player" ? "enemy" : "player";
}

function isPlayerTurn() {
  return game.active === "player";
}

function updateClassIcon(element, classId) {
  if (!element) return;
  const icon = window.CardGameData.classIcons?.[classId] || "";
  element.className = `class-icon class-${classId || "unknown"}${icon ? "" : " class-icon-fallback"}`;
  element.innerHTML = icon ? `<img src="${escapeAttr(icon)}" alt="${classNames[classId] || "クラス"}">` : `<span>${(classNames[classId] || "?").slice(0, 1)}</span>`;
}

function draw(player, count = 1) {
  for (let i = 0; i < count; i += 1) {
    if (player.deck.length === 0) {
      endGame(player === game.player ? "enemy" : "player", `${player.name}はデッキ切れで敗北。`);
      return;
    }
    player.hand.push(player.deck.shift());
  }
}

function startTurn(side) {
  if (game.winner) return;
  game.active = side;
  if (side === "player") game.turn += 1;

  const player = getPlayer(side);
  player.maxCost = Math.min(10, player.maxCost + 1);
  player.cost = player.maxCost;
  draw(player, 1);
  forEachUnit(player, (unit) => {
    unit.canAttack = true;
    unit.summonedThisTurn = false;
  });
  window.currentTurnSide = side;
  resolveFieldStart(side);
  selected = null;
  log(`${player.name}のターン開始。`);
  render();
  if (side === "enemy" && !game.winner) {
    window.setTimeout(runCpuTurn, 500);
  }
}

function endTurn() {
  if (!isPlayerTurn() || game.winner) return;
  startTurn("enemy");
}

function runCpuTurn() {
  if (game.winner) return;
  let played = true;
  while (played) {
    played = false;
    const playable = game.enemy.hand
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => card.cost <= game.enemy.cost)
      .sort((a, b) => b.card.cost - a.card.cost);

    for (const item of playable) {
      if ((item.card.type === "unit" || item.card.type === "extra_unit") && hasEmptySlot(game.enemy)) {
        summonFromHand("enemy", item.index, bestCpuSlot(game.enemy));
        played = true;
        break;
      }
      if (item.card.type === "field" && !game.enemy.field) {
        playField("enemy", item.index);
        played = true;
        break;
      }
      if (item.card.type === "spell" && cpuUseSpell(item.index)) {
        played = true;
        break;
      }
    }
  }

  cpuUseExtra();
  cpuAwaken();
  cpuAttackAll();
  render();
  if (!game.winner) startTurn("player");
}

function cpuUseSpell(handIndex) {
  const card = game.enemy.hand[handIndex];
  if (!card || card.cost > game.enemy.cost) return false;
  if (card.effect === "heal_3" && game.enemy.hp >= 17) return false;
  if ((card.effect === "buff_ally_1" || card.effect === "buff_all_allies_attack_1") && !firstUnitSlot(game.enemy)) {
    return false;
  }
  if (["deal_4_to_unit"].includes(card.effect) && !firstUnitSlot(game.player)) return false;

  payAndMoveSpell("enemy", handIndex);
  resolveSpellEffect("enemy", card, bestCpuSpellTarget(card));
  log(`CPUが${card.name}を使用。`);
  checkWin();
  return true;
}

function bestCpuSpellTarget(card) {
  if (card.effect === "deal_2_damage") {
    return firstUnitSlot(game.player) || { side: "player", hero: true };
  }
  if (card.effect === "deal_4_to_unit") return firstUnitSlot(game.player);
  if (card.effect === "deal_2_to_unit") return firstUnitSlot(game.player);
  if (card.effect === "buff_ally_1") return firstUnitSlot(game.enemy);
  return null;
}

function cpuUseExtra() {
  const index = game.enemy.extra.findIndex((card) => canUseExtra(game.enemy, card) && card.cost <= game.enemy.cost);
  if (index < 0) return;
  const card = game.enemy.extra[index];
  if (card.type === "extra_unit" && hasEmptySlot(game.enemy)) {
    summonFromExtra("enemy", index, bestCpuSlot(game.enemy));
  } else if (card.type === "extra_spell") {
    game.enemy.cost -= card.cost;
    game.enemy.extra.splice(index, 1);
    resolveSpellEffect("enemy", card, null);
    log(`CPUがエクストラから${card.name}を使用。`);
  }
}

function cpuAwaken() {
  if (!canUseAwaken("enemy")) return;
  const target = firstUnitSlot(game.enemy);
  if (target) awakenUnit("enemy", target.row, target.index);
}

function cpuAttackAll() {
  for (const row of ["front", "back"]) {
    for (let index = 0; index < 3; index += 1) {
      const unit = game.enemy.board[row][index];
      if (!unit || !unit.canAttack || game.winner) continue;
      const target = firstAttackableUnit("enemy", unit);
      if (target) attackUnit("enemy", row, index, target.row, target.index);
      else if (canAttackHero("enemy", unit)) attackHero("enemy", row, index);
    }
  }
}

function hasEmptySlot(player) {
  return [...player.board.front, ...player.board.back].some((slot) => !slot);
}

function bestCpuSlot(player) {
  const front = player.board.front.findIndex((slot) => !slot);
  if (front >= 0) return { row: "front", index: front };
  return { row: "back", index: player.board.back.findIndex((slot) => !slot) };
}

function firstUnitSlot(player) {
  for (const row of ["front", "back"]) {
    const index = player.board[row].findIndex(Boolean);
    if (index >= 0) return { row, index };
  }
  return null;
}

function firstOtherUnitSlot(player, uid) {
  for (const row of ["front", "back"]) {
    const index = player.board[row].findIndex((unit) => unit && unit.uid !== uid);
    if (index >= 0) return { row, index };
  }
  return null;
}

function forEachUnit(player, fn) {
  for (const row of ["front", "back"]) {
    player.board[row].forEach((unit, index) => {
      if (unit) fn(unit, row, index);
    });
  }
}

function boardUnits(player) {
  const units = [];
  forEachUnit(player, (unit, row, index) => units.push({ unit, row, index }));
  return units;
}

function playHand(index) {
  if (!isPlayerTurn() || game.winner) return;
  const card = game.player.hand[index];
  if (!card) return;
  if (card.cost > game.player.cost) {
    log("コストが足りません。");
    return;
  }
  if (card.type === "spell") {
    startSpellSelection(index);
    return;
  }
  if (card.type === "field") {
    playField("player", index);
    render();
    return;
  }
  selected = { kind: "hand", index, uid: card.uid };
  log(`${card.name}を選択しました。空きマスを選んでください。`);
  render();
}

function playExtra(index) {
  if (!isPlayerTurn() || game.winner) return;
  const card = game.player.extra[index];
  if (!card) return;
  if (!canUseExtra(game.player, card)) {
    log("エクストラカードの条件を満たしていません。");
    return;
  }
  if (card.cost > game.player.cost) {
    log("コストが足りません。");
    return;
  }
  if (card.type === "extra_spell") {
    game.player.cost -= card.cost;
    game.player.extra.splice(index, 1);
    resolveSpellEffect("player", card, null);
    log(`${card.name}を使用。`);
    selected = null;
    checkWin();
    render();
    closeExtraModal();
    return;
  }
  selected = { kind: "extra", index, uid: card.uid };
  log(`${card.name}を選択しました。空きマスを選んでください。`);
  closeExtraModal();
  render();
}

function startSpellSelection(index) {
  const card = game.player.hand[index];
  if (
    [
      "heal_3",
      "heal_5",
      "draw_1",
      "draw_2",
      "buff_all_allies_attack_1",
      "buff_all_allies_1_1",
      "all_units_2",
      "enemy_all_2",
      "enemy_all_3",
      "summon_token_1_1",
      "buff_front_allies_1_1",
      "draw_2_heal_5",
      "knight_extra_rally"
    ].includes(card.effect)
  ) {
    payAndMoveSpell("player", index);
    resolveSpellEffect("player", card, null);
    log(`${card.name}を使用。`);
    selected = null;
    checkWin();
    render();
    return;
  }
  if (card.effect === "buff_ally_1") {
    selected = { kind: "spell_target_ally", index, uid: card.uid };
    log("味方ユニットを選んでください。");
  } else {
    selected = { kind: "spell_target_enemy", index, uid: card.uid };
    log("相手ユニット、またはCPUのHP欄を選んでください。");
  }
  render();
}

function clickSlot(side, row, index) {
  if (game.winner) return;
  const clickedPlayer = getPlayer(side);
  const unit = clickedPlayer.board[row][index];
  if (unit) showPreview(unit);

  if (side === "player" && selected?.kind === "hand") {
    const card = game.player.hand[selected.index];
    if (card?.uid === selected.uid && !unit) {
      summonFromHand("player", selected.index, { row, index });
      selected = null;
      render();
    }
    return;
  }

  if (side === "player" && selected?.kind === "extra") {
    const card = game.player.extra[selected.index];
    if (card?.uid === selected.uid && !unit) {
      summonFromExtra("player", selected.index, { row, index });
      selected = null;
      render();
    }
    return;
  }

  if (side === "player" && selected?.kind === "spell_target_ally" && unit) {
    resolveTargetedSpell("player", row, index);
    return;
  }

  if (side === "enemy" && selected?.kind === "spell_target_enemy" && unit && canTargetEnemyUnit(row, index)) {
    resolveTargetedSpell("enemy", row, index);
    return;
  }

  if (side === "enemy" && selected?.kind === "attacker" && unit && canAttackUnit("player", selected.row, selected.index, row, index)) {
    attackUnit("player", selected.row, selected.index, row, index);
    selected = null;
    render();
    return;
  }

  if (side === "player" && unit && isPlayerTurn()) {
    if (selected?.kind === "awaken") {
      awakenUnit("player", row, index);
      selected = null;
    } else if (unit.canAttack) {
      selected = { kind: "attacker", row, index };
      log(`${unit.name}で攻撃対象を選択してください。`);
    }
    render();
  }
}

function resolveTargetedSpell(targetSide, row, index) {
  const spell = game.player.hand[selected.index];
  if (!spell || spell.uid !== selected.uid || spell.cost > game.player.cost) return;
  payAndMoveSpell("player", selected.index);
  resolveSpellEffect("player", spell, { side: targetSide, row, index });
  log(`${spell.name}を使用。`);
  selected = null;
  checkWin();
  render();
}

function payAndMoveSpell(side, handIndex) {
  const player = getPlayer(side);
  const [card] = player.hand.splice(handIndex, 1);
  player.cost -= card.cost;
  player.graveyard.push(card);
  player.spellsCast += 1;
  showFloatingText(side === "player" ? els.playerHero : els.enemyHero, "SPELL", "cast");
}

function resolveSpellEffect(casterSide, card, target) {
  const caster = getPlayer(casterSide);
  const enemySide = opponentSide(casterSide);
  if (card.effect === "deal_2_damage") {
    if (target?.hero) damageHero(target.side, 2);
    else if (target) damageUnit(target.side, target.row, target.index, 2);
    else damageHero(enemySide, 2);
  }
  if (card.effect === "deal_4_to_unit" && target) damageUnit(target.side || enemySide, target.row, target.index, 4);
  if (card.effect === "deal_2_to_unit" && target) damageUnit(target.side || enemySide, target.row, target.index, 2);
  if (card.effect === "heal_3") caster.hp = Math.min(20, caster.hp + 3);
  if (card.effect === "heal_5") caster.hp = Math.min(20, caster.hp + 5);
  if (card.effect === "draw_1") draw(caster, 1);
  if (card.effect === "draw_2") draw(caster, 2);
  if (card.effect === "buff_ally_1" && target) buffUnit(caster, target.row, target.index, 1, 1);
  if (card.effect === "summon_token_1_1") summonToken(casterSide);
  if (card.effect === "buff_front_allies_1_1") buffFrontAllies(caster, 1, 1);
  if (card.effect === "buff_all_allies_attack_1") {
    forEachUnit(caster, (_, row, index) => buffUnit(caster, row, index, 1, 0, false));
    log(`${caster.name}の全ユニットが+1/+0。`);
  }
  if (card.effect === "buff_all_allies_1_1") {
    forEachUnit(caster, (_, row, index) => buffUnit(caster, row, index, 1, 1, false));
    log(`${caster.name}の全ユニットが+1/+1。`);
  }
  if (card.effect === "all_units_2") {
    damageAllUnits("player", 2);
    damageAllUnits("enemy", 2);
  }
  if (card.effect === "enemy_all_2") damageAllUnits(enemySide, 2);
  if (card.effect === "enemy_all_3") damageAllUnits(enemySide, 3);
  if (card.effect === "knight_extra_rally") {
    buffFrontAllies(caster, 1, 1);
    summonToken(casterSide);
  }
  if (card.effect === "draw_2_heal_5") {
    draw(caster, 2);
    caster.hp = Math.min(20, caster.hp + 5);
  }
}

function playField(side, handIndex) {
  const player = getPlayer(side);
  const [card] = player.hand.splice(handIndex, 1);
  player.cost -= card.cost;
  if (player.field) player.graveyard.push(player.field);
  player.field = card;
  showFloatingText(side === "player" ? els.playerHero : els.enemyHero, "FIELD", "cast");
  log(`${player.name}がフィールド「${card.name}」を展開。`);
}

function resolveFieldStart(side) {
  const player = getPlayer(side);
  if (!player.field) return;
  if (player.field.effect === "field_train") {
    const target = firstUnitSlot(player);
    if (target) {
      buffUnit(player, target.row, target.index, 1, 0);
      log(`訓練場が${player.board[target.row][target.index].name}を鍛えました。`);
    }
  }
  if (player.field.effect === "field_heal") {
    player.hp = Math.min(20, player.hp + 1);
    log(`癒しの泉で${player.name}が1回復。`);
  }
  if (player.field.effect === "field_draw") {
    draw(player, 1);
    log(`魔導研究所で${player.name}がカードを1枚引きました。`);
  }
}

function summonFromHand(side, handIndex, slot) {
  const player = getPlayer(side);
  const [card] = player.hand.splice(handIndex, 1);
  player.cost -= card.cost;
  const unit = placeUnit(player, card, slot);
  resolveUnitAbility(side, unit, "onPlay");
  showFloatingText(findSlotElement(side, slot.row, slot.index), "SUMMON", "cast");
  log(`${player.name}が${card.name}を召喚。`);
  checkWin();
}

function summonFromExtra(side, extraIndex, slot) {
  const player = getPlayer(side);
  const [card] = player.extra.splice(extraIndex, 1);
  player.cost -= card.cost;
  const unit = placeUnit(player, card, slot);
  resolveUnitAbility(side, unit, "onPlay");
  showFloatingText(findSlotElement(side, slot.row, slot.index), "EXTRA", "extra");
  log(`${player.name}がエクストラから${card.name}を召喚。`);
  checkWin();
}

function placeUnit(player, card, slot) {
  const unit = {
    ...card,
    keywords: [...(card.keywords || [])],
    abilities: { ...(card.abilities || {}) },
    maxHp: card.hp,
    damage: 0,
    canAttack: card.keywords?.includes("charge") || card.keywords?.includes("rush") || false,
    summonedThisTurn: true,
    awakened: false
  };
  player.board[slot.row][slot.index] = unit;
  return unit;
}

function resolveUnitAbility(side, unit, timing) {
  const ability = unit?.abilities?.[timing];
  if (!ability) return;
  const player = getPlayer(side);
  const enemySide = opponentSide(side);

  if (ability === "buff_ally_1_1") {
    const target = firstOtherUnitSlot(player, unit.uid);
    if (target) buffUnit(player, target.row, target.index, 1, 1);
  }
  if (ability === "buff_front_allies_1_1") {
    buffFrontAllies(player, 1, 1);
  }
  if (ability === "damage_enemy_unit_2" || ability === "damage_enemy_unit_3") {
    const target = firstUnitSlot(getPlayer(enemySide));
    if (target) damageUnit(enemySide, target.row, target.index, ability.endsWith("_3") ? 3 : 2);
  }
  if (ability === "heal_owner_2") {
    player.hp = Math.min(20, player.hp + 2);
    log(`${unit.name}の破壊時効果で${player.name}が2回復。`);
  }
  if (ability === "heal_owner_3") {
    player.hp = Math.min(20, player.hp + 3);
    log(`${unit.name}の効果で${player.name}が3回復。`);
  }
  if (ability === "draw_owner_1") {
    draw(player, 1);
    log(`${unit.name}の破壊時効果でカードを1枚引きました。`);
  }
  if (ability === "summon_token_1_1") {
    summonToken(side);
  }
  if (ability === "ping_enemy_hero_1") {
    damageHero(enemySide, 1);
    log(`${unit.name}の攻撃時効果が発動。`);
  }
  if (ability === "buff_self_1_0") {
    const found = findUnitByUid(player, unit.uid);
    if (found) buffUnit(player, found.row, found.index, 1, 0);
  }
  if (ability === "self_extra_1_1") {
    const found = findUnitByUid(player, unit.uid);
    if (found) buffUnit(player, found.row, found.index, 1, 1);
  }
  if (ability === "gain_charge") {
    unit.keywords = unique([...unit.keywords, "charge"]);
    unit.canAttack = true;
    log(`${unit.name}は疾走を得ました。`);
  }
}

function findUnitByUid(player, uid) {
  for (const row of ["front", "back"]) {
    const index = player.board[row].findIndex((unit) => unit?.uid === uid);
    if (index >= 0) return { row, index, unit: player.board[row][index] };
  }
  return null;
}

function unique(items) {
  return [...new Set(items)];
}

function summonToken(side) {
  const player = getPlayer(side);
  if (!hasEmptySlot(player)) return;
  const slot = bestCpuSlot(player);
  placeUnit(player, cloneCard("token_soldier_001"), slot);
  log(`${player.name}が兵士トークンを召喚。`);
}

function buffFrontAllies(player, attack, hp) {
  player.board.front.forEach((unit, index) => {
    if (unit) buffUnit(player, "front", index, attack, hp, false);
  });
  log(`${player.name}の前列ユニットが+${attack}/+${hp}。`);
}

function hasUnitWithTribe(player, tribe) {
  return countUnitsWithTribe(player, tribe) > 0;
}

function countUnitsWithTribe(player, tribe) {
  return boardUnits(player).filter(({ unit }) => unit.tribe === tribe).length;
}

function buffUnitsByTribe(player, tribe, attack, hp) {
  boardUnits(player).forEach(({ unit, row, index }) => {
    if (unit.tribe === tribe) buffUnit(player, row, index, attack, hp, false);
  });
}

function countGraveyardUnitsWithTribe(player, tribe) {
  return player.graveyard.filter((card) => ["unit", "extra_unit"].includes(card.type) && card.tribe === tribe).length;
}

function damageHero(side, amount) {
  const player = getPlayer(side);
  player.hp -= amount;
  log(`${player.name}に${amount}ダメージ。`);
  showFloatingText(side === "player" ? els.playerHero : els.enemyHero, `-${amount}`, "damage");
  checkWin();
}

function damageUnit(side, row, index, amount) {
  const player = getPlayer(side);
  const unit = player.board[row][index];
  if (!unit) return;
  unit.damage += amount;
  log(`${unit.name}に${amount}ダメージ。`);
  showFloatingText(findSlotElement(side, row, index), `-${amount}`, "damage");
  if (unit.hp - unit.damage <= 0) destroyUnit(side, row, index);
}

function damageAllUnits(side, amount) {
  const targets = boardUnits(getPlayer(side)).map(({ row, index }) => ({ row, index }));
  targets.forEach((target) => damageUnit(side, target.row, target.index, amount));
}

function destroyUnit(side, row, index) {
  const player = getPlayer(side);
  const unit = player.board[row][index];
  if (!unit) return;
  player.board[row][index] = null;
  player.graveyard.push(unit);
  log(`${unit.name}は破壊されました。`);
  resolveUnitAbility(side, unit, "onDeath");
}

function buffUnit(player, row, index, attack, hp, shouldLog = true) {
  const unit = player.board[row][index];
  if (!unit) return;
  unit.attack += attack;
  unit.hp += hp;
  unit.maxHp += hp;
  showFloatingText(findSlotElement(player === game.player ? "player" : "enemy", row, index), `+${attack}/+${hp}`, "heal");
  if (shouldLog) log(`${unit.name}が+${attack}/+${hp}。`);
}

function awakenUnit(side, row, index) {
  const player = getPlayer(side);
  const unit = player.board[row][index];
  if (!unit || !canUseAwaken(side) || unit.awakened) return;
  player.awaken -= 1;
  player.awakenUsed += 1;
  unit.attack += 2;
  unit.hp += 2;
  unit.maxHp += 2;
  unit.awakened = true;
  log(`${player.name}の${unit.name}が覚醒。`);
  showFloatingText(findSlotElement(side, row, index), "AWAKEN", "awaken");
  resolveUnitAbility(side, unit, "onAwaken");
  render();
}

function attackUnit(attackerSide, attackerRow, attackerIndex, targetRow, targetIndex) {
  const attacker = getPlayer(attackerSide);
  const defenderSide = opponentSide(attackerSide);
  const defender = getPlayer(defenderSide);
  const attackingUnit = attacker.board[attackerRow][attackerIndex];
  const defendingUnit = defender.board[targetRow][targetIndex];
  if (!attackingUnit || !defendingUnit || !attackingUnit.canAttack) return;
  if (!canAttackUnit(attackerSide, attackerRow, attackerIndex, targetRow, targetIndex)) return;

  attackingUnit.canAttack = false;
  resolveUnitAbility(attackerSide, attackingUnit, "onAttack");
  const attackDamage = attackingUnit.attack;
  const counterDamage = defendingUnit.attack;
  animateElement(findSlotElement(defenderSide, targetRow, targetIndex), "hit-shake");
  damageUnit(defenderSide, targetRow, targetIndex, attackDamage);
  if (attacker.board[attackerRow][attackerIndex]) {
    damageUnit(attackerSide, attackerRow, attackerIndex, counterDamage);
  }
  log(`${attackingUnit.name}が${defendingUnit.name}を攻撃。`);
  checkWin();
}

function attackHero(attackerSide, row, index) {
  const attacker = getPlayer(attackerSide);
  const defenderSide = opponentSide(attackerSide);
  const unit = attacker.board[row][index];
  if (!unit || !unit.canAttack || !canAttackHero(attackerSide, unit)) return;
  unit.canAttack = false;
  resolveUnitAbility(attackerSide, unit, "onAttack");
  log(`${unit.name}がプレイヤーを攻撃。`);
  animateElement(defenderSide === "player" ? els.playerHero : els.enemyHero, "hit-shake");
  damageHero(defenderSide, unit.attack);
}

function firstAttackableUnit(attackerSide, attackerUnit) {
  const defender = getPlayer(opponentSide(attackerSide));
  const guards = activeGuardUnits(defender);
  if (guards.length) return guards[0];
  for (let index = 0; index < 3; index += 1) {
    if (defender.board.front[index]) return { row: "front", index };
  }
  for (let index = 0; index < 3; index += 1) {
    if (defender.board.back[index] && !defender.board.front[index]) return { row: "back", index };
  }
  return null;
}

function canAttackUnit(attackerSide, attackerRow, attackerIndex, targetRow, targetIndex) {
  const defender = getPlayer(opponentSide(attackerSide));
  const target = defender.board[targetRow][targetIndex];
  if (!target) return false;
  const guards = activeGuardUnits(defender);
  if (guards.length && !isActiveGuard(defender, targetRow, targetIndex)) return false;
  if (targetRow === "front") return true;
  return !defender.board.front[targetIndex];
}

function canTargetEnemyUnit(row, index) {
  return Boolean(game.enemy.board[row][index]);
}

function canAttackHero(attackerSide, unit) {
  const defender = getPlayer(opponentSide(attackerSide));
  if (unit?.summonedThisTurn && hasKeyword(unit, "rush") && !hasKeyword(unit, "charge")) return false;
  if (activeGuardUnits(defender).length) return false;
  return defender.board.front.some((slot) => !slot);
}

function hasKeyword(unit, keyword) {
  return unit?.keywords?.includes(keyword);
}

function activeGuardUnits(player) {
  return boardUnits(player).filter(({ row, unit }) => row === "front" && hasKeyword(unit, "guard"));
}

function isActiveGuard(player, row, index) {
  return row === "front" && hasKeyword(player.board[row][index], "guard");
}

function canUseAwaken(side) {
  const player = getPlayer(side);
  return game.turn >= 5 && player.awaken > 0 && !game.winner;
}

function canUseExtra(player, card) {
  if (card.condition === "graveyard_units_5") {
    return player.graveyard.filter((grave) => ["unit", "extra_unit"].includes(grave.type)).length >= 5;
  }
  if (card.condition === "low_hp_10") return player.hp <= 10;
  if (card.condition === "awaken_used_2") return player.awakenUsed >= 2;
  if (card.condition === "spells_cast_3") return player.spellsCast >= 3;
  return false;
}

function checkWin() {
  if (game.player.hp <= 0) endGame("enemy", "あなたの体力が0になりました。");
  if (game.enemy.hp <= 0) endGame("player", "CPUの体力が0になりました。");
}

function endGame(winner, reason) {
  if (game.winner) return;
  game.winner = winner;
  log(`${reason} ${winner === "player" ? "勝利！" : "敗北。"}`);
  showResultModal(winner, reason);
  render();
}

function showResultModal(winner, reason) {
  if (!ui.resultModal) return;
  const victory = winner === "player";
  ui.resultModal.hidden = false;
  ui.resultModal.classList.toggle("victory", victory);
  ui.resultModal.classList.toggle("defeat", !victory);
  if (ui.resultTitle) ui.resultTitle.textContent = victory ? "VICTORY" : "DEFEAT";
  if (ui.resultSubTitle) ui.resultSubTitle.textContent = victory ? "勝利" : "敗北";
  if (ui.resultReason) ui.resultReason.textContent = reason;
}

function closeResultModal() {
  if (ui.resultModal) ui.resultModal.hidden = true;
}

function openHowToModal() {
  if (ui.howToModal) ui.howToModal.hidden = false;
}

function closeHowToModal() {
  if (ui.howToModal) ui.howToModal.hidden = true;
}

function log(text) {
  const item = document.createElement("li");
  item.textContent = text;
  item.dataset.id = String(messageId);
  messageId += 1;
  els.log.prepend(item);
  while (els.log.children.length > 10) els.log.lastElementChild.remove();
}

function findSlotElement(side, row, index) {
  return document.querySelector(`.slot[data-side="${side}"][data-row="${row}"][data-index="${index}"]`);
}

function showFloatingText(target, text, kind = "damage") {
  if (!ui.effectLayer || !target) return;
  const rect = target.getBoundingClientRect();
  const item = document.createElement("span");
  item.className = `float-text ${kind}`;
  item.textContent = text;
  item.style.left = `${rect.left + rect.width / 2}px`;
  item.style.top = `${rect.top + rect.height / 2}px`;
  ui.effectLayer.append(item);
  window.setTimeout(() => item.remove(), 900);
}

function animateElement(element, className) {
  if (!element) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), 520);
}

function render() {
  els.turnLabel.textContent = game.winner
    ? game.winner === "player"
      ? "勝利"
      : "敗北"
    : game.active === "player"
      ? `あなたのターン ${game.turn}`
      : `CPUターン ${game.turn}`;
  els.enemyHp.textContent = game.enemy.hp;
  els.enemyCost.textContent = `${game.enemy.cost}/${game.enemy.maxCost}`;
  els.enemyHandCount.textContent = game.enemy.hand.length;
  els.enemyDeckCount.textContent = game.enemy.deck.length;
  els.enemyField.textContent = game.enemy.field?.name || "なし";
  els.playerHp.textContent = game.player.hp;
  els.playerCost.textContent = `${game.player.cost}/${game.player.maxCost}`;
  els.playerAwaken.textContent = `${game.player.awaken} / 使用${game.player.awakenUsed}`;
  els.playerDeckCount.textContent = game.player.deck.length;
  els.playerField.textContent = game.player.field?.name || "なし";
  updateClassIcon(ui.enemyClassIcon, game.enemy.classId);
  updateClassIcon(ui.playerClassIcon, game.player.classId);
  bindFieldPreview(els.enemyField, game.enemy.field);
  bindFieldPreview(els.playerField, game.player.field);
  els.endTurnButton.disabled = !isPlayerTurn() || Boolean(game.winner);
  els.awakenButton.disabled = !isPlayerTurn() || !canUseAwaken("player");
  els.awakenButton.classList.toggle("pulse-ready", isPlayerTurn() && canUseAwaken("player"));
  els.enemyHero.classList.toggle("highlight", canHighlightEnemyHero());

  renderBoard("enemy", els.enemyBoard, ["back", "front"]);
  renderBoard("player", els.playerBoard, ["front", "back"]);
  renderHand();
  renderExtra();
  renderPreview();
}

function canHighlightEnemyHero() {
  if (!isPlayerTurn() || game.winner) return false;
  if (selected?.kind === "spell_target_enemy") {
    const spell = game.player.hand[selected.index];
    return spellCanTargetHero(spell);
  }
  if (selected?.kind !== "attacker") return false;
  const unit = game.player.board[selected.row][selected.index];
  return canAttackHero("player", unit);
}

function bindFieldPreview(fieldElement, card) {
  const slot = fieldElement?.closest(".field-slot");
  if (!slot) return;
  slot.classList.toggle("has-card", Boolean(card));
  slot.onclick = card ? () => showPreview(card) : null;
  slot.onmouseenter = card ? () => showPreview(card) : null;
}

function renderBoard(side, container, rowOrder) {
  container.innerHTML = "";
  rowOrder.forEach((row) => {
    lanes.forEach((_, index) => {
      const unit = getPlayer(side).board[row][index];
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = `slot ${row}`;
      slot.dataset.side = side;
      slot.dataset.row = row;
      slot.dataset.index = String(index);
      if (unit) slot.append(renderUnit(unit));
      else slot.innerHTML = `<span class="empty">${row === "front" ? "前" : "後"}${index + 1}</span>`;
      if (isHighlightedSlot(side, row, index)) slot.classList.add("highlight");
      if (unit?.canAttack && side === "player" && isPlayerTurn()) slot.classList.add("ready");
      if (unit && isActiveGuard(getPlayer(side), row, index)) slot.classList.add("guard-slot");
      if (unit) {
        slot.addEventListener("mouseenter", () => showPreview(unit));
        slot.addEventListener("focus", () => showPreview(unit));
      }
      slot.addEventListener("click", () => clickSlot(side, row, index));
      container.append(slot);
    });
  });
}

function isHighlightedSlot(side, row, index) {
  if (!isPlayerTurn() || game.winner) return false;
  if (side === "player" && selected?.kind === "hand") {
    return !game.player.board[row][index];
  }
  if (side === "player" && selected?.kind === "extra") {
    return !game.player.board[row][index];
  }
  if (side === "player" && selected?.kind === "spell_target_ally") {
    return Boolean(game.player.board[row][index]);
  }
  if (side === "enemy" && selected?.kind === "spell_target_enemy") {
    return Boolean(game.enemy.board[row][index]) && canTargetEnemyUnit(row, index);
  }
  if (side === "enemy" && selected?.kind === "attacker") {
    return Boolean(game.enemy.board[row][index]) && canAttackUnit("player", selected.row, selected.index, row, index);
  }
  if (side === "player" && selected?.kind === "awaken") {
    const unit = game.player.board[row][index];
    return Boolean(canUseAwaken("player") && unit && !unit.awakened);
  }
  return false;
}

function renderUnit(unit) {
  const wrap = document.createElement("span");
  wrap.className = `unit-card card-frame ${unit.rarity} ${unit.type}${hasCompletedImage(unit) ? " completed-mode" : " dummy-mode"}`;
  const tags = [...(unit.keywords || []).map((keyword) => keywordNames[keyword]), unit.awakened ? "覚醒" : ""]
    .filter(Boolean)
    .map((tag) => `<span class="tag">${tag}</span>`)
    .join("");
  wrap.innerHTML = hasCompletedImage(unit)
    ? `
      ${renderCardVisual(unit, "board")}
      ${unit.awakened ? '<span class="state-badge">覚醒</span>' : ""}
    `
    : `
      ${renderCardVisual(unit, "board")}
      <strong class="card-name">${unit.name}</strong>
      <span class="stats">${unit.attack}/${getCurrentHp(unit)}</span>
      <span class="tags">${tags}</span>
    `;
  return wrap;
}

function renderHand() {
  els.hand.innerHTML = "";
  game.player.hand.forEach((card, index) => {
    const button = renderPlayableCard(card);
    button.disabled = !isPlayerTurn() || card.cost > game.player.cost || Boolean(game.winner);
    button.classList.toggle("usable", isPlayerTurn() && card.cost <= game.player.cost && !game.winner);
    button.classList.toggle("cost-locked", card.cost > game.player.cost);
    if (selected?.kind === "hand" && selected.uid === card.uid) button.classList.add("selected");
    button.addEventListener("mouseenter", () => showPreview(card));
    button.addEventListener("focus", () => showPreview(card));
    button.addEventListener("click", () => {
      showPreview(card);
      playHand(index);
    });
    els.hand.append(button);
  });
}

function renderExtra() {
  els.extraZone.innerHTML = "";
  const usableCount = game.player.extra.filter((card) => canUseExtra(game.player, card) && card.cost <= game.player.cost).length;
  els.extraZone.innerHTML = `
    <span>EXTRA</span>
    <strong>${game.player.extra.length}</strong>
    <small>使用可能 ${usableCount}</small>
  `;
  els.extraZone.disabled = Boolean(game.winner);
  els.extraZone.classList.toggle("pulse-ready", usableCount > 0 && !game.winner);
}

function openExtraModal() {
  if (!ui.extraModal || game.winner) return;
  renderExtraModal();
  ui.extraModal.hidden = false;
}

function closeExtraModal() {
  if (ui.extraModal) ui.extraModal.hidden = true;
}

function renderExtraModal() {
  if (!ui.extraModalList) return;
  ui.extraModalList.innerHTML = "";
  game.player.extra.forEach((card, index) => {
    const usable = canUseExtra(game.player, card) && card.cost <= game.player.cost;
    const item = document.createElement("button");
    item.type = "button";
    item.className = `extra-modal-card card-frame ${card.rarity} ${card.type} ${hasCompletedImage(card) ? "completed-mode" : " dummy-mode"} ${usable ? "usable" : "locked"}`;
    const condition = card.condition || "なし";
    item.innerHTML = hasCompletedImage(card)
      ? `
        ${renderCardVisual(card, "modal")}
        <em class="state-line">${usable ? "使用可能" : "使用不可"}</em>
      `
      : `
        ${renderCardVisual(card, "modal")}
        <span class="collection-meta"><b>${card.cost}</b><span>${typeNames[card.type]}</span></span>
        <strong>${card.name}</strong>
        <span class="collection-sub">${classNames[card.cardClass]} / ${shouldShowTribe(card) ? tribeNames[card.tribe] : "なし"}</span>
        <small>条件: ${condition}</small>
        <em>${usable ? "使用可能" : "条件未達成またはコスト不足"}</em>
      `;
    item.addEventListener("mouseenter", () => showPreview(card));
    item.addEventListener("mousemove", (event) => showHoverPreview(card, event));
    item.addEventListener("mouseleave", hideHoverPreview);
    item.addEventListener("focus", () => showPreview(card));
    item.addEventListener("click", () => {
      showPreview(card);
      if (usable) playExtra(index);
    });
    ui.extraModalList.append(item);
  });
}

function renderPlayableCard(card) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `play-card card-frame ${card.rarity} ${card.type}${hasCompletedImage(card) ? " completed-mode" : " dummy-mode"}`;
  const keywords = (card.keywords || []).map((keyword) => keywordNames[keyword]).join(" / ");
  button.innerHTML = hasCompletedImage(card)
    ? renderCardVisual(card, "hand")
    : `
      ${renderCardVisual(card, "hand")}
      <strong>${card.name}</strong>
      ${keywords ? `<em>${keywords}</em>` : ""}
      <small>${card.text || "能力なし。"}</small>
    `;
  return button;
}

function renderCardArt(card, size) {
  const imageStyle = card.image ? ` style="--card-image: url('${card.image.replace(/'/g, "%27")}')"` : "";
  const type = normalizedCardType(card);
  const label = card.image ? "" : `<span>${cardTypeLabel(card)}</span>`;
  const tribe = shouldShowTribe(card) ? `<small class="tribe-label">${tribeNames[card.tribe]}</small>` : "";
  return `<span class="card-art card-art-${size} art-${type}${card.image ? " has-image" : ""}"${imageStyle}>${label}${tribe}</span>`;
}

function escapeAttr(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getFrameImage(card) {
  const cardClass = card.cardClass === "token" ? "token" : card.cardClass || "neutral";
  const type = card.type === "field" ? "field" : card.type;
  return window.CardGameData.frameImages?.[cardClass]?.[type] || window.CardGameData.frameImages?.neutral?.[type] || "";
}

function renderFrameImage(card) {
  const frame = getFrameImage(card);
  return frame ? `<span class="card-frame-image" style="--frame-image: url('${frame.replace(/'/g, "%27")}')"></span>` : "";
}

function getSubstituteImage(card) {
  const cardClass = card.cardClass === "token" ? "token" : card.cardClass || "neutral";
  const type = card.type === "field" ? "field" : card.type;
  const substitutes = window.CardGameData.substituteImages || {};
  return substitutes?.[cardClass]?.[type] || substitutes?.neutral?.[type] || "";
}

function getCardDisplayImage(card) {
  return card.fullImage || getSubstituteImage(card) || "";
}

function hasCompletedImage(card) {
  return Boolean(card.fullImage);
}

function isUnitLike(card) {
  return ["unit", "extra_unit"].includes(card.type);
}

function getCurrentHp(card) {
  return Math.max(0, (card.hp || 0) - (card.damage || 0));
}

function getNumberLayoutStyle(card) {
  const layout = card.numberLayout;
  if (!layout) return "";
  const declarations = [];
  const addPoint = (key, xVar, yVar) => {
    const point = layout[key];
    if (!point) return;
    if (Number.isFinite(point.x)) declarations.push(`${xVar}: ${point.x}%`);
    if (Number.isFinite(point.y)) declarations.push(`${yVar}: ${point.y}%`);
  };

  addPoint("cost", "--cost-x", "--cost-y");
  addPoint("attack", "--atk-x", "--atk-y");
  addPoint("hp", "--hp-x", "--hp-y");
  return declarations.join("; ");
}

function renderCompletedCard(card, size) {
  const className = `completed-card card-image-card card-size-${size} class-${card.cardClass || "neutral"} type-${card.type}`;
  const numberLayoutStyle = getNumberLayoutStyle(card);
  const styleAttr = numberLayoutStyle ? ` style="${escapeAttr(numberLayoutStyle)}"` : "";
  const unitStats = isUnitLike(card)
    ? `
      <span class="card-num card-atk-num">${card.attack}</span>
      <span class="card-num card-hp-num">${getCurrentHp(card)}</span>
    `
    : "";
  return `
    <div class="${className}"${styleAttr}>
      <img class="completed-card-img card-full-img" src="${escapeAttr(card.fullImage)}" alt="${escapeAttr(card.name)}" loading="lazy">
      <span class="card-num card-cost-num">${card.cost}</span>
      ${unitStats}
    </div>
  `;
}

function renderDummyCard(card, size) {
  const keywords = (card.keywords || []).map((keyword) => keywordNames[keyword]).join(" / ");
  const tribe = shouldShowTribe(card) ? `<span>${tribeNames[card.tribe]}</span>` : "";
  const unitStats = isUnitLike(card)
    ? `
      <span class="card-num card-atk-num">${card.attack}</span>
      <span class="card-num card-hp-num">${getCurrentHp(card)}</span>
    `
    : "";

  return `
    <div class="dummy-card card-image-card card-size-${size}">
      <span class="card-no-image">NO IMAGE</span>
      <span class="card-temp-label">仮</span>
      <span class="card-num card-cost-num">${card.cost}</span>
      ${unitStats}
      <div class="dummy-card-body">
        <strong>${card.name}</strong>
        <span class="dummy-card-sub">${cardTypeLabel(card)}${tribe ? " / " : ""}${tribe}</span>
        ${keywords ? `<em>${keywords}</em>` : ""}
        <small>${card.condition ? `条件: ${card.condition}。` : ""}${card.text || "能力なし。"}</small>
      </div>
    </div>
  `;
}

function renderCardImageCard(card, size) {
  return hasCompletedImage(card) ? renderCompletedCard(card, size) : renderDummyCard(card, size);
}

function renderCardVisual(card, size) {
  return hasCompletedImage(card) ? renderCompletedCard(card, size) : renderDummyCard(card, size);
}

function normalizedCardType(card) {
  if (card.type === "extra_unit") return "unit";
  if (card.type === "extra_spell") return "spell";
  return card.type;
}

function cardTypeLabel(card) {
  const labels = {
    unit: "UNIT",
    extra_unit: "EXTRA",
    spell: "SPELL",
    extra_spell: "EXTRA",
    field: "FIELD"
  };
  return labels[card.type] || "CARD";
}

function shouldShowTribe(card) {
  return ["unit", "extra_unit"].includes(card.type) && card.tribe && card.tribe !== "none";
}

function showPreview(card) {
  previewCard = card;
  renderPreview();
}

function renderPreview() {
  if (!els.cardPreview) return;
  const card = previewCard || game?.player?.hand?.[0] || game?.player?.extra?.[0];
  if (!card) {
    els.cardPreview.className = "card-preview empty-preview";
    els.cardPreview.innerHTML = "<span>カードを選択</span>";
    return;
  }
  const isUnit = ["unit", "extra_unit"].includes(card.type);
  const keywords = (card.keywords || []).map((keyword) => keywordNames[keyword]).join(" / ");
  const tribe = shouldShowTribe(card) ? tribeNames[card.tribe] : "なし";
  els.cardPreview.className = `card-preview card-frame ${card.rarity} ${card.type}${hasCompletedImage(card) ? " completed-mode" : " dummy-mode"}`;
  els.cardPreview.innerHTML = hasCompletedImage(card)
    ? renderCardVisual(card, "preview")
    : `
      ${renderCardVisual(card, "preview")}
      <div class="preview-head">
        <span class="card-cost">${card.cost}</span>
        <span class="preview-type">${cardTypeLabel(card)}</span>
      </div>
      <strong class="preview-name">${card.name}</strong>
      <span class="preview-class">${classNames[card.cardClass]}${isUnit ? ` / ${tribe}` : ""}</span>
      ${keywords ? `<em class="preview-keywords">${keywords}</em>` : ""}
      <p>${card.text || "能力なし。"}</p>
      ${
        isUnit
          ? `<div class="preview-stats"><span>攻撃 ${card.attack}</span><span>体力 ${getCurrentHp(card)}</span></div>`
          : `<div class="preview-stats"><span>${card.type === "field" ? "フィールド" : "スペル"}</span></div>`
      }
    `;
}

function showHoverPreview(card, event) {
  if (!ui.hoverPreview || !event) return;
  ui.hoverPreview.hidden = false;
  ui.hoverPreview.innerHTML = renderHoverCard(card);
  const width = 280;
  const height = 430;
  const margin = 16;
  const x = Math.min(event.clientX + 18, window.innerWidth - width - margin);
  const y = Math.min(event.clientY + 18, window.innerHeight - height - margin);
  ui.hoverPreview.style.left = `${Math.max(margin, x)}px`;
  ui.hoverPreview.style.top = `${Math.max(margin, y)}px`;
}

function hideHoverPreview() {
  if (ui.hoverPreview) ui.hoverPreview.hidden = true;
}

function renderHoverCard(card) {
  const isUnit = ["unit", "extra_unit"].includes(card.type);
  const keywords = (card.keywords || []).map((keyword) => keywordNames[keyword]).join(" / ");
  return hasCompletedImage(card)
    ? `
      <div class="hover-card card-frame ${card.rarity} ${card.type} completed-mode">
        ${renderCardVisual(card, "hover")}
      </div>
    `
    : `
      <div class="hover-card card-frame ${card.rarity} ${card.type} dummy-mode">
        ${renderCardVisual(card, "hover")}
        <div class="preview-head">
          <span class="card-cost">${card.cost}</span>
          <span class="preview-type">${cardTypeLabel(card)}</span>
        </div>
        <strong class="preview-name">${card.name}</strong>
        <span class="preview-class">${classNames[card.cardClass]}${shouldShowTribe(card) ? ` / ${tribeNames[card.tribe]}` : ""}</span>
        ${keywords ? `<em class="preview-keywords">${keywords}</em>` : ""}
        <p>${card.text || "能力なし。"}</p>
        ${
          isUnit
            ? `<div class="preview-stats"><span>攻撃 ${card.attack}</span><span>体力 ${getCurrentHp(card)}</span></div>`
            : `<div class="preview-stats"><span>${card.type === "field" ? "フィールド" : "スペル"}</span></div>`
        }
      </div>
    `;
}

function showScreen(screenName) {
  currentScreen = screenName;
  document.body.classList.toggle("home-mode", screenName === "home");
  document.body.classList.toggle("battle-mode", screenName === "battle");
  document.body.classList.toggle("management-mode", !["home", "battle"].includes(screenName));
  closeBattleMenu();
  Object.entries(ui.screens).forEach(([name, screen]) => {
    screen?.classList.toggle("active", name === screenName);
  });
  ui.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.screenButton === screenName);
  });
  if (screenName === "cardLibrary") renderCardLibrary();
  if (screenName === "deckBuilder") renderDeckBuilder();
  updateHomeDeckInfo();
}

function openBattleMenu() {
  if (!ui.battleSideMenu || !ui.battleMenuOverlay) return;
  ui.battleSideMenu.classList.add("open");
  ui.battleSideMenu.setAttribute("aria-hidden", "false");
  ui.battleMenuOverlay.hidden = false;
  ui.battleMenuButton?.setAttribute("aria-expanded", "true");
}

function closeBattleMenu() {
  if (!ui.battleSideMenu || !ui.battleMenuOverlay) return;
  ui.battleSideMenu.classList.remove("open");
  ui.battleSideMenu.setAttribute("aria-hidden", "true");
  ui.battleMenuOverlay.hidden = true;
  ui.battleMenuButton?.setAttribute("aria-expanded", "false");
}

function toggleBattleMenu() {
  if (ui.battleSideMenu?.classList.contains("open")) closeBattleMenu();
  else openBattleMenu();
}

function retireBattle() {
  closeBattleMenu();
  if (game.winner) return;
  endGame("enemy", "リタイアしました。");
}

function setupCollectionControls() {
  fillFilter(ui.libraryTypeFilter, [
    ["all", "種類: すべて"],
    ["unit", "ユニット"],
    ["spell", "スペル"],
    ["field", "フィールド"],
    ["extra", "エクストラ"]
  ]);
  fillFilter(ui.deckTypeFilter, [
    ["all", "種類: すべて"],
    ["unit", "ユニット"],
    ["spell", "スペル"],
    ["field", "フィールド"]
  ]);
  fillFilter(ui.libraryClassFilter, [
    ["all", "クラス: すべて"],
    ["knight", "ナイト"],
    ["mage", "メイジ"],
    ["neutral", "ニュートラル"]
  ]);
  fillFilter(ui.deckClassFilter, [
    ["all", "クラス: 使用可能"],
    ["knight", "ナイト"],
    ["mage", "メイジ"],
    ["neutral", "ニュートラル"]
  ]);
  fillFilter(ui.libraryImageFilter, [
    ["all", "画像: すべて"],
    ["complete", "完成済み"],
    ["dummy", "未完成"]
  ]);
  fillFilter(ui.deckImageFilter, [
    ["all", "画像: すべて"],
    ["complete", "完成済み"],
    ["dummy", "未完成"]
  ]);
  fillFilter(ui.libraryTribeFilter, buildTribeOptions("種族: すべて"));
  fillFilter(ui.deckTribeFilter, buildTribeOptions("種族: すべて"));
  fillFilter(
    ui.deckClassSelect,
    Object.entries(window.CardGameData.classes).map(([value, label]) => [value, label])
  );
  fillFilter(
    ui.homeCpuDeckSelect,
    Object.values(window.CardGameData.cpuDecks).map((deck) => [deck.id, deck.name])
  );
  fillFilter(
    ui.battleCpuDeckSelect,
    Object.values(window.CardGameData.cpuDecks).map((deck) => [deck.id, deck.name])
  );
  [ui.libraryRarityFilter, ui.deckRarityFilter].forEach((select) =>
    fillFilter(select, [
      ["all", "レアリティ: すべて"],
      ["bronze", "ブロンズ"],
      ["silver", "シルバー"],
      ["gold", "ゴールド"],
      ["legend", "レジェンド"]
    ])
  );
  [ui.libraryCostFilter, ui.deckCostFilter].forEach((select) =>
    fillFilter(select, [
      ["all", "コスト: すべて"],
      ["1", "1"],
      ["2", "2"],
      ["3", "3"],
      ["4", "4"],
      ["5plus", "5以上"]
    ])
  );

  [ui.librarySearchInput, ui.libraryTypeFilter, ui.libraryClassFilter, ui.libraryTribeFilter, ui.libraryRarityFilter, ui.libraryCostFilter].forEach((element) => {
    element?.addEventListener("input", renderCardLibrary);
    element?.addEventListener("change", renderCardLibrary);
  });
  [ui.deckSearchInput, ui.deckTypeFilter, ui.deckClassFilter, ui.deckTribeFilter, ui.deckRarityFilter, ui.deckCostFilter].forEach((element) => {
    element?.addEventListener("input", renderDeckBuilder);
    element?.addEventListener("change", renderDeckBuilder);
  });
  ui.deckClassSelect?.addEventListener("change", () => {
    builderDeck.classId = ui.deckClassSelect.value;
    builderDeck.extra = normalizeExtraDeckList(builderDeck.extra, builderDeck.classId);
    setDeckMessage(`${window.CardGameData.classes[builderDeck.classId]}用デッキを編集中です。`, false);
    updateClassIcon(ui.deckClassIcon, builderDeck.classId);
    renderDeckBuilder();
  });
  [ui.homeCpuDeckSelect, ui.battleCpuDeckSelect].forEach((select) => {
    select?.addEventListener("change", () => setCpuDeck(select.value));
  });
  ui.mainDeckTab?.addEventListener("click", () => {
    builderMode = "main";
    renderDeckBuilder();
  });
  ui.extraDeckTab?.addEventListener("click", () => {
    builderMode = "extra";
    renderDeckBuilder();
  });
}

function buildTribeOptions(firstLabel) {
  return [
    ["all", firstLabel],
    ...Object.entries(window.CardGameData.tribes)
      .filter(([id]) => id !== "none")
      .map(([id, label]) => [id, label])
  ];
}

function fillFilter(select, options) {
  if (!select) return;
  select.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
}

function getFilterState(prefix) {
  const source =
    prefix === "library"
      ? {
      search: ui.librarySearchInput,
      type: ui.libraryTypeFilter,
      classFilter: ui.libraryClassFilter,
      image: ui.libraryImageFilter,
      tribe: ui.libraryTribeFilter,
      rarity: ui.libraryRarityFilter,
      cost: ui.libraryCostFilter
        }
      : {
      search: ui.deckSearchInput,
      type: ui.deckTypeFilter,
      classFilter: ui.deckClassFilter,
      image: ui.deckImageFilter,
      tribe: ui.deckTribeFilter,
      rarity: ui.deckRarityFilter,
      cost: ui.deckCostFilter
        };
  return {
    search: source.search?.value.trim().toLowerCase() || "",
    type: source.type?.value || "all",
    classFilter: source.classFilter?.value || "all",
    image: source.image?.value || "all",
    tribe: source.tribe?.value || "all",
    rarity: source.rarity?.value || "all",
    cost: source.cost?.value || "all"
  };
}

function getFilteredCards({ deckOnly = false, prefix = "library" } = {}) {
  const filters = getFilterState(prefix);
  return window.CardGameData.cards.filter((card) => {
    if (deckOnly && builderMode === "main" && !isDeckBuildable(card)) return false;
    if (deckOnly && builderMode === "extra" && !isExtraDeckBuildable(card)) return false;
    if (deckOnly && !["neutral", builderDeck.classId].includes(card.cardClass)) return false;
    if (!deckOnly && filters.type === "extra" && !["extra_unit", "extra_spell"].includes(card.type)) return false;
    if (filters.type !== "all" && filters.type !== "extra" && card.type !== filters.type) return false;
    if (filters.classFilter !== "all" && card.cardClass !== filters.classFilter) return false;
    if (filters.image === "complete" && !card.fullImage) return false;
    if (filters.image === "dummy" && card.fullImage) return false;
    if (filters.tribe !== "all" && card.tribe !== filters.tribe) return false;
    if (filters.rarity !== "all" && card.rarity !== filters.rarity) return false;
    if (filters.cost !== "all") {
      if (filters.cost === "5plus" && card.cost < 5) return false;
      if (filters.cost !== "5plus" && card.cost !== Number(filters.cost)) return false;
    }
    if (filters.search) {
      const haystack = `${card.name} ${card.text || ""}`.toLowerCase();
      if (!haystack.includes(filters.search)) return false;
    }
    return true;
  });
}

function isDeckBuildable(card) {
  return card.collectible !== false && !deckRules.excludedTypes.includes(card.type) && !deckRules.excludedClasses.includes(card.cardClass);
}

function isExtraDeckBuildable(card) {
  return card.collectible !== false && extraDeckRules.allowedTypes.includes(card.type) && !extraDeckRules.excludedClasses.includes(card.cardClass);
}

function renderCardLibrary() {
  if (!ui.cardLibraryGrid) return;
  const cards = getFilteredCards({ deckOnly: false, prefix: "library" });
  ui.cardLibraryGrid.innerHTML = "";
  cards.forEach((card) => ui.cardLibraryGrid.append(renderCollectionCard(card)));
  if (!cards.length) ui.cardLibraryGrid.innerHTML = `<p class="empty-state">条件に合うカードがありません。</p>`;
}

function renderCollectionCard(card, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `collection-card card-frame ${card.rarity} ${card.type}${hasCompletedImage(card) ? " completed-mode" : " dummy-mode"}`;
  const keywords = (card.keywords || []).map((keyword) => keywordNames[keyword]).join(" / ");
  const stats = ["unit", "extra_unit"].includes(card.type) ? `${card.attack}/${card.hp}` : "-";
  const tribe = shouldShowTribe(card) ? ` / ${tribeNames[card.tribe]}` : "";
  button.innerHTML = hasCompletedImage(card)
    ? `
      ${renderCardVisual(card, "list")}
      ${options.count ? `<span class="owned-count">×${options.count}</span>` : ""}
    `
    : `
      ${renderCardVisual(card, "list")}
      <span class="collection-meta"><b>${card.cost}</b><span>${typeNames[card.type] || cardTypeLabel(card)}</span></span>
      <strong>${card.name}</strong>
      <span class="collection-sub">${rarityNames[card.rarity]} / ${classNames[card.cardClass]} / ${stats}${tribe}</span>
      ${keywords ? `<em>${keywords}</em>` : ""}
      <small>${card.text || "能力なし。"}</small>
      ${options.count ? `<span class="owned-count">×${options.count}</span>` : ""}
    `;
  button.addEventListener("mouseenter", () => showPreview(card));
  button.addEventListener("mousemove", (event) => showHoverPreview(card, event));
  button.addEventListener("mouseleave", hideHoverPreview);
  button.addEventListener("focus", () => showPreview(card));
  button.addEventListener("click", () => {
    showPreview(card);
    if (options.onClick) options.onClick(card);
  });
  return button;
}

function setupDeckBuilder() {
  const savedDeck = loadSavedDeck();
  builderDeck = validateDeckList(savedDeck).valid
    ? normalizeSavedDeck(savedDeck)
    : { classId: deckRules.defaultClassId, cards: cloneDeckList(window.CardGameData.fixedDeck), extra: getDefaultExtraDeck(deckRules.defaultClassId) };
  if (ui.deckClassSelect) ui.deckClassSelect.value = builderDeck.classId;
}

function cloneDeckList(deckList) {
  return normalizeDeckList(deckList).map(([id, count]) => [id, count]);
}

function renderDeckBuilder() {
  if (!ui.deckCardPool || !ui.deckList) return;
  if (ui.deckClassSelect && ui.deckClassSelect.value !== builderDeck.classId) ui.deckClassSelect.value = builderDeck.classId;
  updateClassIcon(ui.deckClassIcon, builderDeck.classId);
  ui.mainDeckTab?.classList.toggle("active", builderMode === "main");
  ui.extraDeckTab?.classList.toggle("active", builderMode === "extra");
  const counts = deckListToCounts(builderDeck.cards);
  const validation = validateDeckList(builderDeck);
  ui.deckCount.textContent =
    builderMode === "main" ? `${validation.total} / ${deckRules.size}` : `${builderDeck.extra.length} / ${extraDeckRules.size}`;
  ui.deckCount.classList.toggle("invalid", builderMode === "main" ? validation.total !== deckRules.size : builderDeck.extra.length !== extraDeckRules.size);

  const cards = getFilteredCards({ deckOnly: true, prefix: "deck" });
  ui.deckCardPool.innerHTML = "";
  cards.forEach((card) => {
    ui.deckCardPool.append(
      renderCollectionCard(card, {
        count: builderMode === "main" ? counts[card.id] || 0 : builderDeck.extra.includes(card.id) ? 1 : 0,
        onClick: builderMode === "main" ? addCardToBuilder : addExtraCardToBuilder
      })
    );
  });
  if (!cards.length) ui.deckCardPool.innerHTML = `<p class="empty-state">条件に合うカードがありません。</p>`;

  ui.deckList.innerHTML = "";
  const rows = builderMode === "main" ? countsToDeckList(counts).map(([id, count]) => ({ id, count })) : builderDeck.extra.map((id) => ({ id, count: 1 }));
  rows.forEach(({ id, count }) => {
    const card = dataById[id];
    const row = document.createElement("button");
    row.type = "button";
    row.className = `deck-row ${card.rarity}`;
    row.innerHTML = `<span>${card.cost}</span><strong>${card.name}</strong><em>${count}</em>`;
    row.addEventListener("mouseenter", () => showPreview(card));
    row.addEventListener("mousemove", (event) => showHoverPreview(card, event));
    row.addEventListener("mouseleave", hideHoverPreview);
    row.addEventListener("focus", () => showPreview(card));
    row.addEventListener("click", () => (builderMode === "main" ? removeCardFromBuilder(card) : removeExtraCardFromBuilder(card)));
    ui.deckList.append(row);
  });
}

function addExtraCardToBuilder(card) {
  if (!isExtraDeckBuildable(card)) {
    setDeckMessage(`${card.name}はエクストラデッキに追加できません。`, true);
    return;
  }
  if (!["neutral", builderDeck.classId].includes(card.cardClass)) {
    setDeckMessage(`${card.name}は${window.CardGameData.classes[builderDeck.classId]}のエクストラデッキに追加できません。`, true);
    return;
  }
  if (builderDeck.extra.includes(card.id)) {
    setDeckMessage(`${card.name}はエクストラデッキに1枚までです。`, true);
    return;
  }
  if (builderDeck.extra.length >= extraDeckRules.size) {
    setDeckMessage(`エクストラデッキは${extraDeckRules.size}枚までです。`, true);
    return;
  }
  builderDeck.extra.push(card.id);
  setDeckMessage(`${card.name}をエクストラデッキに追加しました。`, false);
  renderDeckBuilder();
}

function removeExtraCardFromBuilder(card) {
  builderDeck.extra = builderDeck.extra.filter((id) => id !== card.id);
  setDeckMessage(`${card.name}をエクストラデッキから外しました。`, false);
  renderDeckBuilder();
}

function addCardToBuilder(card) {
  if (!isDeckBuildable(card)) {
    setDeckMessage(`${card.name}は通常デッキに追加できません。`, true);
    return;
  }
  const counts = deckListToCounts(builderDeck.cards);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const limit = deckRules.rarityLimits[card.rarity] ?? 3;
  if (total >= deckRules.size) {
    setDeckMessage(`デッキは${deckRules.size}枚までです。`, true);
    return;
  }
  if ((counts[card.id] || 0) >= limit) {
    setDeckMessage(`${card.name}は${limit}枚までです。`, true);
    return;
  }
  if (!["neutral", builderDeck.classId].includes(card.cardClass)) {
    setDeckMessage(`${card.name}は${window.CardGameData.classes[builderDeck.classId]}デッキに追加できません。`, true);
    return;
  }
  counts[card.id] = (counts[card.id] || 0) + 1;
  builderDeck.cards = countsToDeckList(counts);
  setDeckMessage(`${card.name}を追加しました。`, false);
  renderDeckBuilder();
}

function removeCardFromBuilder(card) {
  const counts = deckListToCounts(builderDeck.cards);
  if (!counts[card.id]) return;
  counts[card.id] -= 1;
  if (counts[card.id] <= 0) delete counts[card.id];
  builderDeck.cards = countsToDeckList(counts);
  setDeckMessage(`${card.name}を1枚外しました。`, false);
  renderDeckBuilder();
}

function saveBuilderDeck({ startBattle = false } = {}) {
  const validation = validateDeckList(builderDeck);
  if (!validation.valid) {
    setDeckMessage(validation.errors.join(" "), true);
    return false;
  }
  saveDeckList({ classId: builderDeck.classId, cards: countsToDeckList(deckListToCounts(builderDeck.cards)), extra: [...builderDeck.extra] });
  setDeckMessage("デッキを保存しました。", false);
  updateHomeDeckInfo();
  if (startBattle) {
    showScreen("battle");
    newGame();
  }
  return true;
}

function resetBuilderDeck() {
  removeSavedDeck();
  builderDeck = { classId: deckRules.defaultClassId, cards: cloneDeckList(window.CardGameData.fixedDeck), extra: getDefaultExtraDeck(deckRules.defaultClassId) };
  if (ui.deckClassSelect) ui.deckClassSelect.value = builderDeck.classId;
  setDeckMessage("保存デッキを削除し、初期デッキに戻しました。", false);
  updateHomeDeckInfo();
  renderDeckBuilder();
}

function setDeckMessage(message, isError) {
  if (!ui.deckMessage) return;
  ui.deckMessage.textContent = message;
  ui.deckMessage.classList.toggle("error", Boolean(isError));
}

function setCpuDeck(deckId) {
  selectedCpuDeckId = deckId;
  if (ui.homeCpuDeckSelect && ui.homeCpuDeckSelect.value !== deckId) ui.homeCpuDeckSelect.value = deckId;
  if (ui.battleCpuDeckSelect && ui.battleCpuDeckSelect.value !== deckId) ui.battleCpuDeckSelect.value = deckId;
}

function updateHomeDeckInfo() {
  if (!ui.homeDeckInfo) return;
  const savedDeck = loadSavedDeck();
  const normalized = normalizeSavedDeck(savedDeck);
  const validation = validateDeckList(savedDeck);
  const classLabel = window.CardGameData.classes[normalized.classId] || "不明";
  const status = validation.valid ? "有効" : "未保存または無効";
  updateClassIcon(ui.homeClassIcon, normalized.classId);
  if (ui.homeDeckTitle) ui.homeDeckTitle.textContent = `${classLabel}デッキ`;
  ui.homeDeckInfo.innerHTML = `
    <span>使用クラス<strong>${classLabel}</strong></span>
    <span>通常デッキ<strong>${validation.total} / ${deckRules.size}</strong></span>
    <span>エクストラ<strong>${validation.extraTotal || normalized.extra.length} / ${extraDeckRules.size}</strong></span>
    <span>状態<strong class="${validation.valid ? "valid" : "invalid"}">${status}</strong></span>
  `;
}

function setupV08Ui() {
  [ui.libraryRarityFilter, ui.deckRarityFilter].forEach((select) =>
    fillFilter(select, [
      ["all", "レアリティ: すべて"],
      ["bronze", "ブロンズ"],
      ["silver", "シルバー"],
      ["gold", "ゴールド"],
      ["legend", "レジェンド"]
    ])
  );
  [ui.libraryCostFilter, ui.deckCostFilter].forEach((select) =>
    fillFilter(select, [
      ["all", "コスト: すべて"],
      ["1", "1"],
      ["2", "2"],
      ["3", "3"],
      ["4", "4"],
      ["5plus", "5以上"]
    ])
  );
  fillFilter(ui.libraryImageFilter, [
    ["all", "画像: すべて"],
    ["complete", "完成済み"],
    ["dummy", "未完成"]
  ]);
  fillFilter(ui.deckImageFilter, [
    ["all", "画像: すべて"],
    ["complete", "完成済み"],
    ["dummy", "未完成"]
  ]);
  [ui.libraryImageFilter].forEach((element) => {
    element?.addEventListener("input", renderCardLibrary);
    element?.addEventListener("change", renderCardLibrary);
  });
  [ui.deckImageFilter].forEach((element) => {
    element?.addEventListener("input", renderDeckBuilder);
    element?.addEventListener("change", renderDeckBuilder);
  });
  updateClassIcon(ui.deckClassIcon, builderDeck.classId);
}

els.endTurnButton.addEventListener("click", endTurn);
els.newGameButton.addEventListener("click", () => {
  closeBattleMenu();
  newGame();
});
els.extraZone.addEventListener("click", openExtraModal);
els.awakenButton.addEventListener("click", () => {
  if (!isPlayerTurn() || !canUseAwaken("player")) return;
  selected = { kind: "awaken" };
  log("覚醒するユニットを選んでください。");
  render();
});
els.enemyHero.addEventListener("click", () => {
  if (selected?.kind === "attacker") {
    const unit = game.player.board[selected.row][selected.index];
    if (canAttackHero("player", unit)) {
      attackHero("player", selected.row, selected.index);
      selected = null;
      render();
    }
  } else if (selected?.kind === "spell_target_enemy") {
    const spell = game.player.hand[selected.index];
    if (!spell || spell.uid !== selected.uid || spell.cost > game.player.cost) return;
    if (!spellCanTargetHero(spell)) return;
    payAndMoveSpell("player", selected.index);
    resolveSpellEffect("player", spell, { side: "enemy", hero: true });
    log(`${spell.name}を使用。`);
    selected = null;
    checkWin();
    render();
  }
});

function spellCanTargetHero(spell) {
  return spell.effect === "deal_2_damage";
}

ui.navButtons.forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.screenButton));
});
ui.homeActions.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.homeAction;
    showScreen(target);
    if (target === "battle") newGame();
  });
});
ui.saveDeckButton?.addEventListener("click", () => saveBuilderDeck());
ui.playWithDeckButton?.addEventListener("click", () => saveBuilderDeck({ startBattle: true }));
ui.resetDeckButton?.addEventListener("click", resetBuilderDeck);
ui.closeExtraModalButton?.addEventListener("click", closeExtraModal);
ui.rematchButton?.addEventListener("click", () => {
  closeResultModal();
  showScreen("battle");
  newGame();
});
ui.resultHomeButton?.addEventListener("click", () => {
  closeResultModal();
  showScreen("home");
});
ui.resultDeckButton?.addEventListener("click", () => {
  closeResultModal();
  showScreen("deckBuilder");
});
ui.resultLibraryButton?.addEventListener("click", () => {
  closeResultModal();
  showScreen("cardLibrary");
});
ui.howToButton?.addEventListener("click", openHowToModal);
ui.closeHowToButton?.addEventListener("click", closeHowToModal);
ui.battleMenuButton?.addEventListener("click", toggleBattleMenu);
ui.closeBattleMenuButton?.addEventListener("click", closeBattleMenu);
ui.battleMenuOverlay?.addEventListener("click", closeBattleMenu);
ui.battleHomeButton?.addEventListener("click", () => {
  closeBattleMenu();
  showScreen("home");
});
ui.menuDeckButton?.addEventListener("click", () => {
  closeBattleMenu();
  showScreen("deckBuilder");
});
ui.menuLibraryButton?.addEventListener("click", () => {
  closeBattleMenu();
  showScreen("cardLibrary");
});
ui.menuHowToButton?.addEventListener("click", () => {
  closeBattleMenu();
  openHowToModal();
});
ui.menuRetireButton?.addEventListener("click", retireBattle);
ui.extraModal?.addEventListener("click", (event) => {
  if (event.target === ui.extraModal) closeExtraModal();
});
ui.howToModal?.addEventListener("click", (event) => {
  if (event.target === ui.howToModal) closeHowToModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeExtraModal();
    closeResultModal();
    closeHowToModal();
    closeBattleMenu();
  }
});

setupCollectionControls();
setupV08Ui();
setupDeckBuilder();
setCpuDeck("knight");
newGame();
showScreen("home");
