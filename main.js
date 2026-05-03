const dataById = Object.fromEntries(window.CardGameData.cards.map((card) => [card.id, card]));
const lanes = ["left", "center", "right"];

let game = null;
let selected = null;
let messageId = 1;

const els = {
  turnLabel: document.querySelector("#turnLabel"),
  enemyHp: document.querySelector("#enemyHp"),
  enemyCost: document.querySelector("#enemyCost"),
  enemyHandCount: document.querySelector("#enemyHandCount"),
  enemyDeckCount: document.querySelector("#enemyDeckCount"),
  playerHp: document.querySelector("#playerHp"),
  playerCost: document.querySelector("#playerCost"),
  playerAwaken: document.querySelector("#playerAwaken"),
  playerDeckCount: document.querySelector("#playerDeckCount"),
  enemyBoard: document.querySelector("#enemyBoard"),
  playerBoard: document.querySelector("#playerBoard"),
  hand: document.querySelector("#hand"),
  extraZone: document.querySelector("#extraZone"),
  log: document.querySelector("#battleLog"),
  endTurnButton: document.querySelector("#endTurnButton"),
  newGameButton: document.querySelector("#newGameButton"),
  awakenButton: document.querySelector("#awakenButton"),
  enemyHero: document.querySelector("#enemyHero"),
  playerHero: document.querySelector("#playerHero")
};

function cloneCard(id) {
  return {
    ...dataById[id],
    uid: `${id}_${Math.random().toString(36).slice(2)}`
  };
}

