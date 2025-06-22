/**
 * Wet Bulb Temperature Calculator
 * Uses the Stull approximation for wet bulb temperature calculations
 * Reference: Stull, R. (2011). Wet-Bulb Temperature from Relative Humidity and
 * Air Temperature.
 */

export const wetBulbCalculator = {
  /**
   * Calculate wet bulb temperature from air temperature and relative humidity
   * using Stull's approximation formula.
   * @param {number} temp Air temperature in Celsius.
   * @param {number} rh Relative humidity in percentage (0% to 100%).
   * @returns {number} Wet bulb temperature in Celsius.
   */
  calculateWetBulb(temp, rh) {
    // Stull approximation
    // T_w = T * atan[0.151977 * (RH + 8.313659)^(1/2)]
    //       + atan(T + RH) - atan(RH - 1.676331)
    //       + 0.00391838 * (RH)^(3/2) * atan(0.023101 * RH)
    //       - 4.686035

    const term1 = temp * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5));
    const term2 = Math.atan(temp + rh);
    const term3 = Math.atan(rh - 1.676331);
    const term4 = 0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh);
    const term5 = 4.686035;

    const T_w = term1 + term2 - term3 + term4 - term5;

    return Math.round(T_w * 10) / 10; // Round to 1 decimal place.
  },

  /**
   * Find the humidity that produces a given wet bulb temperature at a specific
   * air temperature. Uses binary search to find the humidity value.
   * @param {number} temp Air temperature in Celsius.
   * @param {number} targetWetBulb Target wet bulb temperature in Celsius.
   * @returns {number} Relative humidity in percentage (0% to 100%).
   */
  findHumidityForWetBulb(temp, targetWetBulb) {
    // Wet bulb can't be higher than dry bulb.
    if (targetWetBulb > temp) {
      return -1;
    }

    // If they're equal, humidity must be 100%.
    if (Math.abs(targetWetBulb - temp) < 0.1) {
      return 100;
    }

    // Due to non-monotonic behavior at very low humidity (< ~3%) caused by the
    // Stull approximation artifact, we need to handle this range specially.
    // The artifact occurs because of the term -atan(RH - 1.676331) in the
    // formula.

    // First, check if we're in the range where the artifact might occur.
    const minPossibleWB = this.calculateWetBulb(temp, 0);
    const wbAt3Percent = this.calculateWetBulb(temp, 3);

    // If the target is below what's achievable at 3% humidity, we're in
    // artifact territory.
    if (targetWetBulb < wbAt3Percent) {
      // Find the minimum achievable wet bulb in the 0 to 3% range.
      let minWB = minPossibleWB;
      let minRH = 0;

      for (let rh = 0; rh <= 3; rh += 0.1) {
        const wb = this.calculateWetBulb(temp, rh);
        if (wb < minWB) {
          minWB = wb;
          minRH = rh;
        }
      }

      // If target is below the minimum achievable, return 0% (physically
      // meaningful).
      if (targetWetBulb < minWB - 0.1) {
        return 0;
      }

      // If we're near the minimum, return the humidity at minimum. This avoids
      // the non-physical upturn in the curve.
      if (Math.abs(targetWetBulb - minWB) < 0.2) {
        return Math.round(minRH);
      }
    }

    // Standard binary search for higher humidity values (> 3%).
    let low = 0;
    let high = 100;
    let mid;

    const tolerance = 0.1;
    const maxIterations = 50;
    let iterations = 0;

    while (low <= high && iterations < maxIterations) {
      mid = (low + high) / 2;
      const calculatedWetBulb = this.calculateWetBulb(temp, mid);

      if (Math.abs(calculatedWetBulb - targetWetBulb) < tolerance) {
        return Math.round(mid);
      }

      if (calculatedWetBulb < targetWetBulb) {
        low = mid + 0.1;
      } else {
        high = mid - 0.1;
      }

      iterations++;
    }

    // If binary search didn't find a good match, do one more comprehensive
    // search.
    let bestHumidity = mid;
    let bestDiff = Math.abs(this.calculateWetBulb(temp, mid) - targetWetBulb);

    for (let rh = 0; rh <= 100; rh += 1) {
      const wb = this.calculateWetBulb(temp, rh);
      const diff = Math.abs(wb - targetWetBulb);

      if (diff < bestDiff) {
        bestDiff = diff;
        bestHumidity = rh;
      }
    }

    return Math.round(bestHumidity);
  },

  /**
   * Find the temperature that produces a given wet bulb temperature at a
   * specific humidity. Uses binary search to find the temperature value.
   * @param {number} targetWetBulb Target wet bulb temperature in Celsius.
   * @param {number} humidity Relative humidity in percentage (0% to 100%).
   * @returns {number} Air temperature in Celsius.
   */
  findTempForWetBulbAndHumidity(targetWetBulb, humidity) {
    // Wet bulb can't be higher than dry bulb.
    let low = targetWetBulb;
    let high = 50; // Maximum temperature we consider.
    let mid;
    const tolerance = 0.1;
    const maxIterations = 50;
    let iterations = 0;

    while (low <= high && iterations < maxIterations) {
      mid = (low + high) / 2;
      const calculatedWetBulb = this.calculateWetBulb(mid, humidity);

      if (Math.abs(calculatedWetBulb - targetWetBulb) < tolerance) {
        return Math.round(mid * 10) / 10;
      }

      if (calculatedWetBulb < targetWetBulb) {
        low = mid + 0.1;
      } else {
        high = mid - 0.1;
      }

      iterations++;
    }

    return Math.round(mid * 10) / 10;
  },

  /**
   * Get danger level classification for wet bulb temperature, based on Penn
   * State 2022 research findings.
   * @param {number} wetBulbTemp Wet bulb temperature in Celsius.
   * @returns {{ level: string, description: string, color: string }} Object
   * containing level and description.
   */
  getDangerLevel(wetBulbTemp) {
    if (wetBulbTemp < 19) {
      return {
        level: "safe",
        description: "Safe conditions for normal activities",
        color: "#10b981",
      };
    } else if (wetBulbTemp < 25) {
      return {
        level: "caution",
        description:
          "Increased caution - approaching limits for vulnerable populations",
        color: "#f59e0b",
      };
    } else if (wetBulbTemp < 28) {
      return {
        level: "extreme",
        description: "Dangerous - many people cannot compensate, AC essential",
        color: "#f97316",
      };
    } else if (wetBulbTemp < 31) {
      return {
        level: "danger",
        description: "Life-threatening - approaching human survivability limit",
        color: "#ef4444",
      };
    } else {
      return {
        level: "unsurvivable",
        description: "Beyond human adaptability - fatal without cooling",
        color: "#991b1b",
      };
    }
  },
};
