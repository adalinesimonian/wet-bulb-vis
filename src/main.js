import Chart from "chart.js/auto";
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";
import { wetBulbCalculator } from "./wet-bulb-calculator.js";

// Register Chart.js plugins.
Chart.register(annotationPlugin);
// @ts-expect-error Type mismatch, but zoomPlugin is a valid plugin.
Chart.register(zoomPlugin);

// Application state.
const state = {
  mode: "wetbulb-input",
  wetBulbTemp: 20,
  airTemp: 30,
  humidity: 50,
  /** @type {import('chart.js').Chart | null} */
  chart: null,
  showLabels: true,
  showGrid: true,
};

// DOM Elements.
const elements = {
  // Mode buttons.
  modeButtons: document.querySelectorAll(".mode-button"),

  // Input panels.
  wetbulbInputPanel: document.getElementById("wetbulb-input-panel"),
  tempHumidityInputPanel: document.getElementById("temp-humidity-input-panel"),

  // Wet bulb inputs.
  wetbulbSlider: /** @type {HTMLInputElement} */ (
    document.getElementById("wetbulb-slider")
  ),
  wetbulbInput: /** @type {HTMLInputElement} */ (
    document.getElementById("wetbulb-input")
  ),

  // Temperature & humidity inputs.
  tempSlider: /** @type {HTMLInputElement} */ (
    document.getElementById("temp-slider")
  ),
  tempInput: /** @type {HTMLInputElement} */ (
    document.getElementById("temp-input")
  ),
  humiditySlider: /** @type {HTMLInputElement} */ (
    document.getElementById("humidity-slider")
  ),
  humidityInput: /** @type {HTMLInputElement} */ (
    document.getElementById("humidity-input")
  ),

  // Results.
  calculatedWetbulb: document.getElementById("calculated-value"),
  calculatedDanger: document.getElementById("calculated-danger"),

  // Chart.
  chartCanvas: /** @type {HTMLCanvasElement} */ (
    document.getElementById("wetbulb-chart")
  ),
  resetZoomBtn: document.getElementById("reset-zoom"),
  toggleLabelsBtn: document.getElementById("toggle-labels"),
  toggleGridBtn: document.getElementById("toggle-grid"),

  // Warning message.
  warningMessage: document.getElementById("warning-message"),
  warningTitle: document.querySelector(".warning-title"),
  warningText: document.querySelector(".warning-text"),
};

// URL parameter handling.
function loadStateFromURL() {
  const params = new URLSearchParams(window.location.search);

  // Load mode.
  const mode = params.get("mode");
  if (mode === "wetbulb" || mode === "temp-humidity") {
    state.mode = mode === "wetbulb" ? "wetbulb-input" : "temp-humidity-input";
  }

  // Load values based on mode.
  if (state.mode === "wetbulb-input") {
    const wetbulb = params.get("wetbulb");
    if (wetbulb !== null) {
      const value = parseFloat(wetbulb);
      if (!isNaN(value)) {
        state.wetBulbTemp = Math.max(0, Math.min(40, value));
      }
    }
  } else {
    const temp = params.get("temp");
    const humidity = params.get("humidity");

    if (temp !== null) {
      const value = parseFloat(temp);
      if (!isNaN(value)) {
        state.airTemp = Math.max(0, Math.min(50, value));
      }
    }

    if (humidity !== null) {
      const value = parseFloat(humidity);
      if (!isNaN(value)) {
        state.humidity = Math.max(5, Math.min(100, value));
      }
    }
  }
}

// Update URL without adding to history.
function updateURL() {
  const params = new URLSearchParams();

  // Add mode.
  params.set(
    "mode",
    state.mode === "wetbulb-input" ? "wetbulb" : "temp-humidity",
  );

  // Add values based on mode.
  if (state.mode === "wetbulb-input") {
    params.set("wetbulb", state.wetBulbTemp.toFixed(1));
  } else {
    params.set("temp", state.airTemp.toFixed(1));
    params.set("humidity", state.humidity.toFixed(0));
  }

  // Update URL without adding to history.
  const newURL = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", newURL);
}

// Initialize the application.
function init() {
  loadStateFromURL();
  setupEventListeners();
  setupChart();
  updateUI();
  updateCalculations();
}

// Update UI based on loaded state.
function updateUI() {
  // Update mode buttons.
  elements.modeButtons.forEach((btn) => {
    const htmlBtn = /** @type {HTMLElement} */ (btn);
    const isActive = htmlBtn.dataset.mode === state.mode;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-checked", String(isActive));
  });

  // Update panels.
  if (state.mode === "wetbulb-input") {
    elements.wetbulbInputPanel.style.display = "";
    elements.tempHumidityInputPanel.style.display = "none";

    // Update wet bulb inputs.
    elements.wetbulbSlider.value = String(state.wetBulbTemp);
    elements.wetbulbInput.value = String(state.wetBulbTemp);
    elements.wetbulbSlider.setAttribute(
      "aria-valuenow",
      String(state.wetBulbTemp),
    );
  } else {
    elements.wetbulbInputPanel.style.display = "none";
    elements.tempHumidityInputPanel.style.display = "";

    // Update temp & humidity inputs.
    elements.tempSlider.value = String(state.airTemp);
    elements.tempInput.value = String(state.airTemp);
    elements.humiditySlider.value = String(state.humidity);
    elements.humidityInput.value = String(state.humidity);
  }
}

