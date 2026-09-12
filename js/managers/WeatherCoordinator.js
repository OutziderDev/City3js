import { WEATHER_COOLDOWN_MIN, WEATHER_COOLDOWN_MAX } from '../utils/constants.js';

export class WeatherCoordinator {
  constructor() {
    this.activeWeather = null;
    this.cooldownTimer = 0;
    this.isCooldown = false;
    this.weatherManager = null;
    this.snowManager = null;
  }

  setManagers(weatherManager, snowManager) {
    this.weatherManager = weatherManager;
    this.snowManager = snowManager;
  }

  getCooldownDuration() {
    return WEATHER_COOLDOWN_MIN + Math.random() * (WEATHER_COOLDOWN_MAX - WEATHER_COOLDOWN_MIN);
  }

  canStartWeather(type) {
    if (this.activeWeather !== null) return false;
    if (this.isCooldown) return false;
    if (this.weatherManager && this.weatherManager.isStillVisual()) return false;
    if (this.snowManager && this.snowManager.isStillVisual()) return false;
    return true;
  }

  forceStartWeather(type) {
    this.activeWeather = type;
    this.isCooldown = false;
    this.cooldownTimer = 0;
  }

  registerWeatherStart(type) {
    this.activeWeather = type;
  }

  registerWeatherEnd() {
    this.activeWeather = null;
    this.isCooldown = true;
    this.cooldownTimer = this.getCooldownDuration();
  }

  update(delta) {
    if (this.isCooldown) {
      this.cooldownTimer -= delta;
      if (this.cooldownTimer <= 0) {
        this.isCooldown = false;
        this.cooldownTimer = 0;
      }
    }
  }

  getActiveWeather() {
    return this.activeWeather;
  }

  isWeatherActive() {
    return this.activeWeather !== null;
  }
}