function createDeck() {
  const deck = [];
  window.CardGameData.fixedDeck.forEach(([id, count]) => {
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

function makePlayer(name, isCpu, awakenPoints) {
  return {
    name,
    isCpu,
    hp: 20,
    maxCost: 0,
    cost: 0,
    deck: createDeck(),
    hand: [],
    board: { front: [null, null, null], back: [null, null, null] },
    graveyard: [],
    extra: window.CardGameData.extra.map(cloneCard),
    awaken: awakenPoints,
    spellsCast: 0
  };
}

function newGame() {
  selected = null;
  messageId = 1;
  game = {
    active: "player",
    turn: 0,
    winner: null,
    player: makePlayer("PLAYER", false, 2),
    enemy: makePlayer("CPU", true, 3)
  };
  draw(game.player, 3);
  draw(game.enemy, 4);
  els.log.innerHTML = "";
  log("対戦開始。あなたが先攻です。");
  startTurn("player");
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
  });
  selected = null;
  log(`${player.name}のターン開始。`);
  render();
  if (side === "enemy" && !game.winner) {
    window.setTimeout(runCpuTurn, 550);
  }
}

function endTurn() {
  if (!isPlayerTurn() || game.winner) return;
  startTurn("enemy");
}

function runCpuTurn() {
  const cpu = game.enemy;
  if (game.winner) return;

  let played = true;
  while (played) {
    played = false;
    const playable = cpu.hand
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => card.cost <= cpu.cost)
      .sort((a, b) => a.card.cost - b.card.cost);

    for (const item of playable) {
      if (item.card.type === "unit" && hasEmptySlot(cpu)) {
        summonFromHand("enemy", item.index, bestCpuSlot(cpu));
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
  if (card.effect === "heal_3" && game.enemy.hp >= 18) return false;
  if (card.effect === "buff_ally_1" && !firstUnitSlot(game.enemy)) return false;

  payAndMoveSpell("enemy", handIndex);
  if (card.effect === "deal_2_damage") {
    const target = firstUnitSlot(game.player);
    if (target) damageUnit("player", target.row, target.index, 2);
    else damageHero("player", 2);
  }
  if (card.effect === "heal_3") game.enemy.hp = Math.min(20, game.enemy.hp + 3);
  if (card.effect === "draw_1") draw(game.enemy, 1);
  if (card.effect === "buff_ally_1") {
    const target = firstUnitSlot(game.enemy);
    buffUnit(game.enemy, target.row, target.index, 1, 1);
  }
  log(`CPUが${card.name}を使用。`);
  checkWin();
  return true;
}

function cpuUseExtra() {
  const index = game.enemy.extra.findIndex((card) => canUseExtra(game.enemy, card) && card.cost <= game.enemy.cost);
  if (index < 0) return;
  const card = game.enemy.extra[index];
  if (card.type === "extra_unit" && hasEmptySlot(game.enemy)) {
    game.enemy.cost -= card.cost;
    game.enemy.extra.splice(index, 1);
    placeUnit(game.enemy, card, bestCpuSlot(game.enemy));
    resolveEntryEffect("enemy", card);
    log(`CPUがエクストラから${card.name}を召喚。`);
  } else if (card.type === "extra_spell") {
    game.enemy.cost -= card.cost;
    game.enemy.extra.splice(index, 1);
    damageAllUnits("player", 2);
    log(`CPUがエクストラから${card.name}を使用。`);
  }
  checkWin();
}

function cpuAwaken() {
  const target = firstUnitSlot(game.enemy);
  if (!target || game.enemy.awaken <= 0) return;
  awakenUnit("enemy", target.row, target.index);
}

function cpuAttackAll() {
  for (const row of ["front", "back"]) {
    for (let index = 0; index < 3; index += 1) {
      const unit = game.enemy.board[row][index];
      if (!unit || !unit.canAttack || game.winner) continue;
      const target = firstAttackableUnit("enemy");
      if (target) attackUnit("enemy", row, index, target.row, target.index);
      else if (canAttackHero("enemy")) attackHero("enemy", row, index);
    }
  }
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

function forEachUnit(player, fn) {
  for (const row of ["front", "back"]) {
    player.board[row].forEach((unit, index) => {
      if (unit) fn(unit, row, index);
    });
  }
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
    resolvePlayerSpell(index);
    return;
  }
  selected = { kind: "hand", index, uid: card.uid };
  log(`${card.name}を選択しました。`);
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
  selected = { kind: "extra", index, uid: card.uid };
  if (card.type === "extra_spell") resolvePlayerExtraSpell(index);
  else {
    log(`${card.name}を選択しました。空きマスを選んでください。`);
    render();
  }
}

function clickSlot(side, row, index) {
  if (game.winner) return;
  const clickedPlayer = getPlayer(side);
  const unit = clickedPlayer.board[row][index];

  if (side === "player" && selected?.kind === "hand") {
    const card = game.player.hand[selected.index];
    if (card?.uid === selected.uid && card.type === "unit" && !unit) {
      summonFromHand("player", selected.index, { row, index });
      selected = null;
      render();
    }
    return;
  }

  if (side === "player" && selected?.kind === "extra") {
    const card = game.player.extra[selected.index];
    if (card?.uid === selected.uid && card.type === "extra_unit" && !unit) {
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

  if (side === "enemy" && selected?.kind === "attacker" && unit && canAttackUnit("player", row, index)) {
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
      if (canAttackHero("player")) {
        log(`${unit.name}で攻撃対象を選択してください。CPUのHP欄をクリックすると直接攻撃できます。`);
      } else {
        log(`${unit.name}で攻撃対象を選択してください。`);
      }
    }
    render();
  }
}

function resolvePlayerSpell(index) {
  const card = game.player.hand[index];
  if (!card || card.cost > game.player.cost) return;
  if (card.effect === "deal_2_damage") {
    selected = { kind: "spell_target_enemy", index, uid: card.uid };
    log("火炎弾の対象を選んでください。");
    render();
    return;
  }
  if (card.effect === "buff_ally_1") {
    selected = { kind: "spell_target_ally", index, uid: card.uid };
    log("力の紋章の対象を選んでください。");
    render();
    return;
  }
  payAndMoveSpell("player", index);
  if (card.effect === "heal_3") game.player.hp = Math.min(20, game.player.hp + 3);
  if (card.effect === "draw_1") draw(game.player, 1);
  log(`${card.name}を使用。`);
  selected = null;
  render();
}

function resolveTargetedSpell(targetSide, row, index) {
  const spell = game.player.hand[selected.index];
  if (!spell || spell.uid !== selected.uid) return;
  payAndMoveSpell("player", selected.index);
  if (spell.effect === "deal_2_damage") damageUnit(targetSide, row, index, 2);
  if (spell.effect === "buff_ally_1") buffUnit(game.player, row, index, 1, 1);
  log(`${spell.name}を使用。`);
  selected = null;
  checkWin();
  render();
}

function resolvePlayerExtraSpell(index) {
  const card = game.player.extra[index];
  if (!card || card.cost > game.player.cost || !canUseExtra(game.player, card)) return;
  game.player.cost -= card.cost;
  game.player.extra.splice(index, 1);
  damageAllUnits("enemy", 2);
  log(`${card.name}を使用。`);
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
}

function summonFromHand(side, handIndex, slot) {
  const player = getPlayer(side);
  const [card] = player.hand.splice(handIndex, 1);
  player.cost -= card.cost;
  placeUnit(player, card, slot);
  resolveEntryEffect(side, card);
  log(`${player.name}が${card.name}を召喚。`);
  checkWin();
}

function summonFromExtra(side, extraIndex, slot) {
  const player = getPlayer(side);
  const [card] = player.extra.splice(extraIndex, 1);
  player.cost -= card.cost;
  placeUnit(player, card, slot);
  resolveEntryEffect(side, card);
  log(`${player.name}がエクストラから${card.name}を召喚。`);
  checkWin();
}

function placeUnit(player, card, slot) {
  player.board[slot.row][slot.index] = {
    ...card,
    maxHp: card.hp,
    damage: 0,
    canAttack: false,
    awakened: false
  };
}

function resolveEntryEffect(side, card) {
  const player = getPlayer(side);
  const enemySide = opponentSide(side);
  if (card.effect === "battlecry_buff_ally") {
    const target = firstOtherUnitSlot(player, card.uid);
    if (target) buffUnit(player, target.row, target.index, 1, 1);
  }
  if (card.effect === "battlecry_enemy_3") {
    const target = firstUnitSlot(getPlayer(enemySide));
    if (target) damageUnit(enemySide, target.row, target.index, 3);
  }
}

function firstOtherUnitSlot(player, uid) {
  for (const row of ["front", "back"]) {
    const index = player.board[row].findIndex((unit) => unit && unit.uid !== uid);
    if (index >= 0) return { row, index };
  }
  return null;
}

function damageHero(side, amount) {
  const player = getPlayer(side);
  player.hp -= amount;
  log(`${player.name}に${amount}ダメージ。`);
  checkWin();
}

function damageUnit(side, row, index, amount) {
  const player = getPlayer(side);
  const unit = player.board[row][index];
  if (!unit) return;
  unit.damage += amount;
  log(`${unit.name}に${amount}ダメージ。`);
  if (unit.hp - unit.damage <= 0) destroyUnit(player, row, index);
}

function damageAllUnits(side, amount) {
  const targets = [];
  forEachUnit(getPlayer(side), (_, row, index) => targets.push({ row, index }));
  targets.forEach((target) => damageUnit(side, target.row, target.index, amount));
}

function destroyUnit(player, row, index) {
  const [unit] = player.board[row].splice(index, 1, null);
  if (unit) {
    player.graveyard.push(unit);
    log(`${unit.name}は破壊されました。`);
  }
}

function buffUnit(player, row, index, attack, hp) {
  const unit = player.board[row][index];
  if (!unit) return;
  unit.attack += attack;
  unit.hp += hp;
  unit.maxHp += hp;
  log(`${unit.name}が+${attack}/+${hp}。`);
}

function awakenUnit(side, row, index) {
  const player = getPlayer(side);
  const unit = player.board[row][index];
  if (!unit || player.awaken <= 0 || unit.awakened) return;
  player.awaken -= 1;
  unit.attack += 2;
  unit.hp += 2;
  unit.maxHp += 2;
  unit.awakened = true;
  log(`${player.name}の${unit.name}が覚醒。`);
  render();
}

function attackUnit(attackerSide, attackerRow, attackerIndex, targetRow, targetIndex) {
  const attacker = getPlayer(attackerSide);
  const defenderSide = opponentSide(attackerSide);
  const defender = getPlayer(defenderSide);
  const attackingUnit = attacker.board[attackerRow][attackerIndex];
  const defendingUnit = defender.board[targetRow][targetIndex];
  if (!attackingUnit || !defendingUnit || !attackingUnit.canAttack) return;

  attackingUnit.canAttack = false;
  const attackDamage = attackingUnit.attack;
  const counterDamage = defendingUnit.attack;
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
  if (!unit || !unit.canAttack || !canAttackHero(attackerSide)) return;
  unit.canAttack = false;
  log(`${unit.name}がプレイヤーを攻撃。`);
  damageHero(defenderSide, unit.attack);
}

function firstAttackableUnit(attackerSide) {
  const defender = getPlayer(opponentSide(attackerSide));
  for (let index = 0; index < 3; index += 1) {
    if (defender.board.front[index]) return { row: "front", index };
  }
  for (let index = 0; index < 3; index += 1) {
    if (defender.board.back[index] && !defender.board.front[index]) return { row: "back", index };
  }
  return null;
}

function canAttackUnit(attackerSide, row, index) {
  const defender = getPlayer(opponentSide(attackerSide));
  if (!defender.board[row][index]) return false;
  if (row === "front") return true;
  return !defender.board.front[index];
}

function canTargetEnemyUnit(row, index) {
  return Boolean(game.enemy.board[row][index]);
}

function canAttackHero(attackerSide) {
  const defender = getPlayer(opponentSide(attackerSide));
  return defender.board.front.some((slot) => !slot);
}

function canUseExtra(player, card) {
  if (card.condition === "graveyard_units_5") {
    return player.graveyard.filter((grave) => ["unit", "extra_unit"].includes(grave.type)).length >= 5;
  }
  if (card.condition === "low_hp_10") return player.hp <= 10;
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
  render();
}

function log(text) {
  const item = document.createElement("li");
  item.textContent = text;
  item.dataset.id = String(messageId);
  messageId += 1;
  els.log.prepend(item);
  while (els.log.children.length > 9) els.log.lastElementChild.remove();
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
  els.playerHp.textContent = game.player.hp;
  els.playerCost.textContent = `${game.player.cost}/${game.player.maxCost}`;
  els.playerAwaken.textContent = game.player.awaken;
  els.playerDeckCount.textContent = game.player.deck.length;
  els.endTurnButton.disabled = !isPlayerTurn() || Boolean(game.winner);
  els.awakenButton.disabled = !isPlayerTurn() || game.player.awaken <= 0 || Boolean(game.winner);
  els.enemyHero.classList.toggle(
    "highlight",
    isPlayerTurn() &&
      !game.winner &&
      ((selected?.kind === "attacker" && canAttackHero("player")) || selected?.kind === "spell_target_enemy")
  );

  renderBoard("enemy", els.enemyBoard, ["back", "front"]);
  renderBoard("player", els.playerBoard, ["front", "back"]);
  renderHand();
  renderExtra();
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
      slot.addEventListener("click", () => clickSlot(side, row, index));
      container.append(slot);
    });
  });
}