// Set up event listeners.
function setupEventListeners() {
  // Mode switching.
  elements.modeButtons.forEach((button) => {
    button.addEventListener("click", handleModeSwitch);
  });

  // Wet bulb inputs.
  elements.wetbulbSlider.addEventListener("input", handleWetbulbSliderChange);
  elements.wetbulbInput.addEventListener("input", handleWetbulbInputChange);

  // Temperature & humidity inputs.
  elements.tempSlider.addEventListener("input", handleTempSliderChange);
  elements.tempInput.addEventListener("input", handleTempInputChange);
  elements.humiditySlider.addEventListener("input", handleHumiditySliderChange);
  elements.humidityInput.addEventListener("input", handleHumidityInputChange);

  // Chart controls.
  elements.resetZoomBtn.addEventListener("click", resetChartZoom);
  elements.toggleLabelsBtn.addEventListener("click", toggleLabels);
  elements.toggleGridBtn.addEventListener("click", toggleGrid);
}

// Mode switching.
/** @param {MouseEvent} event */
function handleModeSwitch(event) {
  const button = event.currentTarget;

  if (!(button instanceof HTMLElement)) {
    return;
  }

  const mode = button.dataset.mode;

  if (mode === state.mode) {
    return;
  }

  // Update button states.
  elements.modeButtons.forEach((btn) => {
    const isActive = btn === button;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-checked", String(isActive));
  });

  // Update panels.
  if (mode === "wetbulb-input") {
    elements.wetbulbInputPanel.style.display = "block";
    elements.tempHumidityInputPanel.style.display = "none";

    // Update state to current wet bulb slider value.
    state.wetBulbTemp = parseFloat(elements.wetbulbInput.value);
  } else {
    elements.wetbulbInputPanel.style.display = "none";
    elements.tempHumidityInputPanel.style.display = "block";

    // Update state to current temp/humidity values.
    state.airTemp = parseFloat(elements.tempInput.value);
    state.humidity = parseFloat(elements.humidityInput.value);
  }

  state.mode = mode;
  updateCalculations();
  updateChart();
  updateURL();
}

// Wet bulb input handlers.
/** @param {InputEvent} event */
function handleWetbulbSliderChange(event) {
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }

  const value = parseFloat(event.target.value);
  state.wetBulbTemp = value;
  elements.wetbulbInput.value = String(value);
  elements.wetbulbSlider.setAttribute("aria-valuenow", String(value));
  updateCalculations();
  updateChart();
  updateURL();
}

/** @param {InputEvent} event */
function handleWetbulbInputChange(event) {
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }

  const value = parseFloat(event.target.value) || 0;
  const clamped = Math.max(0, Math.min(40, value));
  state.wetBulbTemp = clamped;
  elements.wetbulbSlider.value = String(clamped);
  elements.wetbulbSlider.setAttribute("aria-valuenow", String(clamped));
  updateCalculations();
  updateChart();
  updateURL();
}

// Temperature input handlers.
/** @param {InputEvent} event */
function handleTempSliderChange(event) {
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }

  const value = parseFloat(event.target.value);
  state.airTemp = value;
  elements.tempInput.value = String(value);
  updateCalculations();
  updateChart();
  updateURL();
}

/** @param {InputEvent} event */
function handleTempInputChange(event) {
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }

  const value = parseFloat(event.target.value) || 0;
  const clamped = Math.max(0, Math.min(50, value));
  state.airTemp = clamped;
  elements.tempSlider.value = String(clamped);
  updateCalculations();
  updateChart();
  updateURL();
}

// Humidity input handlers.
/** @param {InputEvent} event */
function handleHumiditySliderChange(event) {
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }

  const value = parseFloat(event.target.value);
  state.humidity = value;
  elements.humidityInput.value = String(value);
  updateCalculations();
  updateChart();
  updateURL();
}

/** @param {InputEvent} event */
function handleHumidityInputChange(event) {
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }

  const value = parseFloat(event.target.value) || 0;
  const clamped = Math.max(0, Math.min(100, value));
  state.humidity = clamped;
  elements.humiditySlider.value = String(clamped);
  updateCalculations();
  updateChart();
  updateURL();
}

