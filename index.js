/* plinko_player_state
  {
    bet: int с разамером ставки, где последние 2 цифры - дробная часть
    bet_cost: вся ставка с множителями модификаторов
    rows: ключ одного из рядов в config
    pin_tree: [[двумерный массив с данными о полей модификаторов на игровом поле(в основном x2 зоны)]]
    chips: int число шариков в игре
    auto_bet: int сколько раз запустить chip с текущим bet и bet_cost на текущем игровом поле TODO: изменение auto_bet в момент игры
    risk_factor: index текущего risk_factor
    modifiers: [ключи модификаторов в игре]
  }
*/

/*plinko_chip_data
  {
    chips: [массив объектов chip, с данными о запущенных шариках]  
    bonus_chips: [массив объектов chip, с данными о бонусны шариках от модификатора double_chip(двойная корзина)]  
    chip: {
      target_bin: целевая корзина шарика,
      chip_value: ставка шарика,
      chip_cost: стоимость ставки шарика,
      chip_currency: валюта шарика,
      multiplier: [мультипликаторы шарика на пути],
      way: [маршрут шарика по штырям по колонкам]
    }
  }

*/

import * as plinko_math from "./scripts/plinko_math.js"

const PlinkoEvents = {
  PLAYER_STATE_UPDATE: "STATE_UPDATE", //Событие изменения состояния игрока в godot, при изменении кол-ва рядом, шариков, модификаторов в игре, размера ставки или автоставки
  
  CONFIG_LOADED: "CONFIG_LOADED", //Событие загрузки конфига игры с сервера, сохраняет конфиг в памяти(переменная cfg)
  GODOT_READY: "GODOT_READY", //Событие загрузки окна игры и запуска движка
  LOAD_GAME: "LOAD_GAME", //Событие загрузки игры, вызывает после того, как запустился само окно игры и движок, передает конфиг игры(cfg)

  GAME_START: "GAME_START", //Инициирует начало игры с текущим state игрока
  CHIP_SCORED: "CHIP_SCORED", //Шарик упал в корзину, обносить UI истории игры 
  /*{
    "time": Time.get_datetime_string_from_system(), //время попадания в корзину (дата + время системы пользователя)
    "bet_value": ball.value, //ставка шарика
    "bet_cost": ball.cost, //стоимость ставки шарика
    "bet_currency": ball.currency, //валюта шарика
    "result": ball.value * _multiplier * ball.multiplier //результат шарика
    }
  */
  GAME_END: "GAME_END", //Событие завершения игры, пропуск анимации

  CHIP_UPDATE: "CHIP_UPDATE", //Событие изменения кол-ва шариков в игре, обновляет состояние рядов(rows), в state игрока
  ROWS_UPDATE: "ROWS_UPDATE", //Событие изменения кол-ва рядов в игре, обновляет состояние шариков(chips), в state игрока
  MODIFIERS_UPDATE: "MODIFIERS_UPDATE", //Событие изменения модификаторов в игре, обновляет состояние модификаторов(modifiers) в state игрока
  BET_UPDATE: "BET_UPDATE", //Событие изменения ставки в игре, обновляет ставку (bet) и ее стоимость(bet_cost) в state игрока
  AUTO_BET_UPDATE: "AUTO_BET_UPDATE", //Событие изменения авто-ставки в игре, обновляет авто-ставку(auto_bet) в state игрока
  RISK_FACTOR_UPDATE: "RISK_FACTOR_UPDATE" //Изменение риск-фактора в игре, обновляет риск-фактор(risk_factor) в state игрока
}

var cfg

window.addEventListener('config-ready', e => {
  cfg = e.detail;
  initUI(cfg);
  setPlayerState(cfg);
  initGodotEvents()
});


