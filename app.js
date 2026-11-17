// Structure : { [folderId]: { name: string, emoji: string, blocks: { ... }, directSubjects: { ... } } }
let appData = JSON.parse(localStorage.getItem('moyennapp_v2')) || {};
let currentFolderId = null;
let currentBlockId = null;

// Cible en cours de modification d'emoji
let emojiTarget = null;

const PRESET_EMOJIS = [
  '📁', '🎓', '🏫', '🎒', '📚', '📖',
  '📦', '🗂️', '📐', '🧮', '🧪', '🧬',
  '🌍', '🏛️', '💻', '🎨', '🎵', '⚽',
  '🇬🇧', '🇪🇸', '🇩🇪', '🇫🇷', '📝', '⭐'
];

// Vues
const foldersView = document.getElementById('folders-view');
const blocksView = document.getElementById('blocks-view');
const subjectsView = document.getElementById('subjects-view');

// Éléments Dossiers
const folderForm = document.getElementById('folder-form');
const foldersList = document.getElementById('folders-list');

// Éléments Vue Dossier
const backToFoldersBtn = document.getElementById('back-to-folders-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const currentFolderTitle = document.getElementById('current-folder-title');
const folderAverageEl = document.getElementById('folder-average');

const showBlockFormBtn = document.getElementById('show-block-form-btn');
const showDirectSubFormBtn = document.getElementById('show-direct-sub-form-btn');
const blockForm = document.getElementById('block-form');
const cancelBlockBtn = document.getElementById('cancel-block-btn');
const directSubjectForm = document.getElementById('direct-subject-form');
const cancelDirectSubBtn = document.getElementById('cancel-direct-sub-btn');

const blocksList = document.getElementById('blocks-list');
const directSubjectsList = document.getElementById('direct-subjects-list');

// Éléments Vue Bloc
const backToBlocksBtn = document.getElementById('back-to-blocks-btn');
const currentBlockTitle = document.getElementById('current-block-title');
const blockAverageEl = document.getElementById('block-average');
const subjectForm = document.getElementById('subject-form');
const subjectsList = document.getElementById('subjects-list');

// Modale Emoji
const emojiModal = document.getElementById('emoji-modal');
const emojiPresetsEl = document.getElementById('emoji-presets');
const customEmojiInput = document.getElementById('custom-emoji-input');
const saveCustomEmojiBtn = document.getElementById('save-custom-emoji-btn');
const closeEmojiModalBtn = document.getElementById('close-emoji-modal');

function saveData() {
  localStorage.setItem('moyennapp_v2', JSON.stringify(appData));
}

// ---------------- GESTION DES EMOJIS PERSONNALISÉS ----------------

function initEmojiPicker() {
  emojiPresetsEl.innerHTML = '';
  PRESET_EMOJIS.forEach(em => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-choice-btn';
    btn.textContent = em;
    btn.onclick = () => applyEmoji(em);
    emojiPresetsEl.appendChild(btn);
  });
}

function openEmojiPicker(type, id, isDirect, event) {
  event.stopPropagation();
  emojiTarget = { type, id, isDirect };
  customEmojiInput.value = '';
  emojiModal.classList.remove('hidden');
}

function closeEmojiPicker() {
  emojiModal.classList.add('hidden');
  emojiTarget = null;
}

function applyEmoji(newEmoji) {
  const cleanEmoji = newEmoji.trim();
  if (!cleanEmoji || !emojiTarget) return;

  const { type, id, isDirect } = emojiTarget;

  if (type === 'folder') {
    appData[id].emoji = cleanEmoji;
    saveData();
    renderFolders();
  } else if (type === 'block') {
    appData[currentFolderId].blocks[id].emoji = cleanEmoji;
    saveData();
    renderFolderContent();
  } else if (type === 'subject') {
    if (isDirect) {
      appData[currentFolderId].directSubjects[id].emoji = cleanEmoji;
      saveData();
      renderFolderContent();
    } else {
      appData[currentFolderId].blocks[currentBlockId].subjects[id].emoji = cleanEmoji;
      saveData();
      renderBlockSubjects();
    }
  }

  closeEmojiPicker();
}

closeEmojiModalBtn.addEventListener('click', closeEmojiPicker);
emojiModal.addEventListener('click', (e) => {
  if (e.target === emojiModal) closeEmojiPicker();
});
saveCustomEmojiBtn.addEventListener('click', () => {
  if (customEmojiInput.value.trim()) {
    applyEmoji(customEmojiInput.value.trim());
  }
});

