// Joker Run MVP (vanilla JS)
// v4: rename project, prep for web launch.

const SUITS = [
  { key: 'S', name: '♠' },
  { key: 'H', name: '♥' },
  { key: 'D', name: '♦' },
  { key: 'C', name: '♣' },
];
const RANKS = [
  { r: 'A', v: 14, points: 11 },
  { r: 'K', v: 13, points: 10 },
  { r: 'Q', v: 12, points: 10 },
  { r: 'J', v: 11, points: 10 },
  { r: '10', v: 10, points: 10 },
  { r: '9', v: 9, points: 9 },
  { r: '8', v: 8, points: 8 },
  { r: '7', v: 7, points: 7 },
  { r: '6', v: 6, points: 6 },
  { r: '5', v: 5, points: 5 },
  { r: '4', v: 4, points: 4 },
  { r: '3', v: 3, points: 3 },
  { r: '2', v: 2, points: 2 },
];

// simplified hand chips + base mult
const HAND_TABLE = {
  'High Card': { chips: 10, mult: 1 },
  'Pair': { chips: 30, mult: 1 },
  'Two Pair': { chips: 45, mult: 1 },
  'Three of a Kind': { chips: 60, mult: 2 },
  'Straight': { chips: 70, mult: 2 },
  'Flush': { chips: 80, mult: 2 },
  'Full House': { chips: 100, mult: 3 },
  'Four of a Kind': { chips: 130, mult: 4 },
  'Straight Flush': { chips: 180, mult: 6 },
};

const BLINDS = [
  { name: '小盲', target: 300, reward: 4 },
  { name: '大盲', target: 600, reward: 6 },
  { name: 'Boss', target: 1000, reward: 10 },
];

// Joker pool (MVP subset)
// Conventions: apply(ctx) mutates ctx.chipsBonus / ctx.multBonus / ctx.moneyBonus.
const JOKER_POOL = [
  {
    id: 'double_pair',
    name: '双倍对子',
    rarity: 'Common',
    price: 6,
    desc: '若本次出牌牌型是「Pair」，倍率 +2。',
    apply: (ctx) => { if (ctx.handName === 'Pair') ctx.multBonus += 2; }
  },
  {
    id: 'flush_fan',
    name: '同花粉丝',
    rarity: 'Common',
    price: 6,
    desc: '若为「Flush」或「Straight Flush」，筹码 +40。',
    apply: (ctx) => { if (ctx.handName === 'Flush' || ctx.handName === 'Straight Flush') ctx.chipsBonus += 40; }
  },
  {
    id: 'face_mult',
    name: '人头加成',
    rarity: 'Common',
    price: 5,
    desc: '每张 J/Q/K 额外 +1 倍率（最多 +5）。',
    apply: (ctx) => {
      const faces = ctx.cards.filter(c => ['J','Q','K'].includes(c.rank)).length;
      ctx.multBonus += Math.min(5, faces);
    }
  },
  {
    id: 'ace_chips',
    name: 'A 爱好者',
    rarity: 'Common',
    price: 5,
    desc: '每张 A 额外 +15 筹码。',
    apply: (ctx) => {
      const aces = ctx.cards.filter(c => c.rank === 'A').length;
      ctx.chipsBonus += 15 * aces;
    }
  },
  {
    id: 'always_mult',
    name: '稳定发挥',
    rarity: 'Common',
    price: 4,
    desc: '每次出牌固定 +1 倍率。',
    apply: (ctx) => { ctx.multBonus += 1; }
  },
  {
    id: 'straight_runner',
    name: '顺子跑者',
    rarity: 'Uncommon',
    price: 8,
    desc: '若为「Straight」或「Straight Flush」，倍率 +3。',
    apply: (ctx) => { if (ctx.handName === 'Straight' || ctx.handName === 'Straight Flush') ctx.multBonus += 3; }
  },
  {
    id: 'pair_chips',
    name: '对子小费',
    rarity: 'Common',
    price: 4,
    desc: '若为「Pair」，筹码 +25。',
    apply: (ctx) => { if (ctx.handName === 'Pair') ctx.chipsBonus += 25; }
  },
  {
    id: 'two_pair_mult',
    name: '两对起飞',
    rarity: 'Uncommon',
    price: 7,
    desc: '若为「Two Pair」，倍率 +2，筹码 +20。',
    apply: (ctx) => { if (ctx.handName === 'Two Pair') { ctx.multBonus += 2; ctx.chipsBonus += 20; } }
  },
  {
    id: 'three_kind_mult',
    name: '三条信仰',
    rarity: 'Uncommon',
    price: 7,
    desc: '若为「Three of a Kind」，倍率 +2。',
    apply: (ctx) => { if (ctx.handName === 'Three of a Kind') ctx.multBonus += 2; }
  },
  {
    id: 'highcard_money',
    name: '低保',
    rarity: 'Common',
    price: 5,
    desc: '若为「High Card」，额外 +$2（每次出牌）。',
    apply: (ctx) => { if (ctx.handName === 'High Card') ctx.moneyBonus += 2; }
  },
  {
    id: 'hearts_chips',
    name: '红心狂热',
    rarity: 'Uncommon',
    price: 8,
    desc: '每张 ♥ 额外 +10 筹码。',
    apply: (ctx) => {
      const hearts = ctx.cards.filter(c => c.suit === 'H').length;
      ctx.chipsBonus += 10 * hearts;
    }
  },
  {
    id: 'diamond_mult',
    name: '方片倍率',
    rarity: 'Rare',
    price: 10,
    desc: '若本次出牌包含任意 ♦，倍率 +2。',
    apply: (ctx) => {
      const hasD = ctx.cards.some(c => c.suit === 'D');
      if (hasD) ctx.multBonus += 2;
    }
  },
];

