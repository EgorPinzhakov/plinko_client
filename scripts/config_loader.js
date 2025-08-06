import * as plinko_math from './plinko_math.js';

export async function loadConfig(url = "../config/game_config.json") {
  const rsp = await fetch(url, 
    { method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-cache" }
  );
  if (!rsp.ok) throw new Error(`Config load error: ${rsp.status}`);
  return rsp.json();
}


export function playerConfig(cfg){
  var playerConfig = {}
  playerConfig.rows = {}
  playerConfig.modifiers = {}
  for (var key of Object.keys(cfg.rows)) {

    playerConfig.rows[key] = {
      amount: cfg.rows[key].amount
    }
    var _probs = plinko_math.binom_prob(cfg.rows[key].amount)
    for (var risk_key of Object.keys(cfg.risk)) {
      var bin_multipliers = plinko_math.getMultipliers(cfg.rows[key].weights, cfg.risk[risk_key], _probs, cfg.RTP)
      playerConfig.rows[key][risk_key] = {
        bin_multipliers: bin_multipliers,
      }
    }
  }
  playerConfig.bet_variants = cfg.bet_variants
  playerConfig.chips = cfg.chips
  playerConfig.risk = []

  for (var key in cfg.risk){
    playerConfig.risk.push(key)
  }

  for (var key of Object.keys(cfg.modifiers)) {
    playerConfig.modifiers[key] = { 
      cost: cfg.modifiers[key].cost 
    }
  }
  playerConfig.modifiers.multiplier.chance = cfg.modifiers.multiplier.chance

  playerConfig.modifiers.zone.positions = cfg.modifiers.zone.positions

  playerConfig.modifiers.double_chip.positions = cfg.modifiers.double_chip.positions

  return playerConfig
}