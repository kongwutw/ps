import { vec3, vec4 } from 'gl-matrix';
import { Light } from './light';
import { Node } from '../node';

export class DirectLight extends Light {
  private static _colorProperty: any = 'u_directLightColor';
  private static _directionProperty: any = 'u_directLightDirection';
  target: Node;

  constructor(color, intensity) {
    super(color, intensity);
    this.type = 'DirectionalLight';
    vec3.copy(this.position, Node.DefaultUp);
    this.updateMatrix();
  }

  private static _combinedData = {
    color: new Float32Array(3 * Light._maxLight),
    direction: new Float32Array(3 * Light._maxLight)
  };

  static _updateShaderData(shader: any): void {
    const data = DirectLight._combinedData;
    shader.updateUniformsData(DirectLight._colorProperty, data.color);
    shader.updateUniformsData(DirectLight._directionProperty, data.direction);
  }

  private _forward: vec3 = vec3.create();
  private _lightColor: vec4 = [1, 1, 1, 1];
  private _reverseDirection: vec3 = vec3.create();

  /**
   * 获取全局方向
   */
  get direction(): vec3 {
    this._forward = this.getWorldForward(this._forward);
    return this._forward;
  }

  /**
   * 获取最终的光线颜色
   */
  get lightColor(): vec4 {
    this._lightColor[0] = this.color[0] * this.intensity;
    this._lightColor[1] = this.color[1] * this.intensity;
    this._lightColor[2] = this.color[2] * this.intensity;
    this._lightColor[3] = this.color[3] * this.intensity;
    return this._lightColor;
  }

  /**
   * 获取方向光的反方向
   */
  get reverseDirection(): vec3 {
    vec3.scale(this._reverseDirection, this.direction, -1);
    return this._reverseDirection;
  }

  public _appendData(lightIndex: number): void {
    const colorStart = lightIndex * 3;
    const directionStart = lightIndex * 3;
    const lightColor = this.lightColor;
    const direction = this.direction;

    const data = DirectLight._combinedData;

    data.color[colorStart] = lightColor[0];
    data.color[colorStart + 1] = lightColor[1];
    data.color[colorStart + 2] = lightColor[2];
    data.direction[directionStart] = direction[0];
    data.direction[directionStart + 1] = direction[1];
    data.direction[directionStart + 2] = direction[2];
    // Logger.info('_appendData.direction', data);
  }
}
