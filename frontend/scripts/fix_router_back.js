const fs = require('fs');
const path = require('path');

const directory = 'c:/Users/dipan/OneDrive/Desktop/git/Goldy-Mobiles/frontend/src';

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Clean up the weird double canGoBack() instances first
      content = content.replace(/router\.canGoBack\(\) \? router\.canGoBack\(\) \? router\.back\(\) : router\.replace\('([^']+)'\) : router\.replace\('([^']+)'\)/g, "router.canGoBack() ? router.back() : router.replace('$1')");
      
      // Replace raw router.back() that are not preceded by canGoBack()
      // We look for router.back() and replace it if it doesn't have `? ` before it.
      // But let's just use a simple regex that matches `router.back()` and ignores ones that are part of `router.canGoBack() ? router.back()`
      
      const parts = content.split('router.back()');
      let newContent = parts[0];
      for (let i = 1; i < parts.length; i++) {
        const prev = parts[i-1];
        if (prev.trim().endsWith('?')) {
           newContent += 'router.back()' + parts[i];
        } else {
           // check if we are in an arrow function `() => router.back()`
           // if yes, replace with `() => router.canGoBack() ? router.back() : router.replace('/')`
           // if it's a standalone statement like `router.back();`, replace with `router.canGoBack() ? router.back() : router.replace('/');`
           if (parts[i].trim().startsWith(';')) {
               newContent += 'router.canGoBack() ? router.back() : router.replace(\'/\')' + parts[i];
           } else {
               newContent += 'router.canGoBack() ? router.back() : router.replace(\'/\')' + parts[i];
           }
        }
      }
      
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(directory);
console.log('Done');
