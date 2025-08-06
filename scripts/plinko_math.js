

function _binom_row(n) {
	var row = new Array(n + 1);
	row[0] = 1.0;
	for (var k = 1; k <= n; k++){
	  row[k] = row[k-1] * parseFloat(n + 1 - k) / parseFloat(k);
  }
  console.log(row)
	return row;
}

export function binom_prob(rows){
	//Строим таблицу вероятностей и кумулятивную сумму
	var binom = _binom_row(rows);
	var inv = 1.0 / Math.pow(2.0, rows);
	var _probs = new Array();
	for (var k = 0; k <= rows; k++){
		var p = binom[k] * inv;
		_probs.push(p);                 // CDF[k] = Σ_{i≤k} P_{i}
  }
	//(аккумулятор acc должен стать 1.0 — проверка на погрешность)
	return _probs;
}

/*─────────────────────────────────────────────────────────────────────────*/
/* 2.  inverse‑CDF  (binary search)                                      */
/*─────────────────────────────────────────────────────────────────────────*/
export function uniformToPocket(cdf) {
  let u = Math.random();
  let lo = 0,
  hi = cdf.length - 1;
  while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (u < cdf[mid]) hi = mid;
      else              lo = mid + 1;
  }
  return lo;                        // карман k
}

//Мультипликаторы корзин
export function getMultipliers(weights, risk_factor, cdf, rtp){

  var prob_summ = 0
  var prob_table = []
  var mkr_arr = []

  //Расчет таблицы вероятностей
  for (var i = 0; i < cdf.length; i++) {
    prob_table.push(Math.min(cdf[i], 1 - cdf[i]))
  }

  //Pk в формуле расчета мультипликатора(сумма вероятности * вес корзины ^ риск фактора)
  for (var k = 0; k < prob_table.length; k++) {
    prob_summ += prob_table[k] * Math.pow(weights[k], risk_factor)
  }

  //Расчет мультипликаторов корзин
  for (var k = 0; k < weights.length; k++){
    var wkr = Math.pow(weights[k], risk_factor)
    var mkr = (rtp * wkr) / prob_summ
    if (mkr < 3.0) mkr_arr.push(Math.round((mkr * 10)) / 10); 
    else mkr_arr.push(Math.round(mkr))
  }

  return mkr_arr
}