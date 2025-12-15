#!/usr/bin/env node

/**
 * Script de correction automatique des problèmes de rafraîchissement
 * Corrige automatiquement les patterns problématiques les plus courants
 */

const fs = require('fs');
const path = require('path');

// Couleurs pour la console
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Corrections automatiques
const autoFixes = [
  {
    name: 'Remplacer type="submit" par type="button"',
    pattern: /(<Button[^>]*?)type\s*=\s*["']submit["']([^>]*>)/g,
    replacement: '$1type="button"$2',
    description: 'Remplace type="submit" par type="button" dans les composants Button'
  },
  {
    name: 'Ajouter preventDefault dans onClick',
    pattern: /(onClick\s*=\s*{\s*\([^)]*\)\s*=>\s*{)(?!\s*[^}]*preventDefault)/g,
    replacement: '$1\n    e.preventDefault();\n    e.stopPropagation();',
    description: 'Ajoute preventDefault() dans les handlers onClick qui n\'en ont pas'
  },
  {
    name: 'Corriger les handlers onSubmit',
    pattern: /(onSubmit\s*=\s*{\s*\([^)]*\)\s*=>\s*{)(?!\s*[^}]*preventDefault)/g,
    replacement: '$1\n    e.preventDefault();\n    e.stopPropagation();',
    description: 'Ajoute preventDefault() dans les handlers onSubmit'
  },
  {
    name: 'Ajouter type="button" aux boutons sans type',
    pattern: /(<Button(?![^>]*type\s*=)[^>]*)(>)/g,
    replacement: '$1 type="button"$2',
    description: 'Ajoute type="button" aux composants Button qui n\'ont pas de type spécifié'
  }
];

function scanDirectory(dir, results = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Ignorer certains dossiers
      if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
        scanDirectory(filePath, results);
      }
    } else if (file.match(/\.(tsx?|jsx?)$/)) {
      results.push(filePath);
    }
  }
  
  return results;
}

function applyFixes(filePath, dryRun = false) {
  const originalContent = fs.readFileSync(filePath, 'utf8');
  let content = originalContent;
  const appliedFixes = [];
  
  autoFixes.forEach(({ name, pattern, replacement, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      appliedFixes.push({
        name,
        description,
        count: matches.length
      });
    }
  });
  
  // Corrections spécifiques pour les formulaires
  if (content.includes('<form') && content.includes('onSubmit')) {
    // Remplacer <form onSubmit={handler}> par <div> et gérer manuellement
    const formPattern = /<form([^>]*onSubmit[^>]*)>/g;
    const formMatches = content.match(formPattern);
    if (formMatches) {
      content = content.replace(formPattern, '<div$1>');
      content = content.replace(/<\/form>/g, '</div>');
      appliedFixes.push({
        name: 'Remplacer form par div',
        description: 'Remplace les balises <form> par <div> pour éviter les soumissions automatiques',
        count: formMatches.length
      });
    }
  }
  
  if (!dryRun && content !== originalContent) {
    // Créer une sauvegarde
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.writeFileSync(backupPath, originalContent);
    
    // Écrire le fichier corrigé
    fs.writeFileSync(filePath, content);
    
    console.log(`${colors.green}✅ Sauvegarde créée: ${backupPath}${colors.reset}`);
  }
  
  return {
    modified: content !== originalContent,
    appliedFixes,
    originalSize: originalContent.length,
    newSize: content.length
  };
}

function generateFixReport(results, dryRun) {
  let totalFiles = 0;
  let modifiedFiles = 0;
  let totalFixes = 0;
  
  console.log(`${colors.bold}${colors.blue}🔧 RAPPORT DE CORRECTION ${dryRun ? '(MODE TEST)' : ''}${colors.reset}\n`);
  
  Object.entries(results).forEach(([filePath, { modified, appliedFixes, originalSize, newSize }]) => {
    totalFiles++;
    
    if (modified) {
      modifiedFiles++;
      console.log(`${colors.bold}📁 ${filePath}${colors.reset}`);
      
      appliedFixes.forEach(({ name, description, count }) => {
        totalFixes += count;
        console.log(`  ${colors.green}✅ ${name} (${count} correction(s))${colors.reset}`);
        console.log(`     ${description}`);
      });
      
      console.log(`  ${colors.blue}📊 Taille: ${originalSize} → ${newSize} caractères${colors.reset}`);
      console.log('');
    }
  });
  
  // Résumé
  console.log(`${colors.bold}📊 RÉSUMÉ${colors.reset}`);
  console.log(`Fichiers analysés: ${totalFiles}`);
  console.log(`Fichiers modifiés: ${modifiedFiles}`);
  console.log(`Total des corrections: ${totalFixes}`);
  
  if (dryRun) {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  MODE TEST ACTIVÉ - Aucun fichier n'a été modifié${colors.reset}`);
    console.log(`${colors.blue}Pour appliquer les corrections, exécutez: node scripts/fix-refresh-issues.js --apply${colors.reset}`);
  } else if (modifiedFiles > 0) {
    console.log(`\n${colors.green}${colors.bold}🎉 Corrections appliquées avec succès !${colors.reset}`);
    console.log(`${colors.blue}💡 Conseils:${colors.reset}`);
    console.log(`  1. Testez chaque composant modifié`);
    console.log(`  2. Vérifiez que les interactions fonctionnent correctement`);
    console.log(`  3. Les sauvegardes sont disponibles avec l'extension .backup`);
  } else {
    console.log(`\n${colors.green}${colors.bold}✨ Aucune correction nécessaire - Votre code est déjà optimisé !${colors.reset}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const srcDir = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error(`${colors.red}Erreur: Dossier 'src' non trouvé. Exécutez ce script depuis la racine du projet.${colors.reset}`);
    process.exit(1);
  }
  
  if (dryRun) {
    console.log(`${colors.yellow}🧪 Mode test activé - Analyse des corrections possibles...${colors.reset}\n`);
  } else {
    console.log(`${colors.blue}🔧 Application des corrections automatiques...${colors.reset}\n`);
  }
  
  const files = scanDirectory(srcDir);
  const results = {};
  
  files.forEach(filePath => {
    const relativePath = path.relative(process.cwd(), filePath);
    results[relativePath] = applyFixes(filePath, dryRun);
  });
  
  generateFixReport(results, dryRun);
}

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = { applyFixes, scanDirectory };