// ---------------- CALCULS DE MOYENNES ----------------

function getSubjectAverage(subject) {
  if (!subject.grades || subject.grades.length === 0) return null;
  let pts = 0, coefs = 0;
  subject.grades.forEach(g => {
    pts += g.value * g.coef;
    coefs += g.coef;
  });
  return coefs > 0 ? pts / coefs : null;
}

function getBlockAverage(block) {
  const subjects = Object.values(block.subjects || {});
  let pts = 0, coefs = 0;
  subjects.forEach(sub => {
    const avg = getSubjectAverage(sub);
    if (avg !== null) {
      pts += avg * sub.coef;
      coefs += sub.coef;
    }
  });
  return coefs > 0 ? pts / coefs : null;
}

function getFolderAverage(folder) {
  let pts = 0, coefs = 0;

  const blocks = Object.values(folder.blocks || {});
  blocks.forEach(blk => {
    const avg = getBlockAverage(blk);
    if (avg !== null) {
      pts += avg;
      coefs += 1;
    }
  });

  const directSubs = Object.values(folder.directSubjects || {});
  directSubs.forEach(sub => {
    const avg = getSubjectAverage(sub);
    if (avg !== null) {
      pts += avg * sub.coef;
      coefs += sub.coef;
    }
  });

  return coefs > 0 ? pts / coefs : null;
}

// ---------------- VUE 1 : DOSSIERS ----------------

folderForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const folderInput = document.getElementById('folder-name');
  const name = folderInput.value.trim();
  if (!name) return;

  const id = 'folder_' + Date.now();
  appData[id] = { name, emoji: '📁', blocks: {}, directSubjects: {} };
  saveData();
  renderFolders();

  folderForm.reset();
  setTimeout(() => folderInput.focus(), 10);
});

function deleteFolder(id, e) {
  e.stopPropagation();
  if (confirm("Supprimer ce dossier et tout son contenu ?")) {
    delete appData[id];
    saveData();
    renderFolders();
  }
}

function openFolder(id) {
  currentFolderId = id;
  if (!appData[id].directSubjects) appData[id].directSubjects = {};
  if (!appData[id].blocks) appData[id].blocks = {};

  blockForm.classList.add('hidden');
  directSubjectForm.classList.add('hidden');

  foldersView.classList.add('hidden');
  subjectsView.classList.add('hidden');
  blocksView.classList.remove('hidden');
  renderFolderContent();
}

function renderFolders() {
  foldersList.innerHTML = '';
  const keys = Object.keys(appData);

  if (keys.length === 0) {
    foldersList.innerHTML = '<p class="subtitle">Aucun dossier créé pour le moment.</p>';
    return;
  }

  keys.forEach(id => {
    const folder = appData[id];
    const emoji = folder.emoji || '📁';
    const blockCount = Object.keys(folder.blocks || {}).length;
    const subCount = Object.keys(folder.directSubjects || {}).length;
    const avg = getFolderAverage(folder);
    const avgText = avg !== null ? ` • Moyenne : ${avg.toFixed(2)}/20` : '';

    const card = document.createElement('div');
    card.className = 'item-card';
    card.onclick = () => openFolder(id);
    card.innerHTML = `
      <div class="item-card-left">
        <span class="emoji-badge" title="Changer l'emoji" onclick="openEmojiPicker('folder', '${id}', false, event)">${emoji}</span>
        <div class="item-card-info">
          <h3>${folder.name}</h3>
          <small style="color: #9ca3af;">${blockCount} bloc(s), ${subCount} matière(s)${avgText}</small>
        </div>
      </div>
      <button class="delete-btn" onclick="deleteFolder('${id}', event)">✕</button>
    `;
    foldersList.appendChild(card);
  });
}

// ---------------- VUE 2 : CONTENU DU DOSSIER ----------------

backToFoldersBtn.addEventListener('click', () => {
  currentFolderId = null;
  blocksView.classList.add('hidden');
  foldersView.classList.remove('hidden');
  renderFolders();
});

showBlockFormBtn.addEventListener('click', () => {
  directSubjectForm.classList.add('hidden');
  blockForm.classList.remove('hidden');
  setTimeout(() => document.getElementById('block-name').focus(), 10);
});

cancelBlockBtn.addEventListener('click', () => {
  blockForm.classList.add('hidden');
  blockForm.reset();
});

showDirectSubFormBtn.addEventListener('click', () => {
  blockForm.classList.add('hidden');
  directSubjectForm.classList.remove('hidden');
  setTimeout(() => document.getElementById('direct-subject-name').focus(), 10);
});

