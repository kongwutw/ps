import { EventDispatcher } from './dispatcher';

import { MathUtil } from '@/util/math';

export class ElsaEngine3D extends EventDispatcher {
  private _isPaused: boolean = true;
  private _requestId: number;
  private _timeoutId: number;
  private _frameId: number = 0;
  private _sceneRenderer: any;
  public frameIdMax: number = 3600;

  constructor(sceneRenderer: any, frameIdMax?: number) {
    super();
    this._sceneRenderer = sceneRenderer;
    if (frameIdMax !== undefined) {
      this.frameIdMax = frameIdMax;
    }
  }

  private _animate = () => {
    this.dispatchEvent({ type: 'pre-render', frameId: this._frameId });
    this.update();
    this.dispatchEvent({ type: 'after-render', frameId: this._frameId });
    // eslint-disable-next-line no-undef
    this._requestId = requestAnimationFrame(this._animate);
  };

  get isPaused(): boolean {
    return this._isPaused;
  }

  update(): void {
    this._frameId %= this.frameIdMax;
    this._sceneRenderer.render(this._frameId);
    this._frameId++;
  }

  start(): void {
    this.resume();
  }

  pause(): void {
    this._isPaused = true;
    // eslint-disable-next-line no-undef
    cancelAnimationFrame(this._requestId);
    clearTimeout(this._timeoutId);
  }

  resume(): void {
    if (!this._isPaused) return;
    this._isPaused = false;
    this._animate();
  }

  play(progress: number): void {
    progress = MathUtil.clamp(progress, 0, 0.999);
    this._frameId = progress * this.frameIdMax;
    this.resume();
  }

  dispose() {
    this.pause();
    this._sceneRenderer = null;
  }
}