// Update calculations based on current mode.
function updateCalculations() {
  if (state.mode === "wetbulb-input") {
    // Update danger indicator.
    updateDangerIndicator(state.wetBulbTemp, elements.calculatedDanger);
    displayWarning(state.wetBulbTemp);

    return;
  }

  // Calculate wet bulb from temp and humidity.
  const wetBulb = wetBulbCalculator.calculateWetBulb(
    state.airTemp,
    state.humidity,
  );
  state.wetBulbTemp = wetBulb;
  elements.calculatedWetbulb.textContent = wetBulb.toFixed(1);
  updateDangerIndicator(wetBulb, elements.calculatedDanger);
  displayWarning(wetBulb);
}

/**
 * Update danger indicator based on wet bulb temperature.
 * @param {number} wetBulbTemp
 * @param {HTMLElement} dangerElement
 */
function updateDangerIndicator(wetBulbTemp, dangerElement) {
  if (!dangerElement) {
    return; // Can happen during initial setup.
  }

  let percentage;
  let gradient;

  if (wetBulbTemp < 19) {
    percentage = (wetBulbTemp / 19) * 25; // 0-25% for safe zone.
    gradient = "var(--gradient-safe)";
  } else if (wetBulbTemp < 25) {
    percentage = 25 + ((wetBulbTemp - 19) / 6) * 25; // 25-50% for caution.
    gradient = "var(--gradient-caution)";
  } else if (wetBulbTemp < 28) {
    percentage = 50 + ((wetBulbTemp - 25) / 3) * 25; // 50-75% for extreme.
    gradient = "var(--gradient-extreme)";
  } else if (wetBulbTemp < 31) {
    percentage = 75 + ((wetBulbTemp - 28) / 3) * 25; // 75-100% for danger.
    gradient = "var(--gradient-danger)";
  } else {
    percentage = 100; // 100% for unsurvivable.
    gradient = "var(--gradient-danger)";
  }

  percentage = Math.min(100, Math.max(0, percentage));
  dangerElement.style.width = `${percentage}%`;
  dangerElement.style.background = gradient;

  // Update warning message visibility.
  updateWarningMessage(wetBulbTemp);
}

/** Update warning message based on wet bulb temperature */
function updateWarningMessage(wetBulbTemp) {
  if (wetBulbTemp >= 31) {
    // Critical threshold reached
    elements.warningMessage.style.display = "block";
    elements.warningTitle.textContent = "Extreme Danger!";
    elements.warningText.textContent =
      "Wet bulb temperature is at a life-threatening level. Take immediate action to cool down and hydrate.";
  } else if (wetBulbTemp >= 28) {
    // High caution threshold
    elements.warningMessage.style.display = "block";
    elements.warningTitle.textContent = "High Caution!";
    elements.warningText.textContent =
      "Wet bulb temperature is approaching dangerous levels. Limit outdoor activities and stay hydrated.";
  } else {
    // Hide warning message
    elements.warningMessage.style.display = "none";
  }
}

/**
 * Display warning messages based on wet bulb temperature
 * @param {number} wetBulbTemp
 */
function displayWarning(wetBulbTemp) {
  const warningEl = elements.warningMessage;
  const titleEl = elements.warningTitle;
  const textEl = elements.warningText;

  // Remove all warning classes.
  warningEl.classList.remove("caution", "extreme", "danger");

  if (wetBulbTemp < 19) {
    warningEl.style.display = "none";
  } else if (wetBulbTemp < 25) {
    warningEl.style.display = "flex";
    warningEl.classList.add("caution");
    titleEl.textContent = "Caution: Approaching Heat Stress Limits";
    textEl.textContent =
      "Vulnerable populations (elderly, children, those with health conditions) may experience heat stress. Limit outdoor activities and ensure access to cooling.";
  } else if (wetBulbTemp < 28) {
    warningEl.style.display = "flex";
    warningEl.classList.add("extreme");
    titleEl.textContent = "Extreme Heat Warning";
    textEl.textContent =
      "Dangerous conditions. Air conditioning is essential. Even healthy individuals will struggle with temperature regulation. Avoid all unnecessary outdoor exposure.";
  } else if (wetBulbTemp < 31) {
    warningEl.style.display = "flex";
    warningEl.classList.add("danger");
    titleEl.textContent = "Life-Threatening Conditions";
    textEl.textContent =
      "Approaching human survivability limits. Prolonged exposure can be fatal even for young, healthy individuals. Immediate access to air conditioning is critical.";
  } else {
    warningEl.style.display = "flex";
    warningEl.classList.add("danger");
    titleEl.textContent = "UNSURVIVABLE CONDITIONS";
    textEl.textContent =
      "Beyond human physiological limits. The body cannot cool itself regardless of shade, water, or wind. Fatal within hours without air conditioning. This represents the absolute limit of human adaptability.";
  }
}

