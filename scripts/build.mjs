import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const outputDir = resolve(projectRoot, "dist/server");

const assetSpecs = [
  ["/", "index.html", "text/html; charset=utf-8", false],
  ["/index.html", "index.html", "text/html; charset=utf-8", false],
  ["/css/main.css", "css/main.css", "text/css; charset=utf-8", false],
  ["/js/main.js", "js/main.js", "text/javascript; charset=utf-8", false],
  ["/concepts", "concepts/01/index.html", "text/html; charset=utf-8", false],
  ["/concepts/", "concepts/01/index.html", "text/html; charset=utf-8", false],
  ["/concepts/common.css", "concepts/common.css", "text/css; charset=utf-8", false],
  ["/concepts/common.js", "concepts/common.js", "text/javascript; charset=utf-8", false],
  ["/concepts/01", "concepts/01/index.html", "text/html; charset=utf-8", false],
  ["/concepts/01/", "concepts/01/index.html", "text/html; charset=utf-8", false],
  ["/concepts/01/index.html", "concepts/01/index.html", "text/html; charset=utf-8", false],
  ["/concepts/02", "index.html", "text/html; charset=utf-8", false],
  ["/concepts/02/", "index.html", "text/html; charset=utf-8", false],
  ["/concepts/02/index.html", "index.html", "text/html; charset=utf-8", false],
  ["/concepts/03", "concepts/03/index.html", "text/html; charset=utf-8", false],
  ["/concepts/03/", "concepts/03/index.html", "text/html; charset=utf-8", false],
  ["/concepts/03/index.html", "concepts/03/index.html", "text/html; charset=utf-8", false],
  ["/concepts/04", "concepts/04/index.html", "text/html; charset=utf-8", false],
  ["/concepts/04/", "concepts/04/index.html", "text/html; charset=utf-8", false],
  ["/concepts/04/index.html", "concepts/04/index.html", "text/html; charset=utf-8", false],
  ["/concepts/05", "concepts/05/index.html", "text/html; charset=utf-8", false],
  ["/concepts/05/", "concepts/05/index.html", "text/html; charset=utf-8", false],
  ["/concepts/05/index.html", "concepts/05/index.html", "text/html; charset=utf-8", false],
  ["/favicon.ico", "favicon.ico", "image/x-icon", true],
  ["/og.png", "og.png", "image/png", true],
  ["/og-atlas.png", "og-atlas.png", "image/png", true],
  ["/assets/logos/telkom.png", "assets/logos/telkom.png", "image/png", true],
  ["/assets/logos/accelbyte.svg", "assets/logos/accelbyte.svg", "image/svg+xml", false],
  ["/assets/logos/airasia.webp", "assets/logos/airasia.webp", "image/webp", true],
  ["/assets/logos/lottiefiles.svg", "assets/logos/lottiefiles.svg", "image/svg+xml", false],
  ["/assets/logos/gag101.png", "assets/logos/gag101.png", "image/png", true],
  ["/assets/logos/dotacaptain.webp", "assets/logos/dotacaptain.webp", "image/webp", true],
  ["/assets/media/wijayanto-portrait-bw.jpg", "assets/media/wijayanto-portrait-bw.jpg", "image/jpeg", true],
  ["/assets/objects/telkom-object.png", "assets/objects/telkom-object.png", "image/png", true],
  ["/assets/objects/accelbyte-object.png", "assets/objects/accelbyte-object.png", "image/png", true],
  ["/assets/objects/airasia-car.png", "assets/objects/airasia-car.png", "image/png", true],
  ["/assets/objects/lottie-object.png", "assets/objects/lottie-object.png", "image/png", true]
];

const assets = {};

for (const [pathname, sourcePath, contentType, binary] of assetSpecs) {
  const file = await readFile(resolve(projectRoot, sourcePath));
  assets[pathname] = {
    body: binary ? file.toString("base64") : file.toString("utf8"),
    contentType,
    binary
  };
}

const worker = `const assets = ${JSON.stringify(assets)};

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const asset = assets[url.pathname];

    if (!asset) {
      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" }
      });
    }

    const cacheControl = asset.contentType.startsWith("text/html")
      ? "public, max-age=0, must-revalidate"
      : "public, max-age=3600";

    return new Response(asset.binary ? decodeBase64(asset.body) : asset.body, {
      headers: {
        "content-type": asset.contentType,
        "cache-control": cacheControl,
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin"
      }
    });
  }
};
`;

await rm(resolve(projectRoot, "dist"), { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "index.js"), worker);

console.log(`Built ${Object.keys(assets).length} static routes.`);