const SHOP = { slots: 3, rerollCost: 2, maxJokers: 5 };

function svgDataUri(svg){
  // IMPORTANT: don't put quotes inside url(...) because we inject it into an inline style attr.
  // encodeURIComponent does NOT encode parentheses, but our SVG contains patterns like fill="url(#g)".
  // Unescaped ')' would prematurely terminate CSS url(...) and make the custom property invalid.
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
  return `url(data:image/svg+xml,${encoded})`;
}

function portraitSvg(rank, color){
  // simple vintage cameo silhouette; varies slightly by rank.
  const crown = (rank === 'K' || rank === 'Q')
    ? `<path d="M18 16 l4 5 4-7 4 7 4-5 v6 H18z" fill="${color}" opacity=".25"/>`
    : '';
  const laurel = (rank === 'A')
    ? `<path d="M18 44c3 6 7 9 12 9s9-3 12-9" fill="none" stroke="${color}" stroke-width="2" opacity=".25"/>
       <path d="M20 44c-2 1-3 3-3 5" fill="none" stroke="${color}" stroke-width="2" opacity=".18"/>
       <path d="M40 44c2 1 3 3 3 5" fill="none" stroke="${color}" stroke-width="2" opacity=".18"/>`
    : '';

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="88" height="112" viewBox="0 0 88 112">
    <defs>
      <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity=".16"/>
        <stop offset="1" stop-color="#000000" stop-opacity=".06"/>
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="86" height="110" rx="16" fill="url(#g)" stroke="${color}" stroke-opacity=".35"/>
    <ellipse cx="44" cy="48" rx="22" ry="26" fill="none" stroke="${color}" stroke-width="2" stroke-opacity=".38"/>
    ${crown}
    <!-- head -->
    <circle cx="44" cy="42" r="10" fill="${color}" opacity=".28"/>
    <!-- shoulders -->
    <path d="M26 74c4-10 14-16 18-16s14 6 18 16" fill="${color}" opacity=".22"/>
    <!-- collar detail -->
    <path d="M36 60l8 8 8-8" fill="none" stroke="${color}" stroke-width="2" opacity=".22"/>
    ${laurel}
    <text x="44" y="100" text-anchor="middle" font-family="ui-serif, Georgia" font-weight="700" font-size="16" fill="${color}" opacity=".28">${rank}</text>
  </svg>`;

  return svgDataUri(svg);
}


const state = {
  deck: [],
  discard: [],
  hand: [],
  selected: new Set(),
  roundIndex: 0, // 0..2
  score: 0,
  money: 0,
  phase: 'play', // play | shop
  ownedJokers: [],
  shopJokers: [],
};

const ui = {
  handCardEls: new Map(), // cardId -> element
  jokerEls: new Map(), // jokerId -> element
};

// ------------------- utils -------------------
function shuffle(arr){
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck(){
  const deck = [];
  for (const s of SUITS){
    for (const rk of RANKS){
      deck.push({
        id: `${rk.r}${s.key}-${Math.random().toString(16).slice(2)}`,
        rank: rk.r,
        value: rk.v,
        points: rk.points,
        suit: s.key,
        suitGlyph: s.name,
      });
    }
  }
  return shuffle(deck);
}

function ensureDeck(){
  if (state.deck.length === 0 && state.discard.length > 0){
    state.deck = shuffle(state.discard);
    state.discard = [];
    log(`牌库为空：将弃牌堆洗回牌库（${state.deck.length}）`);
  }
}

function drawOne(){
  ensureDeck();
  if (state.deck.length === 0) return null;
  const c = state.deck.pop();
  state.hand.push(c);
  return c;
}

function drawTo(n){
  while (state.hand.length < n){
    const c = drawOne();
    if (!c) break;
  }
}

function cardLabel(c){
  return `${c.rank}${c.suitGlyph}`;
}

function pickRandomShopJokers(){
  const ownedIds = new Set(state.ownedJokers.map(j => j.id));
  const pool = JOKER_POOL.filter(j => !ownedIds.has(j.id));
  shuffle(pool);
  return pool.slice(0, SHOP.slots);
}

function sleep(ms){
  return new Promise(r => setTimeout(r, ms));
}

// ------------------- poker eval (5 cards) -------------------
function evalHand(cards){
  const sorted = [...cards].sort((a,b)=>a.value-b.value);
  const values = sorted.map(c=>c.value);
  const suits = cards.map(c=>c.suit);
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v)||0)+1);
  const countList = [...counts.entries()].sort((a,b)=> b[1]-a[1] || b[0]-a[0]);
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = (() => {
    const uniq = [...new Set(values)];
    if (uniq.length !== 5) return false;
    // A2345 wheel
    const wheel = [2,3,4,5,14];
    const isWheel = wheel.every((v,i)=> uniq[i] === wheel[i]);
    if (isWheel) return true;
    for (let i=1;i<uniq.length;i++){
      if (uniq[i] !== uniq[0] + i) return false;
    }
    return true;
  })();

  let name = 'High Card';
  if (isStraight && isFlush) name = 'Straight Flush';
  else if (countList[0][1] === 4) name = 'Four of a Kind';
  else if (countList[0][1] === 3 && countList[1][1] === 2) name = 'Full House';
  else if (isFlush) name = 'Flush';
  else if (isStraight) name = 'Straight';
  else if (countList[0][1] === 3) name = 'Three of a Kind';
  else if (countList[0][1] === 2 && countList[1][1] === 2) name = 'Two Pair';
  else if (countList[0][1] === 2) name = 'Pair';

  return { name };
}

function scorePlay(cards){
  // In MVP: only evaluate as 5-card poker; if <5, treat as High Card with those cards.
  let handName = 'High Card';
  if (cards.length === 5) handName = evalHand(cards).name;

  const base = HAND_TABLE[handName] || HAND_TABLE['High Card'];
  const rankSum = cards.reduce((s,c)=> s + c.points, 0);

  const ctx = {
    cards,
    handName,
    chipsBase: base.chips,
    chipsBonus: 0,
    multBase: base.mult,
    multBonus: 0,
    moneyBonus: 0,
    triggeredJokers: [],
  };

  // We treat "joker applied" as (any bonus changed).
  for (const j of state.ownedJokers){
    const before = { chips: ctx.chipsBonus, mult: ctx.multBonus, money: ctx.moneyBonus };
    j.apply(ctx);
    const changed = (ctx.chipsBonus !== before.chips) || (ctx.multBonus !== before.mult) || (ctx.moneyBonus !== before.money);
    if (changed) ctx.triggeredJokers.push(j.id);
  }

  const chips = ctx.chipsBase + ctx.chipsBonus + rankSum;
  const mult = ctx.multBase + ctx.multBonus;
  const total = Math.max(0, Math.floor(chips * mult));

  return {
    handName,
    chipsBase: ctx.chipsBase,
    chipsBonus: ctx.chipsBonus,
    rankSum,
    multBase: ctx.multBase,
    multBonus: ctx.multBonus,
    chips,
    mult,
    total,
    moneyBonus: ctx.moneyBonus,
    triggeredJokers: ctx.triggeredJokers,
  };
}

// ------------------- UI -------------------
const el = {
  hand: document.getElementById('hand'),
  log: document.getElementById('log'),
  round: document.getElementById('round'),
  blind: document.getElementById('blind'),
  target: document.getElementById('target'),
  score: document.getElementById('score'),
  money: document.getElementById('money'),
  handSize: document.getElementById('handSize'),
  deckSize: document.getElementById('deckSize'),
  discardSize: document.getElementById('discardSize'),
  jokers: document.getElementById('jokers'),
  shop: document.getElementById('shop'),
  btnDraw: document.getElementById('btnDraw'),
  btnPlay: document.getElementById('btnPlay'),
  btnDiscard: document.getElementById('btnDiscard'),
  btnEnd: document.getElementById('btnEnd'),
  btnNew: document.getElementById('btnNew'),
  btnReroll: document.getElementById('btnReroll'),
  btnContinue: document.getElementById('btnContinue'),
};

function ensureToastWrap(){
  let wrap = document.querySelector('.toastWrap');
  if (!wrap){
    wrap = document.createElement('div');
    wrap.className = 'toastWrap';
    document.body.appendChild(wrap);
  }
  return wrap;
}

function toast(text){
  const wrap = ensureToastWrap();
  const div = document.createElement('div');
  div.className = 'toast show';
  div.textContent = text;
  wrap.appendChild(div);
  setTimeout(()=>{ div.remove(); }, 1400);
}

function ensureBannerWrap(){
  let wrap = document.querySelector('.bannerWrap');
  if (!wrap){
    wrap = document.createElement('div');
    wrap.className = 'bannerWrap';
    document.body.appendChild(wrap);
  }
  return wrap;
}

function banner(handName, total, chips, mult){
  const wrap = ensureBannerWrap();
  const div = document.createElement('div');
  div.className = 'banner show';
  div.innerHTML = `
    <div class="line1">${handName}</div>
    <div class="line2">+${total}</div>
    <div class="line3">${chips} × ${mult}</div>
  `;
  wrap.appendChild(div);
  setTimeout(()=>div.remove(), 1100);
}

function flashStat(statEl, text, kind='accent'){
  if (!statEl) return;
  let f = statEl.querySelector('.float');
  if (!f){
    f = document.createElement('div');
    f.className = 'float';
    statEl.appendChild(f);
  }
  f.className = `float ${kind} show`;
  f.textContent = text;
  // retrigger
  void f.offsetWidth;
  f.className = `float ${kind} show`;
}

function log(msg){
  const t = new Date();
  const stamp = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}:${String(t.getSeconds()).padStart(2,'0')}`;
  el.log.textContent = `[${stamp}] ${msg}\n` + el.log.textContent;
}

