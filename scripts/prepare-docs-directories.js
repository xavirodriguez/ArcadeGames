const fs = require('fs');
const path = require('path');

function createDir(dirName) {
  try {
    const targetPath = path.resolve(__dirname, '..', dirName);
    fs.mkdirSync(targetPath, { recursive: true });
    console.log(`Directory successfully prepared: ${targetPath}`);
  } catch (error) {
    console.error(`Error preparing directory ${dirName}:`, error);
    process.exit(1);
  }
}

createDir('etc');
createDir('temp');