/** Calculate optimal label positions to avoid overlap */
function calculateLabelPositions() {
  if (!state.chart || !state.showLabels) return null;

  const chartArea = state.chart.chartArea;
  const xScale = state.chart.scales.x;
  const yScale = state.chart.scales.y;

  // Get visible bounds.
  const xMin = xScale.min;
  const xMax = xScale.max;
  const yMin = yScale.min;
  const yMax = yScale.max;

  // Calculate the vertical center of the current view.
  const viewCenterY = (yMin + yMax) / 2;

  // Define wet bulb temperatures and their properties.
  const wetBulbTemps = [
    {
      temp: 19,
      label: "19°C - Caution",
      bgColor: "#f59e0b",
      textColor: "#000000",
    },
    {
      temp: 25,
      label: "25°C - Extreme",
      bgColor: "#f97316",
      textColor: "#000000",
    },
    {
      temp: 28,
      label: "28°C - Danger",
      bgColor: "#ef4444",
      textColor: "#ffffff",
    },
    {
      temp: 31,
      label: "31°C - Unsurvivable",
      bgColor: "#991b1b",
      textColor: "#ffffff",
    },
  ];

  const labelPositions = [];
  const labelHeight = 25; // Approximate label height in pixels.
  const labelWidth = 140; // Approximate label width in pixels.
  const padding = 10; // Minimum padding between labels.

  /**
   * Helper function to calculate the angle of the wet bulb curve at a given x
   * value.
   * @param {number} x
   * @param {number} wbtTemp
   */
  function calculateCurveAngle(x, wbtTemp) {
    // Calculate the slope using a small delta.
    const delta = 0.5;
    const x1 = x - delta;
    const x2 = x + delta;

    const y1 = wetBulbCalculator.findHumidityForWetBulb(x1, wbtTemp);
    const y2 = wetBulbCalculator.findHumidityForWetBulb(x2, wbtTemp);

    // Convert to pixel coordinates for accurate angle calculation.
    const pixelX1 = xScale.getPixelForValue(x1);
    const pixelX2 = xScale.getPixelForValue(x2);
    const pixelY1 = yScale.getPixelForValue(y1);
    const pixelY2 = yScale.getPixelForValue(y2);

    // Calculate angle in radians. It is negative because the y-axis is inverted
    // in the canvas coordinate system.
    const angle = Math.atan2(pixelY2 - pixelY1, pixelX2 - pixelX1);

    return angle;
  }

  /**
   * Find the best label position for a wet bulb curve.
   * @param {number} wbtTemp The wet bulb temperature to find a position for.
   * @returns {{x: number|null, y: number|null}}
   */
  function findBestLabelPosition(wbtTemp) {
    // Start and end of the curve within visible range.
    const curveStartX = Math.max(wbtTemp, xMin);
    const curveEndX = Math.min(50, xMax); // Curves typically end around 50°C.

    // If the curve is not visible at all, return null.
    if (curveStartX > xMax) return null;

    let bestX = null;
    let bestY = null;
    let bestDistance = Infinity;

    // Sample points along the curve to find the one closest to vertical center.
    const sampleCount = 50;
    const step = (curveEndX - curveStartX) / sampleCount;

    for (let i = 0; i <= sampleCount; i++) {
      const x = curveStartX + i * step;

      // Skip if x is less than the wet bulb temperature (invalid).
      if (x < wbtTemp) continue;

      const y = wetBulbCalculator.findHumidityForWetBulb(x, wbtTemp);

      // Check if the point is valid and within view bounds.
      if (y >= 0 && y <= 100 && y >= yMin && y <= yMax) {
        // Calculate distance from vertical center.
        const distanceFromCenter = Math.abs(y - viewCenterY);

        // Also consider horizontal position - prefer points that are not too
        // close to edges.
        const horizontalPosition = (x - xMin) / (xMax - xMin);
        const horizontalPenalty =
          Math.min(horizontalPosition, 1 - horizontalPosition) < 0.1 ? 50 : 0;

        const totalDistance = distanceFromCenter + horizontalPenalty;

        // Check if this is the best position so far.
        if (totalDistance < bestDistance) {
          const pixelX = xScale.getPixelForValue(x);
          const pixelY = yScale.getPixelForValue(y);

          // Ensure label fits within chart area.
          if (
            pixelX - labelWidth / 2 >= chartArea.left &&
            pixelX + labelWidth / 2 <= chartArea.right &&
            pixelY - labelHeight / 2 >= chartArea.top &&
            pixelY + labelHeight / 2 <= chartArea.bottom
          ) {
            bestX = x;
            bestY = y;
            bestDistance = totalDistance;
          }
        }
      }
    }

    // If no valid position found within view, try to find the closest point.
    if (bestX === null) {
      // Check if the curve starts below the view.
      const startY = wetBulbCalculator.findHumidityForWetBulb(
        curveStartX,
        wbtTemp,
      );
      if (startY > yMax && curveStartX <= xMax) {
        // Find where the curve enters the view from bottom.
        let low = curveStartX;
        let high = curveEndX;

        while (high - low > 0.1) {
          const mid = (low + high) / 2;
          const midY = wetBulbCalculator.findHumidityForWetBulb(mid, wbtTemp);

          if (midY > yMax) {
            low = mid;
          } else {
            high = mid;
          }
        }

        bestX = high;
        bestY = wetBulbCalculator.findHumidityForWetBulb(bestX, wbtTemp);
      }
      // Check if the curve ends above the view.
      else if (curveStartX <= xMax) {
        const endY = wetBulbCalculator.findHumidityForWetBulb(
          Math.min(curveEndX, xMax),
          wbtTemp,
        );
        if (endY < yMin) {
          // Find where the curve exits the view from top.
          let low = curveStartX;
          let high = Math.min(curveEndX, xMax);

          while (high - low > 0.1) {
            const mid = (low + high) / 2;
            const midY = wetBulbCalculator.findHumidityForWetBulb(mid, wbtTemp);

            if (midY < yMin) {
              high = mid;
            } else {
              low = mid;
            }
          }

          bestX = low;
          bestY = wetBulbCalculator.findHumidityForWetBulb(bestX, wbtTemp);
        }
      }
    }

    return { x: bestX, y: bestY };
  }

  // Calculate positions for each wet bulb temperature.
  wetBulbTemps.forEach((wbt) => {
    const position = findBestLabelPosition(wbt.temp);

    if (position && position.x !== null && position.y !== null) {
      const angle = calculateCurveAngle(position.x, wbt.temp);

      labelPositions.push({
        id: `wbt${wbt.temp}`,
        x: position.x,
        y: position.y,
        label: wbt.label,
        bgColor: wbt.bgColor,
        textColor: wbt.textColor,
        pixelX: xScale.getPixelForValue(position.x),
        pixelY: yScale.getPixelForValue(position.y),
        wbtTemp: wbt.temp,
        rotation: angle, // Add rotation angle for slanted text
      });
    }
  });

  // Simple overlap detection and adjustment, sorts by wet bulb temperature to
  // maintain consistent order.
  labelPositions.sort((a, b) => a.wbtTemp - b.wbtTemp);

  // Check for vertical overlaps and adjust slightly if needed
  for (let i = 1; i < labelPositions.length; i++) {
    const prev = labelPositions[i - 1];
    const curr = labelPositions[i];

    // Check if labels overlap vertically.
    const verticalGap = Math.abs(curr.pixelY - prev.pixelY);
    if (verticalGap < labelHeight + padding) {
      // Try to find an alternative position for the current label.

      // Search in both directions from the current position.
      const searchStep = (xMax - xMin) * 0.02;
      let foundAlternative = false;

      for (let direction of [1, -1]) {
        for (let j = 1; j <= 10; j++) {
          const newX = curr.x + direction * j * searchStep;

          // Check if newX is valid for this wet bulb temperature.
          if (newX >= curr.wbtTemp && newX <= xMax && newX >= xMin) {
            const newY = wetBulbCalculator.findHumidityForWetBulb(
              newX,
              curr.wbtTemp,
            );

            if (newY >= yMin && newY <= yMax && newY >= 0 && newY <= 100) {
              const newPixelX = xScale.getPixelForValue(newX);
              const newPixelY = yScale.getPixelForValue(newY);

              // Check if new position maintains sufficient gap and stays
              // within bounds.
              const newVerticalGap = Math.abs(newPixelY - prev.pixelY);
              if (
                newVerticalGap >= labelHeight + padding &&
                newPixelX - labelWidth / 2 >= chartArea.left &&
                newPixelX + labelWidth / 2 <= chartArea.right &&
                newPixelY - labelHeight / 2 >= chartArea.top &&
                newPixelY + labelHeight / 2 <= chartArea.bottom
              ) {
                curr.x = newX;
                curr.y = newY;
                curr.pixelX = newPixelX;
                curr.pixelY = newPixelY;
                curr.rotation = calculateCurveAngle(newX, curr.wbtTemp);
                foundAlternative = true;
                break;
              }
            }
          }
        }
        if (foundAlternative) break;
      }
    }
  }

  return labelPositions;
}