function renderOwnedJokers(){
  ui.jokerEls.clear();
  el.jokers.innerHTML = '';
  if (state.ownedJokers.length === 0){
    const div = document.createElement('div');
    div.className = 'joker';
    div.innerHTML = `<div class="name">（暂无）<span class="pill">最多 ${SHOP.maxJokers} 张</span></div><div class="desc">过关后在商店购买。</div>`;
    el.jokers.appendChild(div);
    return;
  }

  for (const j of state.ownedJokers){
    const div = document.createElement('div');
    div.className = 'joker active';
    const sellPrice = Math.max(1, Math.floor(j.price / 2));
    div.innerHTML = `
      <div class="name">
        <span>${j.name}</span>
        <span class="pill">卖出 +$${sellPrice}</span>
      </div>
      <div class="desc">${j.desc}</div>
      <div class="actions"><button data-sell="${j.id}">卖出</button></div>
    `;
    div.querySelector('button[data-sell]').addEventListener('click', ()=>sellJoker(j.id));
    el.jokers.appendChild(div);
    ui.jokerEls.set(j.id, div);
  }
}

function pulseJokers(ids){
  for (const id of ids){
    const e = ui.jokerEls.get(id);
    if (!e) continue;
    e.classList.remove('pulse');
    void e.offsetWidth;
    e.classList.add('pulse');
  }
}