function initUI(cfg) {
  const bus = window.tonROLL.PLINKO;
  const values = { chips_text: 0, rows_text: 0 };
  const config = cfg;

  // кнопка «Старт игры»
  document.getElementById('startBtn')
  .addEventListener('click', () => {
    console.log('Клик по кнопке «Старт игры»');
    window.tonROLL.PLINKO.emit(PlinkoEvents.GAME_START, play_game())
  });

  // обработка каруселей выбора кол-ва шариков
  document.getElementById('chips').querySelectorAll('.prev, .next')
  .forEach(btn => btn.addEventListener('click', evt => {
    var _chips_key_arr = Object.keys(config.chips).filter(function(e) { return e !== 'default' })
    const id = evt.currentTarget.dataset.target;
    const dir = evt.currentTarget.classList.contains('next') ? 1 : -1;
    let v = values[id] + dir;
    if (v < 0) v = _chips_key_arr.length - 1;
    if (v >= _chips_key_arr.length) v = 0;
    values[id] = v;

    document.getElementById(id).textContent = config.chips[_chips_key_arr[v]];
    console.log(`Значение ${id} изменено на ${config.chips[_chips_key_arr[v]]}`);
    window.tonROLL.PLINKO.emit(PlinkoEvents.CHIP_UPDATE, config.chips[_chips_key_arr[v]])
  }));

  // обработка каруселей выбора рядов
  document.getElementById('rows').querySelectorAll('.prev, .next')
  .forEach(btn => btn.addEventListener('click', evt => {
    var _rows_key_arr = Object.keys(config.rows).filter(function(e) { return e !== 'default' })
    const id = evt.currentTarget.dataset.target;
    const dir = evt.currentTarget.classList.contains('next') ? 1 : -1;
    
    let v = values[id] + dir;
    if (v < 0) v = _rows_key_arr.length - 1;
    if (v >= _rows_key_arr.length) v = 0;
    values[id] = v;

    document.getElementById(id).textContent = config.rows[_rows_key_arr[v]].amount;
    console.log(`Значение ${id} изменено на ${_rows_key_arr[v]}`);
    window.tonROLL.PLINKO.emit(PlinkoEvents.ROWS_UPDATE, config.rows[_rows_key_arr[v]])
  }));


  //обработка поля ввода ставки
  const betValue = document.getElementById('betValue');
  betValue.addEventListener('input', () => {
    bus.emit(PlinkoEvents.BET_UPDATE, betValue.value);
  });

  const select = document.getElementById('betSelect');
  const minus  = document.getElementById('betMinus');
  const plus   = document.getElementById('betPlus');

  config.bet_variants.forEach((optText) => {
    const opt = document.createElement('option');
    opt.value = parseInt(optText);
    opt.textContent = optText;
    select.appendChild(opt);
  });

  const stepSelect = dir => {
    betValue.value = Math.round(Math.max((parseFloat(betValue.value || 0)) + parseInt(select.value) * dir, 0.1) * 10) / 10
    bus.emit(PlinkoEvents.BET_UPDATE, betValue.value);
  };

  minus.addEventListener('click', () => stepSelect(-1));
  plus.addEventListener('click',  () => stepSelect(+1));
  select.addEventListener('change', () => {
    console.log('[UI] QUICK BET (select) =', select.value);
  });

  //обработка флажков модификаторов
  const modifier_checks = document.getElementById('modifierChecks');
  const flags = [
    { id: 'double_chip', text: 'Двойной шарик' },
    { id: 'zone', text: 'x2 Зона' },
    { id: 'multiplier', text: 'Увеличенный шанс x2' },
  ];

  flags.forEach(({ id, text }) => {
    const label = document.createElement('label');
    label.style.marginRight = '12px';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = id;

    label.append(cb, ' ', text);
    modifier_checks.appendChild(label);

    cb.addEventListener('change', () => {
      console.log(`[UI] ${id} =`, cb.checked);
      var new_mod = {}
      new_mod[id] = config.modifiers[id]
      console.log(new_mod)
      bus.emit(PlinkoEvents.MODIFIERS_UPDATE, new_mod);
    });
  });
}


function setPlayerState(cfg){
  window.tonROLL.PLINKO.saveState(
      {
          score: cfg.default_score,
          currency: "TON",
          bet: 100,
          bet_cost: 100,
          rows: cfg.rows.default,
          chips: cfg.chips.default,
          modifiers: {},
          risk_factor: cfg.risk_factor[0]
      }
  );
  window.tonROLL.PLINKO.on(PlinkoEvents.PLAYER_STATE_UPDATE, updatePlayerState)
  
  var state =  window.tonROLL.PLINKO.loadState()
  
  document.getElementById('playerScoreValue').textContent = parseScore(state.score)
  document.getElementById('chips_text').textContent = state.chips
  document.getElementById('rows_text').textContent = state.rows.amount
  document.getElementById("betValue").textContent = state.bet
  document.getElementById("betCost").textContent = state.bet_cost
  document.querySelectorAll('.currency').forEach(el => el.dataset.cur = 'ton');

  console.log("State saved")
}

