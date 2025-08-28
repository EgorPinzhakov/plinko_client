/* godotApi.js */
(function initGateway () {

	/* 1. Если мы в iframe и у родителя уже есть Bus — переиспользуем */
	if (window.parent && window.parent !== window &&
		window.parent.tonROLL && window.parent.tonROLL.PLINKO) {
  
	  window.tonROLL = window.parent.tonROLL;             // 🔗 одна и та же шина
	  console.log('[godotApi] Bus linked to parent');
  
	} else {
	  /* 2. Иначе делаем новый Singleton в текущем окне */

	  window.tonROLL = window.tonROLL || {};

	  window.tonROLL = {
  
	  };

	  if (!window.tonROLL.PLINKO) {
		const handlers = Object.create(null);
  
		window.tonROLL.PLINKO = {
			on  (t, cb) { (handlers[t] = handlers[t] || []).push(cb); },
			off (t, cb) { if (handlers[t]) handlers[t] = handlers[t].filter(f => f !== cb); },
			emit(t, d)  {
					(handlers[t] || []).forEach(cb => cb(t, d)); 
				},
		};
		console.log('[godotApi] New Bus created');
	  }
	}
	
	window.tonROLL.PLINKO.loadStateString  = () =>
		localStorage.getItem("plinko") || "{}";

	window.tonROLL.PLINKO.loadState  = () =>
		JSON.parse(localStorage.getItem("plinko") || "{}");

	window.tonROLL.PLINKO.saveState  = (obj) =>
		localStorage.setItem("plinko", JSON.stringify(obj));
  
  })();

