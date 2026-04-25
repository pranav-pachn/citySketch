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
  // Fix alias paths
  { regex: /from ['"]@\/components\/ui\/(.*?)['"]/g, to: "from '@/shared/ui/$1'" },
  { regex: /from ['"]@\/lib\/utils['"]/g, to: "from '@/shared/utils'" },
  { regex: /from ['"]@\/lib\/api['"]/g, to: "from '@/shared/api/api'" },
  { regex: /from ['"]@\/store\/useStore['"]/g, to: "from '@/entities/store/useStore'" },
];

walk(srcDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  for (const { regex, to } of replacements) {
    content = content.replace(regex, to);
  }

  // WorkspacePage specific relative imports that broke because we moved Workspace.tsx -> pages/WorkspacePage.tsx
  if (filePath.endsWith('WorkspacePage.tsx')) {
    content = content.replace(/from '\.\/store\/(.*?)'/g, "from '@/entities/store/$1'");
    content = content.replace(/from '\.\/components\/ui\/(.*?)'/g, "from '@/shared/ui/$1'");
    content = content.replace(/from '\.\/components\/(Toast.*)'/g, "from '@/shared/ui/$1'");
    content = content.replace(/from '\.\/components\/(Sidebar|WorkspaceHeader|Canvas|CompareView|ScoreDashboard|InsightsPanel|Grid2D|Scene3D|BlueprintView)'/g, "from '@/widgets/$1'");
    content = content.replace(/from '\.\/components\/(ChatInput|SiteSelector|CellDetail)'/g, "from '@/features/$1'");
    content = content.replace(/from '\.\/components\/(.*?)'/g, "from '@/widgets/$1'"); // catchall
    content = content.replace(/from '\.\/utils\/(.*?)'/g, "from '@/shared/utils/$1'");
    content = content.replace(/from '\.\/types'/g, "from '@/entities/types'");
  }

  // ui components utils reference
  if (filePath.includes('shared') && filePath.includes('ui') && filePath.endsWith('.tsx')) {
    content = content.replace(/from ['"]@\/lib\/utils['"]/g, "from '@/shared/utils'");
  }

  // Canvas importing CodeView
  if (filePath.endsWith('Canvas.tsx')) {
    content = content.replace(/from '\.\/CodeView'/g, "from '@/features/CodeView'");
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated imports in ${filePath}`);
  }
});
