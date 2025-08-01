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
		sendJson: async function (obj) {
			try {
				  const response = await fetch("http://localhost:3000/upload", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: obj
				  });
				 console.log(response); //
				 let body = response.text(); // parse the response body
				  console.log(body); //
				 return body;
			}
			catch {
				return null;
			}
		  },
	
		readConfig: async function() {
			try {
				  const response = await fetch("http://localhost:3000/config", {
					method: "GET",
					   headers: { "Content-Type": "application/json" },
				  });
				 let body = response.text(); // parse the response body
				 return body;
			}
			catch {
				return null;
			}
		},
	
		message: function(){
			console.log("Message")
		},

		getImages: async function () {
			try{
				const res = await fetch("http://localhost:3000/img", { mode: 'cors' });
				const mime = res.headers.get('content-type') || '';
				const buf  = new Uint8Array(await res.arrayBuffer());
				// 0 = ok, res.status и mime пойдут в Godot
				console.log(res)
				return (0, res.status, mime, buf);
			}catch(e){
				// 1 = ошибка
				return (1, 0, '', new Uint8Array());
			}
		}
	};

	  if (!window.tonROLL.PLINKO) {
		const handlers = Object.create(null);
  
		window.tonROLL.PLINKO = {
		  on  (t, cb) { (handlers[t] = handlers[t] || []).push(cb); },
		  off (t, cb) { if (handlers[t]) handlers[t] = handlers[t].filter(f => f !== cb); },
		  emit(t, d)  {
			 	(handlers[t] || []).forEach(cb => cb(t, d)); 
			}
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

	/* 3. Регистрируем Bus как интерфейс "godotApi" (если это сборка Web-Godot) */
	(function waitGodot () {
	  if (typeof godot !== 'undefined' && godot.register_interface) {
		godot.register_interface('godotApi', window.tonROLL);
		console.log('[godotApi] godotApi registered');
	  } else { setTimeout(waitGodot, 50); }
	})();
  
  })();