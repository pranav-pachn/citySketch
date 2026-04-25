const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath, callback);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      callback(fullPath);
    }
  }
}

const replacements = [
  // store
  { regex: /from ['"](\.\.\/)*store\/useStore['"]/g, to: "from '@/entities/store/useStore'" },
  { regex: /from ['"](\.\.\/)+store\/useStore['"]/g, to: "from '@/entities/store/useStore'" },
  // types
  { regex: /from ['"](\.\.\/)*types['"]/g, to: "from '@/entities/types'" },
  { regex: /from ['"](\.\.\/)+types['"]/g, to: "from '@/entities/types'" },
  // utils
  { regex: /from ['"](\.\.\/)*utils\/(.*?)['"]/g, to: "from '@/shared/utils/$2'" },
  { regex: /from ['"](\.\.\/)+utils\/(.*?)['"]/g, to: "from '@/shared/utils/$2'" },
  // lib/api
  { regex: /from ['"](\.\.\/)*lib\/apiClient['"]/g, to: "from '@/shared/api/apiClient'" },
  { regex: /from ['"](\.\.\/)*lib\/api['"]/g, to: "from '@/shared/api/api'" },
  // ui components
  { regex: /from ['"](\.\.\/)*components\/ui\/(.*?)['"]/g, to: "from '@/shared/ui/$2'" },
  { regex: /from ['"]\.\/ui\/(.*?)['"]/g, to: "from '@/shared/ui/$1'" },
  // standalone components
  { regex: /from ['"](\.\.\/)*components\/Toaster['"]/g, to: "from '@/shared/ui/Toaster'" },
  { regex: /from ['"](\.\.\/)*components\/(.*?)['"]/g, to: "from '@/widgets/$2'" }, // generic components fallback
];

walk(srcDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  for (const { regex, to } of replacements) {
    content = content.replace(regex, to);
  }

  // Handle specific cases inside pages/WorkspacePage.tsx
  if (filePath.endsWith('WorkspacePage.tsx')) {
    content = content.replace(/from '\.\.\/components\/ui\/(.*?)'/g, "from '@/shared/ui/$1'");
    content = content.replace(/from '\.\.\/components\/(.*?)'/g, "from '@/widgets/$1'");
  }
  
  // App.tsx
  if (filePath.endsWith('App.tsx')) {
    content = content.replace(/from '\.\/pages\/(.*?)'/g, "from '@/pages/$1'");
    content = content.replace(/from '\.\/Workspace'/g, "from '@/pages/WorkspacePage'");
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated imports in ${filePath}`);
  }
});