cancelDirectSubBtn.addEventListener('click', () => {
  directSubjectForm.classList.add('hidden');
  directSubjectForm.reset();
});

blockForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentFolderId) return;
  const blockInput = document.getElementById('block-name');
  const name = blockInput.value.trim();
  if (!name) return;

  const blockId = 'block_' + Date.now();
  appData[currentFolderId].blocks[blockId] = { name, emoji: '📦', subjects: {} };
  saveData();
  renderFolderContent();

  blockForm.reset();
  setTimeout(() => blockInput.focus(), 10);
});

function deleteBlock(blockId, e) {
  e.stopPropagation();
  if (confirm("Supprimer ce bloc et toutes ses matières ?")) {
    delete appData[currentFolderId].blocks[blockId];
    saveData();
    renderFolderContent();
  }
}

directSubjectForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentFolderId) return;
  const subInput = document.getElementById('direct-subject-name');
  const name = subInput.value.trim();
  const coef = parseFloat(document.getElementById('direct-subject-coef').value);
  if (!name) return;

  const subId = 'dsub_' + Date.now();
  appData[currentFolderId].directSubjects[subId] = {
    name,
    emoji: '📚',
    coef,
    grades: []
  };

  saveData();
  renderFolderContent();

  directSubjectForm.reset();
  document.getElementById('direct-subject-coef').value = 1;
  setTimeout(() => subInput.focus(), 10);
});

function openBlock(blockId) {
  currentBlockId = blockId;
  blocksView.classList.add('hidden');
  subjectsView.classList.remove('hidden');
  renderBlockSubjects();
}

function renderFolderContent() {
  const folder = appData[currentFolderId];
  const fEmoji = folder.emoji || '📁';
  currentFolderTitle.textContent = `${fEmoji} ${folder.name}`;

  const folderAvg = getFolderAverage(folder);
  folderAverageEl.textContent = folderAvg !== null ? folderAvg.toFixed(2) : '--';

  blocksList.innerHTML = '';
  const blockKeys = Object.keys(folder.blocks || {});
  blockKeys.forEach(bId => {
    const block = folder.blocks[bId];
    const bEmoji = block.emoji || '📦';
    const subCount = Object.keys(block.subjects || {}).length;
    const avg = getBlockAverage(block);
    const avgText = avg !== null ? ` • Moyenne : ${avg.toFixed(2)}/20` : '';

    const card = document.createElement('div');
    card.className = 'item-card';
    card.onclick = () => openBlock(bId);
    card.innerHTML = `
      <div class="item-card-left">
        <span class="emoji-badge" title="Changer l'emoji" onclick="openEmojiPicker('block', '${bId}', false, event)">${bEmoji}</span>
        <div class="item-card-info">
          <h3>${block.name}</h3>
          <small style="color: #9ca3af;">${subCount} matière(s)${avgText}</small>
        </div>
      </div>
      <button class="delete-btn" onclick="deleteBlock('${bId}', event)">✕</button>
    `;
    blocksList.appendChild(card);
  });

  renderSubjectCards(folder.directSubjects || {}, directSubjectsList, true);
}

// ---------------- VUE 3 : MATIÈRES D'UN BLOC ----------------

backToBlocksBtn.addEventListener('click', () => {
  currentBlockId = null;
  subjectsView.classList.add('hidden');
  blocksView.classList.remove('hidden');
  renderFolderContent();
});

subjectForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentFolderId || !currentBlockId) return;

  const subjectInput = document.getElementById('subject-name');
  const name = subjectInput.value.trim();
  const coef = parseFloat(document.getElementById('subject-coef').value);
  if (!name) return;

  const subId = 'sub_' + Date.now();
  appData[currentFolderId].blocks[currentBlockId].subjects[subId] = {
    name,
    emoji: '📚',
    coef,
    grades: []
  };

  saveData();
  renderBlockSubjects();

  subjectForm.reset();
  document.getElementById('subject-coef').value = 1;
  setTimeout(() => subjectInput.focus(), 10);
});

function renderBlockSubjects() {
  const block = appData[currentFolderId].blocks[currentBlockId];
  const bEmoji = block.emoji || '📦';
  currentBlockTitle.textContent = `${bEmoji} ${block.name}`;

  const blockAvg = getBlockAverage(block);
  blockAverageEl.textContent = blockAvg !== null ? blockAvg.toFixed(2) : '--';

  renderSubjectCards(block.subjects || {}, subjectsList, false);
}

