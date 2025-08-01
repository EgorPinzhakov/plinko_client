
export function buildCDF1(n, p = 0.5) {
    const q   = 1 - p;
    const cdf = new Float64Array(n + 1);
    let      Cnk   = 1;        // C(n,0)
    let      pPow  = 1;        // p^0
    let      qPow  = q ** (n - 1);   // q^n
    let      acc   = 0;
  
    for (let k = 0; k < n; ++k) {
      if (k) {                        // рекуррентно: C(n,k)
        Cnk  *= (n - k) / k;
        pPow *= p;
        qPow /= q;
      }
      const Pnk = Cnk * pPow * qPow;
      acc += Pnk;
      cdf[k] = acc;                   // CDF[k] = Σ_{i≤k} P_{n,i}
    }
    // небольшая гарантия «P‑сумма ≈ 1»
    if (Math.abs(acc - 1) > 1e-9) {
      throw new Error(`CDF does not sum to 1 (got ${acc})`);
    }
    return cdf;
  }
  

function _binom_row(n) {
	var row = new Array(n);
	row[0] = 1.0;
	for (var k = 1; k < n; k++){
	  row[k] = row[k-1] * parseFloat(n-k) / parseFloat(k);
  }
	return row;
}

export function buildCDF(rows){
	//Строим таблицу вероятностей и кумулятивную сумму
	var binom = _binom_row(rows);
	var inv = 1.0 / Math.pow(2.0, rows-1);
	var acc = 0.0;
	var _cdf = new Array();
	for (var k = 0; k < rows; k++){
		var p = binom[k] * inv;
		acc += p;
		_cdf.push(acc);                 // CDF[k] = Σ_{i≤k} P_{i}
  }
	//(аккумулятор acc должен стать 1.0 — проверка на погрешность)
	return _cdf;
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

export function getMultipliers(weights, risk_factor, cdf, rtp){
  var prob_summ = 0
  var prob_table = []
  var mkr_arr = []


  for (var i = 0; i < cdf.length - 1; i++) {
    prob_table.push(Math.min(cdf[i], 1 - cdf[i]))
  }

  for (var k = 0; k < prob_table.length; k++) {
    prob_summ += prob_table[k] * Math.pow(weights[k], risk_factor)
  }

  for (var k = 0; k < weights.length; k++){
    var wkr = Math.pow(weights[k], risk_factor)
    var mkr = (rtp * wkr) / prob_summ
    if (mkr < 3.0) mkr_arr.push(Math.round((mkr * 10)) / 10); 
    else mkr_arr.push(Math.round(mkr))
  }

  return mkr_arr
}