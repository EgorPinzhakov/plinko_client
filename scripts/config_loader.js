
export async function loadConfig(url = "../config/config.json") {
    const rsp = await fetch(url, { cache: "no-cache" });
    if (!rsp.ok) throw new Error(`Config load error: ${rsp.status}`);
    return rsp.json();
  }