// ---------------- FONCTIONS COMMUNES AUX MATIÈRES ----------------

function deleteSubject(subId, isDirect) {
  if (confirm("Supprimer cette matière et ses notes ?")) {
    if (isDirect) {
      delete appData[currentFolderId].directSubjects[subId];
      saveData();
      renderFolderContent();
    } else {
      delete appData[currentFolderId].blocks[currentBlockId].subjects[subId];
      saveData();
      renderBlockSubjects();
    }
  }
}

function addGradeToSubject(subId, isDirect, event) {
  event.preventDefault();
  const form = event.target;
  const valInput = form.querySelector('.grade-val');
  const coefInput = form.querySelector('.grade-coef');

  const value = parseFloat(valInput.value);
  const coef = parseFloat(coefInput.value);
  if (isNaN(value)) return;

  const targetSub = isDirect
    ? appData[currentFolderId].directSubjects[subId]
    : appData[currentFolderId].blocks[currentBlockId].subjects[subId];

  targetSub.grades.push({
    id: Date.now(),
    value,
    coef
  });

  saveData();
  if (isDirect) renderFolderContent();
  else renderBlockSubjects();

  setTimeout(() => {
    const updatedInput = document.querySelector(`[data-sub-id="${subId}"] .grade-val`);
    if (updatedInput) updatedInput.focus();
  }, 10);
}

function deleteGrade(subId, gradeId, isDirect) {
  const targetSub = isDirect
    ? appData[currentFolderId].directSubjects[subId]
    : appData[currentFolderId].blocks[currentBlockId].subjects[subId];

  targetSub.grades = targetSub.grades.filter(g => g.id !== gradeId);
  saveData();
  if (isDirect) renderFolderContent();
  else renderBlockSubjects();
}

function renderSubjectCards(subjectsObj, containerEl, isDirect) {
  containerEl.innerHTML = '';
  const subKeys = Object.keys(subjectsObj);

  if (!isDirect && subKeys.length === 0) {
    containerEl.innerHTML = '<p class="subtitle">Aucune matière dans ce bloc. Ajoutez-en une ci-dessus !</p>';
    return;
  }

  subKeys.forEach(subId => {
    const sub = subjectsObj[subId];
    const sEmoji = sub.emoji || '📚';
    const subAvg = getSubjectAverage(sub);
    const subAvgDisplay = subAvg !== null ? `${subAvg.toFixed(2)} / 20` : '-- / 20';

    const card = document.createElement('div');
    card.className = 'subject-card';
    card.setAttribute('data-sub-id', subId);

    let gradesHTML = '';
    if (sub.grades.length === 0) {
      gradesHTML = '<small style="color: #777;">Aucune note saisie</small>';
    } else {
      gradesHTML = sub.grades.map(g => `
        <span class="grade-pill">
          <strong>${g.value}</strong>/20 <small>(coef ${g.coef})</small>
          <button type="button" onclick="deleteGrade('${subId}', ${g.id}, ${isDirect})">✕</button>
        </span>
      `).join('');
    }

    card.innerHTML = `
      <div class="subject-header">
        <div class="subject-title-row">
          <span class="emoji-badge" title="Changer l'emoji" onclick="openEmojiPicker('subject', '${subId}', ${isDirect}, event)">${sEmoji}</span>
          <h4>${sub.name} <small style="color:#9ca3af; font-weight:normal;">(Coef. ${sub.coef})</small></h4>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="subject-avg-badge">${subAvgDisplay}</span>
          <button type="button" class="delete-btn" onclick="deleteSubject('${subId}', ${isDirect})">✕</button>
        </div>
      </div>

      <div class="grades-pills">${gradesHTML}</div>

      <form class="add-grade-row" onsubmit="addGradeToSubject('${subId}', ${isDirect}, event)">
        <input type="number" class="grade-val" placeholder="Note (/20)" step="any" min="0" max="20" required>
        <input type="number" class="grade-coef" placeholder="Coef" step="any" min="0.01" value="1" required style="max-width: 75px;">
        <button type="submit">+ Note</button>
      </form>
    `;

    containerEl.appendChild(card);
  });
}

// ---------------- EXPORT FICHE BILAN (PDF) ----------------