function renderShop(){
  el.shop.innerHTML = '';
  const enabled = state.phase === 'shop';

  if (!enabled){
    const div = document.createElement('div');
    div.className = 'shopItem';
    div.innerHTML = `<div class="top"><div><b>商店未开启</b></div><div class="price"> </div></div><div class="meta">达成当前盲注目标后自动进入商店。</div>`;
    el.shop.appendChild(div);
    return;
  }

  if (state.shopJokers.length === 0){
    const div = document.createElement('div');
    div.className = 'shopItem';
    div.innerHTML = `<div class="top"><div><b>售罄</b></div></div><div class="meta">你已经买光了（或池子不够）。</div>`;
    el.shop.appendChild(div);
    return;
  }

  for (const j of state.shopJokers){
    const canBuy = state.money >= j.price && state.ownedJokers.length < SHOP.maxJokers;
    const div = document.createElement('div');
    div.className = 'shopItem';
    div.innerHTML = `
      <div class="top">
        <div><b>${j.name}</b> <span class="small">(${j.rarity})</span></div>
        <div class="price">$${j.price}</div>
      </div>
      <div class="meta">${j.desc}</div>
      <div class="actions">
        <button data-buy="${j.id}" ${canBuy ? '' : 'disabled'}>购买</button>
      </div>
    `;
    div.querySelector('button[data-buy]').addEventListener('click', ()=>buyJoker(j.id));
    el.shop.appendChild(div);
  }

  if (state.ownedJokers.length >= SHOP.maxJokers){
    const tip = document.createElement('div');
    tip.className = 'shopItem';
    tip.innerHTML = `<div class="meta">你的小丑牌已满（${SHOP.maxJokers}）。先卖出一张再买。</div>`;
    el.shop.appendChild(tip);
  }
}