function initGodotEvents(){
  window.tonROLL.PLINKO.on(PlinkoEvents.CHIP_SCORED, updateScore)
  window.tonROLL.PLINKO.on(PlinkoEvents.GODOT_READY, godotReady)
}

function updateScore(event_type, data) {
  var player_state = window.tonROLL.PLINKO.loadState()
  var current_score = player_state.score
  current_score += data.result
  document.getElementById('playerScoreValue').textContent = parseScore(current_score)
  player_state.score = current_score
  window.tonROLL.PLINKO.saveState(player_state)
}

function godotReady(event_type, data){
  window.tonROLL.PLINKO.emit(PlinkoEvents.LOAD_GAME, cfg)
}

function updatePlayerState(event_type, data) {
  window.tonROLL.PLINKO.saveState(JSON.parse(data));
  console.log("State updated")
}

function play_game(){
    const game_data = window.tonROLL.PLINKO.loadState();
    game_data.winnings = 0        
    console.log("Calculating chips")
    var _cdf = plinko_math.buildCDF(game_data.rows.amount)
    game_data.bin_multipliers = []
    for (var i = 0; i <= game_data.rows.amount; i++) {
      game_data.bin_multipliers.push(plinko_math.getBinMultiplier(i, game_data.rows.weights, game_data.risk_factor, _cdf, cfg.RTP))
    }

    var chip_data = new Array()
    var bonus_chips = new Array()
    for (let i = 0; i < game_data.chips; i++) {
        calculate_chip(chip_data, game_data, _cdf, bonus_chips)
    }
    
    game_data.chip_data = chip_data
    game_data.bonus_chips = bonus_chips
    // ── 4. Отправляем JSON‑ответ ───────────────────────────
    console.log("Game Started")
    console.log(game_data)
    return game_data
}




function calculate_chip(chip_arr, game_data, _cdf, bonus_chips){

  var chip = {
    target_bin: plinko_math.uniformToPocket(_cdf),
    chip_value: game_data.bet,
    chip_cost: game_data.bet_cost,
    multiplier: [1],
    way: []
  }
  
  var roll_rarity = Math.random()
  var multiplier_chance = 0.05
  if (game_data.modifiers.multiplier != null) {
    multiplier_chance += game_data.modifiers.multiplier.chance
  }

  if (roll_rarity < multiplier_chance){
    chip.multiplier[0] *= 2
  }

  var current_col = 1

  for (var i = 0; i < game_data.rows.amount; i++) {
    chip.way.push(current_col)
    var jump_side = Math.floor(Math.random() * 10)%2
    current_col += jump_side
    if (game_data.modifiers.zone != null && i != parseInt(game_data.rows.amount))  {
      if (game_data.modifiers.zone.positions[i][current_col-1] == 2){
        chip.multiplier.push(chip.multiplier[chip.multiplier.length-1] * 2)
      }
    }
  }

  chip.target_bin = current_col - 1

  game_data.winnings += chip.chip_value * chip.multiplier * game_data.bin_multipliers[chip.target_bin] - chip.chip_cost

  chip_arr.push(chip)

  count_double(bonus_chips, game_data, chip.target_bin, _cdf)
}


function count_double(bonus_chips, game_data, index, _cdf){
  if (game_data.modifiers.double_chip != null && (index == (game_data.modifiers.double_chip.left ?? -1) || index == (game_data.modifiers.double_chip.right ?? -1))) {
    var bonus_data = game_data
    bonus_data.chip_cost = 0
    calculate_chip(bonus_chips, bonus_data, _cdf, bonus_chips)
  }
}

function parseScore(raw) {
  // 1. приводим к строке без пробелов
  const s = String(raw).trim();

  // 2. отсекаем возможный знак
  const sign = s.startsWith('-') ? -1 : 1;
  const digits = sign === -1 ? s.slice(1) : s;

  // 3. дополняем слева нулями, чтобы всегда была минимум одна
  const padded = digits.padStart(3, '0');   // «7» → «007», «42» → «042»

  // 4. делим на целую и дробную части
  const intPart  = padded.slice(0, -2);      // всё, кроме последних двух
  const fracPart = padded.slice(-2);         // последние две

  return sign * Number(`${intPart}.${fracPart}`);
}