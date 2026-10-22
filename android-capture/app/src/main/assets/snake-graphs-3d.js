/* Snake Finance Rev0: presentation-only layer. No ledger, storage or capture changes. */
(function () {
  'use strict';
  if (window.snakeGraphs3DInstalled) return;
  window.snakeGraphs3DInstalled = true;
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