function renderHand({ animateDeal = true } = {}){
  ui.handCardEls.clear();
  el.hand.innerHTML = '';

  state.hand.forEach((c, idx) => {
    // Slot: stable hitbox (prevents hover flicker when cards overlap)
    const slot = document.createElement('div');
    slot.className = 'cardSlot';
    slot.style.setProperty('--d', `${idx * 26}ms`);
    slot.setAttribute('role','button');
    slot.setAttribute('tabindex','0');
    slot.title = '点击选择/取消';

    const div = document.createElement('div');
    const selected = state.selected.has(c.id);
    div.className = 'card' + (selected ? ' selected' : '') + (animateDeal ? ' deal flipped' : '');

    const inner = document.createElement('div');
    inner.className = 'cardInner';

    const front = document.createElement('div');
    front.className = 'cardFace cardFront';
    const suitRed = (c.suit === 'H' || c.suit === 'D');
    const suitColor = suitRed ? '#8f1427' : '#1c1a16';
    const isFace = ['J','Q','K','A'].includes(c.rank);
    front.innerHTML = `
      <div class="corner tl" style="color:${suitColor}">
        <div class="r">${c.rank}</div>
        <div class="s">${c.suitGlyph}</div>
      </div>
      <div class="corner br" style="color:${suitColor}">
        <div class="r">${c.rank}</div>
        <div class="s">${c.suitGlyph}</div>
      </div>

      ${isFace
        ? `<div class="faceMark" style="color:${suitColor}; --portrait:${portraitSvg(c.rank, suitColor)}">
             <div class="orn"></div>
             <div class="portrait"></div>
             <div class="sig">${c.rank}</div>
           </div>`
        : `<div class="centerPip" style="color:${suitColor}">${c.suitGlyph}</div>`
      }

      <div class="small" style="text-align:center">点数 ${c.points}</div>
      <div class="small" style="text-align:center">${c.suit}${c.value}</div>
    `;

    const back = document.createElement('div');
    back.className = 'cardFace cardBack';
    back.innerHTML = `<div class="emblem">J</div>`;

    inner.appendChild(front);
    inner.appendChild(back);
    div.appendChild(inner);
    slot.appendChild(div);

    // auto flip to reveal after dealing
    if (animateDeal){
      setTimeout(()=>{
        div.classList.remove('flipped');
      }, idx * 26 + 90);
    }

    const toggle = () => {
      if (state.phase !== 'play') { log('商店阶段不能选牌'); return; }
      if (state.selected.has(c.id)) state.selected.delete(c.id);
      else state.selected.add(c.id);
      if (state.selected.size > 5){
        state.selected.delete(c.id);
        log('最多选择 5 张牌');
      }
      renderHand({ animateDeal: false });
      renderStats();
    };

    slot.addEventListener('click', toggle);
    slot.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });

    el.hand.appendChild(slot);
    ui.handCardEls.set(c.id, div);
  });

  // Fan layout: spread cards with X offset + slight rotation
  if (el.hand && el.hand.classList.contains('handFan')){
    const n = state.hand.length;
    const mid = (n - 1) / 2;

    const isMobilePortrait = window.matchMedia && window.matchMedia('(max-width: 720px) and (orientation: portrait)').matches;

    // Tuneables (feel free to tweak after you look)
    // Wider spacing to reduce overlap on mobile.
    const spreadXBase = n <= 6 ? 30 : n <= 8 ? 26 : 22; // px between cards
    const spreadX = spreadXBase + (isMobilePortrait ? 10 : 0);

    const anglePerBase = n <= 6 ? 5 : n <= 8 ? 4 : 3;   // deg per step
    const anglePer = Math.max(1.5, anglePerBase - (isMobilePortrait ? 1.2 : 0));

    const arcLift = isMobilePortrait ? 1.8 : 2.6;       // px lift per step away from center

    state.hand.forEach((c, i) => {
      const cardEl = ui.handCardEls.get(c.id);
      if (!cardEl) return;
      const slotEl = cardEl.parentElement; // .cardSlot
      const t = i - mid;
      const x = t * spreadX;
      const a = t * anglePer;
      const y = Math.abs(t) * arcLift;

      // layout vars live on the slot (stable hitbox)
      if (slotEl){
        slotEl.style.setProperty('--x', `${x}px`);
        slotEl.style.zIndex = String(200 + Math.floor(100 - Math.abs(t) * 5) + i);
      }

      // visual vars live on the card
      cardEl.style.setProperty('--y', `${y}px`);
      cardEl.style.setProperty('--a', `${a}deg`);
      cardEl.style.setProperty('--lift', '0px');
    });
  }
}

