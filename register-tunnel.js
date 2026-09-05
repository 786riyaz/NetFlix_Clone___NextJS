// register-tunnel.js — run this alongside your local Vault server (see
// package.json script "tunnel:register"). It starts (or reconnects to)
// your DevTunnel, watches its output for the public URL, and tells the
// Render proxy where to send traffic. If the tunnel ever reconnects with
// a different URL, this picks it up automatically without you touching
// Render at all.
//
// One-time setup (do this once, before running this script):
//   1. Install the DevTunnel CLI:
//        winget install Microsoft.devtunnel        (Windows)
//        brew install --cask devtunnel              (macOS)
//   2. Log in (opens a browser once, then caches the session):
//        devtunnel user login
//   3. Create a PERSISTENT tunnel — this is what makes the URL stable
//      across restarts instead of changing every time, unlike a plain
//      `devtunnel host -p 3000` with no created tunnel:
//        devtunnel create --allow-anonymous --expiration 30d
//        devtunnel port create -p 3000
//      (Re-run the `create` step to renew before the 30 days are up, or
//      drop --expiration for the CLI's default lifetime.)
//
// Then set two environment variables (e.g. in .env.proxy):
//   PROXY_URL=https://your-proxy.onrender.com
//   PROXY_SECRET=<same value you set on the Render proxy>
//
// This script itself starts `devtunnel host` for you — you don't need a
// separate terminal for it.

const { spawn } = require("child_process");

const PROXY_URL = process.env.PROXY_URL;
const PROXY_SECRET = process.env.PROXY_SECRET;
const LOCAL_PORT = process.env.PORT || "3000";
// Optional: pass the specific tunnel ID from `devtunnel create` if you
// have more than one tunnel and need to pick a particular one. If unset,
// `devtunnel host -p <port>` is used, which reuses a port you've already
// created against your *default* tunnel (the one `create` most recently
// switched you to).
const TUNNEL_ID = process.env.DEVTUNNEL_ID || "";

if (!PROXY_URL || !PROXY_SECRET) {
  console.error(
    "Missing PROXY_URL and/or PROXY_SECRET. Set both (e.g. in a .env.proxy " +
      "file and export them, or your shell profile) before running this script."
  );
  process.exit(1);
}

let lastRegistered = null;

async function registerWithProxy(targetUrl) {
  const res = await fetch(`${PROXY_URL.replace(/\/+$/, "")}/_proxy/register-target`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetUrl, secret: PROXY_SECRET }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Proxy rejected registration (${res.status}): ${body}`);
  }
  return res.json();
}

// `devtunnel host` prints one or more candidate URLs on a line like:
//   Hosting port 3000 at https://abc123.usw2.devtunnels.ms:3000/,
//   https://abc123-3000.usw2.devtunnels.ms/ and inspect it at
//   https://abc123-3000-inspect.usw2.devtunnels.ms/
// We want the clean form without an explicit :PORT suffix and without
// "-inspect" (that one's for traffic inspection, not for serving users).
const URL_PATTERN = /https:\/\/[a-zA-Z0-9.\-]+\.devtunnels\.ms(?::\d+)?\/?/g;
function extractBestUrl(text) {
  const matches = text.match(URL_PATTERN) || [];
  const usable = matches.filter((u) => !u.includes("-inspect"));
  return usable.find((u) => !/:\d+/.test(u)) || usable[0] || matches[0] || null;
}

function handleTunnelOutput(chunk) {
  const text = chunk.toString();
  process.stdout.write(`[devtunnel] ${text}`);
  const url = extractBestUrl(text);
  if (!url || url === lastRegistered) return;
  const clean = url.replace(/\/+$/, "");
  registerWithProxy(clean)
    .then(() => {
      lastRegistered = clean;
      console.log(`[register-tunnel] registered ${clean} with the proxy.`);
    })
    .catch((err) => console.error(`[register-tunnel] failed to register: ${err.message}`));
}

function startDevTunnel() {
  const args = TUNNEL_ID ? ["host", TUNNEL_ID] : ["host", "-p", LOCAL_PORT];
  console.log(`[register-tunnel] starting: devtunnel ${args.join(" ")}`);
  // shell:true so this resolves devtunnel from PATH correctly on Windows
  const child = spawn("devtunnel", args, { shell: true });
  child.stdout.on("data", handleTunnelOutput);
  child.stderr.on("data", handleTunnelOutput);
  child.on("error", (err) => {
    console.error(
      `[register-tunnel] could not start devtunnel: ${err.message}. Is the CLI installed and on your PATH? Try running 'devtunnel host -p ${LOCAL_PORT}' manually first to check.`
    );
  });
  child.on("exit", (code) => {
    console.error(`[register-tunnel] devtunnel exited (code ${code}). Restarting in 5s...`);
    setTimeout(startDevTunnel, 5000);
  });
}

console.log(`[register-tunnel] will register URL changes with ${PROXY_URL}`);
startDevTunnel();

