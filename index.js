/* player_config // настройки игрока, для отображение элементов интерфейса и выбора параметров player_state. Выводится из обычного config в config_loader.playerConfig

*/

/* plinko_player_state
  {
    bet: int с размером ставки, где последние 2 цифры - дробная часть
    bet_cost: вся ставка с множителями модификаторов
    rows: ключ одного из рядов в config
    pin_tree: [[двумерный массив с данными о полей модификаторов на игровом поле(в основном x2 зоны)]]
    chips: int число шариков в игре
    auto_bet: int сколько раз запустить chip с текущим bet и bet_cost на текущем игровом поле TODO: изменение auto_bet в момент игры
    risk_factor: ключ текущего risk_factor
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
  CHIPS_LAUNCHED: "CHIPS_LAUNCHED", //Все шарики текущей игры были запущены, для работы автоставки
  CHIP_SCORED: "CHIP_SCORED", //Шарик упал в корзину, обновить UI истории игры 
  /*{
    "time": Time.get_datetime_string_from_system(), //время попадания в корзину (дата + время системы пользователя)
    "bet_value": ball.value, //ставка шарика
    "bet_cost": ball.cost, //стоимость ставки шарика
    "bet_currency": ball.currency, //валюта шарика
    "result": ball.value * _multiplier * ball.multiplier //результат шарика
    }
  */
  GAME_END: "GAME_END", //Событие завершения игры

  GAME_SKIP: "GAME_SKIP", //Событие пропуска анимации

  CHIP_UPDATE: "CHIP_UPDATE", //Событие изменения кол-ва шариков в игре, обновляет состояние рядов(rows), в state игрока
  ROWS_UPDATE: "ROWS_UPDATE", //Событие изменения кол-ва рядов в игре, обновляет состояние шариков(chips), в state игрока
  MODIFIERS_UPDATE: "MODIFIERS_UPDATE", //Событие изменения модификаторов в игре, обновляет состояние модификаторов(modifiers) в state игрока
  BET_UPDATE: "BET_UPDATE", //Событие изменения ставки в игре, обновляет ставку (bet) и ее стоимость(bet_cost) в state игрока
  AUTO_BET_UPDATE: "AUTOBET_UPDATE", //Событие изменения авто-ставки в игре, обновляет авто-ставку(auto_bet) в state игрока
  RISK_FACTOR_UPDATE: "RISK_FACTOR_UPDATE" //Изменение риск-фактора в игре, обновляет риск-фактор(risk_factor) в state игрока
}

var cfg
var is_playing = false

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
    start_game()
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
    bus.emit(PlinkoEvents.CHIP_UPDATE, _chips_key_arr[v])
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
    bus.emit(PlinkoEvents.ROWS_UPDATE, _rows_key_arr[v])
  }));


  //обработка поля ввода ставки
  const betValue = document.getElementById('betValue');
  betValue.addEventListener('input', () => {
    bus.emit(PlinkoEvents.BET_UPDATE, betValue.value);
  });

  const autoBet = document.getElementById('autoBet');

  autoBet.addEventListener('input', () => {
    console.log(autoBet.value)
    bus.emit(PlinkoEvents.AUTO_BET_UPDATE, autoBet.value);
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
      bus.emit(PlinkoEvents.MODIFIERS_UPDATE, id);
    });
  });

    const btn   = document.getElementById('riskBtn');
  const icons = Array.from(btn.querySelectorAll('.risk-icon'));
  let level = 0; // 0..3 (0 = ничего не горит)

  function render() {
    icons.forEach((img, i) => img.classList.toggle('on', i < level));
  }

  function nextLevel() {
    level = (level % 3) + 1; // 1→2→3→1...
    render();
    console.log(Object.values(cfg.risk)[0])
    bus.emit(PlinkoEvents.RISK_FACTOR_UPDATE, cfg.risk[level-1]);
    console.log('Risk level:', level);
  }

  btn.addEventListener('click', nextLevel);

  render(); // начальная отрисовка
}

function setPlayerState(cfg){
  window.tonROLL.PLINKO.saveState(
      {
          score: 100000,
          currency: "TON",
          bet: 100,
          bet_cost: 100,
          autobet: 0,
          rows: Object.keys(cfg.rows)[0],
          chips: Object.keys(cfg.chips)[0],
          modifiers: {},
          risk: cfg.risk[0]
      }
  );

  var state =  window.tonROLL.PLINKO.loadState()

  document.getElementById('playerScoreValue').textContent = parseScore(state.score)
  document.getElementById('chips_text').textContent = cfg.chips[state.chips]
  document.getElementById('rows_text').textContent = cfg.rows[state.rows].amount
  document.getElementById("betValue").value = parseScore(state.bet)
  document.getElementById("autoBet").value = parseScore(state.autobet)
  document.getElementById("betCost").textContent = parseScore(state.bet_cost)
  document.querySelectorAll('.currency').forEach(el => el.dataset.cur = 'ton');

  console.log("State saved")
}

function initGodotEvents(){
  window.tonROLL.PLINKO.on(PlinkoEvents.PLAYER_STATE_UPDATE, updatePlayerState)
  window.tonROLL.PLINKO.on(PlinkoEvents.CHIP_SCORED, updateScore)
  window.tonROLL.PLINKO.on(PlinkoEvents.GODOT_READY, godotReady)
  window.tonROLL.PLINKO.on(PlinkoEvents.GAME_START, lockUI.bind(null, [true]))
  window.tonROLL.PLINKO.on(PlinkoEvents.GAME_END, lockUI.bind(null, [false]))
  window.tonROLL.PLINKO.on(PlinkoEvents.CHIPS_LAUNCHED, onChipsLaunched)
}