function statBoxById(id){
  // stats grid items are in DOM order; easiest is to get parent div of the number span
  const span = document.getElementById(id);
  return span ? span.closest('div') : null;
}

function renderStats(){
  const blind = BLINDS[state.roundIndex];
  el.round.textContent = String(state.roundIndex + 1);
  el.blind.textContent = blind.name;
  el.target.textContent = String(blind.target);
  el.score.textContent = String(state.score);
  el.money.textContent = `$${state.money}`;
  el.handSize.textContent = String(state.hand.length);
  el.deckSize.textContent = String(state.deck.length);
  el.discardSize.textContent = String(state.discard.length);

  const inPlay = state.phase === 'play';
  el.btnDraw.disabled = !inPlay;
  el.btnPlay.disabled = !inPlay || state.selected.size === 0;
  el.btnDiscard.disabled = !inPlay || state.selected.size === 0;
  el.btnEnd.disabled = !inPlay;

  el.btnReroll.disabled = !(state.phase === 'shop') || state.money < SHOP.rerollCost;
  el.btnContinue.disabled = !(state.phase === 'shop');
}

function takeSelectedFromHand(){
  const ids = new Set(state.selected);
  const picked = [];
  state.hand = state.hand.filter(c => {
    if (ids.has(c.id)) { picked.push(c); return false; }
    return true;
  });
  state.selected.clear();
  return picked;
}