/**
 * Update chart annotations with calculated positions.
 */
function updateChartAnnotations() {
  if (!state.chart) return;

  if (!state.showLabels) {
    // Clear all annotations when labels are hidden,
    if (state.chart.options.plugins.annotation) {
      state.chart.options.plugins.annotation.annotations = {};
      state.chart.update("none");
    }
    return;
  }

  const positions = calculateLabelPositions();
  if (!positions) return;

  const annotations = {};

  positions.forEach((pos) => {
    // Calculate offset to position label to the left of the curve,
    // The offset direction is perpendicular to the curve (90 degrees to the
    // left).
    const offsetDistance = -10; // Distance in pixels to offset the label.
    const offsetX = offsetDistance * Math.cos(pos.rotation - Math.PI / 2);
    const offsetY = offsetDistance * Math.sin(pos.rotation - Math.PI / 2);

    annotations[pos.id] = {
      type: "label",
      xValue: pos.x,
      yValue: pos.y,
      xAdjust: offsetX,
      yAdjust: offsetY,
      color: pos.bgColor, // Use the danger zone color for text.
      content: pos.label,
      font: {
        size: 12,
        weight: "bold",
      },
      padding: 6,
      borderRadius: 4,
      rotation: pos.rotation * (180 / Math.PI), // Convert radians to degrees.
      textAlign: "center",
    };
  });

  // Update the chart's annotation configuration.
  if (state.chart.options.plugins.annotation) {
    state.chart.options.plugins.annotation.annotations = annotations;
    state.chart.update("none");
  }
}