//Старт игры
function start_game(){
  var state = window.tonROLL.PLINKO.loadState()
  var current_score = state.score
  var current_autobet = Math.max(0, state.autobet - 1)
  current_score -= state.bet_cost * cfg.chips[state.chips]
  console.log(current_score)
  state.score = current_score
  state.autobet = current_autobet
  document.getElementById('playerScoreValue').textContent = parseScore(current_score)
  document.getElementById('autoBet').value = current_autobet
  window.tonROLL.PLINKO.saveState(state)
  window.tonROLL.PLINKO.emit(PlinkoEvents.GAME_START, play_game(state)) //TODO: вместо play_game(state) данные о игровой сессии полученные с сервера
}

//Обновить счет игрока при падении шарика в корзину
function updateScore(event_type, data) {
  var chip_data = JSON.parse(data)
  var player_state = window.tonROLL.PLINKO.loadState()
  var current_score = player_state.score
  current_score += chip_data.result
  player_state.score = current_score
  document.getElementById('playerScoreValue').textContent = parseScore(current_score)
  window.tonROLL.PLINKO.saveState(player_state)
}

//Игра загружена в godot, выдать конфиг игры для настройки игрового поля
function godotReady(event_type, data){
  window.tonROLL.PLINKO.emit(PlinkoEvents.LOAD_GAME, cfg)
}

function updatePlayerState(event_type, data) {

  var state = JSON.parse(data)

  state.bet_cost = state.bet
  for (var key in state.modifiers){
    state.bet_cost += state.bet * state.modifiers[key].cost
  }
  document.getElementById("betValue").textContent = parseScore(state.bet)
  document.getElementById("betCost").textContent = parseScore(state.bet_cost * cfg.chips[state.chips])

  window.tonROLL.PLINKO.saveState(state);
  console.log("State updated")
}

//Выключить/включить управление элементами интерфейса после старта игры
function lockUI(event_type, data, is_locked){
  console.log("UI is locked: ", is_locked)
  document.getElementById('rows').querySelectorAll('.prev, .next')
  .forEach(btn => btn.disabled = is_locked)

  const flags = [
    { id: 'double_chip' },
    { id: 'zone'},
    { id: 'multiplier' },
  ];

  flags.forEach(({id}) => {
    document.getElementById(id).disabled = is_locked
  })
}

//Запустить следующую игру после запуска шариков предыдущей игры
function onChipsLaunched(event_type, data){
  var state = window.tonROLL.PLINKO.loadState()

  if (state.autobet > 0) {
    start_game()
  }
}

function play_game(client_data){
    const player_data = client_data
    var game_data = {}
    player_data.winnings = 0
    game_data.winnings = 0        
    console.log("Calculating chips")
    var chip_data = new Array() //Массив шариков для кол-ва шариков выбранных игроком
    var bonus_chips = new Array() //Бонусные шарики в зависимости от модификаторов(двойные корзины)
    for (let i = 0; i < cfg.chips[player_data.chips]; i++) {
        calculate_chip(chip_data, bonus_chips, player_data)
    }
    
    game_data.chip_data = chip_data
    game_data.bonus_chips = bonus_chips
    game_data.winnings = player_data.winnings
    // ── 4. Отправляем JSON‑ответ ───────────────────────────
    console.log("Game Started")
    return game_data
}




function calculate_chip(chip_arr, bonus_chips, player_data){

  var chip = {
    target_bin: 0,
    chip_value: player_data.bet,
    chip_cost: player_data.bet_cost,
    chip_result: 0,
    multiplier: [1],
    way: []
  }
  
  var roll_rarity = Math.random()
  var multiplier_chance = 0

  if (player_data.modifiers.multiplier != null) {
    multiplier_chance += 0.2
  }

  if (roll_rarity < multiplier_chance){
    chip.multiplier[0] = step_up(chip.multiplier.at(-1))
  }

  var current_col = 1

  //Маршрут фишки
  for (var i = 0; i < cfg.rows[player_data.rows].amount; i++) {
    chip.way.push(current_col)
    var jump_side = Math.round(Math.random() * 10)%2
    current_col += jump_side
    //Если x2 зоны в игре и фишка пролетает через отверстие зоны
    if (player_data.modifiers.zone != null && i != parseInt(cfg.rows[player_data.rows].amount))  {
      if (player_data.pin_tree[i][current_col-1] == 2){
        chip.multiplier.push(step_up(chip.multiplier.at(-1)))
      }
    }
  }

  chip.target_bin = current_col - 1

  chip.chip_result = chip.chip_value * chip.multiplier[chip.multiplier.length-1] * cfg.rows[player_data.rows][player_data.risk].bin_multipliers[chip.target_bin]

  player_data.winnings += (parseInt(chip.chip_result) - chip.chip_cost)

  chip_arr.push(chip)

  //Если фишка упала в двойную корзину и модификатор в игре
  if (player_data.modifiers.double_chip != null && (chip.target_bin == (cfg.modifiers.double_chip.positions[player_data.rows][0] ?? -1) || chip.target_bin == (cfg.modifiers.double_chip.positions[player_data.rows][1] ?? -1))) {
    count_double(bonus_chips, player_data)
  }
}


function count_double(bonus_chips, player_data){
    var bonus_data = player_data
    bonus_data.bet_cost = 0
    calculate_chip(bonus_chips, bonus_chips, bonus_data)
}

function step_up(mult){
  if (mult == 1) mult = 2
  else mult += 2
  return mult
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