function buildSubjectRowsHTML(subjectsList) {
  if (subjectsList.length === 0) {
    return `<tr><td colspan="5" style="color:#6b7280;">Aucune matière enregistrée</td></tr>`;
  }

  return subjectsList.map(s => {
    const sAvg = getSubjectAverage(s);
    const sAvgText = sAvg !== null ? `<strong>${sAvg.toFixed(2)} / 20</strong>` : '--';

    let notesColHTML = '<span style="color:#6b7280;">Aucune note</span>';
    let coefsColHTML = '<span style="color:#6b7280;">--</span>';

    if (s.grades && s.grades.length > 0) {
      notesColHTML = s.grades.map(g => `<div class="note-line">${g.value} / 20</div>`).join('');
      coefsColHTML = s.grades.map(g => `<div class="note-line">${g.coef}</div>`).join('');
    }

    return `
      <tr>
        <td>${s.emoji || '📚'} ${s.name}</td>
        <td>${s.coef}</td>
        <td>${notesColHTML}</td>
        <td>${coefsColHTML}</td>
        <td>${sAvgText}</td>
      </tr>
    `;
  }).join('');
}

exportPdfBtn.addEventListener('click', () => {
  if (!currentFolderId) return;
  const folder = appData[currentFolderId];
  const folderAvg = getFolderAverage(folder);
  const globalAvgText = folderAvg !== null ? `${folderAvg.toFixed(2)} / 20` : 'Non calculée';

  // Date au format jj/mm/aaaa
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;

  let blocksHTML = '';

  // 1. Tableaux pour chaque Bloc
  Object.values(folder.blocks || {}).forEach(blk => {
    const blkAvg = getBlockAverage(blk);
    const blkAvgText = blkAvg !== null ? `${blkAvg.toFixed(2)} / 20` : '-- / 20';
    const subs = Object.values(blk.subjects || {});

    blocksHTML += `
      <div class="bilan-block">
        <div class="bilan-block-header">
          <span>${blk.emoji || '📦'} ${blk.name}</span>
          <span>Moyenne du bloc : ${blkAvgText}</span>
        </div>
        <table class="bilan-table">
          <thead>
            <tr>
              <th>Matière</th>
              <th>Coef. matière</th>
              <th>Note</th>
              <th>Coef. note</th>
              <th>Moyenne</th>
            </tr>
          </thead>
          <tbody>${buildSubjectRowsHTML(subs)}</tbody>
        </table>
      </div>
    `;
  });

  // 2. Tableau pour les Matières indépendantes (s'il y en a)
  const directSubs = Object.values(folder.directSubjects || {});
  if (directSubs.length > 0) {
    blocksHTML += `
      <div class="bilan-block">
        <div class="bilan-block-header">
          <span>📚 Matières indépendantes</span>
          <span></span>
        </div>
        <table class="bilan-table">
          <thead>
            <tr>
              <th>Matière</th>
              <th>Coef. matière</th>
              <th>Note</th>
              <th>Coef. note</th>
              <th>Moyenne</th>
            </tr>
          </thead>
          <tbody>${buildSubjectRowsHTML(directSubs)}</tbody>
        </table>
      </div>
    `;
  }

  const printContainer = document.getElementById('print-bilan-container');
  printContainer.innerHTML = `
    <div class="bilan-header">
      <div class="bilan-header-left">
        <div class="bilan-brand">
          <div class="bilan-logo">
            <svg viewBox="0 0 64 64" width="22" height="22">
              <path d="M32 14L6 26l26 12 21.5-9.9V41h4.5V26L32 14zm-16 19.5v8.5c0 4.4 7.2 8 16 8s16-3.6 16-8v-8.5l-16 7.4-16-7.4z" fill="#ffffff"/>
            </svg>
          </div>
          <span class="bilan-app-name">MoyennApp</span>
        </div>
        <span class="bilan-divider">|</span>
        <h1 class="bilan-doc-title">Fiche Bilan</h1>
      </div>
      <div class="bilan-meta">
        <div>Éditée le ${formattedDate}</div>
      </div>
    </div>

    <div class="bilan-folder-box">
      <h2>${folder.emoji || '📁'} ${folder.name}</h2>
      <div class="bilan-global-avg">Moyenne Générale : ${globalAvgText}</div>
    </div>

    ${blocksHTML || '<p>Ce dossier ne contient encore aucune note.</p>'}
  `;

  window.print();
});

// ---------------- SERVICE WORKER (PWA & HORS-LIGNE) ----------------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker actif :', reg.scope))
      .catch(err => console.error('Erreur Service Worker :', err));
  });
}

// ---------------- INITIALISATION SÉCURISÉE ----------------

function initApp() {
  appData = JSON.parse(localStorage.getItem('moyennapp_v2')) || {};
  initEmojiPicker();
  renderFolders();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    initApp();
  }
});