/**
 * Set up the chart with initial data and configuration.
 */
function setupChart() {
  const ctx = elements.chartCanvas.getContext("2d");

  // Create separate datasets for each isotherm to prevent line connection
  // artifacts.
  const isothermDatasets = generateIsothermDatasets();

  /** @type {import('chart.js').ChartData<"line", (number | import('chart.js').Point)[], typeof Chart>} */
  const data = {
    datasets: [
      ...isothermDatasets,
      {
        label: "Selected Wet Bulb Curve",
        data: [],
        borderColor: "#6366f1",
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        showLine: true,
        pointRadius: 0,
        borderWidth: 4,
        tension: 0.1,
        pointHitRadius: 10,
        fill: false,
        borderDash: [5, 5],
      },
      {
        label: "Current Condition",
        data: [],
        borderColor: "#6366f1",
        backgroundColor: "#6366f1",
        pointRadius: 8,
        pointHoverRadius: 10,
        pointHitRadius: 10,
        showLine: false,
      },
    ],
  };

  /** @type {import('chart.js').ChartConfiguration<"line", (number | import('chart.js').Point)[], typeof Chart>} */
  const config = {
    type: "line",
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 1.5,
      layout: {
        padding: {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10,
        },
      },
      plugins: {
        title: {
          display: true,
          text: "Temperature vs Humidity: Human Survivability Limits",
          font: {
            size: 16,
            weight: "bold",
          },
        },
        legend: {
          position: "top",
          labels: {
            usePointStyle: true,
            padding: 15,
            filter: function (item, chart) {
              if (!state?.chart) return true;

              // Find the actual dataset by matching the label.
              const dataset = state.chart.data.datasets.find(
                (ds) => ds.label === item.text,
              );

              // Hide the selected curve and current condition if they have no
              // data.
              if (
                item.text === "Selected Wet Bulb Curve" &&
                dataset &&
                dataset.data.length === 0
              ) {
                return false;
              }
              if (
                item.text === "Current Condition" &&
                dataset &&
                dataset.data.length === 0
              ) {
                return false;
              }
              return true;
            },
            generateLabels: function (chart) {
              const labels =
                Chart.defaults.plugins.legend.labels.generateLabels(chart);
              // Customize the labels.
              labels.forEach((label) => {
                // Update selected curve label.
                if (
                  label.text === "Selected Wet Bulb Curve" &&
                  state.wetBulbTemp !== null
                ) {
                  label.text = `${state.wetBulbTemp.toFixed(1)}°C Wet Bulb`;
                }

                // Update isotherm labels to include danger level.
                if (label.text === "19°C") {
                  label.text = "19°C Caution";
                } else if (label.text === "25°C") {
                  label.text = "25°C Extreme";
                } else if (label.text === "28°C") {
                  label.text = "28°C Dangerous";
                } else if (label.text === "31°C") {
                  label.text = "31°C Unsurvivable";
                }
              });
              return labels;
            },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const point =
                /** @type {import('chart.js').Point & { wetBulb?: number }} */ (
                  context.raw
                );
              const wetBulb =
                point.wetBulb ||
                wetBulbCalculator.calculateWetBulb(point.x, point.y);

              if (
                context.dataset.label === "Selected Wet Bulb Curve" ||
                context.dataset.label.includes("°C Wet Bulb Isotherm")
              ) {
                // Show temperature and humidity breakdown for isotherm lines.
                return [
                  `Temperature: ${point.x.toFixed(1)}°C`,
                  `Humidity: ${point.y.toFixed(0)}%`,
                  `Wet Bulb: ${wetBulb.toFixed(1)}°C`,
                ];
              }

              return [
                `Temperature: ${point.x.toFixed(1)}°C`,
                `Humidity: ${point.y.toFixed(0)}%`,
                `Wet Bulb: ${wetBulb.toFixed(1)}°C`,
              ];
            },
            title: function (tooltipItems) {
              if (tooltipItems.length > 0) {
                const point =
                  /** @type {import('chart.js').Point & { wetBulb?: number }} */ (
                    tooltipItems[0].raw
                  );
                const wetBulb =
                  point.wetBulb ||
                  wetBulbCalculator.calculateWetBulb(point.x, point.y);
                const dangerLevel = wetBulbCalculator.getDangerLevel(wetBulb);
                return (
                  dangerLevel.level.charAt(0).toUpperCase() +
                  dangerLevel.level.slice(1) +
                  " Zone"
                );
              }
              return "";
            },
          },
        },
        annotation: {
          // Start with empty annotations, they will be calculated dynamically.
          annotations: {},
        },
        zoom: {
          limits: {
            x: { min: 0, max: 50 },
            y: { min: 0, max: 100 },
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: "xy",
          },
          pan: {
            enabled: true,
            mode: "xy",
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          title: {
            display: true,
            text: "Air Temperature (°C)",
            font: {
              size: 14,
              weight: "bold",
            },
          },
          min: 0,
          max: 50,
          ticks: {
            stepSize: 5,
            precision: 1,
            includeBounds: false,
          },
          grid: {
            display: state.showGrid,
          },
        },
        y: {
          type: "linear",
          title: {
            display: true,
            text: "Relative Humidity (%)",
            font: {
              size: 14,
              weight: "bold",
            },
          },
          min: 0,
          max: 100,
          ticks: {
            stepSize: 10,
            precision: 1,
            includeBounds: false,
          },
          grid: {
            display: state.showGrid,
          },
        },
      },
    },
  };

  // Create the chart.
  state.chart = new Chart(ctx, config);

  // Add event listeners for zoom and pan.
  state.chart.options.plugins.zoom.zoom.onZoom = function () {
    updateChartAnnotations();
  };

  state.chart.options.plugins.zoom.pan.onPan = function () {
    updateChartAnnotations();
  };

  updateChart();
}

