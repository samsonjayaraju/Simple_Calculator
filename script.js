// Scientific calculator behavior (same logic as previous version, with mapping for added controls)
document.addEventListener('DOMContentLoaded', () => {
  const display = document.getElementById('display');
  const subdisplay = document.getElementById('subdisplay');
  const memoryIndicator = document.getElementById('memoryIndicator');
  const angleToggle = document.getElementById('angleToggle');
  const buttons = Array.from(document.querySelectorAll('.btn'));

  let expression = '';
  let memory = null;
  let degMode = false; // false = radians, true = degrees
  let lastAnswer = null;

  // Update UI
  function updateDisplay() {
    display.value = expression === '' ? '0' : expression;
    subdisplay.textContent = lastAnswer === null ? '' : `ans = ${lastAnswer}`;
    memoryIndicator.textContent = `M: ${memory === null ? '—' : memory}`;
    angleToggle.textContent = degMode ? 'DEG' : 'RAD';
  }

  // Basic sanitization helpers
  const allowedNames = new Set([
    'sin','cos','tan','asin','acos','atan',
    'sqrt','ln','log','exp','abs','floor','ceil','round','pow','fact','ans',
    'pi','e'
  ]);

  function replaceVisualOperators(expr) {
    return expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/π/g, 'pi');
  }

  function replacePower(expr) {
    return expr.replace(/\^/g, '**');
  }

  function expandPercentAndFactorial(expr) {
    let prev;
    do {
      prev = expr;
      expr = expr.replace(/([0-9]+(?:\.[0-9]+)?|\([^()]*\))%/g, '($1/100)');
      expr = expr.replace(/([0-9]+(?:\.[0-9]+)?|\([^()]*\))!/g, 'fact($1)');
    } while (expr !== prev);
    return expr;
  }

  function validateIdentifiers(expr) {
    const words = expr.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
    for (const w of words) {
      if (!allowedNames.has(w)) {
        return { ok: false, bad: w };
      }
    }
    return { ok: true };
  }

  function evaluateExpression(expr) {
    let e = replaceVisualOperators(expr);
    e = replacePower(e);
    e = expandPercentAndFactorial(e);

    const v = validateIdentifiers(e);
    if (!v.ok) {
      throw new Error(`Invalid identifier: ${v.bad}`);
    }

    const implementations = {
      sin: (x) => degMode ? Math.sin(x * Math.PI / 180) : Math.sin(x),
      cos: (x) => degMode ? Math.cos(x * Math.PI / 180) : Math.cos(x),
      tan: (x) => degMode ? Math.tan(x * Math.PI / 180) : Math.tan(x),
      asin: (x) => degMode ? (Math.asin(x) * 180 / Math.PI) : Math.asin(x),
      acos: (x) => degMode ? (Math.acos(x) * 180 / Math.PI) : Math.acos(x),
      atan: (x) => degMode ? (Math.atan(x) * 180 / Math.PI) : Math.atan(x),
      sqrt: Math.sqrt,
      ln: Math.log,
      log: (x) => Math.log10 ? Math.log10(x) : Math.log(x) / Math.LN10,
      exp: Math.exp,
      abs: Math.abs,
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round,
      pow: Math.pow,
      fact: (n) => {
        if (typeof n !== 'number' || !isFinite(n) || n < 0) throw new Error('Invalid factorial');
        if (Math.floor(n) !== n) throw new Error('Factorial only for integers');
        let r = 1;
        for (let i = 2; i <= n; i++) r *= i;
        return r;
      },
      pi: Math.PI,
      e: Math.E,
      ans: lastAnswer === null ? 0 : lastAnswer
    };

    const paramNames = Object.keys(implementations);
    const paramValues = Object.values(implementations);

    const fn = new Function(...paramNames, `return (${e});`);
    const result = fn(...paramValues);

    return result;
  }

  // Actions
  function clearAll() { expression = ''; updateDisplay(); }
  function backspace() { expression = expression.slice(0, -1); updateDisplay(); }
  function append(val) {
    if (val === 'Ans') {
      expression += 'ans';
    } else {
      expression += val;
    }
    updateDisplay();
  }
  function applyPercent() { expression += '%'; updateDisplay(); }
  function toggleSign() {
    if (!expression) return;
    if (/^[0-9.]+$/.test(expression)) {
      if (expression.startsWith('-')) expression = expression.slice(1);
      else expression = '-' + expression;
    } else {
      expression = `(-1)*(${expression})`;
    }
    updateDisplay();
  }
  function doFactorial() { expression += '!'; updateDisplay(); }
  function doPow2() { expression += '**2'; updateDisplay(); }
  function doPow() { expression += '^'; updateDisplay(); }
  function insertPi() { expression += 'pi'; updateDisplay(); }

  function computeEquals() {
    try {
      const res = evaluateExpression(expression || String(lastAnswer || 0));
      if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
        lastAnswer = res;
        expression = String(res);
        updateDisplay();
      } else {
        throw new Error('Result not a finite number');
      }
    } catch (err) {
      alert('Error: ' + (err.message || 'Invalid expression'));
      expression = '';
      updateDisplay();
    }
  }

  // Memory actions
  function memoryClear() { memory = null; updateDisplay(); }
  function memoryRecall() { if (memory !== null) { expression += String(memory); updateDisplay(); } }
  function memoryAdd() {
    try {
      const val = evaluateExpression(expression || '0');
      memory = (memory === null) ? val : (memory + val);
      updateDisplay();
    } catch (err) {
      alert('Error adding to memory');
    }
  }
  function memorySubtract() {
    try {
      const val = evaluateExpression(expression || '0');
      memory = (memory === null) ? -val : (memory - val);
      updateDisplay();
    } catch (err) {
      alert('Error subtracting from memory');
    }
  }

  // Some top-row control no-ops (ON, HOME, SETTINGS) map to reasonable actions
  function topControl(action) {
    if (action === 'on') {
      // reset
      clearAll();
    } else if (action === 'home' || action === 'settings') {
      // not implemented — brief flash to user
      alert(`${action.toUpperCase()} not available in this demo`);
    }
  }

  // Button clicks
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-value');
      const action = btn.getAttribute('data-action');

      if (action === 'clear') { clearAll(); return; }
      if (action === 'backspace') { backspace(); return; }
      if (action === 'equals') { computeEquals(); return; }
      if (action === 'toggle-sign') { toggleSign(); return; }
      if (action === 'percent') { applyPercent(); return; }
      if (action === 'factorial') { doFactorial(); return; }
      if (action === 'pow2') { doPow2(); return; }
      if (action === 'pow') { doPow(); return; }
      if (action === 'pi') { insertPi(); return; }

      // Memory actions
      if (action === 'mc') { memoryClear(); return; }
      if (action === 'mr') { memoryRecall(); return; }
      if (action === 'mplus') { memoryAdd(); return; }
      if (action === 'mminus') { memorySubtract(); return; }

      // Top small controls
      if (action === 'on' || action === 'home' || action === 'settings' || action === 'shift' || action === 'variable' || action === 'function' || action === 'catalog' || action === 'tools') {
        topControl(action);
        return;
      }

      if (val) { append(val); return; }
    });
  });

  // Angle mode toggle
  angleToggle.addEventListener('click', () => {
    degMode = !degMode;
    updateDisplay();
  });

  // Keyboard support
  window.addEventListener('keydown', (e) => {
    const key = e.key;

    if ((/^[0-9]$/).test(key)) { append(key); e.preventDefault(); return; }
    if (key === '.') { append('.'); e.preventDefault(); return; }
    if (key === '+' || key === '-' || key === '*' || key === '/') { append(key); e.preventDefault(); return; }
    if (key === '^') { append('^'); e.preventDefault(); return; }
    if (key === '(' || key === ')') { append(key); e.preventDefault(); return; }
    if (key === 'Enter' || key === '=') { computeEquals(); e.preventDefault(); return; }
    if (key === 'Backspace') { backspace(); e.preventDefault(); return; }
    if (key === 'Escape') { clearAll(); e.preventDefault(); return; }
    if (key === '!' || key === '%') { append(key); e.preventDefault(); return; }
    if (key.toLowerCase() === 'c') { clearAll(); e.preventDefault(); return; }
    if (key.toLowerCase() === 'm') {
      if (e.shiftKey) memorySubtract();
      else memoryAdd();
      e.preventDefault();
      return;
    }
  });

  // Initialize
  updateDisplay();
});