async function flyOutCards(cards){
  // animate the selected card elements (if present)
  const els = cards.map(c => ui.handCardEls.get(c.id)).filter(Boolean);

  // quick hit effect
  els.forEach((e) => {
    e.classList.remove('hit');
    void e.offsetWidth;
    e.classList.add('hit');
  });
  if (els.length) await sleep(120);

  els.forEach((e, i) => {
    e.classList.remove('fly');
    void e.offsetWidth;
    e.classList.add('fly');
    e.style.animationDelay = `${i * 18}ms`;
  });
  if (els.length) await sleep(240 + els.length * 18);
}

function openShop(reason){
  state.phase = 'shop';
  state.shopJokers = pickRandomShopJokers();
  toast('🛒 商店开启');
  log(`🛒 进入商店（${reason}）：可购买小丑牌，或继续下一关`);
  renderOwnedJokers();
  renderShop();
  renderStats();
}

function closeShop(){
  state.phase = 'play';
  state.shopJokers = [];
  renderOwnedJokers();
  renderShop();
  renderStats();
}

function buyJoker(id){
  const j = state.shopJokers.find(x => x.id === id);
  if (!j) return;
  if (state.ownedJokers.length >= SHOP.maxJokers){
    log(`买不了：小丑牌已满（${SHOP.maxJokers}）`);
    toast('小丑牌已满，先卖一张');
    return;
  }
  if (state.money < j.price){
    log('买不了：金币不够');
    toast('金币不够');
    return;
  }
  state.money -= j.price;
  state.ownedJokers.push(j);
  state.shopJokers = state.shopJokers.filter(x => x.id !== id);
  log(`购买：${j.name}（-$${j.price}）`);
  toast(`购买：${j.name}`);
  flashStat(statBoxById('money'), `-$${j.price}`, 'bad');
  renderOwnedJokers();
  renderShop();
  renderStats();
}

function sellJoker(id){
  const idx = state.ownedJokers.findIndex(x => x.id === id);
  if (idx < 0) return;
  const j = state.ownedJokers[idx];
  const sellPrice = Math.max(1, Math.floor(j.price / 2));
  state.ownedJokers.splice(idx, 1);
  state.money += sellPrice;
  log(`卖出：${j.name}（+$${sellPrice}）`);
  toast(`卖出：${j.name} +$${sellPrice}`);
  flashStat(statBoxById('money'), `+$${sellPrice}`, 'good');
  renderOwnedJokers();
  renderShop();
  renderStats();
}

function rerollShop(){
  if (state.phase !== 'shop') return;
  if (state.money < SHOP.rerollCost) return;
  state.money -= SHOP.rerollCost;
  state.shopJokers = pickRandomShopJokers();
  log(`刷新商店（-$${SHOP.rerollCost}）`);
  toast('刷新');
  flashStat(statBoxById('money'), `-$${SHOP.rerollCost}`, 'bad');
  renderShop();
  renderStats();
}

function checkRoundClear(){
  const blind = BLINDS[state.roundIndex];
  if (state.score >= blind.target){
    state.money += blind.reward;
    log(`✅ 达成 ${blind.name} 目标 ${blind.target}：过关奖励 +$${blind.reward}`);
    toast(`✅ 过关 +$${blind.reward}`);
    flashStat(statBoxById('money'), `+$${blind.reward}`, 'good');

    state.roundIndex += 1;
    state.score = 0;
    if (state.roundIndex >= BLINDS.length){
      log('🎉 通关：你打完了 Boss（MVP 结束，可继续刷商店玩）');
      state.roundIndex = BLINDS.length - 1;
    }
    openShop('过关');
  }
}

