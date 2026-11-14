export function createCalculator(container, win) {
  let display = "0";
  let expression = "";
  let justEvaluated = false;
  let history = [];

  container.innerHTML = `
      <div class="calc-app">
        <div class="calc-history"></div>
        <div class="calc-display">0</div>
        <div class="calc-grid">
          <button class="calc-btn fn" data-key="C">C</button>
          <button class="calc-btn fn" data-key="±">±</button>
          <button class="calc-btn fn" data-key="%">%</button>
          <button class="calc-btn op" data-key="÷">÷</button>
          <button class="calc-btn" data-key="7">7</button>
          <button class="calc-btn" data-key="8">8</button>
          <button class="calc-btn" data-key="9">9</button>
          <button class="calc-btn op" data-key="×">×</button>
          <button class="calc-btn" data-key="4">4</button>
          <button class="calc-btn" data-key="5">5</button>
          <button class="calc-btn" data-key="6">6</button>
          <button class="calc-btn op" data-key="−">−</button>
          <button class="calc-btn" data-key="1">1</button>
          <button class="calc-btn" data-key="2">2</button>
          <button class="calc-btn" data-key="3">3</button>
          <button class="calc-btn op" data-key="+">+</button>
          <button class="calc-btn span-2" data-key="0">0</button>
          <button class="calc-btn" data-key=".">.</button>
          <button class="calc-btn eq" data-key="=">=</button>
        </div>
      </div>
    `;

  const $display = container.querySelector(".calc-display");
  const $history = container.querySelector(".calc-history");

  function update() {
    $display.textContent = display;
    $history.textContent = expression || " ";
  }

  function reset() {
    display = "0";
    expression = "";
    justEvaluated = false;
  }

  function inputDigit(d) {
    if (justEvaluated) {
      display = "0";
      expression = "";
      justEvaluated = false;
    }
    if (display === "0") display = d;
    else display += d;
  }

  function inputDot() {
    if (justEvaluated) {
      display = "0";
      expression = "";
      justEvaluated = false;
    }
    if (!display.includes(".")) display += ".";
  }

  function inputOp(op) {
    if (justEvaluated) {
      expression = display + " " + op + " ";
      justEvaluated = false;
      return;
    }
    expression = display + " " + op + " ";
  }

  function evaluate() {
    if (!expression) return;
    const fullExpr = expression + display;
    const tokens = fullExpr.split(" ");
    try {
      const val = compute(tokens);
      history.unshift(fullExpr + " = " + format(val));
      if (history.length > 5) history.pop();
      expression = fullExpr + " =";
      display = format(val);
      justEvaluated = true;
    } catch (e) {
      display = "Error";
      expression = "";
      justEvaluated = true;
    }
  }

  function compute(tokens) {
    const nums = [];
    const ops = [];
    for (let i = 0; i < tokens.length; i++) {
      if (i % 2 === 0) nums.push(parseFloat(tokens[i]));
      else ops.push(tokens[i]);
    }
    // first pass: × ÷
    for (let i = 0; i < ops.length; ) {
      if (ops[i] === "×" || ops[i] === "÷") {
        const a = nums[i],
          b = nums[i + 1];
        const r = ops[i] === "×" ? a * b : a / b;
        nums.splice(i, 2, r);
        ops.splice(i, 1);
      } else i++;
    }
    // second pass: + −
    let acc = nums[0];
    for (let i = 0; i < ops.length; i++) {
      acc = ops[i] === "+" ? acc + nums[i + 1] : acc - nums[i + 1];
    }
    return acc;
  }

  function format(n) {
    if (!isFinite(n)) return "Error";
    const rounded = Math.round(n * 1e10) / 1e10;
    return String(rounded);
  }

  function toggleSign() {
    if (display.startsWith("-")) display = display.slice(1);
    else if (display !== "0") display = "-" + display;
  }

  function percent() {
    display = format(parseFloat(display) / 100);
  }

  function handle(key) {
    if (key === "C") {
      reset();
    } else if (key === "±") toggleSign();
    else if (key === "%") percent();
    else if (key === "=") evaluate();
    else if ("0123456789".includes(key)) inputDigit(key);
    else if (key === ".") inputDot();
    else if ("+−×÷".includes(key)) inputOp(key);
    update();
  }

  container.querySelectorAll(".calc-btn").forEach((btn) => {
    btn.addEventListener("click", () => handle(btn.dataset.key));
  });

  document.addEventListener("keydown", function onKey(e) {
    if (!win || !document.body.contains(container)) {
      document.removeEventListener("keydown", onKey);
      return;
    }
    const focused = document.activeElement;
    if (focused && focused.tagName === "INPUT" && focused !== document.body)
      return;

    let key = e.key;
    if (key === "*") key = "×";
    if (key === "/") key = "÷";
    if (key === "-") key = "−";
    if (key === "Enter") key = "=";
    if (key === "Escape") key = "C";
    if (key === "Backspace") {
      e.preventDefault();
      if (display.length > 1) display = display.slice(0, -1);
      else display = "0";
      update();
      return;
    }

    if ("0123456789.+=−×÷%".includes(key)) {
      e.preventDefault();
      handle(key);
    }
  });

  if (win) {
    win.onClose = () => {
      document.removeEventListener("keydown", () => {});
    };
  }

  update();
}
