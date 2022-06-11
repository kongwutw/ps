import { vec2 } from 'gl-matrix';

export class ElsaCanvas {
  private _webCanvas: HTMLCanvasElement;
  private _width: number;
  private _height: number;
  private _scale: vec2 = vec2.create();

  constructor(webCanvas: HTMLCanvasElement) {
    this._webCanvas = webCanvas;
    this._width = webCanvas.clientWidth;
    this._height = webCanvas.clientHeight;
  }

  get width(): number {
    return this._width;
  }

  set width(value: number) {
    if (this._width !== value) {
      this._webCanvas.width = value;
      this._width = value;
    }
  }

  get height(): number {
    return this._height;
  }

  set height(value: number) {
    if (this._height !== value) {
      this._webCanvas.height = value;
      this._height = value;
    }
  }

  get scale(): vec2 {
    const webCanvas = this._webCanvas;
    if (webCanvas instanceof HTMLCanvasElement) {
      vec2.set(
        this._scale,
        // eslint-disable-next-line no-undef
        (webCanvas.clientWidth * devicePixelRatio) / webCanvas.width,
        // eslint-disable-next-line no-undef
        (webCanvas.clientHeight * devicePixelRatio) / webCanvas.height
      );
    }
    return this._scale;
  }

  resizeByClientSize(pixelRatio: number = window.devicePixelRatio): void {
    const webCanvas = this._webCanvas;
    if (webCanvas instanceof HTMLCanvasElement) {
      const width = webCanvas.clientWidth;
      const height = webCanvas.clientHeight;
      this.width = width * pixelRatio;
      this.height = height * pixelRatio;
    }
  }

  set scale(value: vec2) {
    const webCanvas = this._webCanvas;
    if (webCanvas instanceof HTMLCanvasElement) {
      webCanvas.style.transformOrigin = `left top`;
      webCanvas.style.transform = `scale(${value[0]}, ${value[1]})`;
    }
  }

  get webCanvas() {
    return this._webCanvas;
  }
};