function newGame(){
  state.deck = buildDeck();
  state.discard = [];
  state.hand = [];
  state.selected.clear();
  state.roundIndex = 0;
  state.score = 0;
  state.money = 10;
  state.phase = 'play';
  state.ownedJokers = [JOKER_POOL.find(j => j.id === 'always_mult')];
  state.shopJokers = [];

  el.log.textContent = '';
  drawTo(8);
  renderOwnedJokers();
  renderShop();
  renderHand({ animateDeal: true });
  renderStats();
  log('新开一局：已洗牌并补到 8 张（初始金币 $10，送你「稳定发挥」）');
  toast('发牌');
}

// ------------------- actions -------------------
el.btnDraw.addEventListener('click', ()=>{
  if (state.phase !== 'play') return;
  drawTo(8);
  renderHand({ animateDeal: true });
  renderStats();
  log('补牌到 8');
});

el.btnDiscard.addEventListener('click', async ()=>{
  if (state.phase !== 'play') return;
  const cards = takeSelectedFromHand();
  if (cards.length === 0) return;
  await flyOutCards(cards);
  state.discard.push(...cards);
  drawTo(8);
  renderHand({ animateDeal: true });
  renderStats();
  log(`弃牌：${cards.map(cardLabel).join(' ')}（补回到 8）`);
});

el.btnPlay.addEventListener('click', async ()=>{
  if (state.phase !== 'play') return;
  const cards = takeSelectedFromHand();
  if (cards.length === 0) return;
  if (cards.length > 5){
    log('最多出 5 张');
    state.hand.push(...cards);
    renderHand({ animateDeal: false });
    renderStats();
    return;
  }

  await flyOutCards(cards);

  const res = scorePlay(cards);
  state.score += res.total;
  state.discard.push(...cards);

  // money loop (MVP): every play +$1 + joker money bonus
  const moneyGain = 1 + (res.moneyBonus || 0);
  state.money += moneyGain;

  // effects
  flashStat(statBoxById('score'), `+${res.total}`, 'accent');
  flashStat(statBoxById('money'), `+$${moneyGain}`, 'good');
  banner(res.handName, res.total, res.chips, res.mult);
  if (res.triggeredJokers.length){
    pulseJokers(res.triggeredJokers);
    toast(`小丑触发：${res.triggeredJokers.length}`);
  }

  log([
    `出牌：${cards.map(cardLabel).join(' ')}`,
    `牌型：${res.handName}`,
    `筹码：基础 ${res.chipsBase} + 小丑 ${res.chipsBonus} + 牌面 ${res.rankSum} = ${res.chips}`,
    `倍率：基础 ${res.multBase} + 小丑 ${res.multBonus} = ${res.mult}`,
    `本次得分：${res.total}，累计：${state.score}`,
    `金币：+$${moneyGain}（含小丑加成） 当前 $${state.money}`,
  ].join('\n'));

  drawTo(8);
  checkRoundClear();
  renderHand({ animateDeal: true });
  renderStats();
});

el.btnEnd.addEventListener('click', ()=>{
  if (state.phase !== 'play') return;
  const blind = BLINDS[state.roundIndex];
  if (state.score >= blind.target){
    checkRoundClear();
    renderStats();
    return;
  }

  log(`❌ 未达标：${state.score}/${blind.target}。MVP 简化：重置本关分数并洗回手牌`);
  toast('未达标，重置');
  state.score = 0;

  state.discard.push(...state.hand);
  state.hand = [];
  drawTo(8);
  renderHand({ animateDeal: true });
  renderStats();
});

el.btnReroll.addEventListener('click', rerollShop);

el.btnContinue.addEventListener('click', ()=>{
  if (state.phase !== 'shop') return;
  closeShop();
  state.discard.push(...state.hand);
  state.hand = [];
  drawTo(8);
  renderHand({ animateDeal: true });
  renderStats();
  log('离开商店：继续下一关');
  toast('继续');
});

el.btnNew.addEventListener('click', newGame);

newGame();
