/* bridge.js  – выполняется ВНУТРИ iframe (game/index.html) */
(function bridgeToParent () {

    // 1. ждём, пока родительская страница создаст шину
    function waitBus () {
      if (window.parent && window.parent.tonROLL && window.parent.tonROLL.PLINKO) {
        window.tonROLL = window.parent.tonROLL;     // берём ту же шину
        console.log('[bridge] bus linked to parent');
        waitGodot();                                // теперь можно регистрировать интерфейс
      } else { setTimeout(waitBus, 50); }
    }
  
    // 2. регистрируем шину как интерфейс "godotApi" для JavaScriptBridge
    function waitGodot () {
      if (typeof godot !== 'undefined' && godot.register_interface) {
        godot.register_interface('godotApi', window.tonROLL);
        console.log('[bridge] godotApi registered (iframe)');
      } else { setTimeout(waitGodot, 50); }
    }
  
    waitBus();
  })();