function isHighlightedSlot(side, row, index) {
  if (!isPlayerTurn() || game.winner) return false;
  if (side === "player" && selected?.kind === "hand") {
    const card = game.player.hand[selected.index];
    return card?.type === "unit" && !game.player.board[row][index];
  }
  if (side === "player" && selected?.kind === "extra") {
    const card = game.player.extra[selected.index];
    return card?.type === "extra_unit" && !game.player.board[row][index];
  }
  if (side === "player" && selected?.kind === "spell_target_ally") {
    return Boolean(game.player.board[row][index]);
  }
  if (side === "enemy" && selected?.kind === "spell_target_enemy") {
    return Boolean(game.enemy.board[row][index]) && canTargetEnemyUnit(row, index);
  }
  if (side === "enemy" && selected?.kind === "attacker") {
    return Boolean(game.enemy.board[row][index]) && canAttackUnit("player", row, index);
  }
  if (side === "player" && selected?.kind === "awaken") {
    const unit = game.player.board[row][index];
    return Boolean(unit && !unit.awakened);
  }
  return false;
}

function renderUnit(unit) {
  const wrap = document.createElement("span");
  wrap.className = "unit-card";
  wrap.innerHTML = `
    <span class="card-cost">${unit.cost}</span>
    <strong>${unit.name}</strong>
    <span class="stats">${unit.attack}/${Math.max(0, unit.hp - unit.damage)}</span>
    ${unit.awakened ? '<span class="tag">覚醒</span>' : ""}
  `;
  return wrap;
}