/**
 * Generates datasets for wet bulb isotherms at critical thresholds.
 */
function generateIsothermDatasets() {
  const wetBulbTemps = [19, 25, 28, 31]; // Critical thresholds.

  // Define colors to match the danger zones.
  const isothermColors = {
    19: "#f59e0b", // Caution - yellow/amber.
    25: "#f97316", // Extreme - orange.
    28: "#ef4444", // Danger - red.
    31: "#991b1b", // Unsurvivable - dark red.
  };

  const datasets = [];

  wetBulbTemps.forEach((wbt, index) => {
    const data = [];

    // Generate points for this specific isotherm.
    for (let temp = wbt; temp <= 50; temp += 0.5) {
      const humidity = wetBulbCalculator.findHumidityForWetBulb(temp, wbt);
      if (humidity >= 0 && humidity <= 100) {
        data.push({
          x: temp,
          y: humidity,
          wetBulb: wbt,
        });
      }
    }

    // Create a dataset for this isotherm with appropriate color.
    datasets.push({
      label: `${wbt}°C`,
      data: data,
      borderColor: isothermColors[wbt],
      backgroundColor: `${isothermColors[wbt]}33`, // 20% opacity.
      showLine: true,
      pointRadius: 0,
      pointHitRadius: 10,
      borderWidth: wbt === 31 ? 3 : 2, // Make lines more visible.
      tension: 0.1,
      fill: false,
    });
  });

  return datasets;
}

/**
 * Generates a complete isotherm curve for a given wet bulb temperature.
 * @param {number} wetBulbTemp
 * @param {object} [anchorPoint] Optional anchor point {temp, humidity} that the
 * curve must pass through.
 */
function generateIsothermCurve(wetBulbTemp, anchorPoint = null) {
  const curve = [];
  const temperatures = [];

  // Generate temperature points from the wet bulb temp up to 50°C.
  for (let temp = wetBulbTemp; temp <= 50; temp += 0.5) {
    temperatures.push(temp);
  }

  // If we have an anchor point, make sure its temperature is included.
  if (anchorPoint && anchorPoint.temp >= wetBulbTemp) {
    // Check if the anchor temperature is already in our list, within tolerance.
    const hasAnchorTemp = temperatures.some(
      (t) => Math.abs(t - anchorPoint.temp) < 0.01,
    );

    if (!hasAnchorTemp) {
      // Insert the anchor temperature in the correct position.
      temperatures.push(anchorPoint.temp);
      temperatures.sort((a, b) => a - b);
    }
  }

  // Track if we've hit 0% humidity to avoid artifacts.
  let reachedZeroHumidity = false;

  // Generate curve points for each temperature.
  for (const temp of temperatures) {
    // If we've already reached 0% humidity, don't add more points. This
    // prevents the artifact where the curve goes back up.
    if (reachedZeroHumidity) {
      break;
    }

    // If this is the anchor point temperature, use the anchor humidity.
    if (anchorPoint && Math.abs(temp - anchorPoint.temp) < 0.01) {
      curve.push({
        x: anchorPoint.temp,
        y: anchorPoint.humidity,
        wetBulb: wetBulbTemp,
      });

      // Check if anchor point is at 0% humidity.
      if (anchorPoint.humidity === 0) {
        reachedZeroHumidity = true;
      }
    } else {
      const humidity = wetBulbCalculator.findHumidityForWetBulb(
        temp,
        wetBulbTemp,
      );

      // Only add valid points.
      if (humidity >= 0 && humidity <= 100) {
        curve.push({
          x: temp,
          y: humidity,
          wetBulb: wetBulbTemp,
        });

        // If we hit 0% humidity, stop generating points.
        if (humidity === 0) {
          reachedZeroHumidity = true;
        }
      } else if (humidity < 0) {
        // If we get an invalid humidity, stop the curve here.
        break;
      }
    }
  }

  return curve;
}

