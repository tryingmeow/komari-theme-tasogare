// Build the Komari theme zip: preview.png + komari-theme.json + dist/
import { createWriteStream, existsSync } from "node:fs";
import { execSync } from "node:child_process";

for (const f of ["preview.png", "komari-theme.json", "dist/index.html"]) {
  if (!existsSync(f)) {
    console.error(`missing ${f} — run \`npm run build\` first`);
    process.exit(1);
  }
}

// zip via python3 (no extra npm deps)
execSync(
  `python3 -c "
import zipfile, os
with zipfile.ZipFile('komari-theme-tasogare.zip','w',zipfile.ZIP_DEFLATED) as z:
    z.write('preview.png')
    z.write('komari-theme.json')
    for root,_,files in os.walk('dist'):
        for f in files:
            p=os.path.join(root,f); z.write(p)
print('created komari-theme-tasogare.zip')"`,
  { stdio: "inherit" },
);
