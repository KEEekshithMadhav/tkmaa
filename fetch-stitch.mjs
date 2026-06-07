import { stitch } from "@google/stitch-sdk";
import fs from "fs";
import path from "path";

const PROJECT_ID = "13990436914946035290";
const OUTPUT_DIR = "./stitch-assets";

const SCREENS = [
  { name: "tkmaa_primary_logo", id: "0bb69670d88a4bcd85eac6ff48ee3f3c" },
  { name: "parent_dashboard", id: "263c5e289a10408c94a8f0b0c5ef1279" },
  { name: "image_png", id: "8760018699275217167" },
  { name: "admin_dashboard", id: "4db2d9b7eca64168ba43f4830463fe21" },
  { name: "design_system", id: "asset-stub-assets-eafaffd0b6e348079de0bbd0e17bf8be-1779791745019" },
  { name: "tkmaa_landing_page", id: "dbed6fea75ad4794873ef6a770d2310d" },
  { name: "partner_dashboard", id: "e5993a12a5d241f79a8da0b9768ec127" },
];

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const project = stitch.project(PROJECT_ID);
  console.log("Fetching project screens...");

  for (const screen of SCREENS) {
    console.log(`\n--- ${screen.name} (${screen.id}) ---`);
    try {
      const s = await project.getScreen(screen.id);

      // Try to get image
      try {
        const imageUrl = await s.getImage();
        console.log(`  Image URL: ${imageUrl}`);
        fs.writeFileSync(path.join(OUTPUT_DIR, `${screen.name}_image_url.txt`), imageUrl);
      } catch (e) {
        console.log(`  Image: ${e.message}`);
      }

      // Try to get HTML
      try {
        const html = await s.getHtml();
        console.log(`  HTML URL: ${html}`);
        fs.writeFileSync(path.join(OUTPUT_DIR, `${screen.name}_html_url.txt`), html);
      } catch (e) {
        console.log(`  HTML: ${e.message}`);
      }

      // Try to get code
      try {
        const code = await s.getCode();
        console.log(`  Code: received`);
        fs.writeFileSync(path.join(OUTPUT_DIR, `${screen.name}_code.txt`), JSON.stringify(code, null, 2));
      } catch (e) {
        console.log(`  Code: ${e.message}`);
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }

  // Also try listing all screens
  try {
    console.log("\n\n=== All Project Screens ===");
    const allScreens = await project.screens();
    for (const s of allScreens) {
      console.log(`  Screen: ${JSON.stringify(s)}`);
    }
  } catch (e) {
    console.log(`  Error listing screens: ${e.message}`);
  }
}

main().catch(console.error);