// Update chart with current values.
function updateChart() {
  if (!state.chart) return;

  // Find the indices for our special datasets.
  const selectedCurveIndex = state.chart.data.datasets.findIndex(
    (ds) => ds.label === "Selected Wet Bulb Curve",
  );
  const currentConditionIndex = state.chart.data.datasets.findIndex(
    (ds) => ds.label === "Current Condition",
  );

  if (state.mode === "wetbulb-input") {
    // Show the entire wet bulb isotherm curve for the selected temperature.
    const isothermCurve = generateIsothermCurve(state.wetBulbTemp);
    state.chart.data.datasets[selectedCurveIndex].data = isothermCurve; // Selected curve.
    state.chart.data.datasets[currentConditionIndex].data = []; // No specific point.
  } else {
    // Temperature and humidity input mode.

    // Show the wet bulb isotherm curve that passes through this point.
    const wetBulb = wetBulbCalculator.calculateWetBulb(
      state.airTemp,
      state.humidity,
    );
    // Pass the anchor point to ensure the curve goes through the exact user-
    // selected point.
    const isothermCurve = generateIsothermCurve(wetBulb, {
      temp: state.airTemp,
      humidity: state.humidity,
    });
    state.chart.data.datasets[selectedCurveIndex].data = isothermCurve; // Selected curve.
    state.chart.data.datasets[currentConditionIndex].data = [
      { x: state.airTemp, y: state.humidity },
    ]; // Specific point.
  }

  state.chart.update("none");

  // Update label positions after chart update.
  updateChartAnnotations();
}

// Chart control functions

/**
 * Reset the chart zoom to default view.
 */
function resetChartZoom() {
  state.chart.resetZoom();
  // Update label positions after reset
  setTimeout(() => {
    updateChartAnnotations();
  }, 100); // Small delay to ensure chart has updated
}

/**
 * Toggle the visibility of wet bulb threshold labels on the chart.
 */
function toggleLabels() {
  state.showLabels = !state.showLabels;
  updateChartAnnotations();

  // Update button text/state if needed
  if (elements.toggleLabelsBtn) {
    elements.toggleLabelsBtn.classList.toggle("active", state.showLabels);
  }
}

/**
 * Toggle the visibility of grid lines on the chart.
 */
function toggleGrid() {
  state.showGrid = !state.showGrid;

  if (state.chart) {
    // Update both x and y axis grid display.
    state.chart.options.scales.x.grid.display = state.showGrid;
    state.chart.options.scales.y.grid.display = state.showGrid;
    state.chart.update("none");
  }

  // Update button state.
  if (elements.toggleGridBtn) {
    elements.toggleGridBtn.classList.toggle("active", state.showGrid);
  }
}

/** Handle chart resize events. */
function handleChartResize() {
  if (state.chart) {
    state.chart.resize();
    // Update label positions after resize.
    setTimeout(() => {
      updateChartAnnotations();
    }, 100);
  }
}

/** Initialize ResizeObserver to handle chart container resizing. */
function initChartResizeObserver() {
  const chartContainer = document.querySelector(".chart-container");
  if (chartContainer && "ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(() => {
      handleChartResize();
    });
    resizeObserver.observe(chartContainer);
  }
}

// Initialize on DOM content loaded.
document.addEventListener("DOMContentLoaded", () => {
  init();
  initChartResizeObserver();

  // Set initial button states.
  if (elements.toggleLabelsBtn) {
    elements.toggleLabelsBtn.classList.toggle("active", state.showLabels);
  }
  if (elements.toggleGridBtn) {
    elements.toggleGridBtn.classList.toggle("active", state.showGrid);
  }

  // Initial annotation setup.
  setTimeout(() => {
    updateChartAnnotations();
  }, 100);

  // Also handle window resize.
  window.addEventListener("resize", handleChartResize);
});
