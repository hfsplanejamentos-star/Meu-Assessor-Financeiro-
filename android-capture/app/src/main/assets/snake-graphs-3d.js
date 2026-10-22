/* Snake Finance Rev0: presentation-only layer. No ledger, storage or capture changes. */
(function () {
  'use strict';
  if (window.snakeGraphs3DInstalled) return;
  window.snakeGraphs3DInstalled = true;

  // One stable display color per category, including user-created categories.
  // These are presentation metadata only: no ledger or storage writes.
  const assignedCategoryColors = new Map();
  const neutralCategoryColor = '#94A3B8';
  const categoryPalette = {
    mor:'#8B5CF6',mer:'#CCDA4B',tra:'#13A88A',ali:'#FF7A45',laz:'#EC4899',
    sau:'#F3A6AE',con:'#D95E2B',out:'#94A3B8',mov:'#C08457',pen:'#C9A6FF',
    lav:'#ADE2EE',abs:'#FF4D4D',cer:'#F5C542',est:'#A6B85C',trab:'#22D3EE'
  };
  function refreshCategoryColors() {
    const keys = [...new Set([...Object.keys(CAT), ...Object.keys(CATDB)])].sort();
    const used = new Set(assignedCategoryColors.values());
    for (const key of keys) {
      if (assignedCategoryColors.has(key)) continue;
      const initial = categoryPalette[key] || V35_COLORS[key] || CAT[key]?.[2];
      if (initial && (initial.toUpperCase() !== neutralCategoryColor || key === 'out') && !used.has(initial.toUpperCase())) {
        assignedCategoryColors.set(key, initial.toUpperCase()); used.add(initial.toUpperCase());
      }
    }
    for (const key of keys) {
      if (assignedCategoryColors.has(key)) continue;
      const name = String(CATDB[key]?.name || CAT[key]?.[0] || key).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const preferred = /vestuario|roupa/.test(name) ? '#4F8CFF' : /pessoal/.test(name) ? '#53C77E' : /abastecimento|combustivel/.test(name) ? '#FF8A34' : null;
      let hash=2166136261; for (const char of key) hash=Math.imul(hash ^ char.charCodeAt(0),16777619)>>>0;
      let color=preferred, attempt=0;
      while (!color || used.has(color.toUpperCase())) {
        const hue=(hash%360+attempt*137.508)%360, saturation=66, lightness=58;
        const chroma=(1-Math.abs(2*lightness/100-1))*saturation/100, x=chroma*(1-Math.abs((hue/60)%2-1)), m=lightness/100-chroma/2;
        const rgb=hue<60?[chroma,x,0]:hue<120?[x,chroma,0]:hue<180?[0,chroma,x]:hue<240?[0,x,chroma]:hue<300?[x,0,chroma]:[chroma,0,x];
        color='#'+rgb.map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('').toUpperCase(); attempt++;
      }
      assignedCategoryColors.set(key,color.toUpperCase()); used.add(color.toUpperCase());
    }
    for (const key of keys) {
      const color=assignedCategoryColors.get(key);
      V35_COLORS[key]=color;
      if (CAT[key]) CAT[key][2]=color;
    }
  }
  refreshCategoryColors();
  const originalCategoryDraw=draw;
  draw=function(){refreshCategoryColors();return originalCategoryDraw.apply(this,arguments);};

  let sequence = 0;
  ring = function (cx, cy, r, sw, values, opacity) {
    const total = values.reduce((sum, x) => sum + x[1], 0);
    const circumference = 2 * Math.PI * r;
    const uid = 'snakeGraph3d' + (++sequence);
    let offset = 0, definitions = '<defs>', sides = '', faces = '';
    const track = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${sw}"/>`;
    if (total > 0) values.forEach((segment, index) => {
      if (segment[1] <= 0) return;
      const length = circumference * segment[1] / total;
      const id = uid + 'segment' + index;
      const shape = `cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke-width="${sw}" stroke-dasharray="${Math.max(length - 2, .5).toFixed(1)} ${(circumference - length + 2).toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"`;
      const action = segment[2] ? ` onclick="${segment[2]}" style="cursor:pointer" class="sliceClick"` : '';
      definitions += `<linearGradient id="${id}" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="${segment[0]}"/><stop offset=".35" stop-color="${segment[0]}"/><stop offset="1" stop-color="${segment[0]}" stop-opacity=".78"/></linearGradient>`;
      for (let depth = 7; depth >= 1; depth--) {
        sides += `<g transform="translate(0 ${depth})" opacity="${opacity}" style="filter:brightness(.48);pointer-events:none"><circle ${shape} stroke="${segment[0]}"/></g>`;
      }
      faces += `<circle ${shape} stroke="url(#${id})" stroke-opacity="${opacity}"${action}/>`;
      offset += length;
    });
    definitions += `<filter id="${uid}bevel" x="-15%" y="-15%" width="130%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="soft"/><feSpecularLighting in="soft" surfaceScale="3" specularConstant=".6" specularExponent="20" lighting-color="#fff" result="light"><feDistantLight azimuth="225" elevation="55"/></feSpecularLighting><feComposite in="light" in2="SourceAlpha" operator="in" result="shine"/><feComposite in="SourceGraphic" in2="shine" operator="arithmetic" k1="0" k2="1" k3=".55" k4="0"/></filter></defs>`;
    return definitions + track + sides + `<g filter="url(#${uid}bevel)">` + faces + '</g>';
  };
  const originalDaily = graf7;
  graf7 = function () {
    // Keep original dates, amounts, curve coordinates and click handlers verbatim.
    return originalDaily.apply(this, arguments)
      .replaceAll('stroke="var(--a)"', 'stroke="#ff826b"')
      .replaceAll('stop-color="var(--a)"', 'stop-color="#ff826b"')
      .replace('stop-opacity=".32"', 'stop-opacity=".48"')
      .replaceAll('fill="var(--card)" stroke="#ff826b"', 'fill="#ffc2a2" stroke="#ff826b" style="filter:drop-shadow(0 0 3px #ff785f)"');
  };
  const style = document.createElement('style');
  style.id = 'snake-graphs-3d-style';
  style.textContent = `
    #v svg[viewBox]:not([viewBox="0 0 24 24"]) path[stroke-width="3.5"] {
      filter:drop-shadow(0 3px 2px #0008) drop-shadow(0 0 3px #ff826b40);
    }
    .invChart path[fill="none"] {filter:drop-shadow(0 3px 2px #0007)}
    .invChart rect {filter:drop-shadow(2px 3px 1px #0007)}
    .bar>i,.bar>span,.v41track>i,.budgetTrack>i {
      box-shadow:inset 0 2px 2px #ffffff66,inset 0 -2px 2px #0007,0 3px 3px #0005;
      background-image:linear-gradient(180deg,#ffffff30,transparent 40%,#00000030)!important;
    }
  `;
  document.head.appendChild(style);
  // Initial render occurred before this final script; redraw through the original app.
  if (typeof draw === 'function') draw();
})();