function renderHand() {
  els.hand.innerHTML = "";
  game.player.hand.forEach((card, index) => {
    const button = renderPlayableCard(card);
    button.disabled = !isPlayerTurn() || card.cost > game.player.cost || Boolean(game.winner);
    if (selected?.kind === "hand" && selected.uid === card.uid) button.classList.add("selected");
    button.addEventListener("click", () => playHand(index));
    els.hand.append(button);
  });
}

function renderExtra() {
  els.extraZone.innerHTML = "";
  game.player.extra.forEach((card, index) => {
    const button = renderPlayableCard(card);
    const usable = canUseExtra(game.player, card);
    button.classList.add(usable ? "usable" : "locked");
    button.disabled = !isPlayerTurn() || card.cost > game.player.cost || !usable || Boolean(game.winner);
    if (selected?.kind === "extra" && selected.uid === card.uid) button.classList.add("selected");
    button.addEventListener("click", () => playExtra(index));
    els.extraZone.append(button);
  });
}

function renderPlayableCard(card) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `play-card ${card.rarity}`;
  const stats = ["unit", "extra_unit"].includes(card.type) ? `<span>${card.attack}/${card.hp}</span>` : "<span>SP</span>";
  button.innerHTML = `
    <span class="card-top"><b>${card.cost}</b>${stats}</span>
    <strong>${card.name}</strong>
    <small>${card.text || "能力なし"}</small>
  `;
  return button;
}

els.endTurnButton.addEventListener("click", endTurn);
els.newGameButton.addEventListener("click", newGame);
els.awakenButton.addEventListener("click", () => {
  if (!isPlayerTurn() || game.player.awaken <= 0) return;
  selected = { kind: "awaken" };
  log("覚醒するユニットを選んでください。");
  render();
});
els.enemyHero.addEventListener("click", () => {
  if (selected?.kind === "attacker" && canAttackHero("player")) {
    attackHero("player", selected.row, selected.index);
    selected = null;
    render();
  } else if (selected?.kind === "spell_target_enemy") {
    const spell = game.player.hand[selected.index];
    if (!spell || spell.uid !== selected.uid || spell.cost > game.player.cost) return;
    payAndMoveSpell("player", selected.index);
    if (spell.effect === "deal_2_damage") damageHero("enemy", 2);
    log(`${spell.name}を使用。`);
    selected = null;
    render();
  }
});

newGame();
