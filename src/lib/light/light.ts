import { vec4 } from 'gl-matrix';
import { Node } from '../node';

export class Light extends Node {
  /**
   * 每种光源最多数量为10
   * */
  protected static _maxLight: number = 10;
  public color: vec4;
  public intensity: any;
  public isLight: boolean;
  constructor(color, intensity) {
    super('Light');
    this.color = color;
    this.intensity = intensity;
  }

  _appendData(index: number) {}

  dispose() {
    // Empty here in base class; some subclasses override.
  }
}
